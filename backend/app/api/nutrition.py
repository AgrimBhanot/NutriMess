from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.models.nutrition import CalculateRequest, FoodSearchResult, NutrientBreakdown
from app.services.nutrition_engine import NutritionEngine, get_engine

router = APIRouter()


@router.get("/foods", response_model=FoodSearchResult)
async def search_foods(
    engine: Annotated[NutritionEngine, Depends(get_engine)],
    q: Annotated[str, Query(max_length=60)] = "",
    limit: Annotated[int, Query(ge=1, le=50)] = 15,
) -> FoodSearchResult:
    """Search the food database (IFCT 2017 + mess-specific dishes)."""
    return FoodSearchResult(foods=engine.search(q, limit))


@router.post("/calculate", response_model=NutrientBreakdown)
async def calculate(
    body: CalculateRequest,
    engine: Annotated[NutritionEngine, Depends(get_engine)],
) -> NutrientBreakdown:
    """Nutrients for a list of foods with portions or gram weights.
    Unknown foods are omitted from the result."""
    return engine.calculate(body.items)
