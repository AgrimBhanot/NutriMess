from pathlib import Path
from typing import Literal

from app.config import get_settings
from app.models.nutrition import Macros, Portion
from app.models.plate import GeminiPlateResult, PlateAnalysis
from app.services.gemini_client import generate_structured
from app.services.nutrition_engine import NutritionEngine

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "plate_analysis.txt"

MAX_ITEM_GRAMS = 800


def _portion(value: str) -> Portion:
    try:
        return Portion(value.strip().lower())
    except ValueError:
        return Portion.medium


def _overall_confidence(
    scores: list[float], matched: int, total: int
) -> Literal["low", "moderate", "high"]:
    if total == 0:
        return "low"
    mean = sum(scores) / total
    match_rate = matched / total
    if mean >= 0.75 and match_rate >= 0.75:
        return "high"
    if mean >= 0.5:
        return "moderate"
    return "low"


def build_analysis(
    result: GeminiPlateResult, engine: NutritionEngine, model: str
) -> PlateAnalysis:
    """Turn Gemini's detections into nutrient lines via the nutrition engine."""
    notes = list(result.notes)
    lines = []

    for detected in result.items:
        grams = max(1.0, min(detected.estimated_grams, MAX_ITEM_GRAMS))
        estimate = Macros(
            calories=max(0, detected.calories_per_100g),
            protein=max(0, detected.protein_per_100g),
            carbs=max(0, detected.carbs_per_100g),
            fat=max(0, detected.fat_per_100g),
            fiber=max(0, detected.fiber_per_100g),
        )
        confidence = max(0.0, min(detected.confidence, 1.0))

        # Prefer Gemini's pick from the known list, then its free-text name
        line = None
        for candidate in (detected.matched_name, detected.name):
            if candidate and engine.match(candidate)[0] is not None:
                line = engine.line(
                    food_name=candidate,
                    portion=_portion(detected.portion),
                    grams=grams,
                    confidence=confidence,
                )
                break
        if line is None:
            line = engine.line(
                food_name=detected.name,
                portion=_portion(detected.portion),
                grams=grams,
                fallback_per_100g=estimate,
                confidence=confidence,
            )
            if line is not None:
                notes.append(f"{detected.name} isn't in our food database; values are AI estimates.")
        if line is not None:
            lines.append(line)

    totals = sum((line.nutrients for line in lines), Macros())
    return PlateAnalysis(
        is_food=result.is_food and bool(lines),
        items=lines,
        totals=totals,
        confidence=_overall_confidence(
            [line.confidence for line in lines],
            sum(line.matched for line in lines),
            len(lines),
        ),
        notes=notes,
        model=model,
    )


async def analyze_plate(image: bytes, mime_type: str, engine: NutritionEngine) -> PlateAnalysis:
    known = "\n".join(f"- {food.name}" for food in engine.foods)
    prompt = PROMPT_PATH.read_text(encoding="utf-8").replace("{known_foods}", known)
    result = await generate_structured(
        prompt=prompt,
        image=image,
        mime_type=mime_type,
        schema=GeminiPlateResult,
    )
    return build_analysis(result, engine, get_settings().gemini_model)
