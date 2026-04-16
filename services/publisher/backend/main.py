"""
Publisher Service — FastAPI application.
Review, edit, approve, and publish pipeline articles to Notion.
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import articles, backup, images, pipeline, publish, youtube, ads

app = FastAPI(
    title="Publisher Service",
    description="Review and publish pipeline articles to Notion",
    version="0.1.0",
)

# CORS — allow frontend dev server + production origins
_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# Allow Cloud Run / custom domains via env var
if os.getenv("ALLOWED_ORIGINS"):
    _origins.extend(os.getenv("ALLOWED_ORIGINS", "").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(articles.router)
app.include_router(publish.router)
app.include_router(images.router)
app.include_router(pipeline.router)
app.include_router(backup.router)
app.include_router(youtube.router)
app.include_router(ads.router)


@app.on_event("startup")
async def create_tables():
    """Auto-create database tables if they don't exist."""
    from .models import Base
    from .database import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.on_event("startup")
async def start_background_tasks():
    """Start watchdog and auto-publisher loops on app boot."""
    from .routers.pipeline import _ensure_watchdog
    _ensure_watchdog()  # This also starts _ensure_auto_publisher()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "publisher"}


@app.get("/api/backup/drive/auth/callback")
async def drive_auth_callback(code: str, state: str = ""):
    """Handle Google's OAuth2 redirect — no auth required (Google redirects here)."""
    from fastapi.responses import HTMLResponse
    from .gdrive import complete_auth

    result = complete_auth(auth_code=code, state=state)
    if "error" in result:
        return HTMLResponse(f"<h2>❌ {result['error']}</h2>", status_code=400)

    return HTMLResponse(
        "<html><body style='font-family:system-ui;text-align:center;padding:60px'>"
        "<h1>✅ Google Drive Connected</h1>"
        "<p style='color:#666'>You can close this tab and return to the publisher.</p>"
        "<script>setTimeout(()=>window.close(),3000)</script>"
        "</body></html>"
    )


# ── Serve frontend static files in production ────────────────
# When deployed in Docker, the built frontend lives at /app/frontend-dist/
# Only active in Docker (FRONTEND_DIST_DIR must be explicitly set).
_frontend_dist_env = os.getenv("FRONTEND_DIST_DIR")
if _frontend_dist_env:
    _frontend_dist = Path(_frontend_dist_env)
    if (_frontend_dist / "index.html").is_file():
        from starlette.responses import FileResponse as StarletteFileResponse
        from starlette.middleware.base import BaseHTTPMiddleware
        from starlette.requests import Request as StarletteRequest

        # Serve static assets (JS, CSS, images)
        _assets_dir = _frontend_dist / "assets"
        if _assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

        class SPAMiddleware(BaseHTTPMiddleware):
            """Serve the SPA frontend for non-API GET requests that don't match a route."""
            async def dispatch(self, request: StarletteRequest, call_next):
                response = await call_next(request)

                # Only intercept 404s for GET requests on non-API paths
                if (
                    response.status_code == 404
                    and request.method == "GET"
                    and not request.url.path.startswith("/api/")
                    and request.url.path != "/health"
                ):
                    path = request.url.path.lstrip("/")
                    # Try serving a static file from frontend-dist
                    file_path = _frontend_dist / path
                    if path and file_path.is_file():
                        return StarletteFileResponse(str(file_path))
                    # Don't serve index.html for missing static assets
                    if path.endswith((".ico", ".svg", ".png", ".jpg", ".css", ".js", ".map")):
                        return response
                    # SPA fallback — serve index.html
                    return StarletteFileResponse(str(_frontend_dist / "index.html"))

                return response

        app.add_middleware(SPAMiddleware)
