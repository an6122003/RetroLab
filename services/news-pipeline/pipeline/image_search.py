"""
Stage 4 — Image search across ALL free providers.

For each keyword, queries all providers concurrently:
  1. Google Images (scraping — free)
  2. Bing Images  (scraping — free)
  3. Unsplash API (free tier, if key configured)
  4. Pexels API   (free tier, if key configured)
  5. DALL·E 3     (paid, last resort only if nothing else found)

All free providers are searched in parallel for maximum variety
and quality. Results are deduplicated by URL before returning.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

import httpx
import structlog

from config.settings import get_settings

logger = structlog.get_logger(__name__)

# ── Browser-like headers for Bing scraping ──────────────────────

_SCRAPE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


async def search_images(
    keywords: list[str],
    article_id: str = "",
    max_images: int = 10,
) -> list[dict[str, Any]]:
    """
    Search for images across ALL free providers for maximum variety.

    For each keyword, queries Google, Bing, Unsplash, and Pexels
    concurrently and collects all results. DALL·E is only used as
    a last resort if no free results are found.

    Args:
        keywords: list of image search keywords from the rewriter
        article_id: for logging context
        max_images: maximum images to return

    Returns:
        List of image dicts with: url, thumbnail_url, source, page_url,
        photographer, license, query_used, ai_generated, prompt_used,
        width, height, fetched_at
    """
    import asyncio

    settings = get_settings()
    images: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for keyword in keywords:
        # Priority 1: Google API OR Google Playwright OR DuckDuckGo
        # Try Google API first if configured
        api_result = None
        if settings.google_search_api_key and settings.google_search_cx:
            api_result = await _search_google_api_images(keyword, settings.google_search_api_key, settings.google_search_cx)
        
        if api_result and not isinstance(api_result, Exception):
            google_result = api_result
        else:
            # Fallback to DuckDuckGo (API key not needed, fast)
            google_result = await _search_duckduckgo_images(keyword)
            # If DuckDuckGo fails, fallback to Playwright scraper
            if not google_result or isinstance(google_result, Exception):
                google_result = await _scrape_google_images(keyword)

        if google_result and not isinstance(google_result, Exception):
            url = google_result.get("url", "")
            if url and url not in seen_urls and _is_acceptable_image_url(url):
                seen_urls.add(url)
                images.append(google_result)

        # Priority 2: Other providers run concurrently
        other_tasks = [
            _scrape_bing_images(keyword),
        ]
        if settings.unsplash_access_key:
            other_tasks.append(_search_unsplash(keyword, settings.unsplash_access_key))
        if settings.pexels_api_key:
            other_tasks.append(_search_pexels(keyword, settings.pexels_api_key))

        other_results = await asyncio.gather(*other_tasks, return_exceptions=True)

        for result in other_results:
            if isinstance(result, Exception) or result is None:
                continue
            url = result.get("url", "")
            if url and url not in seen_urls and _is_acceptable_image_url(url):
                seen_urls.add(url)
                images.append(result)

    # DALL·E fallback — only if we got nothing from free sources
    if not images and settings.enable_dalle_fallback and settings.openai_api_key:
        for keyword in keywords[:2]:
            result = await _generate_dalle(keyword, settings.openai_api_key)
            if result:
                images.append(result)

    if not images:
        logger.warning(
            "image_search_no_results",
            keywords=keywords,
            article_id=article_id,
        )

    logger.info(
        "image_search_complete",
        article_id=article_id,
        found_count=len(images),
        keywords=keywords,
    )
    return images[:max_images]


# Blocklist of domains/patterns known to return bad, watermarked, or irrelevant images
_IMAGE_URL_BLOCKLIST = [
    "shutterstock.com",
    "istockphoto.com",
    "gettyimages.com",
    "depositphotos.com",
    "dreamstime.com",
    "123rf.com",
    "alamy.com",
    "stockfresh.com",
    "placeholder.com",
    "via.placeholder",
    "picsum.photos",
    "placehold.it",
    "placekitten.com",
    "dummyimage.com",
    "lorempixel.com",
    "fakeimg.pl",
    "ad.doubleclick.net",
    "googlesyndication.com",
    "amazon-adsystem.com",
]


def _is_acceptable_image_url(url: str) -> bool:
    """Filter out images from known bad sources (watermarked stock, placeholders, ads)."""
    url_lower = url.lower()
    # Must be a real HTTP(S) URL
    if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
        return False
    # Block known bad domains
    for blocked in _IMAGE_URL_BLOCKLIST:
        if blocked in url_lower:
            return False
    return True


# ── DuckDuckGo Images (library) ─────────────────────────────────

async def _search_duckduckgo_images(query: str) -> dict[str, Any] | None:
    """Search DuckDuckGo using duckduckgo-search package (synchronous)."""
    import asyncio
    import concurrent.futures

    def _sync_ddg():
        try:
            from duckduckgo_search import DDGS
            return list(DDGS().images(query, max_results=10))
        except Exception as e:
            logger.warning("duckduckgo_sync_failed", error=str(e))
            return []

    try:
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = await loop.run_in_executor(pool, _sync_ddg)
            
        images = []
        for r in results:
            url = r.get("image")
            if not url or "stock" in url.lower() or "depositphotos" in url.lower():
                continue
            images.append({
                "url": url,
                "thumbnail_url": r.get("thumbnail", url),
                "page_url": r.get("url", ""),
                "title": r.get("title", ""),
                "width": r.get("width", 0),
                "height": r.get("height", 0),
            })
            
        if not images:
            logger.debug("duckduckgo_images_empty", query=query)
            return None

        best = _pick_best_image(images)
        logger.info("duckduckgo_image_found", query=query)
        
        return {
            "url": best["url"],
            "thumbnail_url": best.get("thumbnail_url", best["url"]),
            "source": "duckduckgo",
            "photographer": "",
            "page_url": best.get("page_url", ""),
            "license": "Web image — verify rights before publishing",
            "query_used": query,
            "ai_generated": False,
            "prompt_used": None,
            "width": best.get("width", 0),
            "height": best.get("height", 0),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
    except ImportError:
        logger.warning("duckduckgo_search_not_installed")
        return None
    except Exception:
        logger.exception("duckduckgo_search_failed", query=query)
        return None


# ── Google Custom Search API ────────────────────────────────────

async def _search_google_api_images(query: str, api_key: str, cx: str) -> dict[str, Any] | None:
    """Search using official Google Custom Search API (JSON)."""
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": cx,
            "q": query,
            "searchType": "image",
            "safe": "active",
            "num": 10
        }
        
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
        items = data.get("items", [])
        if not items:
            return None
            
        images = []
        for item in items:
            img = item.get("image", {})
            images.append({
                "url": item.get("link", ""),
                "thumbnail_url": img.get("thumbnailLink", item.get("link", "")),
                "page_url": item.get("image", {}).get("contextLink", ""),
                "title": item.get("title", ""),
                "width": img.get("width", 0),
                "height": img.get("height", 0),
            })
            
        best = _pick_best_image(images)
        logger.info("google_api_image_found", query=query)
        
        return {
            "url": best["url"],
            "thumbnail_url": best.get("thumbnail_url", best["url"]),
            "source": "google_api",
            "photographer": "",
            "page_url": best.get("page_url", ""),
            "license": "Web image — verify rights before publishing",
            "query_used": query,
            "ai_generated": False,
            "prompt_used": None,
            "width": best.get("width", 0),
            "height": best.get("height", 0),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        logger.exception("google_api_search_failed", query=query)
        return None


# ── Google Images (scraping) ────────────────────────────────────

async def _scrape_google_images(query: str) -> dict[str, Any] | None:
    """
    Scrape Google Images search results using Playwright.

    Uses a real headed browser to bypass Google's bot detection.
    Runs Playwright synchronously in a thread pool to avoid event loop conflicts.
    Falls back to httpx if Playwright is unavailable.
    """
    import asyncio
    import concurrent.futures

    try:
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            images = await loop.run_in_executor(pool, _google_images_playwright, query)

        if not images:
            # Fallback to httpx (may work sometimes)
            images = await _google_images_httpx_fallback(query)

        if not images:
            logger.debug("google_images_empty", query=query)
            return None

        best = _pick_best_image(images)

        logger.info(
            "google_image_scraped",
            query=query,
            candidates=len(images),
            picked_url=best["url"][:60],
        )

        return {
            "url": best["url"],
            "thumbnail_url": best.get("thumbnail_url", best["url"]),
            "source": "google_images",
            "photographer": "",
            "page_url": best.get("page_url", ""),
            "license": "Web image — verify rights before publishing",
            "query_used": query,
            "ai_generated": False,
            "prompt_used": None,
            "width": best.get("width"),
            "height": best.get("height"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception:
        logger.exception("google_images_scrape_failed", query=query)
        return None


def _google_images_playwright(query: str) -> list[dict[str, Any]]:
    """
    Synchronous Playwright-based Google Images scraper.
    Runs in a thread pool from the async caller.
    """
    import time as _time

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.warning("playwright_not_installed_for_google_images")
        return []

    images: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    try:
        from config.settings import get_settings
        settings = get_settings()

        pw = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=settings.playwright_headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
        )
        page = ctx.new_page()
        page.add_init_script(
            'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
        )

        url = (
            f"https://www.google.com/search?"
            f"q={quote_plus(query)}&tbm=isch"
            f"&hl=en&safe=active"
        )

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
        except Exception:
            pass  # Continue even on timeout

        # Wait for images to load
        _time.sleep(2)

        # Scroll down to trigger lazy loading of more results
        page.evaluate("window.scrollBy(0, 1000)")
        _time.sleep(1)

        # Get the full page HTML
        html = page.content()

        browser.close()
        pw.stop()

        # Parse results from rendered HTML
        images = _parse_google_results(html)

    except Exception as exc:
        logger.warning("google_images_playwright_failed", error=str(exc))

    return images


async def _google_images_httpx_fallback(query: str) -> list[dict[str, Any]]:
    """Fallback httpx-based Google Images scraper (may be blocked)."""
    try:
        url = (
            f"https://www.google.com/search?"
            f"q={quote_plus(query)}&tbm=isch"
            f"&hl=en&safe=active"
        )
        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers={
                **_SCRAPE_HEADERS,
                "Referer": "https://www.google.com/",
            },
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
        return _parse_google_results(html)
    except Exception:
        return []


def _parse_google_results(html: str) -> list[dict[str, Any]]:
    """
    Extract image data from Google Images HTML.

    Google stores image URLs in data arrays within script tags.
    We look for patterns like ["URL",width,height] in AF_initDataCallback blocks.
    """
    images: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    # Strategy 1: Extract image URLs from metadata arrays
    # Google embeds image URLs in patterns like: ["https://...",width,height]
    url_pattern = re.findall(
        r'\["(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"'
        r',\s*(\d+)\s*,\s*(\d+)\s*\]',
        html,
    )

    for img_url, width, height in url_pattern:
        # Skip Google's own thumbnails and tiny images
        if "encrypted-tbn" in img_url or "gstatic" in img_url:
            continue
        if img_url in seen_urls:
            continue

        w, h = int(width), int(height)
        # Only keep reasonably sized images
        if w < 200 or h < 150:
            continue

        seen_urls.add(img_url)
        images.append({
            "url": img_url,
            "thumbnail_url": img_url,
            "page_url": "",
            "title": "",
            "width": w,
            "height": h,
        })

    # Strategy 2: Fallback — extract any large image URLs
    if not images:
        all_urls = re.findall(
            r'"(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"',
            html,
        )
        for img_url in all_urls:
            if "encrypted-tbn" in img_url or "gstatic" in img_url:
                continue
            if img_url in seen_urls:
                continue
            seen_urls.add(img_url)
            images.append({
                "url": img_url,
                "thumbnail_url": img_url,
                "page_url": "",
                "title": "",
                "width": 0,
                "height": 0,
            })

    return images[:20]  # Cap at 20


# ── Bing Images (scraping) ──────────────────────────────────────

async def _scrape_bing_images(query: str) -> dict[str, Any] | None:
    """
    Scrape Bing Images search results via httpx.

    Bing embeds image metadata as JSON in `m` attributes on result
    containers with class="iusc". This includes full-resolution URLs,
    thumbnails, source page URLs, and titles — all in static HTML.
    No JavaScript rendering needed.
    """
    try:
        url = (
            f"https://www.bing.com/images/search?"
            f"q={quote_plus(query)}&first=1"
            f"&qft=+filterui:imagesize-large"
        )

        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=_SCRAPE_HEADERS,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

        # Parse image results from 'm' attributes
        images = _parse_bing_results(html)

        if not images:
            logger.debug("bing_images_empty", query=query)
            return None

        # Score and pick the best image
        best = _pick_best_image(images)

        logger.info(
            "bing_image_scraped",
            query=query,
            candidates=len(images),
            picked_url=best["url"][:60],
            picked_size=f"{best.get('width', '?')}x{best.get('height', '?')}",
        )

        return {
            "url": best["url"],
            "thumbnail_url": best.get("thumbnail_url", best["url"]),
            "source": "bing_images",
            "photographer": "",
            "page_url": best.get("page_url", ""),
            "license": "Web image — verify rights before publishing",
            "query_used": query,
            "ai_generated": False,
            "prompt_used": None,
            "width": best.get("width"),
            "height": best.get("height"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception:
        logger.exception("bing_images_scrape_failed", query=query)
        return None


def _parse_bing_results(html: str) -> list[dict[str, Any]]:
    """
    Extract image data from Bing's HTML.

    Bing stores image metadata as JSON in the `m` attribute of
    elements with class="iusc". The JSON contains:
      - murl: full-resolution image URL
      - turl: Bing-hosted thumbnail URL
      - purl: source page URL
      - t:    image title / alt text
      - mw:   image width (sometimes 0)
      - mh:   image height (sometimes 0)
    """
    images: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    # Extract JSON from m="..." attributes on image containers
    m_attrs = re.findall(r'class="iusc"[^>]*m="([^"]*)"', html)
    if not m_attrs:
        # Fallback: try data-m attribute
        m_attrs = re.findall(r'data-m="([^"]*)"', html)

    for m_raw in m_attrs:
        try:
            # Unescape HTML entities
            m_json = (
                m_raw
                .replace("&quot;", '"')
                .replace("&amp;", "&")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
            )
            data = json.loads(m_json)

            img_url = data.get("murl", "")
            if not img_url or img_url in seen_urls:
                continue

            seen_urls.add(img_url)
            images.append({
                "url": img_url,
                "thumbnail_url": data.get("turl", img_url),
                "page_url": data.get("purl", ""),
                "title": data.get("t", ""),
                "width": data.get("mw", 0) or 0,
                "height": data.get("mh", 0) or 0,
            })

        except (json.JSONDecodeError, KeyError):
            continue

    return images[:20]  # Cap at 20 candidates


def _pick_best_image(images: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Score and pick the best image from candidates.
    Prefers: large landscape JPEGs, penalizes icons/SVGs/logos.
    """
    scored: list[tuple[int, dict]] = []

    for img in images:
        score = 0
        w = img.get("width", 0) or 0
        h = img.get("height", 0) or 0
        url = img.get("url", "").lower()

        # Prefer larger images (when dimensions are known)
        if w >= 1200:
            score += 3
        elif w >= 800:
            score += 2
        elif w >= 400:
            score += 1

        # Prefer landscape orientation
        if w > h and h > 0:
            score += 2

        # Penalize tiny images
        if w > 0 and (w < 300 or h < 200):
            score -= 5

        # Penalize icons, logos, SVGs
        if "icon" in url or "logo" in url or "favicon" in url:
            score -= 3
        if url.endswith(".svg"):
            score -= 5

        # Prefer JPEG (typically photos)
        if any(ext in url for ext in [".jpg", ".jpeg"]):
            score += 1

        # Prefer images with a page_url (attribution available)
        if img.get("page_url"):
            score += 1

        # Bonus for images from known reputable sources
        reputable = ["cdn.mos.cms.futurecdn", "techcrunch", "theverge",
                     "mashable", "cnet", "tomsguide", "xda-developers"]
        if any(domain in url for domain in reputable):
            score += 2

        scored.append((score, img))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


# ── Unsplash ────────────────────────────────────────────────────

async def _search_unsplash(query: str, access_key: str) -> dict[str, Any] | None:
    """Query Unsplash /search/photos API."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.unsplash.com/search/photos",
                params={
                    "query": query,
                    "per_page": 3,
                    "orientation": "landscape",
                },
                headers={"Authorization": f"Client-ID {access_key}"},
            )
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        if not results:
            return None

        photo = results[0]
        return {
            "url": photo["urls"]["regular"],
            "thumbnail_url": photo["urls"]["thumb"],
            "source": "unsplash",
            "photographer": photo["user"]["name"],
            "page_url": photo["user"]["links"].get("html", ""),
            "license": "Unsplash License",
            "query_used": query,
            "ai_generated": False,
            "prompt_used": None,
            "width": photo.get("width"),
            "height": photo.get("height"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception:
        logger.exception("unsplash_search_failed", query=query)
        return None


# ── Pexels ──────────────────────────────────────────────────────

async def _search_pexels(query: str, api_key: str) -> dict[str, Any] | None:
    """Query Pexels /v1/search API."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.pexels.com/v1/search",
                params={
                    "query": query,
                    "per_page": 3,
                    "orientation": "landscape",
                },
                headers={"Authorization": api_key},
            )
            resp.raise_for_status()
            data = resp.json()

        photos = data.get("photos", [])
        if not photos:
            return None

        photo = photos[0]
        return {
            "url": photo["src"]["large"],
            "thumbnail_url": photo["src"]["medium"],
            "source": "pexels",
            "photographer": photo.get("photographer", "Unknown"),
            "page_url": photo.get("url", ""),
            "license": "Pexels License",
            "query_used": query,
            "ai_generated": False,
            "prompt_used": None,
            "width": photo.get("width"),
            "height": photo.get("height"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception:
        logger.exception("pexels_search_failed", query=query)
        return None


# ── DALL·E (AI generation) ──────────────────────────────────────

async def _generate_dalle(query: str, api_key: str) -> dict[str, Any] | None:
    """Generate an image with DALL·E 3 as final fallback."""
    try:
        import openai

        client = openai.AsyncOpenAI(api_key=api_key)
        prompt = (
            f"A professional, editorial-style photograph related to: {query}. "
            "High quality, landscape orientation, suitable for a tech news article."
        )

        response = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1792x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        return {
            "url": image_url,
            "thumbnail_url": image_url,
            "source": "dalle",
            "photographer": "AI Generated",
            "page_url": "",
            "license": "OpenAI Terms of Use",
            "query_used": query,
            "ai_generated": True,
            "prompt_used": prompt,
            "width": 1792,
            "height": 1024,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception:
        logger.exception("dalle_generation_failed", query=query)
        return None
