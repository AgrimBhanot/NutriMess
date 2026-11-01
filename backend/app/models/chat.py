from pydantic import BaseModel, Field

from app.models.nutrition import Macros
from app.services.recommender import Suggestion


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    suggestions: list[Suggestion] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    meal: str
    day: str  # "today" | "tomorrow"
    menu_available: bool
    targets: Macros
    eaten_today: Macros
    suggestions: list[Suggestion]
