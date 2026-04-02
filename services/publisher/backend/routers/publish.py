"""
Publish endpoint — pushes an approved article to Notion.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from ..auth import require_admin
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Article
from ..notion import push_to_notion
from ..schemas import ArticleOut

router = APIRouter(prefix="/api", tags=["publish"], dependencies=[Depends(require_admin)])


@router.post("/articles/{article_id}/publish", response_model=ArticleOut)
async def publish_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Publish an approved article to Notion."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Article must be approved before publishing (current: {article.status})",
        )

    try:
        notion_page_id = await push_to_notion(article)
    except Exception as exc:
        import logging
        logging.exception("Notion Publish Failed")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to push to Notion: {exc}",
        )

    article.notion_page_id = notion_page_id
    article.published_to_notion_at = datetime.now(timezone.utc)
    article.status = "published"
    await db.commit()
    await db.refresh(article)
    return article


@router.post("/articles/{article_id}/unpublish", response_model=ArticleOut)
async def unpublish_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Move a published article back to 'approved' so it can be re-published."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.status != "published":
        raise HTTPException(
            status_code=400,
            detail=f"Only published articles can be unpublished (current: {article.status})",
        )

    article.status = "approved"
    article.notion_page_id = None
    article.published_to_notion_at = None
    await db.commit()
    await db.refresh(article)
    return article
