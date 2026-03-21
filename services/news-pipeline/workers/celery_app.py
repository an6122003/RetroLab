"""
Celery application configuration + beat schedule.

Usage:
    # Start worker (all pipeline tasks):
    celery -A workers.celery_app worker -Q scraper_queue,rewriter_queue,image_search_queue,default -l INFO

    # Start beat scheduler (discovery every 30 min):
    celery -A workers.celery_app beat -l INFO
"""

from __future__ import annotations

import sys
from pathlib import Path

from celery import Celery
from celery.schedules import crontab

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

    # Retry defaults
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Beat schedule
    beat_schedule={
        "discover-rss-feeds": {
            "task": "workers.tasks.discover_feeds",
            "schedule": settings.discovery_interval_minutes * 60.0,  # seconds
            "options": {"queue": "default"},
        },
        "discover-crawl-pages": {
            "task": "workers.tasks.discover_crawl",
            "schedule": settings.discovery_interval_minutes * 60.0,
            "options": {"queue": "default"},
        },
    },
)
