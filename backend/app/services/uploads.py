from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


async def read_image_upload(file: UploadFile) -> tuple[bytes, str]:
    """Validate an uploaded image and return (bytes, mime type)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG, PNG, WebP or HEIC image"
        )

    max_mb = get_settings().max_upload_mb
    image = await file.read(max_mb * 1024 * 1024 + 1)
    if len(image) > max_mb * 1024 * 1024:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Image must be under {max_mb} MB"
        )
    if not image:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    return image, file.content_type
