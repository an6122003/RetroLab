"""
Tests for Stage 1 — Mode A: RSS feed poller.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from pipeline.discovery.feed_poller import hash_url, poll_feeds


class TestHashUrl:
    """Test URL hashing utility."""

    def test_deterministic(self):
        url = "https://example.com/article-1"
        assert hash_url(url) == hash_url(url)

    def test_different_urls_different_hashes(self):
        assert hash_url("https://a.com") != hash_url("https://b.com")

    def test_sha256_length(self):
        result = hash_url("https://example.com")
        assert len(result) == 64


class TestPollFeeds:
    """Integration-style tests for the feed poller."""

    @pytest.mark.asyncio
    async def test_poll_feeds_skips_processed_urls(self):
        """Already-processed URLs should be skipped."""

        mock_feed_xml = """<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>Already Seen Article</title>
              <link>https://example.com/old-article</link>
            </item>
          </channel>
        </rss>"""

        with (
            patch("pipeline.discovery.feed_poller.get_enabled_sources") as mock_sources,
            patch("pipeline.discovery.feed_poller.is_url_processed", new_callable=AsyncMock) as mock_check,
            patch("pipeline.discovery.feed_poller.mark_url_processed", new_callable=AsyncMock),
            patch("httpx.AsyncClient.get") as mock_get,
        ):
            mock_sources.return_value = [
                {"name": "Test", "url": "https://example.com/feed", "category": "tech"}
            ]

            mock_response = AsyncMock()
            mock_response.text = mock_feed_xml
            mock_response.raise_for_status = lambda: None
            mock_get.return_value = mock_response

            # Mark as already processed
            mock_check.return_value = True

            result = await poll_feeds()
            assert len(result) == 0

    @pytest.mark.asyncio
    async def test_poll_feeds_enqueues_new_urls(self):
        """New URLs should be returned and marked as processed."""

        mock_feed_xml = """<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>New Article</title>
              <link>https://example.com/new-article</link>
            </item>
          </channel>
        </rss>"""

        with (
            patch("pipeline.discovery.feed_poller.get_enabled_sources") as mock_sources,
            patch("pipeline.discovery.feed_poller.is_url_processed", new_callable=AsyncMock) as mock_check,
            patch("pipeline.discovery.feed_poller.mark_url_processed", new_callable=AsyncMock) as mock_mark,
            patch("httpx.AsyncClient.get") as mock_get,
        ):
            mock_sources.return_value = [
                {"name": "Test", "url": "https://example.com/feed", "category": "tech"}
            ]

            mock_response = AsyncMock()
            mock_response.text = mock_feed_xml
            mock_response.raise_for_status = lambda: None
            mock_get.return_value = mock_response

            mock_check.return_value = False

            result = await poll_feeds()
            assert len(result) == 1
            assert result[0]["url"] == "https://example.com/new-article"
            assert result[0]["source_name"] == "Test"
            mock_mark.assert_called_once()
