"""
Stage 1 — Mode A: RSS / Atom feed polling.

Loads RSS-type sources from sources.yaml, fetches each feed,
hashes entry URLs (SHA-256), deduplicates via processed_urls table,
and enqueues new URLs for scraping.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

import feedparser
import httpx
import structlog

from config.settings import get_enabled_sources, get_settings
from db.crud import is_url_processed, mark_url_processed

logger = structlog.get_logger(__name__)


def hash_url(url: str) -> str:
    """Return the SHA-256 hex digest of a URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


async def poll_feeds(source_tags: list[str] | None = None) -> list[dict[str, Any]]:
    """
    Poll all enabled RSS sources and return a list of new article dicts
    ready for the scraper queue.

    Uses round-robin collection (1 per source per pass) to ensure
    diversity across sources, instead of draining one source first.
    
    Args:
        source_tags: Optional list of tags to filter sources. Only sources
                     with at least one matching tag are polled.
    """
    import random

    settings = get_settings()
    sources = get_enabled_sources(source_type="rss")
    
    # Filter by tags if provided
    if source_tags:
        tag_set = set(source_tags)
        sources = [s for s in sources if tag_set.intersection(s.get("tags", []))]
    
    # Randomize source order if enabled
    if settings.randomize_sources:
        random.shuffle(sources)

    max_per_run = settings.max_articles_per_run
    max_per_source = settings.max_articles_per_source

    # ── Phase 1: Fetch all feeds in parallel ──────────────────
    source_entries: list[tuple[dict, list]] = []

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for source in sources:
            source_name = source["name"]
            feed_url = source["url"]
            try:
                resp = await client.get(feed_url)
                resp.raise_for_status()
                feed = feedparser.parse(resp.text)
                entries = list(feed.entries)
                # Randomize entries within each source if enabled
                if settings.randomize_sources:
                    random.shuffle(entries)
                source_entries.append((source, entries))
            except Exception:
                logger.exception("feed_fetch_failed", source_name=source_name, url=feed_url)
                continue

    # ── Phase 2: Round-robin pick 1 per source per pass ───────
    new_articles: list[dict[str, Any]] = []
    # Track index per source and count per source
    source_idx = [0] * len(source_entries)
    source_count = [0] * len(source_entries)

    while len(new_articles) < max_per_run:
        added_this_round = False
        for si, (source, entries) in enumerate(source_entries):
            if len(new_articles) >= max_per_run:
                break
            # Skip sources that have reached their per-source limit
            if source_count[si] >= max_per_source:
                continue
            while source_idx[si] < len(entries):
                entry = entries[source_idx[si]]
                source_idx[si] += 1

                link = entry.get("link")
                if not link:
                    continue

                url_hash = hash_url(link)
                if await is_url_processed(url_hash):
                    continue

                # Parse published date
                published_at = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    try:
                        published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    except Exception:
                        pass

                article_info = {
                    "url": link,
                    "url_hash": url_hash,
                    "source_name": source["name"],
                    "source_type": "rss",
                    "category": source.get("category", "tech"),
                    "title": entry.get("title", ""),
                    "published_at": published_at,
                    "output_language": source.get("output_language", settings.output_language),
                }

                await mark_url_processed(
                    url_hash=url_hash,
                    url=link,
                    source_name=source["name"],
                )

                new_articles.append(article_info)
                source_count[si] += 1
                logger.info(
                    "new_article_discovered",
                    source_name=source["name"],
                    url=link,
                )
                added_this_round = True
                break  # move to next source

        if not added_this_round:
            break  # all sources exhausted or at per-source limit

    logger.info("feed_poll_complete", new_count=len(new_articles))
    return new_articles

