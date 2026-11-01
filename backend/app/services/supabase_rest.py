from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import get_settings


class SupabaseRest:
    """Minimal PostgREST client that acts as the calling user.

    Every request carries the user's JWT, so Row Level Security applies
    exactly as it does for the frontend.
    """

    def __init__(self, token: str) -> None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_api_key:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, "Supabase is not configured on the server"
            )
        self.base = settings.supabase_url
        self.headers = {
            "apikey": settings.supabase_api_key,
            "Authorization": f"Bearer {token}",
        }

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        async with httpx.AsyncClient(timeout=10) as client:
            return await client.request(
                method,
                f"{self.base}{path}",
                headers={**self.headers, **kwargs.pop("headers", {})},
                **kwargs,
            )

    async def get_user(self) -> dict | None:
        res = await self._request("GET", "/auth/v1/user")
        return res.json() if res.status_code == 200 else None

    async def select(self, table: str, params: dict[str, str]) -> list[dict]:
        res = await self._request("GET", f"/rest/v1/{table}", params=params)
        if res.status_code != 200:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, f"Could not read {table}: {res.text[:200]}"
            )
        return res.json()

    async def insert(self, table: str, rows: dict | list[dict]) -> list[dict]:
        res = await self._request(
            "POST",
            f"/rest/v1/{table}",
            json=rows,
            headers={"Prefer": "return=representation"},
        )
        if res.status_code not in (200, 201):
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, f"Could not write {table}: {res.text[:200]}"
            )
        return res.json()
