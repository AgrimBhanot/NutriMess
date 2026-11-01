import asyncio
import logging
from functools import lru_cache
from typing import TypeVar

from google import genai
from google.genai import errors, types
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class GeminiNotConfiguredError(RuntimeError):
    """Raised when GEMINI_API_KEY is missing."""


class GeminiRequestError(RuntimeError):
    """Raised when Gemini fails after retries or returns unusable output."""


@lru_cache()
def get_client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise GeminiNotConfiguredError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=settings.gemini_api_key)


async def generate_structured(
    *,
    prompt: str,
    image: bytes,
    mime_type: str,
    schema: type[T],
    max_attempts: int = 3,
) -> T:
    """Send an image + prompt to Gemini and parse the JSON reply into `schema`.

    Retries with exponential backoff on rate limits and server errors.
    """
    settings = get_settings()
    client = get_client()
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.1,
    )
    contents = [types.Part.from_bytes(data=image, mime_type=mime_type), prompt]

    for attempt in range(1, max_attempts + 1):
        try:
            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=config,
            )
        except errors.APIError as exc:
            if exc.code in RETRYABLE_STATUS and attempt < max_attempts:
                delay = 2**attempt
                logger.warning("Gemini %s, retrying in %ss", exc.code, delay)
                await asyncio.sleep(delay)
                continue
            raise GeminiRequestError(f"Gemini request failed: {exc.message}") from exc

        if isinstance(response.parsed, schema):
            return response.parsed
        if response.text:
            try:
                return schema.model_validate_json(response.text)
            except ValueError as exc:
                raise GeminiRequestError("Gemini returned malformed JSON") from exc
        raise GeminiRequestError("Gemini returned an empty response")

    raise GeminiRequestError("Gemini request failed after retries")
