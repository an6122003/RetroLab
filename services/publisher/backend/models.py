"""
SQLAlchemy models — mirrors the pipeline's existing tables.
Read + update: articles
Read-only:     raw_articles

DO NOT run Alembic migrations from this service.
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


class RawArticle(Base):
    """Scraped article content — read-only from publisher."""

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
    source_type = Column(Text, nullable=False)
    category = Column(Text)
    title = Column(Text)
    author = Column(Text)
    published_at = Column(DateTime(timezone=True))
    body_text = Column(Text)
    word_count = Column(Integer)
    language = Column(CHAR(2))
    original_images = Column(JSON)
    scrape_path = Column(Text)
    status = Column(Text, nullable=False, default="new")
    scraped_at = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        default=lambda: datetime.now(timezone.utc),
    )

    articles = relationship("Article", back_populates="raw_article")


class Article(Base):
    """Final rewritten article — editorial review and publish state."""

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
    body = Column(Text)
    summary = Column(Text)
    perspective = Column(Text)
    reading_time_minutes = Column(Integer)
    category = Column(Text)
    tags = Column(ARRAY(Text))
    image_keywords = Column(ARRAY(Text))
    inline_image_keywords = Column(ARRAY(Text))
    original_images = Column(JSON)
    searched_images = Column(JSON)
    source_url = Column(Text)
    source_outlet = Column(Text)
    source_author = Column(Text)
    source_published_at = Column(DateTime(timezone=True))
    rewrite_model = Column(Text, default="claude-sonnet-4-6")
    output_language = Column(
        CHAR(2), nullable=False, default="vi", server_default="vi"
    )
    selected_image = Column(JSON)
    slug = Column(Text)
    notion_page_id = Column(Text)
    published_to_notion_at = Column(DateTime(timezone=True))
    status = Column(Text, nullable=False, default="image_pending")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        default=lambda: datetime.now(timezone.utc),
    )

    raw_article = relationship("RawArticle", back_populates="articles")
