from enum import Enum

from pydantic import BaseModel, Field


class Day(str, Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"


class Meal(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    snacks = "snacks"
    dinner = "dinner"


class ExtractedMenuItem(BaseModel):
    """One dish on the menu for a given day and meal."""

    day: Day
    meal: Meal
    item_name: str = Field(min_length=1, max_length=120)
    item_order: int = 0


class MenuExtractionResponse(BaseModel):
    """Structured menu extracted from an uploaded image."""

    items: list[ExtractedMenuItem]
    warnings: list[str] = Field(default_factory=list)
    model: str


# Shape Gemini is asked to return (kept flat so the schema stays simple)
class GeminiMenuEntry(BaseModel):
    day: str
    meal: str
    items: list[str]


class GeminiMenuResult(BaseModel):
    entries: list[GeminiMenuEntry]
    notes: list[str] = Field(default_factory=list)
