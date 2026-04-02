"""
Celery task definitions for the news pipeline.

All tasks are idempotent — safe to retry without creating duplicates.
Each task calls the corresponding async pipeline function via asyncio.run().
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import structlog

from workers.celery_app import app

logger = structlog.get_logger(__name__)


# ── Activity logger (pushes to Redis for dashboard) ─────────────

def _log_activity(step: str, detail: str = "", status: str = "running"):
    """Push a task progress event to Redis for the pipeline dashboard."""
    import json
    import redis
    from config.settings import get_settings

    try:
        settings = get_settings()
        r = redis.Redis.from_url(settings.redis_url)
        entry = json.dumps({
            "ts": datetime.now(timezone.utc).isoformat(),
            "step": step,
            "detail": detail[:120],
            "status": status,
        })
        r.lpush("pipeline:activity", entry)
        r.ltrim("pipeline:activity", 0, 49)  # keep last 50
    except Exception:
        pass  # non-critical — don't break the task


def _is_pipeline_stopped() -> bool:
    """Check if the pipeline has been stopped via the dashboard.
    
    Returns True if the 'pipeline:stopped' key exists in Redis,
    meaning all tasks should abort without enqueuing follow-up work.
    """
    import redis
    from config.settings import get_settings

    try:
        settings = get_settings()
        r = redis.Redis.from_url(settings.redis_url)
        return r.exists("pipeline:stopped") > 0
    except Exception:
        return False

# Persistent event loop for the Celery worker thread.
# asyncio.run() creates and closes a loop each time, which invalidates
# any async DB engine connections. Instead, we keep one loop alive.
_worker_loop = None


def _run_async(coro):
    """Run an async coroutine from a sync Celery task.
    
    Uses a persistent event loop so the asyncpg engine connections
    stay valid across multiple calls within the same task.
    """
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop.run_until_complete(coro)


def _pick_best_hero_image(
    images: list[dict],
    article_title: str = "",
) -> dict | None:
    """Score and pick the best hero/cover image from candidates.

    Prefers large landscape images that are relevant to the article title.
    Penalizes author headshots, logos, ads, icons, and tiny images.
    """
    import re

    if not images:
        return None

    title_lower = article_title.lower()
    # Extract meaningful keywords from article title (3+ chars, no stopwords)
    stopwords = {"the", "and", "for", "with", "new", "how", "its", "that", "this",
                 "from", "has", "are", "was", "were", "can", "will", "could",
                 "của", "và", "với", "cho", "trong", "một", "các", "được", "này"}
    title_keywords = {
        w for w in re.findall(r'[a-z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+', title_lower)
        if len(w) >= 3 and w not in stopwords
    }

    # Patterns that indicate a BAD hero image
    bad_url_patterns = [
        "avatar", "author", "profile", "headshot", "bio-photo",
        "logo", "favicon", "icon", "badge", "sprite",
        "ads", "ad-", "advert", "banner", "sponsor",
        "pixel", "tracking", "analytics", "beacon",
        "emoji", "sticker", "button", "arrow",
        "gravatar.com", "wp-content/uploads/author",
        "secure.gravatar", "pbs.twimg.com/profile",
    ]

    scored: list[tuple[float, dict]] = []

    for img in images:
        score = 0.0
        url = (img.get("url") or "").lower()
        title_text = (img.get("title") or img.get("query_used") or "").lower()
        w = img.get("width", 0) or 0
        h = img.get("height", 0) or 0
        source = img.get("source", "")

        # ── Penalty: bad URL patterns ──
        for pattern in bad_url_patterns:
            if pattern in url:
                score -= 10
                break

        # ── Penalty: tiny images (likely icons/tracking pixels) ──
        if w > 0 and h > 0:
            if w < 200 or h < 150:
                score -= 8
            elif w < 400 or h < 300:
                score -= 3

        # ── Bonus: large images ──
        if w >= 1200:
            score += 4
        elif w >= 800:
            score += 3
        elif w >= 600:
            score += 1

        # ── Bonus: landscape orientation (good for hero banners) ──
        if w > 0 and h > 0 and w > h:
            score += 2

        # ── Bonus: title keyword relevance ──
        if title_keywords and title_text:
            text_words = set(re.findall(r'[a-z0-9]+', title_text))
            overlap = title_keywords & text_words
            score += len(overlap) * 2  # 2 points per matching keyword

        # ── Bonus: original source images (from the article itself) ──
        if source == "original":
            score += 2

        # ── Penalty: SVG, GIF (usually logos/animations) ──
        if url.endswith(".svg"):
            score -= 8
        if url.endswith(".gif"):
            score -= 3  # could be animated, not great for hero

        # ── Bonus: JPEG/WebP (typically photos) ──
        if any(ext in url for ext in [".jpg", ".jpeg", ".webp"]):
            score += 1

        scored.append((score, img))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_img = scored[0]

    # If the best score is very negative, don't pick anything
    if best_score < -5:
        return None

    return best_img


# ── Stage 1: Discovery ──────────────────────────────────────────

@app.task(name="workers.tasks.discover_feeds", bind=True, max_retries=2)
def discover_feeds(self, source_tags=None):
    """Poll all enabled RSS feeds and enqueue new articles for scraping.
    
    Args:
        source_tags: Optional list of tags to filter sources (e.g. ['ai', 'smartphones']).
                     Only sources with at least one matching tag are polled.
    """
    from pipeline.discovery.feed_poller import poll_feeds

    tag_str = f" (tags: {source_tags})" if source_tags else ""
    logger.info("discover_feeds_started", source_tags=source_tags)
    _log_activity("🔍 Discover Feeds", f"Polling RSS sources{tag_str}...", "running")

    try:
        if _is_pipeline_stopped():
            _log_activity("🔍 Discover Feeds", "Aborted — pipeline stopped", "error")
            return {"new_count": 0, "stopped": True}

        new_articles = _run_async(poll_feeds(source_tags=source_tags))

        # Enqueue each discovered article for scraping
        for article_info in new_articles:
            if _is_pipeline_stopped():
                _log_activity("🔍 Discover Feeds", "Stopped mid-discovery", "error")
                break
            scrape_article_task.delay(article_info)

        _log_activity("🔍 Discover Feeds", f"Found {len(new_articles)} new articles{tag_str}", "done")
        logger.info("discover_feeds_complete", new_count=len(new_articles))
        return {"new_count": len(new_articles)}

    except Exception as exc:
        logger.exception("discover_feeds_failed")
        raise self.retry(exc=exc, countdown=60)


@app.task(name="workers.tasks.discover_crawl", bind=True, max_retries=2)
def discover_crawl(self, source_tags=None):
    """Crawl all enabled crawl-type sources and enqueue new articles.
    
    Args:
        source_tags: Optional list of tags to filter sources.
    """
    from pipeline.discovery.page_crawler import crawl_pages

    tag_str = f" (tags: {source_tags})" if source_tags else ""
    logger.info("discover_crawl_started", source_tags=source_tags)
    _log_activity("🕷️ Web Crawl", f"Crawling enabled sources{tag_str}...", "running")

    try:
        if _is_pipeline_stopped():
            _log_activity("🕷️ Web Crawl", "Aborted — pipeline stopped", "error")
            return {"new_count": 0, "stopped": True}

        new_articles = _run_async(crawl_pages(source_tags=source_tags))

        for article_info in new_articles:
            if _is_pipeline_stopped():
                _log_activity("🕷️ Web Crawl", "Stopped mid-crawl", "error")
                break
            scrape_article_task.delay(article_info)

        _log_activity("🕷️ Web Crawl", f"Found {len(new_articles)} new articles{tag_str}", "done")
        logger.info("discover_crawl_complete", new_count=len(new_articles))
        return {"new_count": len(new_articles)}

    except Exception as exc:
        logger.exception("discover_crawl_failed")
        raise self.retry(exc=exc, countdown=60)


# ── Stage 2: Scraper ────────────────────────────────────────────

@app.task(
    name="workers.tasks.scrape_article_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def scrape_article_task(self, article_info: dict):
    """
    Scrape an article URL and store in raw_articles.
    Sets status='scraped' and STOPS — user curates via the curation UI
    before articles proceed to the LLM rewrite stage.
    """
    from db.crud import create_raw_article, update_raw_article
    from pipeline.scraper import scrape_article

    url = article_info.get("url", "")
    source_name = article_info.get("source_name", "")

    logger.info("scrape_task_started", url=url, source_name=source_name)
    title_short = article_info.get("title", url)[:80]
    _log_activity("📰 Scraping", f"{source_name}: {title_short}", "running")

    try:
        if _is_pipeline_stopped():
            _log_activity("📰 Scraping", f"Aborted: {title_short}", "error")
            return {"status": "stopped"}

        # Create raw article entry first (status: new)
        raw_article_id = _run_async(create_raw_article({
            "url": url,
            "url_hash": article_info.get("url_hash", ""),
            "source_name": source_name,
            "source_type": article_info.get("source_type", "rss"),
            "category": article_info.get("category"),
            "title": article_info.get("title", ""),
            "published_at": article_info.get("published_at"),
            "status": "new",
        }))

        # Scrape the article
        scraped = _run_async(scrape_article(url))

        scrape_success = bool(scraped.get("body_text"))

        # Update raw article with scraped content
        _run_async(update_raw_article(raw_article_id, {
            "title": scraped.get("title") or article_info.get("title", ""),
            "author": scraped.get("author"),
            "body_text": scraped.get("body_text", ""),
            "word_count": scraped.get("word_count", 0),
            "language": scraped.get("language"),
            "original_images": scraped.get("original_images"),
            "scrape_path": scraped.get("scrape_path"),
            "status": "scraped" if scrape_success else "scrape_failed",
            "scraped_at": datetime.now(timezone.utc),
        }))

        if not scrape_success:
            _log_activity("📰 Scraping", f"Failed: {title_short}", "error")
            logger.warning("scrape_empty_body", url=url, source_name=source_name)
            return {"raw_article_id": raw_article_id, "status": "scrape_failed"}

        _log_activity("📰 Scraping", f"Ready for curation: {title_short} ({scraped.get('word_count', 0)} words)", "done")
        logger.info(
            "scrape_task_complete",
            raw_article_id=raw_article_id,
            url=url,
            word_count=scraped.get("word_count", 0),
        )
        return {"raw_article_id": raw_article_id, "status": "scraped"}

    except Exception as exc:
        logger.exception("scrape_task_failed", url=url, source_name=source_name)
        raise self.retry(exc=exc)


# ── Stage 3: Rewriter ───────────────────────────────────────────

@app.task(
    name="workers.tasks.rewrite_article_task",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def rewrite_article_task(self, raw_article_id: str, source_name: str = "", output_language: str = "vi"):
    """
    Rewrite a raw article via LLM and store the result.
    Pre-searches images so the LLM can place real URLs directly.
    Then enqueue for hero image search.
    """
    from db.crud import create_article, get_raw_article, update_raw_article
    from pipeline.rewriter import rewrite_article
    from config.settings import get_settings

    settings = get_settings()
    # Resolve language name from code (use per-source override or global default)
    lang_name = settings.output_language_name if output_language == settings.output_language else None

    logger.info("rewrite_task_started", raw_article_id=raw_article_id, output_language=output_language)

    try:
        if _is_pipeline_stopped():
            _log_activity("✍️ Rewriting", "Aborted — pipeline stopped", "error")
            return {"status": "stopped"}

        # Fetch raw article
        raw_article = _run_async(get_raw_article(raw_article_id))
        if raw_article is None:
            logger.error("raw_article_not_found", raw_article_id=raw_article_id)
            return {"status": "error", "reason": "raw_article_not_found"}

        title_short = (raw_article.get("title") or "")[:80]
        provider = settings.llm_provider.lower()
        model_label = settings.ollama_model if provider == "ollama" else (settings.gemini_model if provider == "gemini" else settings.anthropic_model)

        # ── Pre-search images before rewrite ────────────────────
        # Search using the article title so the LLM can place real URLs
        _log_activity("✍️ Rewriting", f"Pre-searching images: {title_short}", "running")
        available_images = []
        try:
            from pipeline.image_search import search_images
            title_query = raw_article.get("title", "")
            if title_query:
                pre_images = _run_async(search_images(
                    [title_query],
                    article_id=raw_article_id,
                    max_images=6,
                ))
                # Build lightweight image list for the LLM (URL + description only)
                for img in pre_images:
                    desc = img.get("title") or img.get("query_used") or ""
                    available_images.append({
                        "url": img.get("url", ""),
                        "description": desc,
                    })
                logger.info(
                    "pre_search_images_done",
                    raw_article_id=raw_article_id,
                    images_found=len(available_images),
                )
        except Exception:
            logger.warning("pre_search_images_failed", raw_article_id=raw_article_id)
            # Non-critical — continue without available images

        _log_activity("✍️ Rewriting", f"[{model_label}] {title_short}", "running")

        # Call LLM rewriter with language and available images
        rewritten = _run_async(rewrite_article(
            raw_article,
            source_name=source_name,
            output_language_name=lang_name,
            available_images=available_images if available_images else None,
        ))

        body = rewritten["body"]

        # Build formatted author: "Author | SiteName | Tổng hợp bởi RetroLab"
        brand = "Tổng hợp bởi RetroLab"
        raw_author = raw_article.get("author")
        author_parts = []
        if raw_author:
            author_parts.append(raw_author)
        if source_name:
            author_parts.append(source_name)
        author_parts.append(brand)
        formatted_author = " | ".join(author_parts)

        # Create the rewritten article
        article_id = _run_async(create_article({
            "raw_article_id": raw_article_id,
            "title": rewritten["title"],
            "body": body,
            "summary": rewritten["summary"],
            "perspective": rewritten["perspective"],
            "reading_time_minutes": rewritten["reading_time_minutes"],
            "category": rewritten.get("category") or "Tin tức",
            "tags": rewritten["tags"],
            "image_keywords": rewritten["image_keywords"],
            "inline_image_keywords": rewritten.get("inline_image_keywords", []),
            "original_images": raw_article.get("original_images"),
            "source_url": raw_article["url"],
            "source_outlet": source_name,
            "source_author": formatted_author,
            "source_published_at": raw_article.get("published_at"),
            "rewrite_model": rewritten.pop("_model", "unknown"),
            "output_language": output_language,
            "status": "image_pending",
        }))

        # Mark raw article as done (rewrite complete)
        _run_async(update_raw_article(raw_article_id, {"status": "done"}))

        # Enqueue for image search (unless stopped)
        if not _is_pipeline_stopped():
            search_images_task.delay(article_id)
        else:
            # Skip image search, promote to draft directly
            from db.crud import update_article
            _run_async(update_article(article_id, {"status": "draft"}))
            _log_activity("✍️ Rewriting", f"Done but skipped images (stopped)", "done")

        _log_activity("✍️ Rewriting", f"Done: {rewritten['title'][:80]}", "done")
        logger.info(
            "rewrite_task_complete",
            raw_article_id=raw_article_id,
            article_id=article_id,
        )
        return {"article_id": article_id, "status": "image_pending"}

    except ValueError as exc:
        # Malformed JSON after retry — mark as failed
        logger.error("rewrite_failed_permanently", raw_article_id=raw_article_id, error=str(exc))
        _run_async(create_article({
            "raw_article_id": raw_article_id,
            "status": "rewrite_failed",
            "source_url": "",
            "source_outlet": source_name,
        }))
        return {"status": "rewrite_failed"}

    except Exception as exc:
        logger.exception("rewrite_task_failed", raw_article_id=raw_article_id)
        raise self.retry(exc=exc)


# ── Stage 4: Image Search (FINAL STAGE) ─────────────────────────

@app.task(
    name="workers.tasks.search_images_task",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def search_images_task(self, article_id: str):
    """
    Search for images using the article's image_keywords.
    Also resolves inline PLACEHOLDER_IMAGE_N in the article body.
    This is the FINAL pipeline stage — sets status to 'draft'.
    """
    from db.crud import get_article, update_article
    from pipeline.image_search import search_images
    import re

    logger.info("image_search_started", article_id=article_id)

    try:
        if _is_pipeline_stopped():
            # Promote to draft directly, skip image search
            from db.crud import update_article as _upd
            _run_async(_upd(article_id, {"status": "draft"}))
            _log_activity("🖼️ Image Search", "Skipped — pipeline stopped", "error")
            return {"status": "stopped"}

        article = _run_async(get_article(article_id))
        if article is None:
            logger.error("article_not_found", article_id=article_id)
            return {"status": "error", "reason": "article_not_found"}

        title_short = (article.get("title") or "Untitled")[:80]
        _log_activity("🖼️ Image Search", f"{title_short}", "running")

        keywords = article.get("image_keywords") or []
        
        # --- Phase 2: Build original image results from scraper ---
        original_imgs = article.get("original_images") or []
        original_results = []
        for img in original_imgs:
            img_url = img.get("url", "")
            if img_url and (img_url.startswith("http://") or img_url.startswith("https://")):
                original_results.append({
                    "url": img_url,
                    "thumbnail_url": img_url,
                    "source": "original",
                    "photographer": "",
                    "page_url": article.get("source_url", ""),
                    "license": "Original source image",
                    "query_used": "original",
                    "ai_generated": False,
                    "prompt_used": None,
                    "width": img.get("width", 0) or 0,
                    "height": img.get("height", 0) or 0,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                })

        # Phase 3: Add article title context to search keywords for better relevance
        title_words = (article.get("title") or "")[:60]
        if title_words and keywords:
            # Prepend a title-contextual keyword
            keywords = [f"{keywords[0]} {title_words}"] + keywords

        images = _run_async(search_images(keywords, article_id=article_id))

        # Merge: original images first, then search results (deduped)
        seen_urls = {img["url"] for img in original_results}
        for img in images:
            if img["url"] not in seen_urls:
                seen_urls.add(img["url"])
                original_results.append(img)
        all_images = original_results  # originals first, search results after

        # --- Resolve inline image placeholders ---
        body = article.get("body", "") or ""
        inline_keywords = article.get("inline_image_keywords") or []
        
        # Find all PLACEHOLDER_IMAGE_N markers
        placeholders = re.findall(r'PLACEHOLDER_IMAGE_(\d+)', body)
        
        if placeholders:
            # Search for inline images using inline_image_keywords
            inline_images = []
            for i, placeholder_num in enumerate(sorted(set(placeholders), key=int)):
                # Get keyword for this placeholder
                keyword_idx = int(placeholder_num) - 1
                if keyword_idx < len(inline_keywords):
                    keyword = inline_keywords[keyword_idx]
                elif keyword_idx < len(keywords):
                    keyword = keywords[keyword_idx]
                else:
                    keyword = keywords[0] if keywords else article.get("title", "tech")
                
                inline_result = _run_async(search_images([keyword], article_id=article_id, max_images=1))
                if inline_result:
                    img_url = inline_result[0]["url"]
                    body = body.replace(f"PLACEHOLDER_IMAGE_{placeholder_num}", img_url)
                    inline_images.extend(inline_result)
                else:
                    # Remove unresolved placeholders cleanly
                    body = re.sub(
                        rf'!\[[^\]]*\]\(PLACEHOLDER_IMAGE_{placeholder_num}\)\s*\n?',
                        '',
                        body
                    )

            logger.info(
                "inline_images_resolved",
                article_id=article_id,
                placeholders_found=len(placeholders),
                inline_images_found=len(inline_images),
            )

        # Update article with searched images, resolved body, and set final status
        from config.settings import get_settings
        settings = get_settings()

        final_status = "draft"
        if settings.auto_approve:
            final_status = "approved"
            logger.info(
                "auto_approve_enabled",
                article_id=article_id,
                final_status=final_status,
            )

        # Always pick the best hero image — regardless of auto-approve
        selected_image = None
        if all_images:
            selected_image = _pick_best_hero_image(
                all_images,
                article_title=article.get("title", ""),
            )
            logger.info(
                "hero_image_selected",
                article_id=article_id,
                image_selected=selected_image is not None,
                image_source=selected_image.get("source") if selected_image else None,
                image_url=(selected_image.get("url") or "")[:80] if selected_image else None,
            )

        update_data = {
            "searched_images": all_images,
            "status": final_status,
        }
        if selected_image:
            update_data["selected_image"] = selected_image
        if placeholders:
            update_data["body"] = body

        _run_async(update_article(article_id, update_data))

        title = article.get("title", "Untitled")
        orig_count = sum(1 for img in all_images if img.get("source") == "original")
        status_label = "Auto-approved" if final_status == "approved" else "Draft"
        _log_activity("🖼️ Image Search", f"{status_label}: {title[:80]} ({orig_count} original + {len(all_images) - orig_count} searched)", "done")
        logger.info(
            "article_ready_for_review",
            article_id=article_id,
            title=title,
            images_found=len(all_images),
            original_images=orig_count,
            auto_approved=final_status == "approved",
        )
        return {"article_id": article_id, "images_found": len(all_images), "status": final_status}

    except Exception as exc:
        logger.exception("image_search_failed", article_id=article_id)
        raise self.retry(exc=exc)

