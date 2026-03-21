"""
Article CRUD endpoints — list, detail, update, approve, reject.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Article
from ..schemas import ArticleListOut, ArticleOut, ArticleUpdate, StatsOut

router = APIRouter(prefix="/api", tags=["articles"])


@router.get("/articles", response_model=list[ArticleListOut])
async def list_articles(
    status: str | None = Query(None),
    source: str | None = Query(None, description="'composer' for manual, 'pipeline' for automated"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List articles with optional status and source filter."""
    from ..models import RawArticle
    q = select(Article).order_by(Article.created_at.desc())
    if status:
        q = q.where(Article.status == status)
    if source == "composer":
        q = q.join(RawArticle, Article.raw_article_id == RawArticle.id).where(
            RawArticle.source_name == "composer"
        )
    elif source == "pipeline":
        q = q.join(RawArticle, Article.raw_article_id == RawArticle.id).where(
            RawArticle.source_name != "composer"
        )
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/articles/{article_id}", response_model=ArticleOut)
async def get_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single article by ID with full detail."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.patch("/articles/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: UUID,
    payload: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update editable fields on an article."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return article

    for key, value in update_data.items():
        setattr(article, key, value)

    await db.commit()
    await db.refresh(article)
    return article


@router.post("/articles/{article_id}/approve", response_model=ArticleOut)
async def approve_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Approve an article — requires selected_image and slug to be set."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if not article.slug:
        raise HTTPException(status_code=400, detail="Slug must be set before approval")
    if not article.selected_image:
        raise HTTPException(status_code=400, detail="Image must be selected before approval")

    article.status = "approved"
    await db.commit()
    await db.refresh(article)
    return article


@router.post("/articles/{article_id}/reject", response_model=ArticleOut)
async def reject_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Reject an article."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.status = "rejected"
    await db.commit()
    await db.refresh(article)
    return article


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an article (and its raw_article if exists)."""
    from ..models import RawArticle

    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Also delete associated raw_article
    if article.raw_article_id:
        raw_result = await db.execute(
            select(RawArticle).where(RawArticle.id == article.raw_article_id)
        )
        raw = raw_result.scalar_one_or_none()
        if raw:
            await db.delete(raw)

    await db.delete(article)
    await db.commit()
    return {"status": "deleted", "id": str(article_id)}


@router.get("/stats", response_model=StatsOut)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Return counts by status."""
    result = await db.execute(
        select(Article.status, func.count(Article.id)).group_by(Article.status)
    )
    counts = {row[0]: row[1] for row in result.all()}
    return StatsOut(
        draft=counts.get("draft", 0),
        approved=counts.get("approved", 0),
        published=counts.get("published", 0),
        rejected=counts.get("rejected", 0),
    )


@router.get("/finops")
async def get_finops(db: AsyncSession = Depends(get_db)):
    """
    FinOps dashboard — aggregate LLM usage, estimated tokens, and costs.

    Derives everything from existing article data:
    - Per-model article counts
    - Estimated tokens (body length ÷ 4 for input, output similar)
    - Estimated costs using known API pricing
    - Daily breakdown for the last 30 days
    """
    from sqlalchemy import cast, Date, text
    from datetime import datetime, timedelta, timezone

    # ── Per-model aggregation ──
    model_stats_q = await db.execute(
        select(
            Article.rewrite_model,
            func.count(Article.id).label("count"),
            func.sum(func.length(Article.body)).label("total_body_chars"),
            func.avg(func.length(Article.body)).label("avg_body_chars"),
        )
        .where(Article.rewrite_model.isnot(None))
        .group_by(Article.rewrite_model)
    )
    model_rows = model_stats_q.all()

    # Known pricing per 1M tokens (approximate)
    PRICING = {
        "gemini":    {"input": 0.075, "output": 0.30},   # Gemini 2.0 Flash
        "anthropic": {"input": 3.00,  "output": 15.00},  # Claude Sonnet
        "ollama":    {"input": 0.00,  "output": 0.00},   # Local — free
    }

    def _resolve_provider(model_str: str) -> str:
        if not model_str:
            return "unknown"
        m = model_str.lower()
        if m.startswith("ollama") or "ollama" in m:
            return "ollama"
        if m.startswith("gemini") or "gemini" in m:
            return "gemini"
        if m.startswith("anthropic") or "claude" in m:
            return "anthropic"
        return "unknown"

    models = []
    total_articles = 0
    total_estimated_tokens = 0
    total_estimated_cost = 0.0

    for row in model_rows:
        model_name = row.rewrite_model or "unknown"
        count = row.count
        total_chars = row.total_body_chars or 0
        avg_chars = row.avg_body_chars or 0

        # Token estimation: ~4 chars per token for English/Vietnamese
        # Input: source article ~= output length, Output: rewritten body
        est_output_tokens = total_chars // 4
        est_input_tokens = int(est_output_tokens * 1.5)  # source is typically larger
        est_total = est_input_tokens + est_output_tokens

        provider = _resolve_provider(model_name)
        pricing = PRICING.get(provider, PRICING["ollama"])
        est_cost = (
            (est_input_tokens / 1_000_000) * pricing["input"] +
            (est_output_tokens / 1_000_000) * pricing["output"]
        )

        models.append({
            "model": model_name,
            "provider": provider,
            "count": count,
            "total_chars": total_chars,
            "avg_chars_per_article": int(avg_chars),
            "est_input_tokens": est_input_tokens,
            "est_output_tokens": est_output_tokens,
            "est_total_tokens": est_total,
            "est_cost_usd": round(est_cost, 4),
        })

        total_articles += count
        total_estimated_tokens += est_total
        total_estimated_cost += est_cost

    # ── Daily breakdown (last 30 days) ──
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    daily_q = await db.execute(
        select(
            cast(Article.created_at, Date).label("date"),
            Article.rewrite_model,
            func.count(Article.id).label("count"),
            func.sum(func.length(Article.body)).label("total_chars"),
        )
        .where(Article.created_at >= cutoff)
        .where(Article.rewrite_model.isnot(None))
        .group_by(cast(Article.created_at, Date), Article.rewrite_model)
        .order_by(cast(Article.created_at, Date))
    )
    daily_rows = daily_q.all()

    daily = []
    for row in daily_rows:
        chars = row.total_chars or 0
        est_out = chars // 4
        est_in = int(est_out * 1.5)
        provider = _resolve_provider(row.rewrite_model or "")
        pricing = PRICING.get(provider, PRICING["ollama"])
        cost = (est_in / 1_000_000) * pricing["input"] + (est_out / 1_000_000) * pricing["output"]

        daily.append({
            "date": str(row.date),
            "model": row.rewrite_model or "unknown",
            "provider": provider,
            "count": row.count,
            "est_tokens": est_in + est_out,
            "est_cost_usd": round(cost, 4),
        })

    # ── Provider summary ──
    provider_summary: dict[str, dict] = {}
    for m in models:
        p = m["provider"]
        if p not in provider_summary:
            provider_summary[p] = {"count": 0, "est_tokens": 0, "est_cost_usd": 0.0}
        provider_summary[p]["count"] += m["count"]
        provider_summary[p]["est_tokens"] += m["est_total_tokens"]
        provider_summary[p]["est_cost_usd"] = round(
            provider_summary[p]["est_cost_usd"] + m["est_cost_usd"], 4
        )

    return {
        "total_articles": total_articles,
        "total_estimated_tokens": total_estimated_tokens,
        "total_estimated_cost_usd": round(total_estimated_cost, 4),
        "models": sorted(models, key=lambda x: x["count"], reverse=True),
        "providers": provider_summary,
        "daily": daily,
    }
