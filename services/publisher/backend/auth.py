"""
Admin authentication dependency — verifies Supabase JWT and checks admin email allowlist.

Usage in any router:
    from ..auth import require_admin
    
    @router.post("/articles/{id}/publish")
    async def publish(id: UUID, user=Depends(require_admin)):
        ...
"""

from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .settings import settings

_bearer = HTTPBearer(auto_error=False)


async def _get_supabase_user(token: str) -> dict:
    """Call Supabase's /auth/v1/user endpoint to validate the JWT and get user info."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_ANON_KEY,
            },
            timeout=10,
        )
    if resp.status_code != 200:
        return {}
    return resp.json()


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """
    FastAPI dependency — extracts Bearer token, validates with Supabase, 
    and checks the user's email is in ADMIN_EMAILS.
    
    Returns the Supabase user dict on success.
    Raises 401/403 on failure.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    user = await _get_supabase_user(credentials.credentials)
    if not user or not user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    email = user["email"].lower()
    if email not in settings.admin_emails_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied — {email} is not an admin",
        )

    return user
