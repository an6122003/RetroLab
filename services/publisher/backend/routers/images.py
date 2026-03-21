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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Article
from ..schemas import ArticleOut

router = APIRouter(prefix="/api", tags=["images"])

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


async def _scrape_google_images(query: str, count: int = 10) -> list[dict[str, Any]]:
    """Scrape Google Images for a query, return up to `count` results."""
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

        images: list[dict[str, Any]] = []
        seen: set[str] = set()

        # Extract image URLs from metadata arrays: ["URL",width,height]
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

        # Fallback: extract any large image URLs
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

        return images

    except Exception:
        return []


@router.post("/articles/{article_id}/search-images")
async def search_images(
    article_id: str,
    q: str | None = Query(None, description="Custom search query, or uses article's image_keywords"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search for more images for an article.
    Queries both Google and Bing for maximum coverage.
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

    # Search both Google and Bing
    new_images: list[dict] = []
    for query in queries:
        google_results = await _scrape_google_images(query, count=5)
        bing_results = await _scrape_bing_images(query, count=5)
        new_images.extend(google_results)
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
