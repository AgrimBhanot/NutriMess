from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.models.plate import PlateAnalysis
from app.services.auth import CurrentUser
from app.services.rate_limit import ai_rate_limited_user
from app.services.gemini_client import GeminiNotConfiguredError, GeminiRequestError
from app.services.nutrition_engine import NutritionEngine, get_engine
from app.services.plate_analyzer import analyze_plate
from app.services.uploads import read_image_upload

router = APIRouter()


@router.post("/analyze", response_model=PlateAnalysis)
async def analyze(
    file: Annotated[UploadFile, File(description="Photo of the plate")],
    _user: Annotated[CurrentUser, Depends(ai_rate_limited_user)],
    engine: Annotated[NutritionEngine, Depends(get_engine)],
) -> PlateAnalysis:
    """Identify foods on a plate photo and estimate their nutrition."""
    image, mime_type = await read_image_upload(file)

    try:
        return await analyze_plate(image, mime_type, engine)
    except GeminiNotConfiguredError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Plate analysis is not configured"
        ) from exc
    except GeminiRequestError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
