"""
Publisher service configuration via Pydantic Settings.
Reads from environment variables / .env file.
"""

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env lives at services/publisher/.env  (parent of backend/)
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/news_pipeline"
    NOTION_API_KEY: str = ""
    NOTION_DATABASE_ID: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"

    @property
    def pipeline_dir(self) -> Path:
        """Path to the news-pipeline service root.

        In production (Docker), PIPELINE_CONFIG_DIR points to the mounted config.
        In dev, it resolves relative to this file.
        """
        env_dir = os.getenv("PIPELINE_CONFIG_DIR")
        if env_dir:
            return Path(env_dir).parent  # parent because config/ is the dir
        return Path(__file__).resolve().parent.parent.parent / "news-pipeline"


settings = Settings()
