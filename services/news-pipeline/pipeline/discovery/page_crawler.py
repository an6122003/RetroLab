"""
Stage 1 — Mode B: Page crawling + link extraction.

Fetches seed pages from crawl-type sources, extracts article links
via CSS selectors and regex patterns, scores links by DOM context,
deduplicates, and enqueues survivors for scraping.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
import structlog

from config.settings import get_enabled_sources, get_settings
from db.crud import is_url_processed, mark_url_processed

logger = structlog.get_logger(__name__)


def hash_url(url: str) -> str:
    """Return the SHA-256 hex digest of a URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _score_link(element_context: str) -> int:
    """
    Score a link based on its DOM context.
    article/h2/h3 → +2, nav/footer/aside → -3
    """
    score = 0
    positive = {"article", "h2", "h3", "main", "section"}
    negative = {"nav", "footer", "aside", "header"}

    ctx_lower = element_context.lower()
    for tag in positive:
        if tag in ctx_lower:
            score += 2
    for tag in negative:
        if tag in ctx_lower:
            score -= 3
    return score


async def crawl_pages(
    source_tags: list[str] | None = None,
    category: str | None = None,
) -> list[dict[str, Any]]:
    """
    Crawl all enabled crawl-type sources and return new article dicts.

    For JS-required pages, falls back to Playwright.
    
    Args:
        source_tags: Optional list of tags to filter sources.
        category: Optional category key to filter (e.g. 'game_emulation').
    """
    import random

    settings = get_settings()
    sources = get_enabled_sources(source_type="crawl", category=category)
    
    # Filter by tags if provided
    if source_tags:
        tag_set = set(source_tags)
        sources = [s for s in sources if tag_set.intersection(s.get("tags", []))]
    
    # Randomize source order if enabled
    if settings.randomize_sources:
        random.shuffle(sources)

    new_articles: list[dict[str, Any]] = []
    max_per_run = settings.max_articles_per_run
    max_per_source = settings.max_articles_per_source

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for source in sources:
            if len(new_articles) >= max_per_run:
                break

            source_name = source["name"]
            seed_url = source["seed_url"]
            url_pattern = source.get("article_url_pattern", "")
            js_required = source.get("js_required", False)
            category = source.get("category", "tech")

            try:
                if js_required:
                    html = await _fetch_with_playwright(seed_url, settings.playwright_headless)
                else:
                    resp = await client.get(seed_url)
                    resp.raise_for_status()
                    html = resp.text
            except Exception:
                logger.exception("crawl_fetch_failed", source_name=source_name, url=seed_url)
                continue

            # Extract links using simple HTML parsing
            links = _extract_links(html, seed_url, url_pattern)

            # Randomize link order if enabled
            if settings.randomize_sources:
                random.shuffle(links)

            source_article_count = 0
            for link_url in links:
                if len(new_articles) >= max_per_run:
                    break
                if source_article_count >= max_per_source:
                    break

                url_hash = hash_url(link_url)

                if await is_url_processed(url_hash):
                    continue

                await mark_url_processed(
                    url_hash=url_hash,
                    url=link_url,
                    source_name=source_name,
                )

                new_articles.append({
                    "url": link_url,
                    "url_hash": url_hash,
                    "source_name": source_name,
                    "source_type": "crawl",
                    "category": category,
                    "title": "",
                    "published_at": None,
                    "output_language": source.get("output_language", settings.output_language),
                })

                source_article_count += 1
                logger.info(
                    "new_article_discovered",
                    source_name=source_name,
                    url=link_url,
                )

    logger.info("page_crawl_complete", new_count=len(new_articles))
    return new_articles


def _extract_links(html: str, base_url: str, url_pattern: str) -> list[str]:
    """
    Extract  links from HTML, filter to same domain,
    and match against the article URL regex pattern.
    """
    # Simple regex to extract href from <a> tags
    href_re = re.compile(r'<a\s[^>]*href=["\']([^"\']+)["\']', re.IGNORECASE)
    base_domain = urlparse(base_url).netloc

    seen: set[str] = set()
    results: list[str] = []

    for match in href_re.finditer(html):
        raw_url = match.group(1)
        absolute = urljoin(base_url, raw_url)

        # Same domain check
        if urlparse(absolute).netloc != base_domain:
            continue

        # URL pattern match
        if url_pattern and not re.search(url_pattern, absolute):
            continue

        # Dedup within this page
        if absolute in seen:
            continue
        seen.add(absolute)
        results.append(absolute)

    return results


async def _fetch_with_playwright(url: str, headless: bool = True) -> str:
    """Fetch a page using Playwright for JS-rendered content."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page = await browser.new_page()
            try:
                await page.goto(url, wait_until="networkidle", timeout=30_000)
            except Exception:
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=15_000)
                except Exception:
                    pass
            content = await page.content()
        finally:
            try:
                await browser.close()
            except Exception:
                pass
    return content
