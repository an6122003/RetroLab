"""
Tests for Stage 3 — LLM rewriter.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from pipeline.rewriter import rewrite_article


class TestRewriteArticle:
    """Tests for the Claude-based article rewriter."""

    @pytest.mark.asyncio
    async def test_successful_rewrite(self):
        """Test successful article rewrite with valid JSON response."""
        mock_response = {
            "title": "Rewritten Title",
            "body": "## Introduction\n\nRewritten body text.",
            "summary": "A summary of the article.",
            "perspective": "An editorial perspective.",
            "image_keywords": ["tech", "gadget", "innovation"],
            "tags": ["Technology", "Review"],
            "reading_time_minutes": 5,
        }

        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps(mock_response))]

        with patch("pipeline.rewriter.anthropic.AsyncAnthropic") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.messages.create = AsyncMock(return_value=mock_message)
            mock_client_cls.return_value = mock_client

            with patch("pipeline.rewriter.get_settings") as mock_settings:
                mock_settings.return_value = MagicMock(
                    anthropic_api_key="sk-test",
                    llm_temperature=0.7,
                )

                result = await rewrite_article(
                    {
                        "title": "Original Title",
                        "author": "Test Author",
                        "body_text": "Original article body text goes here.",
                        "published_at": "2026-01-01",
                    },
                    source_name="The Verge",
                )

        assert result["title"] == "Rewritten Title"
        assert result["reading_time_minutes"] == 5
        assert len(result["image_keywords"]) == 3
        assert len(result["tags"]) == 2

    @pytest.mark.asyncio
    async def test_strips_markdown_fences(self):
        """Test that markdown fences around JSON are handled."""
        raw_json = json.dumps({
            "title": "T",
            "body": "B",
            "summary": "S",
            "perspective": "P",
            "image_keywords": ["k"],
            "tags": ["t"],
            "reading_time_minutes": 3,
        })
        fenced = f"```json\n{raw_json}\n```"

        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=fenced)]

        with patch("pipeline.rewriter.anthropic.AsyncAnthropic") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.messages.create = AsyncMock(return_value=mock_message)
            mock_client_cls.return_value = mock_client

            with patch("pipeline.rewriter.get_settings") as mock_settings:
                mock_settings.return_value = MagicMock(
                    anthropic_api_key="sk-test",
                    llm_temperature=0.7,
                )

                result = await rewrite_article(
                    {"title": "T", "body_text": "Body"},
                    source_name="Test",
                )

        assert result["title"] == "T"

    @pytest.mark.asyncio
    async def test_malformed_json_raises_after_retry(self):
        """Test that malformed JSON raises ValueError after retry."""
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="This is not JSON")]

        with patch("pipeline.rewriter.anthropic.AsyncAnthropic") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.messages.create = AsyncMock(return_value=mock_message)
            mock_client_cls.return_value = mock_client

            with patch("pipeline.rewriter.get_settings") as mock_settings:
                mock_settings.return_value = MagicMock(
                    anthropic_api_key="sk-test",
                    llm_temperature=0.7,
                )

                with pytest.raises(ValueError, match="malformed JSON"):
                    await rewrite_article(
                        {"title": "T", "body_text": "Body"},
                        source_name="Test",
                    )

        # Should have been called twice (initial + retry)
        assert mock_client.messages.create.call_count == 2
