"""
Publisher Service — FastAPI application.
Review, edit, approve, and publish pipeline articles to Notion.
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import articles, backup, images, pipeline, publish

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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "publisher"}


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

        # Catch-all: serve index.html for SPA routing
        @app.get("/{path:path}")
        async def serve_spa(path: str):
            """Serve the SPA frontend for any non-API route."""
            return FileResponse(str(_frontend_dist / "index.html"))
