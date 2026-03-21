# 📰 News Pipeline

Automated news scraping, LLM rewriting, and editorial review pipeline.

Discovers articles from 18 tech news sources (RSS feeds + page crawlers),
scrapes and extracts content, rewrites with Claude AI for editorial voice,
finds relevant images, and stores finished articles as `draft` for review
via a built-in FastAPI review API.

> **Note:** Notion publishing is handled by a separate service (not included here).
> This pipeline's job ends when an article reaches `status = 'draft'`.

---

## Architecture

```
┌──────────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│  Discovery   │───▶│  Scraper   │───▶│  Rewriter   │───▶│ Image Search │───▶│  status=draft  │
│ (RSS/Crawl)  │    │(trafilatura│    │ (Claude AI)  │    │(Unsplash/    │    │ (pipeline done)│
│  30m cycle   │    │ +Playwright│    │              │    │ Pexels/DALL·E│    │                │
└──────────────┘    └────────────┘    └─────────────┘    └──────────────┘    └────────────────┘
       │                  │                 │                   │                      │
       └──────────────────┴─────────────────┴───────────────────┴──────────────────────┘
                          PostgreSQL (state) + Redis (queues) + FastAPI (review)
```

## Article Status Lifecycle

```
image_pending → draft → approved → published
                     ↘ rejected
rewrite_failed (terminal)
```

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Or: Python 3.11+, PostgreSQL, Redis

### 2. Environment Setup

```bash
cd services/news-pipeline
cp .env.example .env
# Edit .env with your API keys:
#   ANTHROPIC_API_KEY, UNSPLASH_ACCESS_KEY, PEXELS_API_KEY
```

### 3. Run with Docker (recommended)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** — pipeline state database
- **Redis** — Celery message broker
- **migrate** — runs Alembic migrations (once)
- **worker** — scraper, rewriter, image search tasks
- **beat** — discovery scheduler (every 30 minutes)
- **api** — FastAPI review API on port 8000

### 4. Run Locally (development)

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -e ".[dev]"

# Install Playwright browsers
playwright install chromium

# Run database migrations
alembic upgrade head

# Start workers in separate terminals:
celery -A workers.celery_app worker -Q scraper_queue,rewriter_queue,image_search_queue,default -l INFO
celery -A workers.celery_app beat -l INFO

# Start review API:
uvicorn pipeline.api:app --reload --port 8000
```

---

## Review API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/articles?status=draft&limit=20&offset=0` | List articles (newest first) |
| `GET` | `/articles/{id}` | Get single article |
| `PATCH` | `/articles/{id}` | Update article fields |
| `GET` | `/health` | Health check + draft count |

### PATCH /articles/{id} — accepted fields

```json
{
  "status": "approved",
  "selected_image": { "url": "...", "source": "unsplash" },
  "slug": "pixel-9-review",
  "title": "Updated Title",
  "body": "Updated body in markdown",
  "summary": "...",
  "perspective": "...",
  "category": "tech",
  "tags": ["AI", "Review"]
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL async connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379/0` | Redis broker URL |
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic API key for Claude |
| `UNSPLASH_ACCESS_KEY` | ✅ | — | Unsplash API access key |
| `PEXELS_API_KEY` | ✅ | — | Pexels API key |
| `OPENAI_API_KEY` | ❌ | — | For DALL·E image fallback |
| `ENABLE_DALLE_FALLBACK` | ❌ | `false` | Enable DALL·E image generation |
| `DISCOVERY_INTERVAL_MINUTES` | ❌ | `30` | Feed polling interval |
| `MAX_ARTICLES_PER_RUN` | ❌ | `50` | Max articles per discovery run |
| `SCRAPER_DELAY_SECONDS` | ❌ | `2` | Per-domain rate limit |
| `PLAYWRIGHT_HEADLESS` | ❌ | `true` | Playwright browser mode |
| `LLM_TEMPERATURE` | ❌ | `0.7` | Claude temperature setting |
| `LOG_LEVEL` | ❌ | `INFO` | Logging level |

---

## Adding a New Source

Edit `config/sources.yaml`:

### RSS Source

```yaml
tech:
  - name: My New Source
    type: rss
    url: https://example.com/feed.xml
    enabled: true
```

### Crawl Source

```yaml
tech:
  - name: My Crawl Source
    type: crawl
    seed_url: https://example.com/news
    article_url_pattern: 'example\.com/\d{4}/\d{2}/[a-z-]+'
    article_selector: 'h2 a, h3 a'
    js_required: false
    enabled: true
```

No code changes needed — the pipeline reads from `sources.yaml` on every run.

---

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## Running Tests

```bash
pip install -e ".[dev]"
pytest -v
```

---

## Pipeline Stages

| Stage | Module | Queue | Description |
|-------|--------|-------|-------------|
| 1a | `pipeline/discovery/feed_poller.py` | `default` | RSS/Atom feed polling |
| 1b | `pipeline/discovery/page_crawler.py` | `default` | Page crawling + link extraction |
| 2 | `pipeline/scraper.py` | `scraper_queue` | Article content extraction |
| 3 | `pipeline/rewriter.py` | `rewriter_queue` | Claude AI rewriting |
| 4 | `pipeline/image_search.py` | `image_search_queue` | Image search (final stage) |
| — | `pipeline/api.py` | — | FastAPI review API |

---

## Current Sources (18)

| Source | Type | Status |
|--------|------|--------|
| The Verge | RSS | ✅ |
| 9to5Google | RSS | ✅ |
| 9to5Mac | RSS | ✅ |
| XDA Developers | RSS | ✅ |
| Android Authority | RSS | ✅ |
| Android Central | RSS | ✅ |
| Ars Technica | RSS | ✅ |
| Engadget | RSS | ✅ |
| Gizmodo | RSS | ✅ |
| TechCrunch | RSS | ✅ |
| Wired | RSS | ✅ |
| TechRadar | RSS | ✅ |
| MacRumors | RSS | ✅ |
| Hacker News | RSS | ✅ |
| MIT Technology Review | RSS | ✅ |
| GSMArena | Crawl | ✅ |
| Phandroid | Crawl | ✅ |
| NotebookCheck | Crawl | ✅ |

---

## License

Internal project — not for public distribution.
