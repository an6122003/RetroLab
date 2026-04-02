"""
Application settings via Pydantic BaseSettings.
All config is read from environment variables / .env file.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ── Resolve paths ────────────────────────────────────────────────
SERVICE_ROOT = Path(__file__).resolve().parent.parent
SOURCES_YAML = SERVICE_ROOT / "config" / "sources.yaml"


class Settings(BaseSettings):
    """Central configuration — all values come from env vars or .env file."""

    model_config = SettingsConfigDict(
        env_file=str(SERVICE_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Required ─────────────────────────────────────────────────
    database_url: str = Field(..., description="Async PostgreSQL connection string")
    redis_url: str = Field(default="redis://localhost:6379/0")
    anthropic_api_key: str = Field(default="", description="Anthropic API key for Claude")

    # ── LLM Provider ─────────────────────────────────────────────
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    llm_provider: str = Field(default="gemini", description="LLM provider: 'gemini', 'anthropic', or 'ollama'")

    # ── Ollama (local LLM) ───────────────────────────────────────
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama API base URL")
    ollama_model: str = Field(default="qwen3:32b", description="Ollama model name")
    ollama_num_ctx: int = Field(default=16384, description="Context window size for Ollama")

    # ── Image search keys (all optional — Google Images scraped for free) ──
    unsplash_access_key: str = Field(default="", description="Unsplash API access key (fallback)")
    pexels_api_key: str = Field(default="", description="Pexels API key (fallback)")
    google_search_api_key: str = Field(default="", description="Google Custom Search API key")
    google_search_cx: str = Field(default="", description="Google Custom Search Engine ID (CX)")


    # ── Optional ─────────────────────────────────────────────────
    openai_api_key: str = Field(default="", description="OpenAI key (DALL-E fallback)")
    enable_dalle_fallback: bool = Field(default=False)
    discovery_interval_minutes: int = Field(default=30)
    max_articles_per_run: int = Field(default=50)
    max_articles_per_source: int = Field(default=10, description="Max articles to discover per source per run")
    randomize_sources: bool = Field(default=True, description="Randomize the order sources are polled")
    scraper_delay_seconds: float = Field(default=2.0)
    playwright_headless: bool = Field(default=True)
    llm_temperature: float = Field(default=0.7)
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    anthropic_model: str = Field(default="claude-sonnet-4-6", description="Anthropic model name")
    ollama_think: bool = Field(default=True, description="Enable /think reasoning prefix for Ollama")
    log_level: str = Field(default="INFO")

    # ── Auto-Approval ────────────────────────────────────────────
    auto_approve: bool = Field(default=False, description="Automatically approve articles after pipeline completes")
    auto_approve_select_image: bool = Field(default=True, description="Auto-select the first image when auto-approving")

    # ── Scheduled Pipeline ───────────────────────────────────────
    scheduler_enabled: bool = Field(default=False, description="Enable scheduled automatic pipeline runs")
    scheduler_mode: str = Field(default="interval", description="Mode: interval or daily")
    scheduler_time_of_day: str = Field(default="08:00", description="Comma-separated UTC times (e.g. 08:00, 14:00)")
    scheduler_interval_minutes: int = Field(default=60, description="Interval between scheduled runs in minutes")
    scheduler_task: str = Field(default="full_pipeline", description="Task to run: full_pipeline, discover_feeds, discover_crawl")
    scheduler_quiet_hours_start: int = Field(default=-1, description="Start of quiet hours (0-23, -1 = disabled)")
    scheduler_quiet_hours_end: int = Field(default=-1, description="End of quiet hours (0-23, -1 = disabled)")

    # ── Language ─────────────────────────────────────────────────
    output_language: str = Field(default="vi", description="ISO 639-1 code for output language")
    output_language_name: str = Field(default="Vietnamese", description="Full name of the output language")

    # ── Derived helpers ──────────────────────────────────────────
    @property
    def sync_database_url(self) -> str:
        """Return a synchronous DB URL for Alembic migrations."""
        return self.database_url.replace("+asyncpg", "+psycopg2")


import json as _json
import time as _time

@lru_cache(maxsize=1)
def _base_settings() -> Settings:
    """Load base settings from env vars / .env file (cached forever)."""
    return Settings()  # type: ignore[call-arg]


# ── Redis config overlay (reads dashboard changes) ───────────────

_CONFIG_CACHE: dict[str, Any] | None = None
_CONFIG_CACHE_TS: float = 0.0
_CONFIG_CACHE_TTL: float = 30.0  # seconds
_REDIS_CONFIG_KEY = "pipeline:config"

# Map Redis config keys → Settings field names (lowercase)
_KEY_MAP = {
    "LLM_PROVIDER": "llm_provider",
    "GEMINI_MODEL": "gemini_model",
    "ANTHROPIC_MODEL": "anthropic_model",
    "OLLAMA_BASE_URL": "ollama_base_url",
    "OLLAMA_MODEL": "ollama_model",
    "OLLAMA_NUM_CTX": "ollama_num_ctx",
    "OLLAMA_THINK": "ollama_think",
    "LLM_TEMPERATURE": "llm_temperature",
    "OUTPUT_LANGUAGE": "output_language",
    "OUTPUT_LANGUAGE_NAME": "output_language_name",
    "DISCOVERY_INTERVAL_MINUTES": "discovery_interval_minutes",
    "MAX_ARTICLES_PER_RUN": "max_articles_per_run",
    "MAX_ARTICLES_PER_SOURCE": "max_articles_per_source",
    "RANDOMIZE_SOURCES": "randomize_sources",
    "SCRAPER_DELAY_SECONDS": "scraper_delay_seconds",
    "ENABLE_DALLE_FALLBACK": "enable_dalle_fallback",
    "AUTO_APPROVE": "auto_approve",
    "AUTO_APPROVE_SELECT_IMAGE": "auto_approve_select_image",
}


def _fetch_redis_config() -> dict[str, str]:
    """Fetch config overrides from Redis with a TTL cache."""
    global _CONFIG_CACHE, _CONFIG_CACHE_TS
    now = _time.monotonic()
    if _CONFIG_CACHE is not None and (now - _CONFIG_CACHE_TS) < _CONFIG_CACHE_TTL:
        return _CONFIG_CACHE
    try:
        import redis
        base = _base_settings()
        r = redis.Redis.from_url(base.redis_url, socket_connect_timeout=2)
        raw = r.get(_REDIS_CONFIG_KEY)
        _CONFIG_CACHE = _json.loads(raw) if raw else {}
    except Exception:
        _CONFIG_CACHE = {}
    _CONFIG_CACHE_TS = now
    return _CONFIG_CACHE


def _coerce(field_name: str, value: str, settings: Settings) -> Any:
    """Coerce a string value from Redis to the correct Python type."""
    current = getattr(settings, field_name, None)
    if isinstance(current, bool):
        return value.lower() in ("true", "1", "yes")
    if isinstance(current, int):
        return int(value)
    if isinstance(current, float):
        return float(value)
    return value


def get_settings() -> Settings:
    """Return settings with Redis overrides from the admin dashboard.
    
    Base config comes from .env / env vars (cached forever).
    Dashboard overrides from Redis are overlaid with a 30s TTL cache.
    """
    settings = _base_settings()
    redis_cfg = _fetch_redis_config()
    if not redis_cfg:
        return settings

    # Create a shallow copy so we don't mutate the cached base
    overrides: dict[str, Any] = {}
    for redis_key, value in redis_cfg.items():
        field_name = _KEY_MAP.get(redis_key)
        if field_name and hasattr(settings, field_name):
            try:
                overrides[field_name] = _coerce(field_name, str(value), settings)
            except (ValueError, TypeError):
                pass

    if overrides:
        return settings.model_copy(update=overrides)
    return settings


# ── Source-config loader ─────────────────────────────────────────

def load_sources(path: Path | None = None) -> dict[str, list[dict[str, Any]]]:
    """
    Load and return the sources.yaml config.

    Returns a dict like:
        {"tech": [{"name": "The Verge", "type": "rss", ...}, ...]}
    """
    p = path or SOURCES_YAML
    with open(p, "r", encoding="utf-8") as fh:
        data: dict[str, list[dict[str, Any]]] = yaml.safe_load(fh)
    return data


def get_enabled_sources(
    category: str | None = None,
    source_type: str | None = None,
) -> list[dict[str, Any]]:
    """
    Return a flat list of enabled source dicts, optionally filtered
    by category key and/or type (rss | crawl).
    """
    sources = load_sources()
    result: list[dict[str, Any]] = []

    for cat, entries in sources.items():
        if category and cat != category:
            continue
        for entry in entries:
            if not entry.get("enabled", False):
                continue
            if source_type and entry.get("type") != source_type:
                continue
            # Attach the category key to each source for downstream use
            result.append({**entry, "category": cat})

    return result
