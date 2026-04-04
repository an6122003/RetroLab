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

async def scrape_article(url: str, rss_author: str | None = None) -> dict[str, Any]:
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

    # Path A: httpx + trafilatura (with realistic browser headers)
    try:
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
            },
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
    except Exception:
        logger.warning("scrape_httpx_failed", url=url)
        html = ""

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
            # Re-extract author from Playwright HTML if still missing
            if not author:
                author = _extract_author_from_html(html)
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

    # Use RSS author as fallback if scraping didn't find one
    if not author and rss_author:
        author = _clean_author_name(rss_author)

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
    """Extract author from HTML using multiple strategies.
    
    Priority order:
    1. trafilatura metadata extraction (handles many patterns)
    2. Standard meta tags (author, article:author, dc.creator, etc.)
    3. JSON-LD structured data (schema.org)
    4. Common HTML element patterns (byline classes, rel=author, etc.)
    """
    import json as _json

    # ── Strategy 1: trafilatura metadata ──
    try:
        from trafilatura import extract_metadata
        meta = extract_metadata(html)
        if meta:
            meta_dict = meta.as_dict()
            author_val = meta_dict.get("author")
            if author_val and _is_valid_author(author_val):
                return _clean_author_name(author_val)
    except Exception:
        pass

    # ── Strategy 2: Meta tags (expanded) ──
    meta_patterns = [
        r'<meta\s+name=["\']author["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+content=["\']([^"\']+)["\']\s+name=["\']author["\']',
        r'<meta\s+property=["\']article:author["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']article:author["\']',
        r'<meta\s+name=["\']dc\.creator["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+name=["\']citation_author["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+name=["\']sailthru\.author["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+property=["\']og:article:author["\']\s+content=["\']([^"\']+)["\']',
    ]
    for p in meta_patterns:
        m = re.search(p, html, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if _is_valid_author(val):
                return _clean_author_name(val)

    # ── Strategy 3: JSON-LD structured data ──
    jsonld_pattern = re.findall(
        r'<script\s+type=["\']application/ld\+json["\']\s*>(.*?)</script>',
        html, re.DOTALL | re.IGNORECASE,
    )
    for blob in jsonld_pattern:
        try:
            data = _json.loads(blob)
            # Handle @graph arrays
            items = data if isinstance(data, list) else [data]
            if isinstance(data, dict) and "@graph" in data:
                items = data["@graph"]
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("@type", "")
                if isinstance(item_type, list):
                    item_type = " ".join(item_type)
                if any(t in item_type for t in ["Article", "NewsArticle", "BlogPosting", "WebPage"]):
                    author_obj = item.get("author")
                    if author_obj:
                        name = None
                        if isinstance(author_obj, str):
                            name = author_obj
                        elif isinstance(author_obj, dict):
                            name = author_obj.get("name")
                        elif isinstance(author_obj, list) and author_obj:
                            first = author_obj[0]
                            name = first.get("name") if isinstance(first, dict) else str(first)
                        if name and _is_valid_author(name):
                            return _clean_author_name(name)
        except (_json.JSONDecodeError, TypeError, KeyError):
            continue

    # ── Strategy 4: HTML element patterns ──
    html_patterns = [
        r'<a[^>]+rel=["\']author["\'][^>]*>([^<]+)</a>',
        r'<[^>]+class=["\'][^"\']*\bbyline\b[^"\']*["\'][^>]*>([^<]+)<',
        r'<[^>]+class=["\'][^"\']*\bauthor[_-]?name\b[^"\']*["\'][^>]*>([^<]+)<',
        r'<[^>]+class=["\'][^"\']*\bpost-author\b[^"\']*["\'][^>]*>([^<]+)<',
        r'<[^>]+class=["\'][^"\']*\barticle-author\b[^"\']*["\'][^>]*>([^<]+)<',
        r'<[^>]+class=["\'][^"\']*\bwriter\b[^"\']*["\'][^>]*>([^<]+)<',
        r'<[^>]+itemprop=["\']author["\'][^>]*>(?:<[^>]+>)*([^<]+)',
        r'<span[^>]+class=["\'][^"\']*\bvcard\b[^"\']*["\'][^>]*>\s*<[^>]+class=["\'][^"\']*\bfn\b[^"\']*["\'][^>]*>([^<]+)',
    ]
    for p in html_patterns:
        m = re.search(p, html, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            # Clean HTML entities
            val = re.sub(r'&[a-z]+;', ' ', val).strip()
            if _is_valid_author(val):
                return _clean_author_name(val)

    return None


def _is_valid_author(name: str) -> bool:
    """Check if an extracted author name looks like an actual person/author name."""
    if not name or len(name) < 2 or len(name) > 100:
        return False
    name_lower = name.lower().strip()
    # Reject URLs
    if name_lower.startswith(("http://", "https://", "www.")):
        return False
    # Reject common non-author values
    reject_patterns = [
        "admin", "editor", "staff", "team", "editorial",
        "redaction", "unknown", "anonymous", "contributor",
        "news desk", "newsroom", "web editor",
    ]
    if name_lower in reject_patterns:
        return False
    # Reject if it looks like a site name (all lowercase single word with .com/.org)
    if re.search(r'\.(com|org|net|io|co)$', name_lower):
        return False
    return True


def _clean_author_name(name: str) -> str:
    """Clean up an extracted author name."""
    # Remove common prefixes
    name = re.sub(r'^(by|written by|author:|posted by)\s+', '', name, flags=re.IGNORECASE).strip()
    # Remove HTML tags if any leaked
    name = re.sub(r'<[^>]+>', '', name).strip()
    # Collapse whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    # Title-case if all lowercase or all uppercase
    if name == name.lower() or name == name.upper():
        name = name.title()
    return name


async def _fetch_with_playwright(url: str) -> str:
    """Fetch a page using Playwright with Cloudflare challenge handling.
    
    Runs sync Playwright in a thread pool to avoid event loop conflicts
    in Celery workers.
    """
    import concurrent.futures
    import time as _time

    settings = get_settings()

    def _do_fetch(target_url: str) -> str:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = None
        try:
            browser = pw.chromium.launch(
                headless=settings.playwright_headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                ],
            )
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                java_script_enabled=True,
                locale="en-US",
                timezone_id="America/New_York",
                color_scheme="light",
                service_workers="allow",
            )
            page = ctx.new_page()

            # Stealth: hide automation signals
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
                Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                window.chrome = {runtime: {}};
            """)

            try:
                page.goto(target_url, wait_until="networkidle", timeout=60000)
            except Exception:
                try:
                    page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
                except Exception:
                    pass  # Continue even on timeout

            # Wait for bot challenges / JS rendering to complete
            for _ in range(6):
                _time.sleep(3)
                title = page.title().lower()
                try:
                    body_text = page.inner_text("body")[:500].lower()
                except Exception:
                    body_text = ""
                blocked = any(msg in title or msg in body_text for msg in [
                    "just a moment", "checking", "attention required",
                    "javascript is disabled", "enable javascript",
                    "please wait", "verifying",
                ])
                if not blocked:
                    break

            return page.content()
        finally:
            try:
                if browser:
                    browser.close()
            except Exception:
                pass
            try:
                pw.stop()
            except Exception:
                pass

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(pool, _do_fetch, url),
                timeout=120,  # Hard limit: 2 minutes max
            )
        except asyncio.TimeoutError:
            logger.warning("playwright_fetch_timeout", url=url)
            return ""

