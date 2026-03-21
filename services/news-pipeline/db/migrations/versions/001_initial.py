"""Initial schema — processed_urls, raw_articles, articles

Revision ID: 001_initial
Revises:
Create Date: 2026-03-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── processed_urls ──────────────────────────────────────────
    op.create_table(
        "processed_urls",
        sa.Column("url_hash", sa.CHAR(64), primary_key=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── raw_articles ────────────────────────────────────────────
    op.create_table(
        "raw_articles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("url", sa.Text(), unique=True, nullable=False),
        sa.Column("url_hash", sa.CHAR(64), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("category", sa.Text()),
        sa.Column("title", sa.Text()),
        sa.Column("author", sa.Text()),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("body_text", sa.Text()),
        sa.Column("word_count", sa.Integer()),
        sa.Column("language", sa.CHAR(2)),
        sa.Column("original_images", postgresql.JSONB()),
        sa.Column("scrape_path", sa.Text()),
        sa.Column("status", sa.Text(), nullable=False, server_default="new"),
        sa.Column("scraped_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_raw_articles_url_hash", "raw_articles", ["url_hash"])
    op.create_index("ix_raw_articles_status", "raw_articles", ["status"])

    # ── articles ────────────────────────────────────────────────
    op.create_table(
        "articles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "raw_article_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("raw_articles.id"),
            nullable=False,
        ),
        sa.Column("title", sa.Text()),
        sa.Column("body", sa.Text()),
        sa.Column("summary", sa.Text()),
        sa.Column("perspective", sa.Text()),
        sa.Column("reading_time_minutes", sa.Integer()),
        sa.Column("category", sa.Text()),
        sa.Column("tags", postgresql.ARRAY(sa.Text())),
        sa.Column("image_keywords", postgresql.ARRAY(sa.Text())),
        sa.Column("original_images", postgresql.JSONB()),
        sa.Column("searched_images", postgresql.JSONB()),
        sa.Column("source_url", sa.Text()),
        sa.Column("source_outlet", sa.Text()),
        sa.Column("source_author", sa.Text()),
        sa.Column("source_published_at", sa.DateTime(timezone=True)),
        sa.Column("rewrite_model", sa.Text()),
        sa.Column("output_language", sa.CHAR(2), nullable=False, server_default="vi"),
        sa.Column("selected_image", postgresql.JSONB()),
        sa.Column("slug", sa.Text()),
        sa.Column("notion_page_id", sa.Text()),
        sa.Column("published_to_notion_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.Text(), nullable=False, server_default="image_pending"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_articles_status", "articles", ["status"])
    op.create_index("ix_articles_raw_article_id", "articles", ["raw_article_id"])
    op.create_index("ix_articles_slug", "articles", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_table("articles")
    op.drop_table("raw_articles")
    op.drop_table("processed_urls")
