"""
SQLAlchemy async models for pipeline state tracking.

Three tables:
  - processed_urls: deduplication of discovered URLs
  - raw_articles: scraped article content before rewriting
  - articles: final rewritten articles with editorial review state
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    ARRAY,
    CHAR,
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Declarative base for all models."""
    pass


class ProcessedURL(Base):
    """Tracks all discovered URLs for deduplication."""

    __tablename__ = "processed_urls"

    url_hash = Column(CHAR(64), primary_key=True, comment="SHA-256 hash of the URL")
    url = Column(Text, nullable=False)
    source_name = Column(Text, nullable=False)
    first_seen_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    def __repr__(self) -> str:
        return f"<ProcessedURL hash={self.url_hash[:12]}… source={self.source_name}>"


class RawArticle(Base):
    """Scraped article content — before LLM rewriting."""

    __tablename__ = "raw_articles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    url = Column(Text, unique=True, nullable=False)
    url_hash = Column(CHAR(64), nullable=False)
    source_name = Column(Text, nullable=False)
    source_type = Column(Text, nullable=False, comment="rss | crawl")
    category = Column(Text)
    title = Column(Text)
    author = Column(Text)
    published_at = Column(DateTime(timezone=True))
    body_text = Column(Text)
    word_count = Column(Integer)
    language = Column(CHAR(2))
    original_images = Column(JSON, comment="Array of image objects from scraper")
    scrape_path = Column(Text, comment="fast | playwright")
    status = Column(
        Text,
        nullable=False,
        default="new",
        comment="new | scraped | scrape_failed | paywall | processing | done | discarded",
    )
    scraped_at = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    articles = relationship("Article", back_populates="raw_article")

    def __repr__(self) -> str:
        return f"<RawArticle id={self.id} title={self.title!r:.40} status={self.status}>"


class Article(Base):
    """Final rewritten article — tracks editorial review and publish state."""

    __tablename__ = "articles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    raw_article_id = Column(
        UUID(as_uuid=True),
        ForeignKey("raw_articles.id"),
        nullable=False,
    )
    title = Column(Text)
    body = Column(Text, comment="Rewritten body in Markdown")
    summary = Column(Text)
    perspective = Column(Text)
    reading_time_minutes = Column(Integer)
    category = Column(Text)
    tags = Column(ARRAY(Text))
    image_keywords = Column(ARRAY(Text))
    inline_image_keywords = Column(ARRAY(Text), comment="Per-placeholder inline image search keywords")
    original_images = Column(JSON)
    searched_images = Column(JSON)
    source_url = Column(Text)
    source_outlet = Column(Text)
    source_author = Column(Text)
    source_published_at = Column(DateTime(timezone=True))
    rewrite_model = Column(Text, default="claude-sonnet-4-6")
    output_language = Column(CHAR(2), nullable=False, default="vi", server_default="vi",
                             comment="ISO 639-1 code of the output language")
    selected_image = Column(JSON, comment="Editor-selected hero image object")
    slug = Column(Text, comment="URL-friendly slug for the article")
    notion_page_id = Column(Text)
    published_to_notion_at = Column(DateTime(timezone=True))
    status = Column(
        Text,
        nullable=False,
        default="image_pending",
        comment="image_pending | draft | approved | published | rejected | rewrite_failed",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    raw_article = relationship("RawArticle", back_populates="articles")

    def __repr__(self) -> str:
        return f"<Article id={self.id} title={self.title!r:.40} status={self.status}>"
