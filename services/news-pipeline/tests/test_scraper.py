"""
Tests for Stage 2 — Article scraper.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from pipeline.scraper import DomainRateLimiter, _extract_images, _extract_title_from_html


class TestExtractTitle:
    """Test HTML title extraction."""

    def test_extracts_og_title(self):
        html = '<meta property="og:title" content="Test Article Title">'
        assert _extract_title_from_html(html) == "Test Article Title"

    def test_fallback_to_title_tag(self):
        html = "<title>Fallback Title</title>"
        assert _extract_title_from_html(html) == "Fallback Title"

    def test_og_title_preferred_over_title_tag(self):
        html = """
        <meta property="og:title" content="OG Title">
        <title>Title Tag</title>
        """
        assert _extract_title_from_html(html) == "OG Title"

    def test_no_title(self):
        html = "<html><body>No title here</body></html>"
        assert _extract_title_from_html(html) == ""


class TestExtractImages:
    """Test image extraction from HTML."""

    def test_extracts_images(self):
        html = """
        <img src="https://example.com/photo1.jpg" width="800" height="600">
        <img src="https://example.com/photo2.jpg" width="400" height="300">
        """
        images = _extract_images(html, "https://example.com")
        assert len(images) == 2

    def test_skips_small_images(self):
        html = '<img src="https://example.com/icon.png" width="50" height="50">'
        images = _extract_images(html, "https://example.com")
        assert len(images) == 0

    def test_skips_tracker_images(self):
        html = '<img src="https://example.com/pixel.gif" width="800" height="600">'
        images = _extract_images(html, "https://example.com")
        assert len(images) == 0

    def test_max_images_limit(self):
        html = "".join(
            f'<img src="https://example.com/img{i}.jpg">'
            for i in range(20)
        )
        images = _extract_images(html, "https://example.com", max_images=5)
        assert len(images) == 5


class TestDomainRateLimiter:
    """Test the per-domain rate limiter."""

    @pytest.mark.asyncio
    async def test_rate_limiter_delays(self):
        import time
        limiter = DomainRateLimiter(interval=0.1)

        start = time.monotonic()
        await limiter.acquire("example.com")
        await limiter.acquire("example.com")
        elapsed = time.monotonic() - start

        # Second acquire should wait ~0.1s
        assert elapsed >= 0.09

    @pytest.mark.asyncio
    async def test_different_domains_no_delay(self):
        import time
        limiter = DomainRateLimiter(interval=1.0)

        start = time.monotonic()
        await limiter.acquire("domain-a.com")
        await limiter.acquire("domain-b.com")
        elapsed = time.monotonic() - start

        # Different domains should not block each other
        assert elapsed < 0.5
