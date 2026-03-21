"""
Review API — minimal FastAPI application for article review.

Endpoints:
    GET   /articles          — list articles (filterable by status)
    GET   /articles/{id}     — get single article
    PATCH /articles/{id}     — update article fields (status, slug, selected_image, etc.)
    GET   /health            — health check with draft count
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure project root is on the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.crud import count_articles_by_status, get_article, list_articles, update_article

# ── App setup ────────────────────────────────────────────────────

app = FastAPI(
    title="News Pipeline — Review API",
    description="Review and manage pipeline-generated articles",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ────────────────────────────────────

class ArticlePatch(BaseModel):
    """Patchable article fields."""
    status: str | None = None
    selected_image: dict[str, Any] | None = None
    slug: str | None = None
    title: str | None = None
    body: str | None = None
    summary: str | None = None
    perspective: str | None = None
    category: str | None = None
    tags: list[str] | None = None


class HealthResponse(BaseModel):
    status: str
    draft_count: int


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/articles")
async def list_articles_endpoint(
    status: str | None = Query(None, description="Filter by status (e.g. 'draft')"),
    limit: int = Query(20, ge=1, le=100, description="Max articles to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> list[dict[str, Any]]:
    """
    List articles, newest first. Optionally filter by status.
    """
    articles = await list_articles(status=status, limit=limit, offset=offset)
    return articles


@app.get("/articles/{article_id}")
async def get_article_endpoint(article_id: str) -> dict[str, Any]:
    """
    Get a single article by ID.
    """
    article = await get_article(article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@app.patch("/articles/{article_id}")
async def patch_article_endpoint(
    article_id: str,
    patch: ArticlePatch,
) -> dict[str, Any]:
    """
    Update article fields. Only non-null fields in the request body are applied.
    """
    # Verify article exists
    existing = await get_article(article_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Article not found")

    # Validate status transitions
    valid_statuses = {"image_pending", "draft", "approved", "published", "rejected", "rewrite_failed"}
    if patch.status and patch.status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{patch.status}'. Valid: {sorted(valid_statuses)}",
        )

    # Build update dict from non-None fields
    update_data = patch.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    await update_article(article_id, update_data)

    # Return updated article
    updated = await get_article(article_id)
    return updated  # type: ignore[return-value]


@app.get("/health")
async def health_check() -> HealthResponse:
    """
    Health check endpoint. Returns OK status and count of draft articles.
    """
    draft_count = await count_articles_by_status("draft")
    return HealthResponse(status="ok", draft_count=draft_count)
