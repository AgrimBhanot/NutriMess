from pathlib import Path

from app.config import get_settings
from app.models.menu import (
    Day,
    ExtractedMenuItem,
    GeminiMenuResult,
    Meal,
    MenuExtractionResponse,
)
from app.services.gemini_client import generate_structured

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "menu_extraction.txt"

DAY_ALIASES: dict[str, Day] = {
    **{d.value: d for d in Day},
    **{d.value[:3]: d for d in Day},
    "tues": Day.tuesday,
    "thur": Day.thursday,
    "thurs": Day.thursday,
}

MEAL_ALIASES: dict[str, Meal] = {
    **{m.value: m for m in Meal},
    "snack": Meal.snacks,
    "evening snacks": Meal.snacks,
    "evening tea": Meal.snacks,
    "hi-tea": Meal.snacks,
    "high tea": Meal.snacks,
    "tiffin": Meal.snacks,
    "brunch": Meal.lunch,
    "supper": Meal.dinner,
}


def _normalise_name(name: str) -> str:
    cleaned = " ".join(name.replace("\n", " ").split()).strip(" ,;-.")
    if cleaned.islower() or cleaned.isupper():
        cleaned = cleaned.title()
    return cleaned[:120]


def normalise_menu(result: GeminiMenuResult, model: str) -> MenuExtractionResponse:
    """Map Gemini's loose output onto the DB enums, dedupe and order items."""
    warnings = list(result.notes)
    items: list[ExtractedMenuItem] = []
    seen: set[tuple[Day, Meal, str]] = set()
    order: dict[tuple[Day, Meal], int] = {}

    for entry in result.entries:
        day = DAY_ALIASES.get(entry.day.strip().lower())
        meal = MEAL_ALIASES.get(entry.meal.strip().lower())
        if day is None or meal is None:
            warnings.append(f"Skipped unrecognised slot: {entry.day} / {entry.meal}")
            continue

        for raw in entry.items:
            name = _normalise_name(raw)
            key = (day, meal, name.lower())
            if not name or key in seen:
                continue
            seen.add(key)
            idx = order.get((day, meal), 0)
            order[(day, meal)] = idx + 1
            items.append(ExtractedMenuItem(day=day, meal=meal, item_name=name, item_order=idx))

    day_rank = {d: i for i, d in enumerate(Day)}
    meal_rank = {m: i for i, m in enumerate(Meal)}
    items.sort(key=lambda i: (day_rank[i.day], meal_rank[i.meal], i.item_order))

    if not items:
        warnings.append("No menu items could be read from this image.")

    return MenuExtractionResponse(items=items, warnings=warnings, model=model)


async def extract_menu_from_image(image: bytes, mime_type: str) -> MenuExtractionResponse:
    """Run Gemini Vision on a menu photo and return editable structured items."""
    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    result = await generate_structured(
        prompt=prompt,
        image=image,
        mime_type=mime_type,
        schema=GeminiMenuResult,
    )
    return normalise_menu(result, get_settings().gemini_model)
