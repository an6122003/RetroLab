"""
Review API — FastAPI application for article review + curation.

Endpoints:
    # ── Rewritten articles ────────────────────────────────────
    GET   /articles              — list articles (filterable by status)
    GET   /articles/{id}         — get single article
    PATCH /articles/{id}         — update article fields

    # ── Raw article curation ──────────────────────────────────
    GET   /raw-articles          — list raw articles (filterable by status)
    GET   /raw-articles/{id}     — get single raw article
    POST  /raw-articles/approve  — approve selected → enqueue rewrite
    POST  /raw-articles/discard  — discard selected
    POST  /raw-articles/approve-all — approve all scraped
    POST  /raw-articles/discard-all — discard all scraped
    GET   /raw-articles/stats    — counts by status

    # ── Curation UI ───────────────────────────────────────────
    GET   /curation              — mobile-friendly curation dashboard

    # ── Health ────────────────────────────────────────────────
    GET   /health                — health check + draft/scraped counts
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Ensure project root is on the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.crud import (
    bulk_update_all_raw_articles_status,
    bulk_update_raw_articles_status,
    count_articles_by_status,
    count_raw_articles_by_status,
    get_article,
    get_raw_article,
    get_raw_article_ids_by_status,
    list_articles,
    list_raw_articles,
    update_article,
)

# ── App setup ────────────────────────────────────────────────────

app = FastAPI(
    title="News Pipeline — Review & Curation API",
    description="Review, curate, and manage pipeline-generated articles",
    version="0.2.0",
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


class BulkArticleAction(BaseModel):
    """Request body for bulk approve/discard."""
    ids: list[str]


class HealthResponse(BaseModel):
    status: str
    draft_count: int
    scraped_count: int


# ── Article endpoints (existing) ─────────────────────────────────

@app.get("/articles")
async def list_articles_endpoint(
    status: str | None = Query(None, description="Filter by status (e.g. 'draft')"),
    limit: int = Query(20, ge=1, le=100, description="Max articles to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> list[dict[str, Any]]:
    """List articles, newest first. Optionally filter by status."""
    articles = await list_articles(status=status, limit=limit, offset=offset)
    return articles


@app.get("/articles/{article_id}")
async def get_article_endpoint(article_id: str) -> dict[str, Any]:
    """Get a single article by ID."""
    article = await get_article(article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@app.patch("/articles/{article_id}")
async def patch_article_endpoint(
    article_id: str,
    patch: ArticlePatch,
) -> dict[str, Any]:
    """Update article fields. Only non-null fields in the request body are applied."""
    existing = await get_article(article_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Article not found")

    valid_statuses = {"image_pending", "draft", "approved", "published", "rejected", "rewrite_failed"}
    if patch.status and patch.status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{patch.status}'. Valid: {sorted(valid_statuses)}",
        )

    update_data = patch.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    await update_article(article_id, update_data)

    updated = await get_article(article_id)
    return updated  # type: ignore[return-value]


# ── Raw article curation endpoints ───────────────────────────────

@app.get("/raw-articles")
async def list_raw_articles_endpoint(
    status: str | None = Query(None, description="Filter by status (e.g. 'scraped')"),
    limit: int = Query(100, ge=1, le=200, description="Max articles to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> list[dict[str, Any]]:
    """List raw articles, newest first. Optionally filter by status."""
    articles = await list_raw_articles(status=status, limit=limit, offset=offset)
    return articles


@app.get("/raw-articles/stats")
async def raw_articles_stats_endpoint() -> dict[str, int]:
    """Get counts of raw articles by status."""
    scraped = await count_raw_articles_by_status("scraped")
    done = await count_raw_articles_by_status("done")
    processing = await count_raw_articles_by_status("processing")
    discarded = await count_raw_articles_by_status("discarded")
    scrape_failed = await count_raw_articles_by_status("scrape_failed")
    new = await count_raw_articles_by_status("new")
    return {
        "scraped": scraped,
        "done": done,
        "processing": processing,
        "discarded": discarded,
        "scrape_failed": scrape_failed,
        "new": new,
        "total_pending": scraped,
    }


@app.get("/raw-articles/{article_id}")
async def get_raw_article_endpoint(article_id: str) -> dict[str, Any]:
    """Get a single raw article by ID."""
    article = await get_raw_article(article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Raw article not found")
    return article


@app.post("/raw-articles/approve")
async def approve_raw_articles_endpoint(body: BulkArticleAction) -> dict[str, Any]:
    """
    Approve selected raw articles for rewriting.
    Sets status to 'processing' and enqueues each for rewrite.
    """
    if not body.ids:
        raise HTTPException(status_code=422, detail="No article IDs provided")

    # Mark as processing
    count = await bulk_update_raw_articles_status(body.ids, "processing")

    # Enqueue each for rewriting
    _enqueue_rewrites(body.ids)

    return {"approved": count, "enqueued": len(body.ids)}


@app.post("/raw-articles/discard")
async def discard_raw_articles_endpoint(body: BulkArticleAction) -> dict[str, Any]:
    """Discard selected raw articles — they won't be rewritten."""
    if not body.ids:
        raise HTTPException(status_code=422, detail="No article IDs provided")

    count = await bulk_update_raw_articles_status(body.ids, "discarded")
    return {"discarded": count}


@app.post("/raw-articles/approve-all")
async def approve_all_raw_articles_endpoint() -> dict[str, Any]:
    """Approve ALL scraped raw articles for rewriting."""
    # Get IDs first so we can enqueue
    ids = await get_raw_article_ids_by_status("scraped")
    count = await bulk_update_all_raw_articles_status("scraped", "processing")

    # Enqueue rewrites
    _enqueue_rewrites(ids)

    return {"approved": count, "enqueued": len(ids)}


@app.post("/raw-articles/discard-all")
async def discard_all_raw_articles_endpoint() -> dict[str, Any]:
    """Discard ALL scraped raw articles."""
    count = await bulk_update_all_raw_articles_status("scraped", "discarded")
    return {"discarded": count}


# ── Curation UI ──────────────────────────────────────────────────

@app.get("/curation", response_class=HTMLResponse)
async def curation_ui():
    """Serve the curation dashboard HTML."""
    static_dir = Path(__file__).parent / "static"
    html_file = static_dir / "curation.html"
    if not html_file.exists():
        raise HTTPException(status_code=404, detail="Curation UI not found")
    return HTMLResponse(content=html_file.read_text(encoding="utf-8"))


# ── Health ───────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> HealthResponse:
    """Health check endpoint. Returns OK status and counts."""
    draft_count = await count_articles_by_status("draft")
    scraped_count = await count_raw_articles_by_status("scraped")
    return HealthResponse(status="ok", draft_count=draft_count, scraped_count=scraped_count)


# ── Helper: enqueue rewrites ────────────────────────────────────

def _enqueue_rewrites(raw_article_ids: list[str]) -> None:
    """Enqueue rewrite tasks for a list of raw article IDs."""
    from workers.tasks import rewrite_article_task

    for raw_id in raw_article_ids:
        rewrite_article_task.delay(raw_id)
