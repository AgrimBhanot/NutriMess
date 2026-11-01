from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.services.supabase_rest import SupabaseRest


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    role: str
    bhawan_id: str | None = None
    token: str = ""

    def db(self) -> SupabaseRest:
        """PostgREST client acting as this user (RLS applies)."""
        return SupabaseRest(self.token)


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """Validate the Supabase access token and load the caller's profile.

    The profile is read with the caller's own JWT, so RLS still applies.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    db = SupabaseRest(token)
    user = await db.get_user()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    rows = await db.select("profiles", {"id": f"eq.{user['id']}", "select": "role,bhawan_id"})
    if not rows:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Profile not found")

    return CurrentUser(
        id=user["id"],
        email=user.get("email"),
        role=rows[0]["role"],
        bhawan_id=rows[0].get("bhawan_id"),
        token=token,
    )


async def require_secretary(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if user.role not in ("secretary", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Secretary access required")
    return user
