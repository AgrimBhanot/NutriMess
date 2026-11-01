from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.chat import ChatRequest, ChatResponse, RecommendationResponse
from app.services.auth import CurrentUser, get_current_user
from app.services.rate_limit import ai_rate_limited_user
from app.services.context_builder import build_context
from app.services.gemini_client import (
    GeminiNotConfiguredError,
    GeminiRequestError,
    generate_chat,
)
from app.services.nutrition_engine import NutritionEngine, get_engine

router = APIRouter()

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "nutrition_chat.txt"
HISTORY_TURNS = 12


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user: Annotated[CurrentUser, Depends(ai_rate_limited_user)],
    engine: Annotated[NutritionEngine, Depends(get_engine)],
) -> ChatResponse:
    """AI nutrition assistant grounded in the user's profile, meals and menu.
    Conversation is stored in ai_chat_sessions / ai_chat_messages."""
    db = user.db()

    history: list[tuple[str, str]] = []
    if body.session_id:
        # RLS: only the owner's session is visible
        sessions = await db.select("ai_chat_sessions", {"id": f"eq.{body.session_id}", "select": "id"})
        if not sessions:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat session not found")
        session_id = body.session_id
        rows = await db.select(
            "ai_chat_messages",
            {
                "session_id": f"eq.{session_id}",
                "select": "role,content",
                "order": "created_at.desc",
                "limit": str(HISTORY_TURNS),
            },
        )
        history = [(r["role"], r["content"]) for r in reversed(rows)]
    else:
        session_id = (await db.insert("ai_chat_sessions", {"user_id": user.id}))[0]["id"]

    context = await build_context(db, user.id, engine)
    system = PROMPT_PATH.read_text(encoding="utf-8").replace("{context}", context.to_prompt())

    try:
        reply = await generate_chat(system=system, history=history, message=body.message)
    except GeminiNotConfiguredError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The AI assistant is not configured"
        ) from exc
    except GeminiRequestError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    # Separate inserts so created_at orders the pair correctly
    await db.insert(
        "ai_chat_messages",
        {"session_id": session_id, "role": "user", "content": body.message},
    )
    await db.insert(
        "ai_chat_messages",
        {
            "session_id": session_id,
            "role": "assistant",
            "content": reply,
            "metadata": {
                "next_meal": f"{context.next_meal_day} {context.next_meal}",
                "suggestions": [s.food_name for s in context.suggestions],
            },
        },
    )
    return ChatResponse(session_id=session_id, reply=reply, suggestions=context.suggestions)


@router.get("/recommendations", response_model=RecommendationResponse)
async def recommendations(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    engine: Annotated[NutritionEngine, Depends(get_engine)],
) -> RecommendationResponse:
    """Rule-based picks for the next meal (no AI call, so it's fast and free)."""
    context = await build_context(user.db(), user.id, engine)
    return RecommendationResponse(
        meal=context.next_meal,
        day=context.next_meal_day,
        menu_available=bool(context.menu),
        targets=context.targets,
        eaten_today=context.eaten_today,
        suggestions=context.suggestions,
    )
