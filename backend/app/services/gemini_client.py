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
    # Structured JSON output (response_schema) is only enabled on v1beta;
    # google-genai 3.x defaults to v1, so pin the API version explicitly.
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(api_version="v1beta"),
    )


async def _generate(
    contents: list, config: types.GenerateContentConfig, max_attempts: int
) -> types.GenerateContentResponse:
    """generate_content with exponential backoff on rate limits / server errors."""
    settings = get_settings()
    client = get_client()
    for attempt in range(1, max_attempts + 1):
        try:
            return await client.aio.models.generate_content(
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
            if "location is not supported" in (exc.message or "").lower():
                # Gemini's free API is geo-restricted (e.g. not Hong Kong /
                # Azure East Asia); the server must run in a supported region
                logger.error("Gemini rejected this server's region: %s", exc.message)
                raise GeminiRequestError(
                    "The AI service isn't available from this server's region. "
                    "Host the backend in a supported region (e.g. Azure Central India)."
                ) from exc
            raise GeminiRequestError(f"Gemini request failed: {exc.message}") from exc
    raise GeminiRequestError("Gemini request failed after retries")


async def generate_structured(
    *,
    prompt: str,
    image: bytes,
    mime_type: str,
    schema: type[T],
    max_attempts: int = 3,
) -> T:
    """Send an image + prompt to Gemini and parse the JSON reply into `schema`."""
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.1,
    )
    contents = [types.Part.from_bytes(data=image, mime_type=mime_type), prompt]
    response = await _generate(contents, config, max_attempts)

    if isinstance(response.parsed, schema):
        return response.parsed
    if response.text:
        try:
            return schema.model_validate_json(response.text)
        except ValueError as exc:
            raise GeminiRequestError("Gemini returned malformed JSON") from exc
    raise GeminiRequestError("Gemini returned an empty response")


async def generate_chat(
    *,
    system: str,
    history: list[tuple[str, str]],
    message: str,
    max_attempts: int = 3,
) -> str:
    """Multi-turn text reply. `history` is (role, text) with role user|assistant."""
    contents = [
        types.Content(
            role="model" if role == "assistant" else "user",
            parts=[types.Part(text=text)],
        )
        for role, text in history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    config = types.GenerateContentConfig(system_instruction=system, temperature=0.6)

    response = await _generate(contents, config, max_attempts)
    if not response.text:
        raise GeminiRequestError("Gemini returned an empty response")
    return response.text.strip()
