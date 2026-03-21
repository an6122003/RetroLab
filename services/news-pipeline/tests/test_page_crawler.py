"""
Tests for Stage 1 — Mode B: Page crawler.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from pipeline.discovery.page_crawler import _extract_links, crawl_pages, hash_url


class TestExtractLinks:
    """Test link extraction from HTML."""

    def test_extracts_matching_links(self):
        html = """
        <html>
        <body>
            <h3><a href="/pixel-9-review-news-12345.php">Pixel 9 Review</a></h3>
            <a href="/galaxy-s25-news-67890.php">Galaxy S25</a>
            <a href="/about.php">About</a>
        </body>
        </html>
        """
        pattern = r"gsmarena\.com/[a-z0-9_-]+-news-\d+\.php"
        links = _extract_links(html, "https://www.gsmarena.com/news.php3", pattern)
        assert len(links) == 2
        assert all("news-" in link for link in links)

    def test_filters_external_domains(self):
        html = """
        <a href="https://external.com/article">External</a>
        <a href="/internal-article-news-123.php">Internal</a>
        """
        pattern = r"gsmarena\.com/[a-z0-9_-]+-news-\d+\.php"
        links = _extract_links(html, "https://www.gsmarena.com/", pattern)
        assert len(links) == 1
        assert "gsmarena.com" in links[0]

    def test_deduplicates_within_page(self):
        html = """
        <a href="/article-news-123.php">Link 1</a>
        <a href="/article-news-123.php">Link 2 same URL</a>
        """
        pattern = r"gsmarena\.com/[a-z0-9_-]+-news-\d+\.php"
        links = _extract_links(html, "https://www.gsmarena.com/", pattern)
        assert len(links) == 1

    def test_empty_html(self):
        links = _extract_links("", "https://example.com", ".*")
        assert links == []


class TestCrawlPages:
    """Integration-style tests for page crawler."""

    @pytest.mark.asyncio
    async def test_crawl_pages_discovers_articles(self):
        html = """
        <html><body>
            <h3><a href="https://www.gsmarena.com/pixel-9-review-news-12345.php">Article</a></h3>
        </body></html>
        """

        with (
            patch("pipeline.discovery.page_crawler.get_enabled_sources") as mock_sources,
            patch("pipeline.discovery.page_crawler.is_url_processed", new_callable=AsyncMock) as mock_check,
            patch("pipeline.discovery.page_crawler.mark_url_processed", new_callable=AsyncMock),
            patch("httpx.AsyncClient.get") as mock_get,
        ):
            mock_sources.return_value = [{
                "name": "GSMArena",
                "seed_url": "https://www.gsmarena.com/news.php3",
                "article_url_pattern": r"gsmarena\.com/[a-z0-9_-]+-news-\d+\.php",
                "js_required": False,
                "category": "tech",
            }]

            mock_resp = AsyncMock()
            mock_resp.text = html
            mock_resp.raise_for_status = lambda: None
            mock_get.return_value = mock_resp

            mock_check.return_value = False

            result = await crawl_pages()
            assert len(result) >= 1
            assert result[0]["source_name"] == "GSMArena"
