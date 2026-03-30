"""
Publisher Service — FastAPI application.
Review, edit, approve, and publish pipeline articles to Notion.
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import articles, backup, images, pipeline, publish, youtube

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


@app.on_event("startup")
async def create_tables():
    """Auto-create database tables if they don't exist."""
    from .models import Base
    from .database import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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
# Mount it LAST so API routes take priority.
# Only active in Docker (FRONTEND_DIST_DIR must be explicitly set).
_frontend_dist_env = os.getenv("FRONTEND_DIST_DIR")
if _frontend_dist_env:
    _frontend_dist = Path(_frontend_dist_env)
    if (_frontend_dist / "index.html").is_file():
        from fastapi.responses import FileResponse

        # Serve static assets (JS, CSS, images)
        _assets_dir = _frontend_dist / "assets"
        if _assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

        # Catch-all: serve specific static files or index.html for SPA routing
        @app.get("/{path:path}")
        async def serve_spa(path: str):
            """Serve the SPA frontend for any non-API route, allowing root static files."""
            file_path = _frontend_dist / path
            if file_path.is_file():
                return FileResponse(str(file_path))
            # Don't return index.html for missing static files to prevent browser parsing errors
            if path.endswith((".ico", ".svg", ".png", ".jpg", ".css", ".js", ".map")):
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="File not found")
            return FileResponse(str(_frontend_dist / "index.html"))
