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


    # ── Optional ─────────────────────────────────────────────────
    openai_api_key: str = Field(default="", description="OpenAI key (DALL-E fallback)")
    enable_dalle_fallback: bool = Field(default=False)
    discovery_interval_minutes: int = Field(default=30)
    max_articles_per_run: int = Field(default=50)
    scraper_delay_seconds: float = Field(default=2.0)
    playwright_headless: bool = Field(default=True)
    llm_temperature: float = Field(default=0.7)
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    anthropic_model: str = Field(default="claude-sonnet-4-6", description="Anthropic model name")
    ollama_think: bool = Field(default=True, description="Enable /think reasoning prefix for Ollama")
    log_level: str = Field(default="INFO")

    # ── Language ─────────────────────────────────────────────────
    output_language: str = Field(default="vi", description="ISO 639-1 code for output language")
    output_language_name: str = Field(default="Vietnamese", description="Full name of the output language")

    # ── Derived helpers ──────────────────────────────────────────
    @property
    def sync_database_url(self) -> str:
        """Return a synchronous DB URL for Alembic migrations."""
        return self.database_url.replace("+asyncpg", "+psycopg2")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton accessor — cached after first call."""
    return Settings()  # type: ignore[call-arg]


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
