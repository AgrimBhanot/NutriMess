from typing import Annotated

import httpx
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.config import get_settings


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    role: str
    bhawan_id: str | None = None


async def _supabase_get(path: str, token: str) -> httpx.Response:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Supabase is not configured on the server"
        )
    async with httpx.AsyncClient(timeout=10) as client:
        return await client.get(
            f"{settings.supabase_url}{path}",
            headers={"apikey": settings.supabase_api_key, "Authorization": f"Bearer {token}"},
        )


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """Validate the Supabase access token and load the caller's profile.

    The profile is read with the caller's own JWT, so RLS still applies.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    user_res = await _supabase_get("/auth/v1/user", token)
    if user_res.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")
    user = user_res.json()

    profile_res = await _supabase_get(
        f"/rest/v1/profiles?id=eq.{user['id']}&select=role,bhawan_id", token
    )
    rows = profile_res.json() if profile_res.status_code == 200 else []
    if not rows:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Profile not found")

    return CurrentUser(
        id=user["id"],
        email=user.get("email"),
        role=rows[0]["role"],
        bhawan_id=rows[0].get("bhawan_id"),
    )


async def require_secretary(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if user.role not in ("secretary", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Secretary access required")
    return user
