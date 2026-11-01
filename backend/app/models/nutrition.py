from enum import Enum

from pydantic import BaseModel, Field


class Portion(str, Enum):
    small = "small"
    medium = "medium"
    large = "large"


# Multiplier applied to a food's default serving
PORTION_FACTORS: dict[Portion, float] = {
    Portion.small: 0.6,
    Portion.medium: 1.0,
    Portion.large: 1.5,
}


class Macros(BaseModel):
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0

    def scaled(self, grams: float) -> "Macros":
        f = grams / 100
        return Macros(
            calories=round(self.calories * f, 1),
            protein=round(self.protein * f, 1),
            carbs=round(self.carbs * f, 1),
            fat=round(self.fat * f, 1),
            fiber=round(self.fiber * f, 1),
        )

    def __add__(self, other: "Macros") -> "Macros":
        return Macros(
            calories=round(self.calories + other.calories, 1),
            protein=round(self.protein + other.protein, 1),
            carbs=round(self.carbs + other.carbs, 1),
            fat=round(self.fat + other.fat, 1),
            fiber=round(self.fiber + other.fiber, 1),
        )


class FoodRecord(BaseModel):
    """A food in the nutrition database (per-100g values)."""

    id: str | None = None  # food_items.id when it comes from the DB
    name: str
    category: str | None = None
    default_serving_unit: str | None = None
    default_grams: float = 100
    per_100g: Macros
    source: str | None = None
    aliases: list[str] = Field(default_factory=list)


class FoodSearchResult(BaseModel):
    foods: list[FoodRecord]


class CalculateItem(BaseModel):
    food_name: str = Field(min_length=1, max_length=120)
    grams: float | None = Field(default=None, gt=0, le=2000)
    portion: Portion = Portion.medium


class CalculateRequest(BaseModel):
    items: list[CalculateItem] = Field(min_length=1, max_length=30)


class NutrientLine(BaseModel):
    food_name: str
    food_id: str | None
    matched: bool
    source: str  # food database source, or "ai_estimate"
    portion: Portion
    grams: float
    default_grams: float
    serving_unit: str | None
    per_100g: Macros
    nutrients: Macros
    confidence: float = Field(ge=0, le=1, default=1)


class NutrientBreakdown(BaseModel):
    items: list[NutrientLine]
    totals: Macros
