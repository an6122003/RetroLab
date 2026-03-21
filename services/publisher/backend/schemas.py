"""
Pydantic v2 schemas for API request / response serialization.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Response schemas ──────────────────────────────────────────


class RawArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    source_name: str
    source_type: str
    title: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    raw_article_id: UUID
    title: Optional[str] = None
    body: Optional[str] = None
    summary: Optional[str] = None
    perspective: Optional[str] = None
    reading_time_minutes: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    image_keywords: Optional[list[str]] = None
    original_images: Optional[Any] = None
    searched_images: Optional[Any] = None
    source_url: Optional[str] = None
    source_outlet: Optional[str] = None
    source_author: Optional[str] = None
    source_published_at: Optional[datetime] = None
    rewrite_model: Optional[str] = None
    output_language: str = "vi"
    selected_image: Optional[Any] = None
    slug: Optional[str] = None
    notion_page_id: Optional[str] = None
    published_to_notion_at: Optional[datetime] = None
    status: str
    created_at: datetime


class ArticleListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    source_outlet: Optional[str] = None
    output_language: str = "vi"
    status: str
    created_at: datetime
    selected_image: Optional[Any] = None
    searched_images: Optional[Any] = None
    original_images: Optional[Any] = None
    slug: Optional[str] = None
    reading_time_minutes: Optional[int] = None
    rewrite_model: Optional[str] = None


# ── Request schemas ───────────────────────────────────────────


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    summary: Optional[str] = None
    perspective: Optional[str] = None
    tags: Optional[list[str]] = None
    category: Optional[str] = None
    selected_image: Optional[Any] = None
    slug: Optional[str] = None
    source_author: Optional[str] = None
    searched_images: Optional[Any] = None
    status: Optional[str] = None


# ── Stats ─────────────────────────────────────────────────────


class StatsOut(BaseModel):
    draft: int = 0
    approved: int = 0
    published: int = 0
    rejected: int = 0
