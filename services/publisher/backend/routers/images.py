"""
Image search endpoint — searches Google Images and Bing Images for additional images.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import require_admin
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Article
from ..schemas import ArticleOut

router = APIRouter(prefix="/api", tags=["images"], dependencies=[Depends(require_admin)])

_SCRAPE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


async def _scrape_bing_images(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Scrape Bing Images for a query, return up to `count` results."""
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

        images: list[dict[str, Any]] = []
        seen: set[str] = set()

        m_attrs = re.findall(r'class="iusc"[^>]*m="([^"]*)"', html)
        if not m_attrs:
            m_attrs = re.findall(r'data-m="([^"]*)"', html)

        for m_raw in m_attrs:
            try:
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
                if not img_url or img_url in seen:
                    continue

                # Skip icons/SVGs
                if any(x in img_url.lower() for x in ["icon", "logo", "favicon", ".svg"]):
                    continue

                seen.add(img_url)
                images.append({
                    "url": img_url,
                    "thumbnail_url": data.get("turl", img_url),
                    "source": "bing_images",
                    "page_url": data.get("purl", ""),
                    "query_used": query,
                    "width": data.get("mw", 0) or 0,
                    "height": data.get("mh", 0) or 0,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                })

                if len(images) >= count:
                    break
            except (json.JSONDecodeError, KeyError):
                continue

        return images

    except Exception:
        return []


import asyncio
import concurrent.futures
import logging
import time as _time

_google_logger = logging.getLogger("images.google")


async def _scrape_google_images(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Scrape Google Images using Playwright (real browser) for reliable results."""
    try:
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            images = await loop.run_in_executor(pool, _google_images_playwright, query, count)
        if images:
            return images
    except Exception:
        _google_logger.exception("google_playwright_failed", extra={"query": query})

    # Fallback: try httpx (may be blocked)
    return await _google_images_httpx_fallback(query, count)


def _google_images_playwright(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Synchronous Playwright Google Images scraper — runs in thread pool."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        _google_logger.warning("playwright_not_installed")
        return []

    images: list[dict[str, Any]] = []
    seen: set[str] = set()
    pw = None
    browser = None

    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
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
            pass  # Continue even on timeout — page may have partially loaded

        # Wait for image results to render
        _time.sleep(2.5)

        # Scroll to trigger lazy loading
        page.evaluate("window.scrollBy(0, 1200)")
        _time.sleep(1)

        html = page.content()
        _google_logger.info(f"Google Playwright HTML length: {len(html)} for query: {query}")

        # Parse image URLs from rendered HTML
        # Strategy 1: metadata arrays ["URL",width,height]
        url_pattern = re.findall(
            r'\["(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"'
            r',\s*(\d+)\s*,\s*(\d+)\s*\]',
            html,
        )

        for img_url, width, height in url_pattern:
            if "encrypted-tbn" in img_url or "gstatic" in img_url:
                continue
            if img_url in seen:
                continue
            w, h = int(width), int(height)
            if w < 200 or h < 150:
                continue
            seen.add(img_url)
            images.append({
                "url": img_url,
                "thumbnail_url": img_url,
                "source": "google_images",
                "page_url": "",
                "query_used": query,
                "width": w,
                "height": h,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
            if len(images) >= count:
                break

        # Strategy 2: fallback — any large image URLs
        if not images:
            all_urls = re.findall(
                r'"(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"',
                html,
            )
            for img_url in all_urls:
                if "encrypted-tbn" in img_url or "gstatic" in img_url:
                    continue
                if img_url in seen:
                    continue
                seen.add(img_url)
                images.append({
                    "url": img_url,
                    "thumbnail_url": img_url,
                    "source": "google_images",
                    "page_url": "",
                    "query_used": query,
                    "width": 0,
                    "height": 0,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                })
                if len(images) >= count:
                    break

        _google_logger.info(f"Google Playwright found {len(images)} images for: {query}")

    except Exception as exc:
        _google_logger.warning(f"Google Playwright error: {exc}")
    finally:
        try:
            if browser:
                browser.close()
            if pw:
                pw.stop()
        except Exception:
            pass

    return images


async def _google_images_httpx_fallback(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Fallback httpx-based Google Images scraper (usually blocked by Google)."""
    try:
        url = (
            f"https://www.google.com/search?"
            f"q={quote_plus(query)}&tbm=isch"
            f"&hl=en&safe=active"
        )
        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers={**_SCRAPE_HEADERS, "Referer": "https://www.google.com/"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

        images: list[dict[str, Any]] = []
        seen: set[str] = set()
        url_pattern = re.findall(
            r'\["(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"'
            r',\s*(\d+)\s*,\s*(\d+)\s*\]',
            html,
        )
        for img_url, width, height in url_pattern:
            if "encrypted-tbn" in img_url or "gstatic" in img_url:
                continue
            if img_url in seen:
                continue
            w, h = int(width), int(height)
            if w < 200 or h < 150:
                continue
            seen.add(img_url)
            images.append({
                "url": img_url, "thumbnail_url": img_url,
                "source": "google_images", "page_url": "",
                "query_used": query, "width": w, "height": h,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
            if len(images) >= count:
                break
        return images
    except Exception:
        return []


async def _search_duckduckgo_images(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Search DuckDuckGo using duckduckgo-search (synchronously in thread pool)."""
    import asyncio
    import concurrent.futures

    def _sync_ddg():
        try:
            from duckduckgo_search import DDGS
            return list(DDGS().images(query, max_results=count))
        except Exception as e:
            _google_logger.warning(f"DDG error inside thread: {e}")
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
                "source": "duckduckgo",
                "page_url": r.get("url", ""),
                "query_used": query,
                "width": r.get("width", 0),
                "height": r.get("height", 0),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
        return images
    except Exception as e:
        _google_logger.warning(f"DuckDuckGo search error: {e}")
        return []

async def _search_google_api_images(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Search Google Images using official API keys if provided."""
    import os
    api_key = os.environ.get("GOOGLE_SEARCH_API_KEY", "")
    cx = os.environ.get("GOOGLE_SEARCH_CX", "")
    if not api_key or not cx:
        return []
        
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {"key": api_key, "cx": cx, "q": query, "searchType": "image", "safe": "active", "num": count}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
        items = data.get("items", [])
        images = []
        for item in items:
            img = item.get("image", {})
            images.append({
                "url": item.get("link", ""),
                "thumbnail_url": img.get("thumbnailLink", item.get("link", "")),
                "source": "google_api",
                "page_url": img.get("contextLink", ""),
                "query_used": query,
                "width": img.get("width", 0),
                "height": img.get("height", 0),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
        return images
    except Exception as e:
        _google_logger.warning(f"Google API search error: {e}")
        return []

@router.post("/articles/{article_id}/search-images")
async def search_images(
    article_id: str,
    q: str | None = Query(None, description="Custom search query, or uses article's image_keywords"),
    platform: str = Query("all", description="Platform to search: 'google', 'duckduckgo', 'bing', or 'all'"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search for more images for an article.
    Queries Google and/or Bing based on platform param.
    Appends results to the article's searched_images and returns the new images.
    """
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Determine search queries
    if q:
        queries = [q]
    elif article.image_keywords:
        queries = article.image_keywords[:3]
    elif article.title:
        queries = [article.title[:80]]
    else:
        raise HTTPException(status_code=400, detail="No query or image_keywords available")

    # Search based on platform selection
    new_images: list[dict] = []
    
    import os
    has_google_api = bool(os.environ.get("GOOGLE_SEARCH_API_KEY") and os.environ.get("GOOGLE_SEARCH_CX"))
    
    for query in queries:
        if platform in ("google", "all"):
            if has_google_api:
                google_results = await _search_google_api_images(query, count=5)
            else:
                google_results = await _scrape_google_images(query, count=5)
            new_images.extend(google_results)
            
        if platform in ("duckduckgo", "all"):
            ddg_results = await _search_duckduckgo_images(query, count=5)
            new_images.extend(ddg_results)
            
        if platform in ("bing", "all"):
            bing_results = await _scrape_bing_images(query, count=5)
            new_images.extend(bing_results)

    # Deduplicate against existing searched_images
    existing_urls = set()
    if article.searched_images and isinstance(article.searched_images, list):
        for img in article.searched_images:
            if isinstance(img, dict):
                existing_urls.add(img.get("url", ""))

    unique_new = [img for img in new_images if img["url"] not in existing_urls]

    # Append to article's searched_images
    current = list(article.searched_images or [])
    current.extend(unique_new)
    article.searched_images = current
    await db.commit()
    await db.refresh(article)

    return unique_new
