from typing import Literal

from pydantic import BaseModel, Field

from app.models.nutrition import Macros, NutrientLine


class PlateAnalysis(BaseModel):
    """Result of analysing a plate photo, ready for the user to correct."""

    is_food: bool
    items: list[NutrientLine]
    totals: Macros
    confidence: Literal["low", "moderate", "high"]
    notes: list[str] = Field(default_factory=list)
    model: str


# ---- Shape requested from Gemini ----

class GeminiDetectedFood(BaseModel):
    name: str
    matched_name: str | None = None
    portion: str = "medium"
    estimated_grams: float
    confidence: float
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fiber_per_100g: float


class GeminiPlateResult(BaseModel):
    is_food: bool
    items: list[GeminiDetectedFood]
    notes: list[str] = Field(default_factory=list)
