"""
CRUD helper functions for pipeline state tracking.

All functions use async SQLAlchemy sessions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config.settings import get_settings
from db.models import Article, Base, ProcessedURL, RawArticle

logger = structlog.get_logger(__name__)

# ── Engine & session factory ────────────────────────────────────

_engine = None


def get_engine():
    """Get the async engine singleton."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        get_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def init_db() -> None:
    """Create all tables (for development; use Alembic in production)."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── ProcessedURL operations ─────────────────────────────────────

async def is_url_processed(url_hash: str) -> bool:
    """Check if a URL hash exists in the processed_urls table."""
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(ProcessedURL).where(ProcessedURL.url_hash == url_hash).limit(1)
        )
        return result.scalar_one_or_none() is not None


async def mark_url_processed(url_hash: str, url: str, source_name: str) -> None:
    """Insert a URL into the processed_urls table (idempotent)."""
    factory = get_session_factory()
    async with factory() as session:
        # Check if already exists (idempotent)
        existing = await session.execute(
            select(ProcessedURL).where(ProcessedURL.url_hash == url_hash).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            return

        entry = ProcessedURL(
            url_hash=url_hash,
            url=url,
            source_name=source_name,
        )
        session.add(entry)
        await session.commit()


# ── RawArticle operations ───────────────────────────────────────

async def create_raw_article(data: dict[str, Any]) -> str:
    """
    Insert a new raw article and return its UUID as string.
    Idempotent: if the URL already exists, return the existing ID.
    """
    factory = get_session_factory()
    async with factory() as session:
        # Check for existing by URL
        existing = await session.execute(
            select(RawArticle).where(RawArticle.url == data["url"]).limit(1)
        )
        row = existing.scalar_one_or_none()
        if row is not None:
            return str(row.id)

        article = RawArticle(
            url=data["url"],
            url_hash=data.get("url_hash", ""),
            source_name=data.get("source_name", ""),
            source_type=data.get("source_type", "rss"),
            category=data.get("category"),
            title=data.get("title"),
            author=data.get("author"),
            published_at=data.get("published_at"),
            body_text=data.get("body_text"),
            word_count=data.get("word_count"),
            language=data.get("language"),
            original_images=data.get("original_images"),
            scrape_path=data.get("scrape_path"),
            status=data.get("status", "new"),
            scraped_at=data.get("scraped_at"),
        )
        session.add(article)
        await session.commit()
        await session.refresh(article)
        return str(article.id)


async def update_raw_article(article_id: str, data: dict[str, Any]) -> None:
    """Update fields on an existing raw article."""
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(RawArticle).where(RawArticle.id == uuid.UUID(article_id))
        )
        article = result.scalar_one_or_none()
        if article is None:
            logger.warning("raw_article_not_found", article_id=article_id)
            return

        for key, value in data.items():
            if hasattr(article, key):
                setattr(article, key, value)

        await session.commit()


async def get_raw_article(article_id: str) -> dict[str, Any] | None:
    """Fetch a raw article by ID."""
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(RawArticle).where(RawArticle.id == uuid.UUID(article_id))
        )
        article = result.scalar_one_or_none()
        if article is None:
            return None

        return {
            "id": str(article.id),
            "url": article.url,
            "url_hash": article.url_hash,
            "source_name": article.source_name,
            "source_type": article.source_type,
            "category": article.category,
            "title": article.title,
            "author": article.author,
            "published_at": article.published_at,
            "body_text": article.body_text,
            "word_count": article.word_count,
            "language": article.language,
            "original_images": article.original_images,
            "scrape_path": article.scrape_path,
            "status": article.status,
            "scraped_at": article.scraped_at,
            "created_at": article.created_at,
        }


# ── Article operations ──────────────────────────────────────────

async def create_article(data: dict[str, Any]) -> str:
    """Insert a new (rewritten) article and return its UUID as string."""
    factory = get_session_factory()
    async with factory() as session:
        # Idempotent: check by raw_article_id
        existing = await session.execute(
            select(Article).where(
                Article.raw_article_id == uuid.UUID(data["raw_article_id"])
            ).limit(1)
        )
        row = existing.scalar_one_or_none()
        if row is not None:
            return str(row.id)

        article = Article(
            raw_article_id=uuid.UUID(data["raw_article_id"]),
            title=data.get("title"),
            body=data.get("body"),
            summary=data.get("summary"),
            perspective=data.get("perspective"),
            reading_time_minutes=data.get("reading_time_minutes"),
            category=data.get("category"),
            tags=data.get("tags"),
            image_keywords=data.get("image_keywords"),
            original_images=data.get("original_images"),
            searched_images=data.get("searched_images"),
            source_url=data.get("source_url"),
            source_outlet=data.get("source_outlet"),
            source_author=data.get("source_author"),
            source_published_at=data.get("source_published_at"),
            rewrite_model=data.get("rewrite_model", "claude-sonnet-4-6"),
            status=data.get("status", "image_pending"),
        )
        session.add(article)
        await session.commit()
        await session.refresh(article)
        return str(article.id)


async def update_article(article_id: str, data: dict[str, Any]) -> None:
    """Update fields on a rewritten article."""
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(Article).where(Article.id == uuid.UUID(article_id))
        )
        article = result.scalar_one_or_none()
        if article is None:
            logger.warning("article_not_found", article_id=article_id)
            return

        for key, value in data.items():
            if hasattr(article, key):
                setattr(article, key, value)

        await session.commit()


async def get_article(article_id: str) -> dict[str, Any] | None:
    """Fetch a rewritten article by ID."""
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(Article).where(Article.id == uuid.UUID(article_id))
        )
        article = result.scalar_one_or_none()
        if article is None:
            return None

        return _serialize_article(article)


def _serialize_article(article: Article) -> dict[str, Any]:
    """Convert an Article ORM object to a dict."""
    return {
        "id": str(article.id),
        "raw_article_id": str(article.raw_article_id),
        "title": article.title,
        "body": article.body,
        "summary": article.summary,
        "perspective": article.perspective,
        "reading_time_minutes": article.reading_time_minutes,
        "category": article.category,
        "tags": article.tags,
        "image_keywords": article.image_keywords,
        "original_images": article.original_images,
        "searched_images": article.searched_images,
        "selected_image": article.selected_image,
        "slug": article.slug,
        "source_url": article.source_url,
        "source_outlet": article.source_outlet,
        "source_author": article.source_author,
        "source_published_at": article.source_published_at,
        "rewrite_model": article.rewrite_model,
        "output_language": article.output_language,
        "notion_page_id": article.notion_page_id,
        "published_to_notion_at": article.published_to_notion_at,
        "status": article.status,
        "created_at": article.created_at,
    }


async def list_articles(
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    List articles, newest first. Optionally filter by status.
    """
    factory = get_session_factory()
    async with factory() as session:
        query = select(Article).order_by(Article.created_at.desc())

        if status:
            query = query.where(Article.status == status)

        query = query.limit(limit).offset(offset)
        result = await session.execute(query)
        articles = result.scalars().all()
        return [_serialize_article(a) for a in articles]


async def count_articles_by_status(status: str) -> int:
    """Count articles with a given status."""
    from sqlalchemy import func

    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(func.count()).select_from(Article).where(Article.status == status)
        )
        return result.scalar() or 0
