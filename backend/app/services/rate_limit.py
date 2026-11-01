import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.config import get_settings
from app.services.auth import CurrentUser, get_current_user


class SlidingWindowLimiter:
    """In-memory per-key limiter. Fine for a single instance (Render free
    tier); swap for Redis if the API is ever scaled horizontally."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            retry = int(self.window - (now - hits[0])) + 1
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Too many AI requests. Try again in {retry} seconds.",
                headers={"Retry-After": str(retry)},
            )
        hits.append(now)


_ai_limiter: SlidingWindowLimiter | None = None


def get_ai_limiter() -> SlidingWindowLimiter:
    global _ai_limiter
    if _ai_limiter is None:
        settings = get_settings()
        _ai_limiter = SlidingWindowLimiter(settings.ai_requests_per_window, settings.ai_window_seconds)
    return _ai_limiter


async def ai_rate_limited_user(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    limiter: Annotated[SlidingWindowLimiter, Depends(get_ai_limiter)],
) -> CurrentUser:
    """Current user, after charging one Gemini call to their quota."""
    limiter.check(user.id)
    return user
