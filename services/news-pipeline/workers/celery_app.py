"""
Celery application configuration.

Usage:
    # Start worker (all pipeline tasks):
    celery -A workers.celery_app worker -Q scraper_queue,rewriter_queue,image_search_queue,default -l INFO

    # ⚠️  Do NOT start celery beat — scheduled runs are managed by the
    #     publisher's built-in scheduler via the admin dashboard.
"""

from __future__ import annotations

import sys
from pathlib import Path

from celery import Celery

# Ensure project root is on the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.settings import get_settings

settings = get_settings()

app = Celery(
    "news_pipeline",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks"],
)

# ── Celery configuration ────────────────────────────────────────

app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task routing
    task_routes={
        "workers.tasks.discover_feeds": {"queue": "default"},
        "workers.tasks.discover_crawl": {"queue": "default"},
        "workers.tasks.scrape_article_task": {"queue": "scraper_queue"},
        "workers.tasks.rewrite_article_task": {"queue": "rewriter_queue"},
        "workers.tasks.search_images_task": {"queue": "image_search_queue"},
    },

    # Reliability defaults
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Global time limits (safety net — per-task overrides in tasks.py)
    task_soft_time_limit=300,   # 5 min soft limit (raises SoftTimeLimitExceeded)
    task_time_limit=360,        # 6 min hard kill
    result_expires=3600,        # Clean up results after 1 hour

    # ── Beat schedule: EMPTY — do not add entries here. ──────────
    # All scheduled pipeline runs are controlled by the publisher's
    # scheduler (admin dashboard → Config → Scheduled Runs).
    # Adding beat entries here causes phantom scraping because
    # beat runs independently and ignores dashboard settings.
    beat_schedule={},
)
