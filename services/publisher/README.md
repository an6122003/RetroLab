# Publisher Service

Review, edit, approve, and publish pipeline articles to Notion.

## Architecture

```
services/publisher/
├── backend/          # FastAPI + SQLAlchemy async
│   ├── main.py       # App entry point
│   ├── routers/      # articles.py, publish.py
│   ├── notion.py     # Markdown → Notion blocks + page creation
│   ├── models.py     # SQLAlchemy models (mirrors pipeline)
│   ├── schemas.py    # Pydantic v2 schemas
│   ├── database.py   # Async engine + session
│   └── settings.py   # Pydantic Settings
├── frontend/         # React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/    # Dashboard, ArticleEditor
│       ├── components/ # ArticleList, EditorPanel, ImagePicker, etc.
│       └── utils/    # slug.ts (Vietnamese diacritics)
├── docker-compose.yml
└── .env.example
```

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, NOTION_API_KEY, NOTION_DATABASE_ID
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install fastapi uvicorn sqlalchemy[asyncio] asyncpg pydantic-settings notion-client mistune
uvicorn backend.main:app --port 8001 --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev  # → http://localhost:3000
```

### 4. Docker

```bash
docker compose up -d
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | List articles (query: status, limit, offset) |
| GET | `/api/articles/{id}` | Get article detail |
| PATCH | `/api/articles/{id}` | Update fields |
| POST | `/api/articles/{id}/approve` | Approve (requires slug + image) |
| POST | `/api/articles/{id}/reject` | Reject article |
| POST | `/api/articles/{id}/publish` | Push to Notion |
| GET | `/api/stats` | Status counts |
| GET | `/health` | Health check |

## Notion Integration

Maps to existing Notion DB properties:
- **Title** → article.title
- **Status** → "Live"
- **Category** → article.category (Select)
- **Tags** → article.tags[] (Multi-select)
- **Excerpt** → article.summary (Rich text)
- **Author** → article.source_author (Rich text)
- **Date** → article.source_published_at (Date)
- **Slug** → article.slug (Rich text)
- **Featured** → false (Checkbox)

Page body: image → callout (perspective) → divider → markdown content → divider → source link

## Vietnamese Content

- Font: Be Vietnam Pro
- Slug generation: strips Vietnamese diacritics
- Spell check: disabled on all inputs
- Language badge: shows output_language
