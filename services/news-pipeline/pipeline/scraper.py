"""
Stage 2 — Article content extraction.

Downloads article pages, extracts clean text with trafilatura,
falls back to Playwright for JS-heavy pages, extracts metadata
and images, and stores results in raw_articles table.
"""

from __future__ import annotations

import asyncio
import re
import time
from collections import defaultdict
from typing import Any
from urllib.parse import urlparse

import httpx
import structlog
import trafilatura
from langdetect import detect

from config.settings import get_settings

logger = structlog.get_logger(__name__)


# ── Per-domain rate limiter (token bucket) ──────────────────────

class DomainRateLimiter:
    """Simple asyncio-based per-domain token bucket rate limiter."""

    def __init__(self, interval: float = 2.0):
        self._interval = interval
        self._last_request: dict[str, float] = defaultdict(float)
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def acquire(self, domain: str) -> None:
        """Wait until we can make a request to the given domain."""
        async with self._locks[domain]:
            now = time.monotonic()
            elapsed = now - self._last_request[domain]
            if elapsed < self._interval:
                await asyncio.sleep(self._interval - elapsed)
            self._last_request[domain] = time.monotonic()


_rate_limiter: DomainRateLimiter | None = None


def get_rate_limiter() -> DomainRateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        settings = get_settings()
        _rate_limiter = DomainRateLimiter(interval=settings.scraper_delay_seconds)
    return _rate_limiter


# ── Image extraction ────────────────────────────────────────────

def _extract_images(html: str, base_url: str, max_images: int = 10) -> list[dict[str, Any]]:
    """
    Extract article images from HTML body.
    Skips images smaller than 200x200 and common trackers.
    """
    img_re = re.compile(
        r'<img\s[^>]*src=["\']([^"\']+)["\']'
        r'(?:[^>]*width=["\'](\d+)["\'])?'
        r'(?:[^>]*height=["\'](\d+)["\'])?',
        re.IGNORECASE,
    )

    tracker_patterns = [
        r"pixel", r"beacon", r"tracker", r"1x1",
        r"analytics", r"doubleclick", r"facebook\.com/tr",
    ]

    images: list[dict[str, Any]] = []
    for match in img_re.finditer(html):
        src = match.group(1)

        # Skip tracker images
        if any(re.search(p, src, re.IGNORECASE) for p in tracker_patterns):
            continue

        # Check dimensions if available
        width = int(match.group(2)) if match.group(2) else None
        height = int(match.group(3)) if match.group(3) else None
        if width and height and (width < 200 or height < 200):
            continue

        images.append({
            "url": src,
            "width": width,
            "height": height,
            "credit": None,
        })

        if len(images) >= max_images:
            break

    return images


# ── Main scraper ────────────────────────────────────────────────

async def scrape_article(url: str) -> dict[str, Any]:
    """
    Scrape an article URL and return extracted content.

    Path A (default): httpx GET + trafilatura
    Path B (fallback): Playwright if body_text < 200 chars

    Returns dict with:
        title, author, published_at, body_text, word_count,
        language, original_images, scrape_path
    """
    domain = urlparse(url).netloc
    limiter = get_rate_limiter()
    await limiter.acquire(domain)

    scrape_path = "fast"
    html = ""
    result: dict[str, Any] = {
        "title": "",
        "author": None,
        "published_at": None,
        "body_text": "",
        "word_count": 0,
        "language": None,
        "original_images": [],
        "scrape_path": scrape_path,
    }

    # Path A: httpx + trafilatura
    try:
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; NewsPipeline/1.0)"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
    except Exception:
        logger.exception("scrape_fetch_failed", url=url)
        raise

    # Extract as markdown to preserve inline images
    extracted = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        include_images=True,
        include_links=False,
        output_format="txt",
    )
    body_text = extracted or ""

    # Also extract markdown with images for inline placement
    body_md = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        include_images=True,
        include_links=True,
        output_format="markdown",
    ) or ""

    # Extract metadata
    title = _extract_title_from_html(html)
    author = _extract_author_from_html(html)

    # Path B: Playwright fallback
    if len(body_text) < 200:
        logger.info("scraper_playwright_fallback", url=url, body_len=len(body_text))
        scrape_path = "playwright"
        try:
            html = await _fetch_with_playwright(url)
            extracted = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=False,
                include_images=True,
                include_links=False,
                output_format="txt",
            )
            body_text = extracted or body_text

            body_md = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=False,
                include_images=True,
                include_links=True,
                output_format="markdown",
            ) or body_md

            if not title:
                title = _extract_title_from_html(html)
        except Exception:
            logger.exception("playwright_fallback_failed", url=url)

    # Detect language
    language = None
    if body_text:
        try:
            language = detect(body_text)[:2]
        except Exception:
            language = None

    # Extract images from HTML (for metadata/hero image selection)
    original_images = _extract_images(html, url)

    # Use markdown body if it contains inline images, otherwise use plain text
    # This preserves image positions within the article
    if body_md and re.search(r'!\[.*?\]\(.*?\)', body_md):
        final_body = body_md
    else:
        final_body = body_text

    word_count = len(body_text.split()) if body_text else 0

    result.update({
        "title": title,
        "author": author,
        "body_text": final_body,
        "word_count": word_count,
        "language": language,
        "original_images": original_images,
        "scrape_path": scrape_path,
    })

    logger.info(
        "article_scraped",
        url=url,
        word_count=word_count,
        scrape_path=scrape_path,
        has_inline_images=bool(re.search(r'!\[.*?\]\(.*?\)', final_body)),
    )

    return result


def _extract_title_from_html(html: str) -> str:
    """Extract the <title> or og:title from HTML."""
    # Try og:title first
    og_match = re.search(
        r'<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if og_match:
        return og_match.group(1).strip()

    # Fallback to <title>
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        return title_match.group(1).strip()

    return ""


def _extract_author_from_html(html: str) -> str | None:
    """Try to extract author from common meta tags."""
    patterns = [
        r'<meta\s+name=["\']author["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+property=["\']article:author["\']\s+content=["\']([^"\']+)["\']',
    ]
    for p in patterns:
        m = re.search(p, html, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


async def _fetch_with_playwright(url: str) -> str:
    """Fetch a page using Playwright for JS-rendered content."""
    from playwright.async_api import async_playwright

    settings = get_settings()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=settings.playwright_headless)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30_000)
        content = await page.content()
        await browser.close()
    return content
