from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.models.menu import MenuExtractionResponse
from app.services.auth import CurrentUser, require_secretary
from app.services.gemini_client import GeminiNotConfiguredError, GeminiRequestError
from app.services.menu_parser import extract_menu_from_image
from app.services.uploads import read_image_upload

router = APIRouter()


@router.post("/extract", response_model=MenuExtractionResponse)
async def extract_menu(
    file: Annotated[UploadFile, File(description="Photo of the weekly menu")],
    _user: Annotated[CurrentUser, Depends(require_secretary)],
) -> MenuExtractionResponse:
    """Extract a structured weekly menu from an uploaded image (secretary only)."""
    image, mime_type = await read_image_upload(file)

    try:
        return await extract_menu_from_image(image, mime_type)
    except GeminiNotConfiguredError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Menu extraction is not configured"
        ) from exc
    except GeminiRequestError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
