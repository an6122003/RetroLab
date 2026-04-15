"""
Pipeline control endpoints — trigger pipeline tasks and manage configuration.

Connects to the same Redis broker that the Celery workers use, sends tasks
directly. Sources config is read from / written to the pipeline's sources.yaml.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import redis as _redis_lib

import yaml
from celery import Celery
from fastapi import APIRouter, Body, Depends, HTTPException

from ..auth import require_admin
from pydantic import BaseModel

from ..settings import settings

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"], dependencies=[Depends(require_admin)])

# ── Celery client (sends tasks only — does NOT run workers) ──────

_celery: Celery | None = None


def _get_celery() -> Celery:
    global _celery
    if _celery is None:
        _celery = Celery(
            "news_pipeline",
            broker=settings.REDIS_URL,
            backend=settings.REDIS_URL,
        )
        _celery.conf.update(
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
        )
    return _celery


# ── Paths ────────────────────────────────────────────────────────

def _sources_path() -> Path:
    config_dir = os.getenv("PIPELINE_CONFIG_DIR")
    if config_dir:
        return Path(config_dir) / "sources.yaml"
    return settings.pipeline_dir / "config" / "sources.yaml"


def _env_path() -> Path:
    config_dir = os.getenv("PIPELINE_CONFIG_DIR")
    if config_dir:
        return Path(config_dir).parent / ".env"
    return settings.pipeline_dir / ".env"


# ── DB engine (sync, for queue management queries) ───────────────

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        from sqlalchemy import create_engine
        import os
        # Prefer container env (has Docker network hostnames) over .env file (has localhost)
        db_url = os.environ.get("DATABASE_URL", "")
        if not db_url:
            env = _read_env_config()
            db_url = env.get("DATABASE_URL", "postgresql://pipeline:pipeline@localhost:5432/news_pipeline")
        # Strip +asyncpg for sync engine
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        _engine = create_engine(db_url)
    return _engine



# ── Schemas ──────────────────────────────────────────────────────

class SourceEntry(BaseModel):
    name: str
    type: str  # "rss" or "crawl"
    url: str | None = None
    seed_url: str | None = None
    article_url_pattern: str | None = None
    article_selector: str | None = None
    js_required: bool | None = None
    enabled: bool = True
    output_language: str | None = None
    tags: list[str] | None = None


class PipelineConfig(BaseModel):
    llm_provider: str = "gemini"
    gemini_model: str = "gemini-2.5-flash"
    anthropic_model: str = "claude-sonnet-4-6"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:32b"
    ollama_num_ctx: int = 16384
    ollama_think: bool = True
    llm_temperature: float = 0.7
    output_language: str = "vi"
    output_language_name: str = "Vietnamese"
    discovery_interval_minutes: int = 30
    max_articles_per_run: int = 50
    scraper_delay_seconds: float = 2.0
    enable_dalle_fallback: bool = False
    max_articles_per_source: int = 10
    randomize_sources: bool = True
    # Auto-Approval
    auto_approve: bool = False
    auto_approve_select_image: bool = True
    # Auto-Publish to Notion
    auto_publish: bool = False
    # Scheduler
    scheduler_enabled: bool = False
    scheduler_mode: str = "interval"
    scheduler_time_of_day: str = "08:00, 16:00"
    scheduler_interval_minutes: int = 60
    scheduler_task: str = "full_pipeline"
    scheduler_quiet_hours_start: int = -1
    scheduler_quiet_hours_end: int = -1


class RunRequest(BaseModel):
    task: str  # "discover_feeds", "discover_crawl", "full_pipeline"
    source_tags: list[str] | None = None  # optional tag filter e.g. ["ai", "smartphones"]
    category: str | None = None  # optional category filter e.g. "game_emulation"


class RunResponse(BaseModel):
    status: str
    task_ids: list[str] = []
    message: str = ""


# ── Source management ────────────────────────────────────────────

@router.get("/sources")
async def get_sources() -> dict[str, list[dict[str, Any]]]:
    """Return the current sources.yaml content."""
    path = _sources_path()
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


@router.put("/sources")
async def update_sources(
    sources: dict[str, list[dict[str, Any]]] = Body(...),
) -> dict[str, str]:
    """Overwrite sources.yaml with the provided config."""
    path = _sources_path()
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(sources, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    return {"status": "saved"}


@router.post("/sources/detect")
async def detect_source_patterns(
    payload: dict[str, str] = Body(...),
) -> dict[str, Any]:
    """Auto-detect article URL pattern and CSS selector from a seed URL.

    Fetches the page, analyzes all links, groups them by URL structure,
    and returns the most likely article pattern + CSS selector.
    """
    import re as _re
    from collections import Counter
    from urllib.parse import urlparse, urljoin

    seed_url = payload.get("url", "").strip()
    if not seed_url:
        raise HTTPException(status_code=400, detail="url is required")

    # Fetch the page
    import httpx
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
            resp = await client.get(seed_url)
            resp.raise_for_status()
            html = resp.text
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch: {exc}")

    # Parse HTML
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        # Fallback: basic regex link extraction
        link_re = _re.compile(r'<a\s[^>]*href=["\']([^"\']+)["\']', _re.IGNORECASE)
        raw_links = link_re.findall(html)
        parsed_seed = urlparse(seed_url)
        domain = parsed_seed.netloc.replace("www.", "")

        # Filter to same-domain links
        article_links = []
        for href in raw_links:
            full = urljoin(seed_url, href)
            p = urlparse(full)
            if domain in p.netloc and len(p.path) > 10:
                article_links.append(full)

        if not article_links:
            return {
                "article_url_pattern": "",
                "article_selector": "a[href]",
                "sample_urls": [],
                "message": "No article-like links found on this page.",
            }

        # Find common path pattern
        path_structures: list[str] = []
        for link in article_links:
            p = urlparse(link)
            path = p.path
            path = _re.sub(r'/\d+', r'/\\d+', path)
            path = _re.sub(r'/[a-f0-9]{8,}', r'/[a-f0-9]+', path)
            path_structures.append(path)

        most_common_path = Counter(path_structures).most_common(1)[0][0]
        escaped_domain = _re.escape(domain)
        pattern = f"{escaped_domain}{most_common_path}"

        return {
            "article_url_pattern": pattern,
            "article_selector": "a[href]",
            "sample_urls": article_links[:5],
            "message": f"Detected {len(article_links)} article-like links.",
        }

    # Full BeautifulSoup analysis
    soup = BeautifulSoup(html, "html.parser")
    parsed_seed = urlparse(seed_url)
    domain = parsed_seed.netloc.replace("www.", "")

    # Collect all links with their parent info
    link_data: list[dict[str, Any]] = []
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        full_url = urljoin(seed_url, href)
        p = urlparse(full_url)

        if p.scheme not in ("http", "https"):
            continue
        if domain not in p.netloc.replace("www.", ""):
            continue
        if len(p.path) < 10:
            continue
        skip_patterns = [
            r"/tag/", r"/category/", r"/author/", r"/page/\d+",
            r"/search", r"/login", r"/register", r"/about",
            r"/contact", r"/privacy", r"/terms", r"/feed",
            r"\.(css|js|png|jpg|gif|svg|ico|xml|json)$",
        ]
        if any(_re.search(sp, p.path, _re.IGNORECASE) for sp in skip_patterns):
            continue

        parent = a_tag.parent
        selectors = []
        if parent:
            if parent.name:
                selectors.append(f"{parent.name} a")
            for cls in (parent.get("class") or []):
                selectors.append(f".{cls} a")
        if a_tag.get("class"):
            for cls in a_tag["class"]:
                selectors.append(f"a.{cls}")
        heading_parent = a_tag.find_parent(["h1", "h2", "h3", "h4"])
        if heading_parent:
            selectors.append(f"{heading_parent.name} a")

        link_data.append({
            "url": full_url,
            "path": p.path,
            "selectors": selectors,
            "text": (a_tag.get_text(strip=True) or "")[:100],
        })

    if not link_data:
        return {
            "article_url_pattern": "",
            "article_selector": "a[href]",
            "sample_urls": [],
            "message": "No article-like links found on this page.",
        }

    # Generalize paths into patterns
    path_patterns: list[str] = []
    for ld in link_data:
        path = ld["path"]
        path = _re.sub(r"/\d{4}/\d{2}/\d{2}/", r"/\\d{4}/\\d{2}/\\d{2}/", path)
        path = _re.sub(r"/\d{4}/\d{2}/", r"/\\d{4}/\\d{2}/", path)
        path = _re.sub(r"/\d+(/|$)", r"/\\d+\\1", path)
        path = _re.sub(r"/[a-f0-9]{8,}(/|$)", r"/[a-f0-9]+\\1", path)
        path = _re.sub(r"/[a-z0-9]+-[a-z0-9-]+", r"/[a-z0-9-]+", path)
        path_patterns.append(path)

    pattern_counter = Counter(path_patterns)
    best_pattern_path, best_count = pattern_counter.most_common(1)[0]
    escaped_domain = _re.escape(domain)
    suggested_pattern = f"{escaped_domain}{best_pattern_path}"

    selector_counter: Counter[str] = Counter()
    matching_urls: list[str] = []
    for ld, pp in zip(link_data, path_patterns):
        if pp == best_pattern_path:
            matching_urls.append(ld["url"])
            for sel in ld["selectors"]:
                selector_counter[sel] += 1

    best_selector = "a[href]"
    if selector_counter:
        heading_selectors = {k: v for k, v in selector_counter.items() if k.startswith("h")}
        if heading_selectors:
            best_selector = max(heading_selectors, key=heading_selectors.get)
        else:
            best_selector = selector_counter.most_common(1)[0][0]

    return {
        "article_url_pattern": suggested_pattern,
        "article_selector": best_selector,
        "sample_urls": matching_urls[:5],
        "link_count": len(matching_urls),
        "message": f"Found {len(matching_urls)} article links matching the detected pattern.",
    }


@router.post("/sources/{category}")
async def add_source(
    category: str,
    source: SourceEntry = Body(...),
) -> dict[str, str]:
    """Add a new source under a category."""
    path = _sources_path()
    data: dict[str, list] = {}
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

    if category not in data:
        data[category] = []

    # Build entry dict (exclude None values)
    entry = source.model_dump(exclude_none=True)
    if source.type == "rss":
        entry.pop("seed_url", None)
        entry.pop("article_url_pattern", None)
        entry.pop("article_selector", None)
        entry.pop("js_required", None)

    data[category].append(entry)

    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return {"status": "added"}


@router.delete("/sources/{category}/{source_name}")
async def delete_source(category: str, source_name: str) -> dict[str, str]:
    """Delete a source by category and name."""
    path = _sources_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="sources.yaml not found")

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if category not in data:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    original_len = len(data[category])
    data[category] = [s for s in data[category] if s.get("name") != source_name]

    if len(data[category]) == original_len:
        raise HTTPException(status_code=404, detail=f"Source '{source_name}' not found")

    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return {"status": "deleted"}


@router.patch("/sources/{category}/{source_name}/toggle")
async def toggle_source(category: str, source_name: str) -> dict[str, Any]:
    """Toggle a source's enabled status."""
    path = _sources_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="sources.yaml not found")

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if category not in data:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    for source in data[category]:
        if source.get("name") == source_name:
            source["enabled"] = not source.get("enabled", True)
            with open(path, "w", encoding="utf-8") as f:
                yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
            return {"status": "toggled", "enabled": source["enabled"]}

    raise HTTPException(status_code=404, detail=f"Source '{source_name}' not found")


@router.put("/sources/{category}/{source_name}")
async def update_source(
    category: str,
    source_name: str,
    updated: dict[str, Any] = Body(...),
) -> dict[str, str]:
    """Update a source's fields by category and name."""
    path = _sources_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="sources.yaml not found")

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if category not in data:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    for source in data[category]:
        if source.get("name") == source_name:
            # Merge updates into the source
            for key, value in updated.items():
                if value is not None and value != "":
                    source[key] = value
                elif key in source and (value is None or value == ""):
                    # Allow clearing optional fields
                    if key not in ("name", "type", "enabled"):
                        source.pop(key, None)
            with open(path, "w", encoding="utf-8") as f:
                yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
            return {"status": "updated"}

    raise HTTPException(status_code=404, detail=f"Source '{source_name}' not found")


@router.post("/sources/{category}/batch-toggle")
async def batch_toggle_sources(
    category: str,
    body: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    """Enable or disable ALL sources in a category at once."""
    enabled = body.get("enabled", False)
    path = _sources_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="sources.yaml not found")

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if category not in data:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    count = 0
    for source in data[category]:
        source["enabled"] = enabled
        count += 1

    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return {"status": "updated", "count": count, "enabled": enabled}


# ── Pipeline config (Redis-backed, .env as initial fallback) ─────

_REDIS_CONFIG_KEY = "pipeline:config"


def _get_redis():
    return _redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)


def _read_env_file() -> dict[str, str]:
    """Read key=value pairs from the pipeline .env file (read-only fallback)."""
    path = _env_path()
    config: dict[str, str] = {}
    if not path.exists():
        return config
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            # Strip surrounding quotes from .env values (e.g. "08:00, 16:00" -> 08:00, 16:00)
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            config[key.strip()] = value
    return config


def _read_env_config() -> dict[str, str]:
    """Read pipeline config: Redis first, then .env file as fallback."""
    try:
        r = _get_redis()
        raw = r.get(_REDIS_CONFIG_KEY)
        if raw:
            redis_config = json.loads(raw)
            # Merge: .env file values as defaults, Redis overrides
            file_config = _read_env_file()
            file_config.update(redis_config)
            return file_config
    except Exception:
        pass
    return _read_env_file()


def _write_env_config(config: dict[str, str]) -> None:
    """Write pipeline config to Redis. No filesystem writes needed."""
    try:
        r = _get_redis()
        # Merge with existing Redis config
        existing_raw = r.get(_REDIS_CONFIG_KEY)
        existing = json.loads(existing_raw) if existing_raw else {}
        existing.update(config)
        r.set(_REDIS_CONFIG_KEY, json.dumps(existing))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to save pipeline config to Redis: {e}")


@router.get("/config", response_model=PipelineConfig)
async def get_config() -> PipelineConfig:
    """Read pipeline configuration from .env file."""
    env = _read_env_config()
    return PipelineConfig(
        llm_provider=env.get("LLM_PROVIDER", "gemini"),
        gemini_model=env.get("GEMINI_MODEL", "gemini-2.5-flash"),
        anthropic_model=env.get("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        ollama_base_url=env.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        ollama_model=env.get("OLLAMA_MODEL", "qwen3:32b"),
        ollama_num_ctx=int(env.get("OLLAMA_NUM_CTX", "16384")),
        ollama_think=env.get("OLLAMA_THINK", "true").lower() == "true",
        llm_temperature=float(env.get("LLM_TEMPERATURE", "0.7")),
        output_language=env.get("OUTPUT_LANGUAGE", "vi"),
        output_language_name=env.get("OUTPUT_LANGUAGE_NAME", "Vietnamese"),
        discovery_interval_minutes=int(env.get("DISCOVERY_INTERVAL_MINUTES", "30")),
        max_articles_per_run=int(env.get("MAX_ARTICLES_PER_RUN", "50")),
        scraper_delay_seconds=float(env.get("SCRAPER_DELAY_SECONDS", "2.0")),
        enable_dalle_fallback=env.get("ENABLE_DALLE_FALLBACK", "false").lower() == "true",
        max_articles_per_source=int(env.get("MAX_ARTICLES_PER_SOURCE", "10")),
        randomize_sources=env.get("RANDOMIZE_SOURCES", "true").lower() == "true",
        auto_approve=env.get("AUTO_APPROVE", "false").lower() == "true",
        auto_approve_select_image=env.get("AUTO_APPROVE_SELECT_IMAGE", "true").lower() == "true",
        auto_publish=env.get("AUTO_PUBLISH", "false").lower() == "true",
        scheduler_enabled=env.get("SCHEDULER_ENABLED", "false").lower() == "true",
        scheduler_mode=env.get("SCHEDULER_MODE", "interval"),
        scheduler_time_of_day=env.get("SCHEDULER_TIME_OF_DAY", "08:00, 16:00"),
        scheduler_interval_minutes=int(env.get("SCHEDULER_INTERVAL_MINUTES", "60")),
        scheduler_task=env.get("SCHEDULER_TASK", "full_pipeline"),
        scheduler_quiet_hours_start=int(env.get("SCHEDULER_QUIET_HOURS_START", "-1")),
        scheduler_quiet_hours_end=int(env.get("SCHEDULER_QUIET_HOURS_END", "-1")),
    )


@router.put("/config")
async def update_config(config: PipelineConfig = Body(...)) -> dict[str, str]:
    """Update pipeline configuration in .env file."""
    updates = {
        "LLM_PROVIDER": config.llm_provider,
        "GEMINI_MODEL": config.gemini_model,
        "ANTHROPIC_MODEL": config.anthropic_model,
        "OLLAMA_BASE_URL": config.ollama_base_url,
        "OLLAMA_MODEL": config.ollama_model,
        "OLLAMA_NUM_CTX": str(config.ollama_num_ctx),
        "OLLAMA_THINK": str(config.ollama_think).lower(),
        "LLM_TEMPERATURE": str(config.llm_temperature),
        "OUTPUT_LANGUAGE": config.output_language,
        "OUTPUT_LANGUAGE_NAME": config.output_language_name,
        "DISCOVERY_INTERVAL_MINUTES": str(config.discovery_interval_minutes),
        "MAX_ARTICLES_PER_RUN": str(config.max_articles_per_run),
        "SCRAPER_DELAY_SECONDS": str(config.scraper_delay_seconds),
        "ENABLE_DALLE_FALLBACK": str(config.enable_dalle_fallback).lower(),
        "MAX_ARTICLES_PER_SOURCE": str(config.max_articles_per_source),
        "RANDOMIZE_SOURCES": str(config.randomize_sources).lower(),
        "AUTO_APPROVE": str(config.auto_approve).lower(),
        "AUTO_APPROVE_SELECT_IMAGE": str(config.auto_approve_select_image).lower(),
        "AUTO_PUBLISH": str(config.auto_publish).lower(),
        "SCHEDULER_ENABLED": str(config.scheduler_enabled).lower(),
        "SCHEDULER_MODE": config.scheduler_mode,
        "SCHEDULER_TIME_OF_DAY": config.scheduler_time_of_day,
        "SCHEDULER_INTERVAL_MINUTES": str(config.scheduler_interval_minutes),
        "SCHEDULER_TASK": config.scheduler_task,
        "SCHEDULER_QUIET_HOURS_START": str(config.scheduler_quiet_hours_start),
        "SCHEDULER_QUIET_HOURS_END": str(config.scheduler_quiet_hours_end),
    }
    _write_env_config(updates)

    # If scheduler config changed, restart the scheduler
    _apply_scheduler_config(
        enabled=config.scheduler_enabled,
        mode=config.scheduler_mode,
        time_of_day=config.scheduler_time_of_day,
        interval=config.scheduler_interval_minutes,
        task=config.scheduler_task,
        quiet_start=config.scheduler_quiet_hours_start,
        quiet_end=config.scheduler_quiet_hours_end,
    )

    return {"status": "saved", "note": "Restart Celery workers for config changes to take effect"}


# ── Scheduled Pipeline Runner ────────────────────────────────────
# Runs as an asyncio background task inside the FastAPI process.
# Dispatches Celery tasks at the configured interval.

import asyncio
from datetime import datetime, timezone, timedelta

_scheduler_task: asyncio.Task | None = None
_scheduler_state: dict[str, Any] = {
    "enabled": False,
    "mode": "interval",
    "time_of_day": "08:00, 16:00",
    "interval_minutes": 60,
    "task": "full_pipeline",
    "quiet_start": -1,
    "quiet_end": -1,
    "running": False,
    "last_run_at": None,
    "next_run_at": None,
    "total_runs": 0,
    "last_error": None,
}


def _is_quiet_hours(quiet_start: int, quiet_end: int) -> bool:
    """Check if the current local hour falls within quiet hours."""
    if quiet_start < 0 or quiet_end < 0:
        return False
    current_hour = datetime.now().astimezone().hour
    if quiet_start <= quiet_end:
        return quiet_start <= current_hour < quiet_end
    else:
        # Wraps around midnight, e.g. 22–06
        return current_hour >= quiet_start or current_hour < quiet_end


def _get_next_daily_sleep(now: datetime, time_str: str) -> float:
    """Calculate seconds until next run time in 'daily' mode (local server time)."""
    try:
        times = []
        # Strip any surrounding/embedded quotes and split on comma
        cleaned = time_str.replace('"', '').replace("'", '').replace(" ", "")
        for t in cleaned.split(","):
            if not t: continue
            parts = t.split(":")
            if len(parts) != 2: continue
            h, m = int(parts[0]), int(parts[1])
            if 0 <= h <= 23 and 0 <= m <= 59:
                times.append((h, m))
            
        if not times:
            return 3600.0 # Fallback 1 hour
            
        next_dt = None
        for h, m in sorted(times):
            candidate = now.replace(hour=h, minute=m, second=0, microsecond=0)
            if candidate > now:
                next_dt = candidate
                break
                
        # wrapped to next day
        if next_dt is None:
            first_h, first_m = sorted(times)[0]
            next_dt = now.replace(hour=first_h, minute=first_m, second=0, microsecond=0) + timedelta(days=1)
            
        return (next_dt - now).total_seconds()
    except Exception:
        return 3600.0


async def _scheduler_loop():
    """Background loop that dispatches pipeline tasks on schedule."""
    global _scheduler_state

    while _scheduler_state["enabled"]:
        mode = _scheduler_state.get("mode", "interval")
        time_of_day = _scheduler_state.get("time_of_day", "08:00")
        interval = _scheduler_state["interval_minutes"]
        task_name = _scheduler_state["task"]
        quiet_start = _scheduler_state["quiet_start"]
        quiet_end = _scheduler_state["quiet_end"]

        now = datetime.now().astimezone()

        if mode == "daily":
            sleep_sec = max(0, _get_next_daily_sleep(now, time_of_day))
            _scheduler_state["next_run_at"] = (now + timedelta(seconds=sleep_sec)).isoformat()
        else:
            sleep_sec = interval * 60
            _scheduler_state["next_run_at"] = (now + timedelta(seconds=sleep_sec)).isoformat()

        try:
            # Sleep for the calculated duration
            await asyncio.sleep(sleep_sec)

            # Re-check if still enabled after sleep
            if not _scheduler_state["enabled"]:
                break

            # Check quiet hours (mostly makes sense for interval mode)
            if mode == "interval" and _is_quiet_hours(quiet_start, quiet_end):
                _log_scheduler_activity("Skipped — quiet hours active")
                continue

            # Check if pipeline is stopped
            import redis as _redis_lib
            try:
                _r = _redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
                if _r.exists("pipeline:stopped"):
                    _log_scheduler_activity("Skipped — pipeline is stopped")
                    continue
            except Exception:
                pass

            # Dispatch the task
            _scheduler_state["running"] = True
            _log_scheduler_activity(f"Running scheduled {task_name}")

            celery = _get_celery()
            task_ids = []

            if task_name in ("discover_feeds", "full_pipeline"):
                result = celery.send_task(
                    "workers.tasks.discover_feeds",
                    kwargs={},
                    queue="default",
                )
                task_ids.append(result.id)

            if task_name in ("discover_crawl", "full_pipeline"):
                result = celery.send_task(
                    "workers.tasks.discover_crawl",
                    kwargs={},
                    queue="default",
                )
                task_ids.append(result.id)

            _scheduler_state["last_run_at"] = datetime.now().astimezone().isoformat()
            _scheduler_state["total_runs"] += 1
            _scheduler_state["last_error"] = None
            _scheduler_state["running"] = False

            _log_scheduler_activity(
                f"Dispatched {len(task_ids)} task(s) for {task_name}",
                status="done",
            )

        except asyncio.CancelledError:
            break
        except Exception as e:
            _scheduler_state["running"] = False
            _scheduler_state["last_error"] = str(e)
            _log_scheduler_activity(f"Error: {str(e)[:100]}", status="error")
            # Wait a bit before retrying on error
            await asyncio.sleep(30)

    _scheduler_state["running"] = False
    _scheduler_state["next_run_at"] = None


def _log_scheduler_activity(detail: str, status: str = "running"):
    """Push a scheduler event to the pipeline activity feed."""
    import redis as _redis_lib
    try:
        _r = _redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        entry = json.dumps({
            "ts": datetime.now().astimezone().isoformat(),
            "step": "⏰ Scheduler",
            "detail": detail[:120],
            "status": status,
        })
        _r.lpush("pipeline:activity", entry)
        _r.ltrim("pipeline:activity", 0, 49)
    except Exception:
        pass


def _apply_scheduler_config(
    enabled: bool,
    mode: str,
    time_of_day: str,
    interval: int,
    task: str,
    quiet_start: int,
    quiet_end: int,
):
    """Apply scheduler configuration — starts or stops the background task."""
    global _scheduler_task, _scheduler_state

    # Update state
    _scheduler_state["enabled"] = enabled
    _scheduler_state["mode"] = mode
    _scheduler_state["time_of_day"] = time_of_day
    _scheduler_state["interval_minutes"] = interval
    _scheduler_state["task"] = task
    _scheduler_state["quiet_start"] = quiet_start
    _scheduler_state["quiet_end"] = quiet_end

    # Cancel existing scheduler if running
    if _scheduler_task is not None and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None

    if enabled:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                _scheduler_task = loop.create_task(_scheduler_loop())
                _ensure_watchdog()  # Always run watchdog alongside scheduler
                msg = f"every {interval}m" if mode == "interval" else f"at {time_of_day} local"
                _log_scheduler_activity(
                    f"Started config: {mode} ({msg}) -> {task}",
                    status="done",
                )
        except RuntimeError:
            # No event loop available (e.g. during import) — will be started on first request
            pass


@router.get("/scheduler/status")
async def get_scheduler_status() -> dict[str, Any]:
    """Return the current scheduler state."""
    return {
        "enabled": _scheduler_state["enabled"],
        "mode": _scheduler_state.get("mode", "interval"),
        "time_of_day": _scheduler_state.get("time_of_day", "08:00"),
        "interval_minutes": _scheduler_state["interval_minutes"],
        "task": _scheduler_state["task"],
        "quiet_hours": {
            "start": _scheduler_state["quiet_start"],
            "end": _scheduler_state["quiet_end"],
        },
        "running": _scheduler_state["running"],
        "last_run_at": _scheduler_state["last_run_at"],
        "next_run_at": _scheduler_state["next_run_at"],
        "total_runs": _scheduler_state["total_runs"],
        "last_error": _scheduler_state["last_error"],
        "is_quiet_hours": _is_quiet_hours(
            _scheduler_state["quiet_start"],
            _scheduler_state["quiet_end"],
        ),
    }


@router.post("/scheduler/start")
async def start_scheduler() -> dict[str, Any]:
    """Manually start the scheduler using current config."""
    env = _read_env_config()
    _apply_scheduler_config(
        enabled=True,
        mode=env.get("SCHEDULER_MODE", "interval"),
        time_of_day=env.get("SCHEDULER_TIME_OF_DAY", "08:00, 16:00"),
        interval=int(env.get("SCHEDULER_INTERVAL_MINUTES", "60")),
        task=env.get("SCHEDULER_TASK", "full_pipeline"),
        quiet_start=int(env.get("SCHEDULER_QUIET_HOURS_START", "-1")),
        quiet_end=int(env.get("SCHEDULER_QUIET_HOURS_END", "-1")),
    )
    # Also update the .env
    _write_env_config({"SCHEDULER_ENABLED": "true"})
    return {"status": "started", "message": "Scheduler started"}


@router.post("/scheduler/stop")
async def stop_scheduler() -> dict[str, Any]:
    """Stop the scheduler."""
    global _scheduler_task, _scheduler_state
    _scheduler_state["enabled"] = False
    if _scheduler_task is not None and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
    _scheduler_state["next_run_at"] = None
    # Also update the .env
    _write_env_config({"SCHEDULER_ENABLED": "false"})
    _log_scheduler_activity("Stopped", status="done")
    return {"status": "stopped", "message": "Scheduler stopped"}


@router.post("/scheduler/run-now")
async def scheduler_run_now() -> dict[str, Any]:
    """Trigger an immediate scheduled run (one-shot)."""
    env = _read_env_config()
    task_name = env.get("SCHEDULER_TASK", "full_pipeline")

    celery = _get_celery()
    task_ids = []

    # Clear stop flag
    import redis as _redis_lib
    try:
        _r = _redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        _r.delete("pipeline:stopped")
    except Exception:
        pass

    if task_name in ("discover_feeds", "full_pipeline"):
        result = celery.send_task(
            "workers.tasks.discover_feeds",
            kwargs={},
            queue="default",
        )
        task_ids.append(result.id)

    if task_name in ("discover_crawl", "full_pipeline"):
        result = celery.send_task(
            "workers.tasks.discover_crawl",
            kwargs={},
            queue="default",
        )
        task_ids.append(result.id)

    _scheduler_state["last_run_at"] = datetime.now().astimezone().isoformat()
    _scheduler_state["total_runs"] += 1
    _log_scheduler_activity(
        f"Manual trigger — {task_name} ({len(task_ids)} tasks)",
        status="done",
    )

    return {
        "status": "dispatched",
        "task_ids": task_ids,
        "task": task_name,
        "message": f"Dispatched {len(task_ids)} task(s)",
    }


# ── Auto-initialize scheduler from .env on startup ──────────────

def _init_scheduler_from_env():
    """Check .env and start scheduler if enabled. Called once on import."""
    try:
        env = _read_env_config()
        if env.get("SCHEDULER_ENABLED", "false").lower() == "true":
            _scheduler_state["enabled"] = True
            _scheduler_state["mode"] = env.get("SCHEDULER_MODE", "interval")
            _scheduler_state["time_of_day"] = env.get("SCHEDULER_TIME_OF_DAY", "08:00, 16:00")
            _scheduler_state["interval_minutes"] = int(env.get("SCHEDULER_INTERVAL_MINUTES", "60"))
            _scheduler_state["task"] = env.get("SCHEDULER_TASK", "full_pipeline")
            _scheduler_state["quiet_start"] = int(env.get("SCHEDULER_QUIET_HOURS_START", "-1"))
            _scheduler_state["quiet_end"] = int(env.get("SCHEDULER_QUIET_HOURS_END", "-1"))
            # The actual asyncio task will be created when the first request comes in
            # (since event loop might not be running at import time)
    except Exception:
        pass


_init_scheduler_from_env()


# ── Auto-Recovery Watchdog ───────────────────────────────────────
# Runs every 10 minutes to detect and re-enqueue stuck tasks.
# This replaces the manual "Retry Stuck" button with automatic
# self-healing. Tasks can get stuck when:
#   - A worker crashes mid-execution
#   - All retries are exhausted but on_failure handler didn't fire
#   - Network issues cause task loss between broker and worker

_WATCHDOG_INTERVAL = 60   # 1 minute — primary retry mechanism
_STUCK_THRESHOLD_MINUTES = 2  # re-enqueue if stuck longer than this
_watchdog_task: asyncio.Task | None = None
_watchdog_state: dict[str, Any] = {
    "enabled": False,
    "last_run_at": None,
    "last_recovered": {},
    "total_recovered": 0,
}


async def _watchdog_loop():
    """Background loop that auto-recovers stuck pipeline tasks."""
    global _watchdog_state
    import logging
    _wlog = logging.getLogger("pipeline.watchdog")

    _watchdog_state["enabled"] = True

    while _watchdog_state["enabled"]:
        try:
            await asyncio.sleep(_WATCHDOG_INTERVAL)

            if not _watchdog_state["enabled"]:
                break

            # Skip if pipeline is stopped
            try:
                _r = _redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
                if _r.exists("pipeline:stopped"):
                    continue
            except Exception:
                continue

            # Run stuck recovery in a thread (sync DB access)
            counts = await asyncio.to_thread(_recover_stuck_tasks)

            _watchdog_state["last_run_at"] = datetime.now().astimezone().isoformat()
            _watchdog_state["last_recovered"] = counts

            total = sum(counts.values())
            if total > 0:
                _watchdog_state["total_recovered"] += total
                _log_scheduler_activity(
                    f"🔧 Watchdog recovered {total} stuck tasks: {counts}",
                    status="done",
                )
                _wlog.info(f"Watchdog recovered {total} stuck tasks: {counts}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            _wlog.error(f"Watchdog error: {e}")
            await asyncio.sleep(30)

    _watchdog_state["enabled"] = False


def _recover_stuck_tasks() -> dict[str, int]:
    """Find and re-enqueue tasks stuck in intermediate states.

    Only recovers articles that have been stuck for longer than
    _STUCK_THRESHOLD_MINUTES to avoid interfering with tasks that
    are still legitimately running.
    """
    from sqlalchemy import text

    celery = _get_celery()
    engine = _get_engine()
    counts = {"scrape": 0, "rewrite": 0, "images": 0}
    threshold = f"{_STUCK_THRESHOLD_MINUTES} minutes"

    with engine.connect() as conn:
        # 1. Raw articles stuck at 'new' for too long → re-enqueue scrape
        rows = conn.execute(text(
            "SELECT id, url, url_hash, source_name, source_type, title, category "
            "FROM raw_articles "
            "WHERE status = 'new' "
            f"AND created_at < NOW() - INTERVAL '{threshold}'"
        )).fetchall()
        for row in rows:
            celery.send_task(
                "workers.tasks.scrape_article_task",
                args=[{
                    "url": row[1], "url_hash": row[2],
                    "source_name": row[3], "source_type": row[4],
                    "title": row[5], "category": row[6],
                }],
                queue="scraper_queue",
            )
            counts["scrape"] += 1

        # 2. Raw articles stuck at 'processing' → re-enqueue rewrite
        rows = conn.execute(text(
            "SELECT id, source_name FROM raw_articles "
            "WHERE status = 'processing' "
            f"AND created_at < NOW() - INTERVAL '{threshold}'"
        )).fetchall()
        for row in rows:
            celery.send_task(
                "workers.tasks.rewrite_article_task",
                args=[str(row[0]), row[1] or "", "vi"],
                queue="rewriter_queue",
            )
            counts["rewrite"] += 1

        # 3. Articles stuck at 'image_pending' → re-enqueue image search
        rows = conn.execute(text(
            "SELECT id FROM articles "
            "WHERE status = 'image_pending' "
            f"AND created_at < NOW() - INTERVAL '{threshold}'"
        )).fetchall()
        for row in rows:
            celery.send_task(
                "workers.tasks.search_images_task",
                args=[str(row[0])],
                queue="image_search_queue",
            )
            counts["images"] += 1

    return counts


@router.get("/watchdog/status")
async def get_watchdog_status() -> dict[str, Any]:
    """Return the current watchdog state."""
    return {
        "enabled": _watchdog_state["enabled"],
        "interval_seconds": _WATCHDOG_INTERVAL,
        "stuck_threshold_minutes": _STUCK_THRESHOLD_MINUTES,
        "last_run_at": _watchdog_state["last_run_at"],
        "last_recovered": _watchdog_state["last_recovered"],
        "total_recovered": _watchdog_state["total_recovered"],
    }


def _ensure_watchdog():
    """Start the watchdog if not already running."""
    global _watchdog_task
    if _watchdog_task is None or _watchdog_task.done():
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                _watchdog_task = loop.create_task(_watchdog_loop())
        except RuntimeError:
            pass
    # Also start auto-publisher
    _ensure_auto_publisher()


# ── Auto-Publisher (approved → Notion) ───────────────────────────
# When auto_approve is enabled, this loop watches for articles with
# status='approved' and publishes them to Notion automatically.
# This completes the fully automated pipeline:
#   Discover → Scrape → Curate → Rewrite → Images → Approved → Published (live)

_AUTO_PUBLISH_INTERVAL = 30  # seconds
_auto_publish_task: asyncio.Task | None = None
_auto_publish_state: dict[str, Any] = {
    "enabled": False,
    "last_run_at": None,
    "total_published": 0,
    "last_error": None,
}


async def _auto_publish_loop():
    """Background loop that publishes approved articles to Notion."""
    global _auto_publish_state
    import logging
    _plog = logging.getLogger("pipeline.auto_publish")

    _auto_publish_state["enabled"] = True

    while _auto_publish_state["enabled"]:
        try:
            await asyncio.sleep(_AUTO_PUBLISH_INTERVAL)

            if not _auto_publish_state["enabled"]:
                break

            # Check if auto_publish is enabled in config
            try:
                _r = _redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
                raw = _r.get("pipeline:config")
                if raw:
                    conf = json.loads(raw)
                    # Handle both boolean True and string "true"
                    val = conf.get("AUTO_PUBLISH", False)
                    is_enabled = val is True or (isinstance(val, str) and val.lower() == "true")
                    if not is_enabled:
                        continue  # auto-publish disabled, skip
                else:
                    continue  # no config, skip
            except Exception as _exc:
                _plog.debug(f"Config check failed: {_exc}")
                continue

            # Find approved articles not yet published to Notion
            published_count = await _auto_publish_articles()

            _auto_publish_state["last_run_at"] = datetime.now().astimezone().isoformat()

            if published_count > 0:
                _auto_publish_state["total_published"] += published_count
                _auto_publish_state["last_error"] = None
                _log_scheduler_activity(
                    f"📤 Auto-published {published_count} article{'s' if published_count != 1 else ''} to Notion",
                    status="done",
                )
                _plog.info(f"Auto-published {published_count} articles to Notion")

        except asyncio.CancelledError:
            break
        except Exception as e:
            _auto_publish_state["last_error"] = str(e)
            _plog.error(f"Auto-publish error: {e}")
            await asyncio.sleep(10)

    _auto_publish_state["enabled"] = False


async def _auto_publish_articles() -> int:
    """Find approved articles and publish them to Notion. Returns count published."""
    from sqlalchemy import select
    from ..database import get_db
    from ..models import Article
    from ..notion import push_to_notion
    import logging
    _plog = logging.getLogger("pipeline.auto_publish")

    published = 0

    async for db in get_db():
        # Find articles that are approved but not yet published to Notion
        result = await db.execute(
            select(Article)
            .where(Article.status == "approved")
            .where(Article.notion_page_id.is_(None))
            .limit(10)  # Process in batches to avoid overloading Notion API
        )
        articles = result.scalars().all()

        if not articles:
            return 0

        for article in articles:
            try:
                _log_scheduler_activity(
                    f"📤 Auto-publishing: {(article.title or 'Untitled')[:60]}…",
                    status="running",
                )

                notion_page_id = await push_to_notion(article)

                article.notion_page_id = notion_page_id
                article.published_to_notion_at = datetime.now(timezone.utc)
                article.status = "published"
                await db.commit()
                await db.refresh(article)

                published += 1
                _plog.info(
                    f"Auto-published: {article.title[:60]} → {notion_page_id}"
                )

            except Exception as e:
                _plog.error(f"Failed to auto-publish {article.id}: {e}")
                _log_scheduler_activity(
                    f"📤 Auto-publish failed: {(article.title or 'Untitled')[:60]} — {str(e)[:80]}",
                    status="error",
                )
                # Don't fail the whole batch — continue with next article
                await db.rollback()
                continue

    return published


@router.get("/auto-publish/status")
async def get_auto_publish_status() -> dict[str, Any]:
    """Return the current auto-publisher state."""
    return {
        "enabled": _auto_publish_state["enabled"],
        "interval_seconds": _AUTO_PUBLISH_INTERVAL,
        "last_run_at": _auto_publish_state["last_run_at"],
        "total_published": _auto_publish_state["total_published"],
        "last_error": _auto_publish_state["last_error"],
    }


def _ensure_auto_publisher():
    """Start the auto-publisher if not already running."""
    global _auto_publish_task
    if _auto_publish_task is None or _auto_publish_task.done():
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                _auto_publish_task = loop.create_task(_auto_publish_loop())
        except RuntimeError:
            pass


# Auto-start scheduler on first request if enabled but task not yet created
@router.get("/scheduler/ensure-started")
async def ensure_scheduler_started() -> dict[str, str]:
    """Internal: ensures the scheduler background task is running if enabled."""
    global _scheduler_task
    if _scheduler_state["enabled"] and (_scheduler_task is None or _scheduler_task.done()):
        _scheduler_task = asyncio.get_event_loop().create_task(_scheduler_loop())
    # Always start watchdog alongside scheduler
    _ensure_watchdog()
    status = "started" if _scheduler_state["enabled"] else "disabled"
    return {"status": status, "watchdog": "running" if _watchdog_state["enabled"] else "starting"}


# ── Worker Management ────────────────────────────────────────────

# In-memory tracker for spawned worker processes
_spawned_workers: dict[str, dict[str, Any]] = {}


def _find_celery_cmd() -> str:
    """Locate the celery executable (venv or system PATH).

    In Docker, the venv scripts are stale copies and won't run —
    we verify the candidate is actually executable before using it.
    """
    import shutil

    pipeline_dir = settings.pipeline_dir
    candidates = [
        pipeline_dir / ".venv" / "Scripts" / "celery.exe",
        pipeline_dir / ".venv" / "Scripts" / "celery",
        pipeline_dir / ".venv" / "bin" / "celery",
    ]

    for c in candidates:
        if c.exists():
            # Verify the script's shebang Python actually exists
            try:
                first_line = c.read_text(errors="replace").split("\n")[0]
                if first_line.startswith("#!"):
                    interp = first_line[2:].strip().split()[0]
                    if not Path(interp).exists():
                        continue  # stale venv — skip
                return str(c)
            except Exception:
                continue

    # Fallback: system-installed celery
    return shutil.which("celery") or "celery"


def _check_redis() -> tuple[bool, str]:
    """Quick check if Redis is reachable. Returns (ok, message)."""
    import redis as redis_lib
    try:
        r = redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        r.ping()
        return True, "Redis is reachable"
    except Exception as e:
        return False, f"Cannot connect to Redis at {settings.REDIS_URL}: {e}"


def _get_worker_stage(info: dict) -> str:
    """Determine the live stage of a tracked worker process."""
    import psutil

    pid = info.get("pid")
    if not pid:
        return "failed"  # never started

    # Check if process is still alive
    try:
        proc = psutil.Process(pid)
        if proc.status() == psutil.STATUS_ZOMBIE:
            return "exited"
    except psutil.NoSuchProcess:
        # Process is gone — check log for clues
        log_path = info.get("log_file")
        if log_path and Path(log_path).exists():
            tail = Path(log_path).read_text(encoding="utf-8", errors="replace")[-2000:]
            if "Cannot connect" in tail or "Error" in tail and "connecting" in tail:
                return "connection_failed"
            if "ready" in tail.lower():
                return "exited"  # ran but stopped
        return "exited"
    except Exception:
        return "unknown"

    # Process is alive — check log to determine stage
    log_path = info.get("log_file")
    if log_path and Path(log_path).exists():
        try:
            tail = Path(log_path).read_text(encoding="utf-8", errors="replace")[-3000:]
        except Exception:
            tail = ""

        if "ready" in tail.lower() and "celery@" in tail.lower():
            return "running"
        if "Cannot connect" in tail or ("Error" in tail and "connecting" in tail):
            return "connection_failed"
        if "Trying again" in tail:
            return "retrying_connection"
        if "celery@" in tail.lower() or "[tasks]" in tail:
            return "connecting"

    # Process alive but no logs yet — just spawned
    return "spawning"


@router.post("/worker/restart")
async def restart_worker() -> dict[str, str]:
    """Restart the Celery worker: shutdown old, spawn new."""
    import asyncio
    import subprocess
    import time

    celery = _get_celery()

    # 1. Pre-check Redis connectivity
    redis_ok, redis_msg = _check_redis()
    if not redis_ok:
        raise HTTPException(status_code=503, detail=f"Cannot start worker: {redis_msg}")

    # 2. Broadcast shutdown to all workers
    try:
        celery.control.broadcast("shutdown")
    except Exception:
        pass  # Worker might already be down

    # 3. Wait a moment for the old worker to exit
    await asyncio.sleep(3)

    # 4. Start a new worker with log capture
    pipeline_dir = settings.pipeline_dir
    celery_cmd = _find_celery_cmd()
    worker_name = f"main-{int(time.time()) % 10000}"

    cmd = [
        celery_cmd,
        "-A", "workers.celery_app",
        "worker",
        f"--hostname={worker_name}@%h",
        "--loglevel=INFO",
        "--pool=solo",
        "-Q", "default,scraper_queue,rewriter_queue,image_search_queue",
    ]

    # Log file for inspectability
    logs_dir = pipeline_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    log_file = logs_dir / f"{worker_name}.log"

    try:
        import os
        log_fh = open(log_file, "w", encoding="utf-8")
        # Build creation kwargs — Windows vs Linux differ
        popen_kwargs: dict[str, Any] = {
            "cwd": str(pipeline_dir),
            "stdout": log_fh,
            "stderr": subprocess.STDOUT,
            "env": {**os.environ},  # inherit container env (DATABASE_URL, REDIS_URL etc.)
        }
        # Windows-only process group flags
        if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
            popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        else:
            popen_kwargs["start_new_session"] = True

        proc = subprocess.Popen(cmd, **popen_kwargs)
        _spawned_workers[worker_name] = {
            "pid": proc.pid,
            "log_file": str(log_file),
            "queues": "default,scraper_queue,rewriter_queue,image_search_queue",
            "started_at": time.time(),
            "cmd": cmd,
        }
        return {"status": "restarted", "message": f"Worker '{worker_name}' started successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start worker: {e}")


@router.get("/worker/status")
async def worker_status() -> dict[str, Any]:
    """Check Celery workers + system CPU/memory metrics."""
    import psutil

    celery = _get_celery()

    # ── System metrics ──
    cpu_percent = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    system = {
        "cpu_percent": cpu_percent,
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / (1024 ** 3), 1),
        "memory_total_gb": round(mem.total / (1024 ** 3), 1),
    }

    try:
        # ping with 2s timeout
        response = celery.control.ping(timeout=2.0)
        # Also get stats for each worker
        inspect = celery.control.inspect(timeout=2.0)
        stats = inspect.stats() or {}
        active = inspect.active() or {}

        workers = []
        for entry in response:
            for name, status in entry.items():
                worker_stats = stats.get(name, {})
                worker_active = active.get(name, [])

                # Extract useful stats
                pool_info = worker_stats.get("pool", {})
                total_tasks = sum(
                    worker_stats.get("total", {}).values()
                ) if isinstance(worker_stats.get("total"), dict) else 0

                workers.append({
                    "name": name,
                    "status": "online" if status.get("ok") == "pong" else "unknown",
                    "active_tasks": len(worker_active),
                    "total_processed": total_tasks,
                    "pool": pool_info.get("implementation", "unknown"),
                    "concurrency": pool_info.get("max-concurrency", 1),
                    "pid": worker_stats.get("pid", None),
                    "queues": [
                        q["name"] for q in
                        (inspect.active_queues() or {}).get(name, [])
                    ],
                })
        return {"alive": len(workers) > 0, "workers": workers, "system": system}
    except Exception:
        return {"alive": False, "workers": [], "system": system}


class SpawnWorkerRequest(BaseModel):
    queues: list[str] = ["default", "scraper_queue", "rewriter_queue", "image_search_queue"]
    name: str | None = None  # auto-generated if not specified


@router.post("/worker/spawn")
async def spawn_worker(req: SpawnWorkerRequest) -> dict[str, Any]:
    """Spawn a new Celery worker with a unique name and queue assignment."""
    import subprocess
    import time

    pipeline_dir = settings.pipeline_dir

    # 1. Pre-check Redis connectivity
    redis_ok, redis_msg = _check_redis()
    if not redis_ok:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot start worker — Redis is not reachable. {redis_msg}. "
                   f"Make sure docker compose is running (postgres + redis)."
        )

    # 2. Auto-generate name if not specified
    worker_name = req.name
    if not worker_name:
        worker_name = f"worker-{int(time.time()) % 10000}"

    # 3. Find celery executable
    celery_cmd = _find_celery_cmd()
    queues_str = ",".join(req.queues) if req.queues else "default"

    cmd = [
        celery_cmd,
        "-A", "workers.celery_app",
        "worker",
        f"--hostname={worker_name}@%h",
        "--loglevel=INFO",
        "--pool=solo",
        "-Q", queues_str,
    ]

    # 4. Create log file for output capture
    logs_dir = pipeline_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    log_file = logs_dir / f"{worker_name}.log"

    try:
        import os
        log_fh = open(log_file, "w", encoding="utf-8")
        popen_kwargs: dict[str, Any] = {
            "cwd": str(pipeline_dir),
            "stdout": log_fh,
            "stderr": subprocess.STDOUT,
            "env": {**os.environ},
        }
        if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
            popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        else:
            popen_kwargs["start_new_session"] = True

        proc = subprocess.Popen(cmd, **popen_kwargs)

        # Track the spawned process
        _spawned_workers[worker_name] = {
            "pid": proc.pid,
            "log_file": str(log_file),
            "queues": queues_str,
            "started_at": time.time(),
            "cmd": cmd,
        }

        return {
            "status": "spawned",
            "name": worker_name,
            "queues": queues_str,
            "pid": proc.pid,
            "log_file": str(log_file),
            "message": f"Worker '{worker_name}' started successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to spawn worker: {e}")


@router.post("/worker/stop/{worker_name}")
async def stop_worker(worker_name: str) -> dict[str, str]:
    """Gracefully shut down a specific worker by name."""
    celery = _get_celery()
    try:
        # Send shutdown signal to the specific worker
        celery.control.broadcast("shutdown", destination=[worker_name])

        # Also try to kill tracked local process
        for tracked_name, info in list(_spawned_workers.items()):
            # Match by celery hostname (worker_name may be 'celery@worker-xxx@host')
            if tracked_name in worker_name or worker_name in tracked_name:
                import psutil
                try:
                    proc = psutil.Process(info["pid"])
                    proc.terminate()
                except Exception:
                    pass
                _spawned_workers.pop(tracked_name, None)
                break

        return {
            "status": "stopping",
            "name": worker_name,
            "message": f"Shutdown signal sent to '{worker_name}'",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop worker: {e}")


@router.get("/worker/processes")
async def list_worker_processes() -> dict[str, Any]:
    """List all tracked spawned worker processes with their live stage."""
    import time

    processes = []
    for name, info in list(_spawned_workers.items()):
        stage = _get_worker_stage(info)
        uptime = int(time.time() - info.get("started_at", time.time()))

        processes.append({
            "name": name,
            "pid": info.get("pid"),
            "stage": stage,
            "queues": info.get("queues", ""),
            "uptime_seconds": uptime,
            "log_file": info.get("log_file", ""),
        })

    # Also scan for orphaned log files (workers spawned before server restart)
    logs_dir = settings.pipeline_dir / "logs"
    if logs_dir.exists():
        tracked_names = set(_spawned_workers.keys())
        for log_path in logs_dir.glob("*.log"):
            wname = log_path.stem
            if wname not in tracked_names:
                processes.append({
                    "name": wname,
                    "pid": None,
                    "stage": "unknown",
                    "queues": "",
                    "uptime_seconds": 0,
                    "log_file": str(log_path),
                })

    return {"processes": processes}


@router.get("/worker/logs/{worker_name}")
async def get_worker_logs(worker_name: str, lines: int = 100) -> dict[str, Any]:
    """Read the tail of a spawned worker's log file."""
    # Check tracked workers first
    info = _spawned_workers.get(worker_name)
    log_file = None

    if info:
        log_file = Path(info["log_file"])
    else:
        # Try to find log file by name
        candidate = settings.pipeline_dir / "logs" / f"{worker_name}.log"
        if candidate.exists():
            log_file = candidate

    if not log_file or not log_file.exists():
        raise HTTPException(status_code=404, detail=f"No log file found for worker '{worker_name}'")

    try:
        content = log_file.read_text(encoding="utf-8", errors="replace")
        all_lines = content.splitlines()
        tail = all_lines[-lines:] if len(all_lines) > lines else all_lines

        stage = _get_worker_stage(info) if info else "unknown"

        return {
            "worker_name": worker_name,
            "stage": stage,
            "pid": info.get("pid") if info else None,
            "total_lines": len(all_lines),
            "lines": tail,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read log: {e}")


@router.get("/worker/redis-check")
async def check_redis_status() -> dict[str, Any]:
    """Check if Redis broker is reachable."""
    ok, msg = _check_redis()
    return {"ok": ok, "message": msg, "redis_url": settings.REDIS_URL}


@router.get("/activity")
async def get_activity() -> list[dict[str, Any]]:
    """Read recent pipeline task activity from Redis."""
    import json
    import redis

    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        items = r.lrange("pipeline:activity", 0, 19)
        return [json.loads(item) for item in items]
    except Exception:
        return []

# ── Ollama Status ────────────────────────────────────────────────

@router.get("/ollama/status")
async def ollama_status() -> dict[str, Any]:
    """Check Ollama server status, loaded models, and GPU usage."""
    import httpx

    env = _read_env_config()
    llm_provider = env.get("LLM_PROVIDER", "gemini").lower()
    ollama_base = env.get("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = env.get("OLLAMA_MODEL", "qwen3:14b")
    ollama_think = env.get("OLLAMA_THINK", "true").lower() == "true"
    num_ctx = int(env.get("OLLAMA_NUM_CTX", "8192"))

    result: dict[str, Any] = {
        "provider": llm_provider,
        "configured_model": ollama_model,
        "think_enabled": ollama_think,
        "num_ctx": num_ctx,
        "server_online": False,
        "loaded_models": [],
        "available_models": [],
    }

    if llm_provider != "ollama":
        result["note"] = f"LLM provider is '{llm_provider}', not ollama"
        return result

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check server health
            try:
                resp = await client.get(f"{ollama_base}/api/tags")
                if resp.status_code == 200:
                    result["server_online"] = True
                    tags = resp.json()
                    result["available_models"] = [
                        {"name": m["name"], "size_gb": round(m.get("size", 0) / 1e9, 1)}
                        for m in tags.get("models", [])
                    ]
            except Exception:
                return result

            # Check loaded/running models
            try:
                resp = await client.get(f"{ollama_base}/api/ps")
                if resp.status_code == 200:
                    ps = resp.json()
                    for m in ps.get("models", []):
                        vram_gb = round(m.get("size_vram", 0) / 1e9, 1)
                        total_gb = round(m.get("size", 0) / 1e9, 1)
                        result["loaded_models"].append({
                            "name": m.get("name", ""),
                            "size_gb": total_gb,
                            "vram_gb": vram_gb,
                            "processor": "GPU" if vram_gb >= total_gb * 0.9 else f"GPU+CPU ({vram_gb}/{total_gb} GB)",
                            "expires": m.get("expires_at", ""),
                        })
            except Exception:
                pass

    except Exception:
        pass

    return result


@router.post("/ollama/preload")
async def preload_ollama() -> dict[str, str]:
    """Pre-warm the configured Ollama model into GPU memory."""
    import httpx

    env = _read_env_config()
    ollama_base = env.get("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = env.get("OLLAMA_MODEL", "qwen3:14b")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{ollama_base}/api/chat", json={
                "model": ollama_model,
                "messages": [{"role": "user", "content": "Say OK"}],
                "stream": False,
                "options": {"num_predict": 5},
            })
            if resp.status_code == 200:
                return {"status": "loaded", "model": ollama_model}
            else:
                return {"status": "error", "message": resp.text[:200]}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}


@router.post("/ollama/offload")
async def offload_ollama() -> dict[str, str]:
    """Unload the Ollama model from GPU/RAM to free resources."""
    import httpx

    env = _read_env_config()
    ollama_base = env.get("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = env.get("OLLAMA_MODEL", "qwen3:14b")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Ollama unloads by sending keep_alive=0
            resp = await client.post(f"{ollama_base}/api/chat", json={
                "model": ollama_model,
                "messages": [{"role": "user", "content": ""}],
                "stream": False,
                "keep_alive": 0,
            })
            if resp.status_code == 200:
                return {"status": "offloaded", "model": ollama_model}
            else:
                return {"status": "error", "message": resp.text[:200]}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}


# ── Composer: side-by-side LLM comparison ────────────────────────

# In-memory scrape cache: URL -> {scraped_data, timestamp}
_scrape_cache: dict[str, dict[str, Any]] = {}
_SCRAPE_CACHE_TTL = 1800  # 30 minutes


def _get_cached_scrape(url: str) -> dict | None:
    """Return cached scrape data if still fresh, else None."""
    import time
    entry = _scrape_cache.get(url)
    if entry and (time.time() - entry["timestamp"]) < _SCRAPE_CACHE_TTL:
        return entry["data"]
    if entry:
        _scrape_cache.pop(url, None)
    return None


def _set_cached_scrape(url: str, data: dict) -> None:
    import time
    _scrape_cache[url] = {"data": data, "timestamp": time.time()}
    # Evict old entries (keep max 50)
    if len(_scrape_cache) > 50:
        oldest = sorted(_scrape_cache.items(), key=lambda x: x[1]["timestamp"])[:10]
        for k, _ in oldest:
            _scrape_cache.pop(k, None)


class ComposeRequest(BaseModel):
    url: str
    models: list[str] = []  # Empty = scrape only
    language: str = "Vietnamese"


@router.post("/compose")
async def compose_article(req: ComposeRequest) -> dict[str, Any]:
    """Scrape a URL and rewrite it with multiple models for comparison."""
    import asyncio
    import time
    import re as re_mod

    import httpx
    import trafilatura

    # ── Inline scraper with multi-tier fallback ──
    html = ""
    scrape_method = "httpx"

    # Tier 1: httpx with realistic browser headers
    try:
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate",
                "Cache-Control": "no-cache",
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
            resp = await client.get(req.url)
            resp.raise_for_status()
            html = resp.text
    except Exception:
        html = ""

    # Tier 2: trafilatura's built-in fetcher (has its own anti-bot handling)
    if not html:
        scrape_method = "trafilatura"
        try:
            downloaded = trafilatura.fetch_url(req.url)
            html = downloaded or ""
        except Exception:
            html = ""

    # Tier 3: Playwright headless browser
    if not html:
        scrape_method = "playwright-headless"
        import concurrent.futures
        import time as _time

        def _scrape_with_playwright(target_url: str, headless: bool = True) -> str:
            from playwright.sync_api import sync_playwright
            pw = sync_playwright().start()
            browser = None
            try:
                browser = pw.chromium.launch(
                    headless=headless,
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

        try:
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as pool:
                html = await loop.run_in_executor(pool, _scrape_with_playwright, req.url, True)
        except Exception:
            html = ""

    # Check if Tier 3 headless got blocked (empty body or bot challenge page)
    if html and scrape_method == "playwright-headless":
        _extracted_check = trafilatura.extract(html, include_comments=False, output_format="txt")
        if not _extracted_check or len(_extracted_check) < 100:
            html = ""  # Reset — headless was likely blocked

    # Tier 4: Playwright headed (non-headless) via xvfb virtual display
    # This bypasses aggressive anti-bot that detects headless mode
    if not html:
        scrape_method = "playwright-headed"
        import subprocess as _sp
        import concurrent.futures
        import time as _time

        def _scrape_headed_xvfb(target_url: str) -> str:
            """Run Playwright in headed mode using xvfb-run for a virtual display."""
            script = f'''
import time
from playwright.sync_api import sync_playwright
pw = sync_playwright().start()
browser = None
try:
    browser = pw.chromium.launch(
        headless=False,
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
        viewport={{"width": 1920, "height": 1080}},
        java_script_enabled=True,
        locale="en-US",
        timezone_id="America/New_York",
        color_scheme="light",
        service_workers="allow",
    )
    page = ctx.new_page()
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {{get: () => undefined}});
        Object.defineProperty(navigator, 'languages', {{get: () => ['en-US', 'en']}});
        Object.defineProperty(navigator, 'platform', {{get: () => 'Win32'}});
        Object.defineProperty(navigator, 'plugins', {{get: () => [1, 2, 3, 4, 5]}});
        window.chrome = {{runtime: {{}}}};
    """)
    try:
        page.goto("{target_url}", wait_until="networkidle", timeout=60000)
    except Exception:
        try:
            page.goto("{target_url}", wait_until="domcontentloaded", timeout=30000)
        except Exception:
            pass
    for _ in range(6):
        time.sleep(3)
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
    print(page.content())
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
'''
            result = _sp.run(
                ["xvfb-run", "--auto-servernum", "python", "-c", script],
                capture_output=True, text=True, timeout=90,
            )
            return result.stdout

        try:
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as pool:
                html = await loop.run_in_executor(pool, _scrape_headed_xvfb, req.url)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch URL: All scraping tiers failed (httpx → trafilatura → headless → headed). Error: {e}"
            )

    if not html:
        raise HTTPException(
            status_code=400, 
            detail="Failed to fetch URL: All scraping methods returned empty content."
        )

    # Extract plain text for the LLM
    extracted = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        include_images=True,
        include_links=False,
        output_format="txt",
    )
    body_text = extracted or ""
    if not body_text or len(body_text) < 100:
        # Fallback: try BeautifulSoup raw text extraction
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            # Remove script, style, nav, footer, header, aside elements
            for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form']):
                tag.decompose()
            # Try to find article body
            article_el = soup.find('article') or soup.find(class_=re_mod.compile(r'article|post|entry|content', re_mod.I)) or soup.find('main')
            if article_el:
                body_text = article_el.get_text(separator='\n', strip=True)
            else:
                body_text = soup.get_text(separator='\n', strip=True)
            # Clean up excessive whitespace
            body_text = re_mod.sub(r'\n{3,}', '\n\n', body_text).strip()
        except Exception:
            pass

    if not body_text or len(body_text) < 100:
        raise HTTPException(
            status_code=400, 
            detail=f"Could not extract article content from URL (scrape method: {scrape_method}, html length: {len(html)})"
        )

    # Extract images from article HTML
    from urllib.parse import urljoin
    original_images = []
    # Use trafilatura's metadata extraction for images
    meta_obj = trafilatura.extract(html, output_format="xml", include_comments=False, include_images=True)
    # Also extract from raw HTML <img> tags within the article body
    img_tags = re_mod.findall(
        r'<img[^>]+src=["\']([^"\']+)["\']',
        html,
        re_mod.IGNORECASE,
    )
    seen_urls = set()
    for src in img_tags:
        # Skip tiny icons, tracking pixels, avatars, logos
        if any(skip in src.lower() for skip in [
            'avatar', 'logo', 'icon', 'favicon', 'pixel', 'tracking',
            'gravatar', 'emoji', 'badge', 'button', '1x1', 'ad-',
            'widget', 'share', 'social', '.svg',
        ]):
            continue
        full_url = urljoin(req.url, src)
        if full_url not in seen_urls:
            seen_urls.add(full_url)
            original_images.append(full_url)

    # Extract title, author, and site name
    from urllib.parse import urlparse
    title = ""
    author = ""
    sitename = ""

    if meta_obj:
        m = re_mod.search(r'title="([^"]+)"', meta_obj)
        if m:
            title = m.group(1)
        m = re_mod.search(r'sitename="([^"]+)"', meta_obj)
        if m:
            sitename = m.group(1)

    if not title:
        m = re_mod.search(r"<title[^>]*>([^<]+)</title>", html, re_mod.IGNORECASE)
        title = m.group(1).strip() if m else ""

    # Robust author extraction — use shared pipeline scraper function
    try:
        import sys as _sys2
        if '/app/pipeline' not in _sys2.path:
            _sys2.path.insert(0, '/app/pipeline')
        from pipeline.scraper import _extract_author_from_html
        author = _extract_author_from_html(html) or ""
    except Exception:
        # Fallback: trafilatura metadata
        if meta_obj:
            m = re_mod.search(r'author="([^"]+)"', meta_obj)
            if m:
                author = m.group(1)
        # Fallback: basic meta tags
        if not author:
            m = re_mod.search(r'<meta[^>]+name=["\']author["\'][^>]+content=["\']([^"\']+)["\']', html, re_mod.IGNORECASE)
            if m:
                author = m.group(1)

    # Fallback site name from og:site_name or domain
    if not sitename:
        m = re_mod.search(r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)["\']', html, re_mod.IGNORECASE)
        if m:
            sitename = m.group(1)
    if not sitename:
        parsed = urlparse(req.url)
        # Use domain without www, e.g. "vatvostudio.vn" -> "Vatvostudio"
        domain = parsed.netloc.replace("www.", "")
        sitename = domain.split(".")[0].capitalize()

    word_count = len(body_text.split())
    scraped = {
        "title": title,
        "body_text": body_text,
        "word_count": word_count,
        "original_images": original_images[:20],  # Cap at 20 images
        "author": author,
        "sitename": sitename,
        "scrape_method": scrape_method,
    }

    # Import the shared prompts from the pipeline rewriter
    import sys as _sys
    if '/app/pipeline' not in _sys.path:
        _sys.path.insert(0, '/app/pipeline')
    from pipeline.rewriter import SYSTEM_PROMPT_TEMPLATE, USER_PROMPT_TEMPLATE

    lang = req.language
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(lang=lang)

    # Decode HTML entities in title (e.g. &#039; -> ')
    import html as html_mod
    clean_title = html_mod.unescape(scraped["title"])
    scraped["title"] = clean_title

    user_prompt = USER_PROMPT_TEMPLATE.format(
        lang=lang,
        title=clean_title,
        author=scraped.get("author", "Unknown"),
        source_name=scraped.get("sitename", ""),
        published_at="Unknown",
        body_text=scraped["body_text"],
        available_images_section="",
    )

    # Cache scraped data (available for retry/rewrite later)
    _set_cached_scrape(req.url, scraped)

    # If no models selected, return scrape-only result
    if not req.models:
        return {
            "url": req.url,
            "scraped": {
                "title": scraped.get("title", ""),
                "word_count": scraped.get("word_count", 0),
                "body_text": scraped.get("body_text", ""),
                "body_preview": (scraped.get("body_text", ""))[:500],
                "original_images": scraped.get("original_images", []),
                "author": scraped.get("author", ""),
                "sitename": scraped.get("sitename", ""),
                "scrape_method": scraped.get("scrape_method", "unknown"),
            },
            "results": [],
        }

    # 3. Read env config
    env = _read_env_config()
    ollama_base = env.get("OLLAMA_BASE_URL", "http://localhost:11434")
    num_ctx = int(env.get("OLLAMA_NUM_CTX", "8192"))
    think_enabled = env.get("OLLAMA_THINK", "true").lower() == "true"
    gemini_api_key = env.get("GEMINI_API_KEY", "")
    anthropic_api_key = env.get("ANTHROPIC_API_KEY", "")

    import json as json_mod
    import re
    import httpx

    def _parse_raw(raw_text: str) -> dict:
        """Clean and parse LLM response text into JSON."""
        raw_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
        return json_mod.loads(raw_text)

    async def _call_gemini_model(model_name: str) -> dict:
        from google import genai
        client = genai.Client(api_key=gemini_api_key)
        start = time.time()
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=user_prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        duration = time.time() - start
        parsed = json_mod.loads(response.text.strip())
        return {
            "model": model_name,
            "provider": "gemini",
            "status": "success",
            "duration_sec": round(duration, 1),
            "tokens_generated": getattr(response, 'usage_metadata', None) and response.usage_metadata.candidates_token_count or 0,
            "tokens_per_sec": 0,
            "result": parsed,
        }

    async def _call_anthropic_model(model_name: str) -> dict:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
        start = time.time()
        message = await client.messages.create(
            model=model_name,
            max_tokens=4096,
            temperature=0.7,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        duration = time.time() - start
        raw_text = message.content[0].text.strip()
        parsed = _parse_raw(raw_text)
        output_tokens = getattr(message, 'usage', None) and message.usage.output_tokens or 0
        return {
            "model": model_name,
            "provider": "anthropic",
            "status": "success",
            "duration_sec": round(duration, 1),
            "tokens_generated": output_tokens,
            "tokens_per_sec": round(output_tokens / duration, 1) if duration > 0 and output_tokens else 0,
            "result": parsed,
        }

    async def _call_ollama_model(model_name: str) -> dict:
        start = time.time()
        final_user_prompt = user_prompt
        if think_enabled:
            final_user_prompt = "/think\n\n" + user_prompt

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": final_user_prompt},
            ],
            "stream": False,
            "options": {"num_ctx": num_ctx, "temperature": 0.7},
            "format": "json",
        }
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(f"{ollama_base}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_text = data.get("message", {}).get("content", "")
        parsed = _parse_raw(raw_text)
        duration = time.time() - start

        eval_count = data.get("eval_count", 0)
        eval_duration_ns = data.get("eval_duration", 0)
        tokens_per_sec = (eval_count / (eval_duration_ns / 1e9)) if eval_duration_ns > 0 else 0

        return {
            "model": model_name,
            "provider": "ollama",
            "status": "success",
            "duration_sec": round(duration, 1),
            "tokens_generated": eval_count,
            "tokens_per_sec": round(tokens_per_sec, 1),
            "result": parsed,
        }

    # 4. Group models by provider
    api_tasks = []   # Gemini + Anthropic can run in parallel
    ollama_models = []  # Ollama must run sequentially (single GPU)

    for entry in req.models:
        # Format: "provider:model" e.g. "gemini:gemini-2.5-flash"
        if ":" in entry and entry.split(":")[0] in ("gemini", "anthropic"):
            provider, model_name = entry.split(":", 1)
        else:
            # Default to ollama for backward compat
            provider = "ollama"
            model_name = entry

        if provider == "gemini":
            api_tasks.append(("gemini", model_name))
        elif provider == "anthropic":
            api_tasks.append(("anthropic", model_name))
        else:
            ollama_models.append(model_name)

    results = []

    # Run API models in parallel
    if api_tasks:
        async def _run_api(prov: str, name: str):
            try:
                if prov == "gemini":
                    return await _call_gemini_model(name)
                else:
                    return await _call_anthropic_model(name)
            except Exception as e:
                return {
                    "model": name,
                    "provider": prov,
                    "status": "error",
                    "duration_sec": 0,
                    "error": str(e)[:500],
                }

        api_results = await asyncio.gather(
            *[_run_api(p, n) for p, n in api_tasks]
        )
        results.extend(api_results)

    # Run Ollama models sequentially
    for model_name in ollama_models:
        try:
            result = await _call_ollama_model(model_name)
            results.append(result)
        except Exception as e:
            results.append({
                "model": model_name,
                "provider": "ollama",
                "status": "error",
                "duration_sec": 0,
                "error": str(e)[:500],
            })

    # Cache scraped data for retry
    _set_cached_scrape(req.url, scraped)

    return {
        "url": req.url,
        "scraped": {
            "title": scraped.get("title", ""),
            "word_count": scraped.get("word_count", 0),
            "body_text": scraped.get("body_text", ""),
            "body_preview": (scraped.get("body_text", ""))[:500],
            "original_images": scraped.get("original_images", []),
            "author": scraped.get("author", ""),
            "sitename": scraped.get("sitename", ""),
            "scrape_method": scraped.get("scrape_method", "unknown"),
        },
        "results": results,
    }


class ComposeRetryRequest(BaseModel):
    url: str
    models: list[str]  # Only the failed models to retry
    language: str = "Vietnamese"


@router.post("/compose/retry")
async def compose_retry(req: ComposeRetryRequest) -> dict[str, Any]:
    """Retry LLM rewrite for failed models using cached scrape data (skips re-scraping)."""
    import asyncio
    import time
    import re as re_mod
    import json as json_mod
    import re
    import httpx

    # Look up cached scrape
    scraped = _get_cached_scrape(req.url)
    if not scraped:
        raise HTTPException(
            status_code=404,
            detail="No cached scrape data found for this URL. Please run a full compose first."
        )

    # ── Rebuild prompts from cached data ──
    SYSTEM_PROMPT = (
        "You are an editorial AI for a {lang} tech news website. "
        "You receive English-language tech news articles and rewrite them "
        "entirely in {lang}. Write naturally for a {lang}-speaking audience "
        "— do not translate word-for-word, rewrite with your own editorial "
        "voice and added perspective. Keep technical terms, product names, "
        "and brand names in their original English form (e.g. 'Samsung "
        "Galaxy S26 Ultra', 'Snapdragon 8 Elite', 'Android 16'). "
        "Return valid JSON only — no markdown fences, no preamble."
    )

    USER_PROMPT = """\
Rewrite the following article in {lang}.
Title, body, summary, perspective, and tags → {lang}.
image_keywords and inline_image_keywords → English always (for image search APIs).

SOURCE ARTICLE:
Title: {title}
Body:
{body_text}

---

Return a JSON object with exactly these fields:
- "title": rewritten headline in {lang}
- "body": Full article in Markdown, in {lang}. Write naturally as a professional journalist.
  Use markdown formatting only when it genuinely improves readability.
  Focus on compelling, insightful writing.
- "summary": 2-3 sentences in {lang}, professional tone.
- "perspective": 2 sentences of editorial opinion in {lang}.
- "image_keywords": 4-6 English phrases for hero image search.
- "tags": 5-10 lowercase topic tags in {lang}. Keep product/brand names in English.
- "reading_time_minutes": estimated reading time as an integer.

Rules: Write in a premium, authoritative tech journalism voice.
Keep product names in English.
"""

    lang = req.language
    system_prompt = SYSTEM_PROMPT.format(lang=lang)
    user_prompt = USER_PROMPT.format(
        lang=lang,
        title=scraped["title"],
        body_text=scraped["body_text"],
    )

    env = _read_env_config()
    ollama_base = env.get("OLLAMA_BASE_URL", "http://localhost:11434")
    num_ctx = int(env.get("OLLAMA_NUM_CTX", "8192"))
    think_enabled = env.get("OLLAMA_THINK", "true").lower() == "true"
    gemini_api_key = env.get("GEMINI_API_KEY", "")
    anthropic_api_key = env.get("ANTHROPIC_API_KEY", "")

    def _parse_raw(raw_text: str) -> dict:
        raw_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
        return json_mod.loads(raw_text)

    async def _call_gemini_model(model_name: str) -> dict:
        from google import genai
        client = genai.Client(api_key=gemini_api_key)
        start = time.time()
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=user_prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        duration = time.time() - start
        parsed = json_mod.loads(response.text.strip())
        return {
            "model": model_name, "provider": "gemini", "status": "success",
            "duration_sec": round(duration, 1),
            "tokens_generated": getattr(response, 'usage_metadata', None) and response.usage_metadata.candidates_token_count or 0,
            "tokens_per_sec": 0, "result": parsed,
        }

    async def _call_anthropic_model(model_name: str) -> dict:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
        start = time.time()
        message = await client.messages.create(
            model=model_name, max_tokens=4096, temperature=0.7,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        duration = time.time() - start
        raw_text = message.content[0].text.strip()
        parsed = _parse_raw(raw_text)
        output_tokens = getattr(message, 'usage', None) and message.usage.output_tokens or 0
        return {
            "model": model_name, "provider": "anthropic", "status": "success",
            "duration_sec": round(duration, 1),
            "tokens_generated": output_tokens,
            "tokens_per_sec": round(output_tokens / duration, 1) if duration > 0 and output_tokens else 0,
            "result": parsed,
        }

    async def _call_ollama_model(model_name: str) -> dict:
        start = time.time()
        final_user_prompt = user_prompt
        if think_enabled:
            final_user_prompt = "/think\n\n" + user_prompt
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": final_user_prompt},
            ],
            "stream": False,
            "options": {"num_ctx": num_ctx, "temperature": 0.7},
            "format": "json",
        }
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(f"{ollama_base}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
        raw_text = data.get("message", {}).get("content", "")
        parsed = _parse_raw(raw_text)
        duration = time.time() - start
        eval_count = data.get("eval_count", 0)
        eval_duration_ns = data.get("eval_duration", 0)
        tokens_per_sec = (eval_count / (eval_duration_ns / 1e9)) if eval_duration_ns > 0 else 0
        return {
            "model": model_name, "provider": "ollama", "status": "success",
            "duration_sec": round(duration, 1),
            "tokens_generated": eval_count,
            "tokens_per_sec": round(tokens_per_sec, 1), "result": parsed,
        }

    # Group and run models
    api_tasks = []
    ollama_models = []
    for entry in req.models:
        if ":" in entry and entry.split(":")[0] in ("gemini", "anthropic"):
            provider, model_name = entry.split(":", 1)
        else:
            provider = "ollama"
            model_name = entry
        if provider == "gemini":
            api_tasks.append(("gemini", model_name))
        elif provider == "anthropic":
            api_tasks.append(("anthropic", model_name))
        else:
            ollama_models.append(model_name)

    results = []
    if api_tasks:
        async def _run_api(prov: str, name: str):
            try:
                if prov == "gemini":
                    return await _call_gemini_model(name)
                else:
                    return await _call_anthropic_model(name)
            except Exception as e:
                return {"model": name, "provider": prov, "status": "error", "duration_sec": 0, "error": str(e)[:500]}
        api_results = await asyncio.gather(*[_run_api(p, n) for p, n in api_tasks])
        results.extend(api_results)

    for model_name in ollama_models:
        try:
            result = await _call_ollama_model(model_name)
            results.append(result)
        except Exception as e:
            results.append({"model": model_name, "provider": "ollama", "status": "error", "duration_sec": 0, "error": str(e)[:500]})

    return {
        "url": req.url,
        "scraped": {
            "title": scraped.get("title", ""),
            "word_count": scraped.get("word_count", 0),
            "body_preview": (scraped.get("body_text", ""))[:500],
            "original_images": scraped.get("original_images", []),
            "author": scraped.get("author", ""),
            "sitename": scraped.get("sitename", ""),
        },
        "results": results,
    }


@router.get("/compose/models")
async def get_compose_models() -> dict[str, Any]:
    """List available models for the composer — Ollama, Gemini, and Anthropic."""
    import httpx

    env = _read_env_config()
    all_models = []

    # ── Gemini models ──
    if env.get("GEMINI_API_KEY"):
        gemini_models = [
            {"name": "gemini-2.5-flash", "provider": "gemini", "parameter_size": "—", "size_gb": 0, "family": "gemini"},
            {"name": "gemini-2.5-pro", "provider": "gemini", "parameter_size": "—", "size_gb": 0, "family": "gemini"},
            {"name": "gemini-2.0-flash", "provider": "gemini", "parameter_size": "—", "size_gb": 0, "family": "gemini"},
            {"name": "gemini-2.0-flash-lite", "provider": "gemini", "parameter_size": "—", "size_gb": 0, "family": "gemini"},
        ]
        all_models.extend(gemini_models)

    # ── Anthropic models ──
    if env.get("ANTHROPIC_API_KEY"):
        anthropic_models = [
            {"name": "claude-sonnet-4-6", "provider": "anthropic", "parameter_size": "—", "size_gb": 0, "family": "claude"},
            {"name": "claude-3-5-haiku-20241022", "provider": "anthropic", "parameter_size": "—", "size_gb": 0, "family": "claude"},
        ]
        all_models.extend(anthropic_models)

    # ── Ollama models ──
    ollama_base = env.get("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{ollama_base}/api/tags")
            if resp.status_code == 200:
                tags = resp.json()
                for m in tags.get("models", []):
                    all_models.append({
                        "name": m["name"],
                        "provider": "ollama",
                        "size_gb": round(m.get("size", 0) / 1e9, 1),
                        "family": m.get("details", {}).get("family", ""),
                        "parameter_size": m.get("details", {}).get("parameter_size", ""),
                    })
    except Exception:
        pass

    return {"models": all_models}


class ComposeSaveRequest(BaseModel):
    url: str
    model: str
    provider: str = "ollama"
    result: dict          # The compose result JSON (title, body, summary, etc.)
    original_images: list = []  # Original images from scraping
    source_title: str = ""
    source_author: str = ""
    source_sitename: str = ""


@router.post("/compose/save")
async def compose_save_to_draft(req: ComposeSaveRequest) -> dict[str, Any]:
    """Save a composed article to the database as a draft, with image search.

    Creates a raw_article + article in the DB, then triggers the Celery
    search_images_task so it gets images just like the normal pipeline.
    """
    import hashlib
    import uuid
    from datetime import datetime, timezone

    from sqlalchemy import text

    try:
        engine = _get_engine()

        r = req.result
        now = datetime.now(timezone.utc)
        url_hash = hashlib.sha256(req.url.encode()).hexdigest()

        with engine.connect() as conn:
            # Check if URL already has a raw_article
            existing = conn.execute(
                text("SELECT id FROM raw_articles WHERE url = :url"),
                {"url": req.url},
            ).fetchone()

            if existing:
                raw_article_id = str(existing[0])
            else:
                raw_article_id = str(uuid.uuid4())
                conn.execute(
                    text("""
                        INSERT INTO raw_articles (id, url, url_hash, source_name, source_type, title, body_text, word_count, status, scraped_at, created_at, original_images)
                        VALUES (:id, :url, :url_hash, :source_name, :source_type, :title, :body_text, :word_count, :status, :scraped_at, :created_at, :original_images)
                    """),
                    {
                        "id": raw_article_id,
                        "url": req.url,
                        "url_hash": url_hash,
                        "source_name": "composer",
                        "source_type": "manual",
                        "title": req.source_title or r.get("title", ""),
                        "body_text": "",
                        "word_count": 0,
                        "status": "done",
                        "scraped_at": now,
                        "created_at": now,
                        "original_images": json.dumps(req.original_images) if req.original_images else None,
                    },
                )

            # Create the article
            article_id = str(uuid.uuid4())
            image_keywords = r.get("image_keywords", [])
            inline_image_keywords = r.get("inline_image_keywords", [])
            tags = r.get("tags", [])

            # Ensure array fields are lists of strings (not None)
            if not isinstance(tags, list):
                tags = []
            if not isinstance(image_keywords, list):
                image_keywords = []
            if not isinstance(inline_image_keywords, list):
                inline_image_keywords = []

            # Determine source_author with consistent format: "Author | SiteName | Tổng hợp bởi RetroLab"
            brand = "Tổng hợp bởi RetroLab"
            source_outlet = req.source_sitename or "composer"
            if req.source_author:
                source_author = req.source_author
            else:
                # Build from scraped author + site name
                author_parts = []
                scraped_author = scraped.get("author", "")
                if scraped_author:
                    author_parts.append(scraped_author)
                if source_outlet:
                    author_parts.append(source_outlet)
                author_parts.append(brand)
                source_author = " | ".join(author_parts)

            conn.execute(
                text("""
                    INSERT INTO articles (
                        id, raw_article_id, title, body, summary, perspective,
                        reading_time_minutes, tags, image_keywords, inline_image_keywords,
                        original_images, source_url, source_outlet, source_author,
                        rewrite_model, output_language, status, created_at
                    ) VALUES (
                        :id, :raw_article_id, :title, :body, :summary, :perspective,
                        :reading_time_minutes, :tags, :image_keywords, :inline_image_keywords,
                        :original_images, :source_url, :source_outlet, :source_author,
                        :rewrite_model, :output_language, :status, :created_at
                    )
                """),
                {
                    "id": article_id,
                    "raw_article_id": raw_article_id,
                    "title": r.get("title", ""),
                    "body": r.get("body", ""),
                    "summary": r.get("summary", ""),
                    "perspective": r.get("perspective", ""),
                    "reading_time_minutes": int(r.get("reading_time_minutes", 0) or 0),
                    "tags": tags,
                    "image_keywords": image_keywords,
                    "inline_image_keywords": inline_image_keywords,
                    "original_images": json.dumps(req.original_images) if req.original_images else None,
                    "source_url": req.url,
                    "source_outlet": source_outlet,
                    "source_author": source_author,
                    "rewrite_model": f"{req.provider}:{req.model}",
                    "output_language": "vi",
                    "status": "image_pending",
                    "created_at": now,
                },
            )
            conn.commit()

        # Trigger Celery image search task
        try:
            celery = _get_celery()
            celery.send_task(
                "workers.tasks.search_images_task",
                args=[article_id],
                queue="image_search_queue",
            )
        except Exception as e:
            # If Celery trigger fails, set status to draft directly (no images)
            with engine.connect() as conn:
                conn.execute(
                    text("UPDATE articles SET status = 'draft' WHERE id = :id"),
                    {"id": article_id},
                )
                conn.commit()
            return {
                "article_id": article_id,
                "status": "draft",
                "message": f"Saved as draft (image search skipped: {str(e)[:200]})",
            }

        return {
            "article_id": article_id,
            "status": "image_pending",
            "message": "Saved! Image search started — article will appear in drafts shortly.",
        }

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save draft: {type(e).__name__}: {str(e)[:500]}\n{tb[-500:]}"
        )


@router.post("/flush")
async def flush_pipeline() -> dict[str, Any]:
    """Remove all unprocessed pipeline data.
    
    Deletes:
    - Raw articles that haven't produced a final article yet (new, done, processing, scrape_failed)
    - Articles stuck at image_pending or rewrite_failed
    
    Keeps: draft, approved, published, rejected articles and their raw sources.
    """
    import asyncio
    from sqlalchemy import text

    def _flush_db():
        engine = _get_engine()
        with engine.connect() as conn:
            counts = {}
            
            # 1. Delete articles at intermediate states
            result = conn.execute(text(
                "DELETE FROM articles WHERE status IN ('image_pending', 'rewrite_failed') "
                "RETURNING id"
            ))
            counts["articles_removed"] = result.rowcount

            # 2. Delete raw articles at 'new' or 'scrape_failed' that DON'T back any article
            #    (raw_article_id is NOT NULL, so we can't delete ones that are referenced)
            result = conn.execute(text(
                "DELETE FROM raw_articles "
                "WHERE status IN ('new', 'scrape_failed') "
                "AND id NOT IN ("
                "  SELECT raw_article_id FROM articles WHERE raw_article_id IS NOT NULL"
                ") RETURNING id"
            ))
            stale = result.rowcount

            # 3. Delete orphan raw articles (done/processing but no article references them)
            result = conn.execute(text(
                "DELETE FROM raw_articles WHERE id NOT IN ("
                "  SELECT raw_article_id FROM articles WHERE raw_article_id IS NOT NULL"
                ") RETURNING id"
            ))
            orphans = result.rowcount

            counts["raw_articles_removed"] = stale + orphans
            conn.commit()
            return counts

    counts = await asyncio.to_thread(_flush_db)
    
    # Also purge queues since the data they reference is gone
    import redis
    r = redis.Redis.from_url(settings.REDIS_URL)
    for q in ["default", "scraper_queue", "rewriter_queue", "image_search_queue"]:
        r.delete(q)

    total = counts["raw_articles_removed"] + counts["articles_removed"]
    return {
        "status": "flushed",
        "message": f"Removed {total} items ({counts['raw_articles_removed']} raw articles, {counts['articles_removed']} pending articles). Queues purged.",
        **counts,
    }


# ── Queue Management ─────────────────────────────────────────────

@router.get("/queue/status")
async def queue_status() -> dict[str, Any]:
    """Get queue lengths and stuck article counts."""
    import redis

    r = redis.Redis.from_url(settings.REDIS_URL)

    queues = {}
    for q in ["default", "scraper_queue", "rewriter_queue", "image_search_queue"]:
        queues[q] = r.llen(q)

    # Count stuck articles from DB — only truly stuck ones
    from sqlalchemy import text
    engine = _get_engine()
    stuck = {}
    with engine.connect() as conn:
        # Raw articles at 'new' (never scraped) — exclude those that already have an article
        row = conn.execute(text(
            "SELECT COUNT(*) FROM raw_articles "
            "WHERE status = 'new' "
            "AND id NOT IN (SELECT raw_article_id FROM articles WHERE raw_article_id IS NOT NULL)"
        )).fetchone()
        stuck["raw_new"] = row[0] if row else 0

        # Raw articles at 'scraped' — awaiting curation approval
        row = conn.execute(text(
            "SELECT COUNT(*) FROM raw_articles WHERE status = 'scraped'"
        )).fetchone()
        stuck["raw_scraped"] = row[0] if row else 0

        # Raw articles stuck at 'processing' (rewrite started but never finished)
        # Exclude those that already have a corresponding article
        row = conn.execute(text(
            "SELECT COUNT(*) FROM raw_articles r "
            "WHERE r.status = 'processing' "
            "AND r.id NOT IN (SELECT raw_article_id FROM articles WHERE raw_article_id IS NOT NULL)"
        )).fetchone()
        stuck["raw_processing"] = row[0] if row else 0

        # Articles stuck at image_pending
        row = conn.execute(text(
            "SELECT COUNT(*) FROM articles WHERE status = 'image_pending'"
        )).fetchone()
        stuck["image_pending"] = row[0] if row else 0

    # Active + reserved tasks from Celery inspect (per-queue counts)
    celery = _get_celery()
    active_tasks = []
    # Map task names to their queue for per-queue active counts
    task_queue_map = {
        "scrape_article_task": "scraper_queue",
        "rewrite_article_task": "rewriter_queue",
        "search_images_task": "image_search_queue",
        "discover_feeds": "default",
        "discover_crawl": "default",
    }
    active_per_queue = {q: 0 for q in queues}
    try:
        inspect = celery.control.inspect(timeout=2.0)
        # Count active (currently executing) tasks
        active = inspect.active() or {}
        for worker_name, tasks in active.items():
            for t in tasks:
                task_short = t.get("name", "").split(".")[-1]
                active_tasks.append({
                    "id": t.get("id", ""),
                    "name": task_short,
                    "args": str(t.get("args", ""))[:100],
                    "started": t.get("time_start"),
                    "worker": worker_name,
                })
                q_name = task_queue_map.get(task_short, "default")
                if q_name in active_per_queue:
                    active_per_queue[q_name] += 1

        # Count reserved (prefetched, waiting to execute) tasks
        reserved = inspect.reserved() or {}
        for worker_name, tasks in reserved.items():
            for t in tasks:
                task_short = t.get("name", "").split(".")[-1]
                q_name = task_queue_map.get(task_short, "default")
                if q_name in active_per_queue:
                    active_per_queue[q_name] += 1
    except Exception:
        pass

    # Combine: queued (in Redis) + active + reserved = total in-flight
    combined = {q: queues[q] + active_per_queue.get(q, 0) for q in queues}

    return {
        "queues": combined,
        "queues_pending": queues,
        "active_per_queue": active_per_queue,
        "stuck": stuck,
        "active_tasks": active_tasks,
        "total_queued": sum(combined.values()),
    }


@router.post("/queue/retry-stuck")
async def retry_stuck(target: str = Body("all", embed=True)) -> dict[str, Any]:
    """Re-enqueue articles stuck in intermediate states.
    
    target: 'all', 'scrape' (raw new), 'rewrite' (raw processing), 'images' (image_pending)
    Note: 'scraped' articles are NOT re-enqueued here — they go through the curation UI.
    """
    from sqlalchemy import text

    celery = _get_celery()
    engine = _get_engine()
    counts = {"scrape": 0, "rewrite": 0, "images": 0}

    with engine.connect() as conn:
        # Re-enqueue raw articles stuck at 'new' → scrape
        if target in ("all", "scrape"):
            rows = conn.execute(text(
                "SELECT id, url, url_hash, source_name, source_type, title, category "
                "FROM raw_articles WHERE status = 'new'"
            )).fetchall()
            for row in rows:
                celery.send_task(
                    "workers.tasks.scrape_article_task",
                    args=[{
                        "url": row[1], "url_hash": row[2],
                        "source_name": row[3], "source_type": row[4],
                        "title": row[5], "category": row[6],
                    }],
                    queue="scraper_queue",
                )
                counts["scrape"] += 1

        # Re-enqueue raw articles stuck at 'processing' → rewrite
        # Note: 'scraped' = awaiting curation (NOT stuck). Only 'processing' is stuck.
        if target in ("all", "rewrite"):
            rows = conn.execute(text(
                "SELECT id, source_name FROM raw_articles "
                "WHERE status = 'processing'"
            )).fetchall()
            for row in rows:
                celery.send_task(
                    "workers.tasks.rewrite_article_task",
                    args=[str(row[0]), row[1] or "", "vi"],
                    queue="rewriter_queue",
                )
                counts["rewrite"] += 1

        # Re-enqueue articles at 'image_pending' → image search
        if target in ("all", "images"):
            rows = conn.execute(text(
                "SELECT id FROM articles WHERE status = 'image_pending'"
            )).fetchall()
            for row in rows:
                celery.send_task(
                    "workers.tasks.search_images_task",
                    args=[str(row[0])],
                    queue="image_search_queue",
                )
                counts["images"] += 1

    total = sum(counts.values())
    return {"status": "ok", "enqueued": counts, "total": total}


@router.post("/queue/purge")
async def purge_queues(queue_name: str = Body("all", embed=True)) -> dict[str, Any]:
    """Purge tasks from queues. queue_name: 'all' or specific queue name."""
    import redis

    r = redis.Redis.from_url(settings.REDIS_URL)
    purged = {}

    targets = ["default", "scraper_queue", "rewriter_queue", "image_search_queue"] if queue_name == "all" else [queue_name]
    for q in targets:
        count = r.llen(q)
        r.delete(q)
        purged[q] = count

    return {"status": "purged", "purged": purged, "total": sum(purged.values())}


@router.post("/queue/cancel-all")
async def cancel_all() -> dict[str, Any]:
    """Nuclear option: set stop flag, purge all queues, and reset stuck articles.
    
    The stop flag ('pipeline:stopped') causes all running and queued tasks to 
    abort immediately without enqueuing follow-up work.
    """
    import asyncio
    import redis
    from sqlalchemy import text

    r = redis.Redis.from_url(settings.REDIS_URL)

    # Set the stop flag — all tasks check this and abort
    r.set("pipeline:stopped", "1")

    # Purge all queues
    for q in ["default", "scraper_queue", "rewriter_queue", "image_search_queue"]:
        r.delete(q)

    # Reset stuck articles (run in thread to avoid blocking async loop)
    def _reset_db():
        engine = _get_engine()
        with engine.connect() as conn:
            conn.execute(text("UPDATE articles SET status = 'draft' WHERE status = 'image_pending'"))
            conn.execute(text("UPDATE raw_articles SET status = 'done' WHERE status = 'processing'"))
            conn.commit()

    await asyncio.to_thread(_reset_db)

    # Note: We do NOT try to offload Ollama here because it blocks while
    # the model is serving an active inference request. The stop flag will
    # prevent new tasks from starting, and the user can offload manually 
    # via the Offload button once the current task finishes.

    return {"status": "cancelled", "message": "Pipeline stopped. All queues purged. Use Offload button to free GPU after current task finishes."}


@router.post("/queue/resume")
async def resume_pipeline() -> dict[str, str]:
    """Clear the pipeline stop flag, allowing tasks to run again."""
    import redis

    r = redis.Redis.from_url(settings.REDIS_URL)
    r.delete("pipeline:stopped")
    return {"status": "resumed", "message": "Pipeline resumed. Tasks will now process normally."}


@router.get("/queue/is-stopped")
async def is_pipeline_stopped() -> dict[str, bool]:
    """Check if the pipeline is currently stopped."""
    import redis

    r = redis.Redis.from_url(settings.REDIS_URL)
    return {"stopped": r.exists("pipeline:stopped") > 0}


# ── Source tags ───────────────────────────────────────────────────

@router.get("/sources/tags")
async def get_source_tags() -> dict[str, Any]:
    """Return all available source tags from sources.yaml and their source names."""
    import yaml

    env_path = Path(__file__).resolve().parents[3] / "news-pipeline" / "config" / "sources.yaml"
    if not env_path.exists():
        return {"tags": [], "sources": []}

    with open(env_path) as f:
        data = yaml.safe_load(f) or {}

    tags_map: dict[str, list[str]] = {}
    all_sources: list[dict[str, Any]] = []

    for _cat, entries in data.items():
        for entry in entries:
            if not entry.get("enabled", False):
                continue
            name = entry.get("name", "")
            source_tags = entry.get("tags", [])
            all_sources.append({
                "name": name,
                "type": entry.get("type", "rss"),
                "tags": source_tags,
                "enabled": True,
            })
            for tag in source_tags:
                tags_map.setdefault(tag, []).append(name)

    return {
        "tags": sorted(tags_map.keys()),
        "tags_map": tags_map,
        "sources": all_sources,
    }


# ── Run pipeline tasks ───────────────────────────────────────────

@router.post("/run", response_model=RunResponse)
async def run_pipeline(req: RunRequest = Body(...)) -> RunResponse:
    """
    Manually trigger pipeline tasks.

    Supported tasks:
      - discover_feeds: Poll all RSS feeds
      - discover_crawl: Crawl all enabled crawl sources
      - full_pipeline: Run both discovery tasks
    """
    celery = _get_celery()
    task_ids: list[str] = []

    try:
        # Clear stop flag if set — starting the pipeline means resume
        import redis as _redis
        _r = _redis.Redis.from_url(settings.REDIS_URL)
        _r.delete("pipeline:stopped")

        # Pass source_tags and category to task args if provided
        task_kwargs = {}
        if req.source_tags:
            task_kwargs["source_tags"] = req.source_tags
        if req.category:
            task_kwargs["category"] = req.category

        if req.task in ("discover_feeds", "full_pipeline"):
            result = celery.send_task(
                "workers.tasks.discover_feeds",
                kwargs=task_kwargs,
                queue="default",
            )
            task_ids.append(result.id)

        if req.task in ("discover_crawl", "full_pipeline"):
            result = celery.send_task(
                "workers.tasks.discover_crawl",
                kwargs=task_kwargs,
                queue="default",
            )
            task_ids.append(result.id)

        if req.task not in ("discover_feeds", "discover_crawl", "full_pipeline"):
            raise HTTPException(
                status_code=400,
                detail=f"Unknown task: {req.task}. Use: discover_feeds, discover_crawl, full_pipeline",
            )

        return RunResponse(
            status="dispatched",
            task_ids=task_ids,
            message=f"Dispatched {len(task_ids)} task(s) to Celery workers",
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch: {exc}")


@router.get("/task/{task_id}")
async def get_task_status(task_id: str) -> dict[str, Any]:
    """Check the status of a dispatched Celery task."""
    celery = _get_celery()
    result = celery.AsyncResult(task_id)
    response: dict[str, Any] = {
        "task_id": task_id,
        "status": result.status,
    }
    if result.ready():
        try:
            response["result"] = result.result
        except Exception:
            response["result"] = str(result.result)
    return response


@router.get("/status")
async def get_pipeline_status() -> dict[str, Any]:
    """Return live pipeline processing counts from the database.
    
    Uses a fresh sync connection (not the async session pool) to ensure
    every poll returns the latest data without stale transaction snapshots.
    """
    from sqlalchemy import text

    engine = _get_engine()
    with engine.connect() as conn:
        # Raw articles by status
        raw_result = conn.execute(
            text("SELECT status, COUNT(*) FROM raw_articles GROUP BY status")
        )
        raw_counts = {row[0]: row[1] for row in raw_result.all()}

        # Final articles by status
        art_result = conn.execute(
            text("SELECT status, COUNT(*) FROM articles GROUP BY status")
        )
        art_counts = {row[0]: row[1] for row in art_result.all()}

        # Recent articles (last 5 created)
        recent_result = conn.execute(
            text(
                "SELECT id, LEFT(title, 80) as title, status, source_outlet, created_at "
                "FROM articles ORDER BY created_at DESC LIMIT 5"
            )
        )
        recent = [
            {
                "id": str(row[0]),
                "title": row[1],
                "status": row[2],
                "source": row[3],
                "created_at": str(row[4]),
            }
            for row in recent_result.all()
        ]

    return {
        "raw_articles": raw_counts,
        "articles": art_counts,
        "recent": recent,
        "total_raw": sum(raw_counts.values()),
        "total_articles": sum(art_counts.values()),
    }


# ── Curation (raw article review before LLM rewrite) ────────────

@router.get("/curation/articles")
async def list_curation_articles(
    status: str = "scraped",
    limit: int = 200,
) -> list[dict[str, Any]]:
    """List raw articles for curation, filterable by status."""
    from sqlalchemy import text

    engine = _get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT id, url, url_hash, source_name, source_type, category, "
                "title, author, body_text, word_count, language, status, "
                "scraped_at, created_at "
                "FROM raw_articles "
                "WHERE status = :status "
                "ORDER BY scraped_at DESC NULLS LAST, created_at DESC "
                "LIMIT :limit"
            ),
            {"status": status, "limit": limit},
        )
        rows = result.all()

    return [
        {
            "id": str(row[0]),
            "url": row[1],
            "url_hash": row[2],
            "source_name": row[3],
            "source_type": row[4],
            "category": row[5],
            "title": row[6],
            "author": row[7],
            "body_text": row[8],
            "word_count": row[9],
            "language": row[10],
            "status": row[11],
            "scraped_at": str(row[12]) if row[12] else None,
            "created_at": str(row[13]) if row[13] else None,
        }
        for row in rows
    ]


@router.get("/curation/stats")
async def curation_stats() -> dict[str, int]:
    """Count raw articles by status for the curation dashboard."""
    from sqlalchemy import text

    engine = _get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT status, COUNT(*) FROM raw_articles GROUP BY status")
        )
        return {row[0]: row[1] for row in result.all()}


@router.post("/curation/approve")
async def approve_curation_articles(
    body: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    """Approve selected raw articles → enqueue for LLM rewrite."""
    from sqlalchemy import text
    from ..database import get_db

    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=422, detail="No article IDs provided")

    celery = _get_celery()
    approved = 0

    async for db in get_db():
        for article_id in ids:
            # Set status to 'processing'
            await db.execute(
                text(
                    "UPDATE raw_articles SET status = 'processing' "
                    "WHERE id = :id AND status = 'scraped'"
                ),
                {"id": article_id},
            )

            # Get source_name for the rewrite task
            row = await db.execute(
                text("SELECT source_name FROM raw_articles WHERE id = :id"),
                {"id": article_id},
            )
            source_row = row.fetchone()
            source_name = source_row[0] if source_row else ""

            # Enqueue rewrite task
            celery.send_task(
                "workers.tasks.rewrite_article_task",
                args=[str(article_id), source_name, "vi"],
                queue="rewriter_queue",
            )
            approved += 1

        await db.commit()

    return {"approved": approved}


@router.post("/curation/discard")
async def discard_curation_articles(
    body: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    """Discard selected raw articles — they won't be rewritten."""
    from sqlalchemy import text
    from ..database import get_db

    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=422, detail="No article IDs provided")

    async for db in get_db():
        for article_id in ids:
            await db.execute(
                text(
                    "UPDATE raw_articles SET status = 'discarded' "
                    "WHERE id = :id AND status = 'scraped'"
                ),
                {"id": article_id},
            )
        await db.commit()

    return {"discarded": len(ids)}


@router.post("/curation/approve-all")
async def approve_all_curation_articles() -> dict[str, Any]:
    """Approve ALL scraped raw articles → enqueue for rewrite."""
    from sqlalchemy import text
    from ..database import get_db

    celery = _get_celery()
    approved = 0

    async for db in get_db():
        result = await db.execute(
            text("SELECT id, source_name FROM raw_articles WHERE status = 'scraped'")
        )
        rows = result.all()

        for row in rows:
            article_id, source_name = str(row[0]), row[1] or ""
            await db.execute(
                text("UPDATE raw_articles SET status = 'processing' WHERE id = :id"),
                {"id": article_id},
            )
            celery.send_task(
                "workers.tasks.rewrite_article_task",
                args=[article_id, source_name, "vi"],
                queue="rewriter_queue",
            )
            approved += 1

        await db.commit()

    return {"approved": approved}


@router.post("/curation/discard-all")
async def discard_all_curation_articles() -> dict[str, Any]:
    """Discard ALL scraped raw articles."""
    from sqlalchemy import text
    from ..database import get_db

    async for db in get_db():
        result = await db.execute(
            text(
                "UPDATE raw_articles SET status = 'discarded' "
                "WHERE status = 'scraped'"
            )
        )
        await db.commit()
        return {"discarded": result.rowcount}

