<p align="center">
  <img src="https://img.shields.io/badge/RetroLab-Tech%20Magazine-0d47a1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTIwIDJINGMtMS4xMDMgMC0yIC44OTctMiAydjE2YzAgMS4xMDMuODk3IDIgMiAyaDE2YzEuMTAzIDAgMi0uODk3IDItMlY0YzAtMS4xMDMtLjg5Ny0yLTItMnpNOCAxN1Y3aDN2MTBIOHptNSAwdi00aDN2NGgtM3ptMy02aC0zVjdoM3Y0eiIvPjwvc3ZnPg==&logoColor=white" alt="RetroLab" />
</p>

# 🔬 RetroLab

**A full-stack AI-powered technology news and review magazine platform.**

RetroLab is a self-hosted, end-to-end content pipeline that automatically discovers trending tech news, rewrites articles using LLMs (Ollama, Gemini, Claude), manages editorial workflows, and publishes to a modern Next.js magazine frontend — all from a single monorepo.

---

## 📐 Architecture Overview

```
RetroLab/
├── src/                        # 🌐 Public-facing magazine (Next.js)
├── services/
│   ├── news-pipeline/          # 🔄 Content discovery & AI rewriting engine
│   └── publisher/              # 📋 Editorial dashboard & API
│       ├── backend/            #    FastAPI backend
│       └── frontend/           #    React + Vite admin UI
├── design-system/              # 🎨 Shared design tokens
└── RetroLabMockup/             # 📱 Original design mockups
```

---

## 🧩 Services

### 🌐 Magazine Frontend — `src/`

The public-facing technology magazine built with **Next.js 15**, **React 19**, and **Tailwind CSS**.

| Feature | Details |
|---------|---------|
| **Framework** | Next.js 15 (App Router, Server Components) |
| **Styling** | Tailwind CSS with custom design system |
| **CMS** | Notion API as headless CMS |
| **Content** | Markdown rendering with syntax highlighting |
| **Themes** | Light & Dark mode with `next-themes` |
| **Animations** | Framer Motion for page transitions |
| **SEO** | Dynamic metadata, Open Graph, structured data |
| **Port** | `localhost:3001` |

**Category pages** include distinct layouts for AI, Reviews, News, Tips & Tricks, and more — each with unique hero sections and content grids.

---

### 🔄 News Pipeline — `services/news-pipeline/`

An automated content discovery and AI rewriting engine that finds trending tech articles, scrapes them, and rewrites them into original Vietnamese content using LLMs.

| Feature | Details |
|---------|---------|
| **Framework** | FastAPI + SQLAlchemy + Alembic |
| **Database** | PostgreSQL |
| **Task Queue** | Celery with Redis broker |
| **LLM Providers** | Ollama (local), Google Gemini, Anthropic Claude |
| **Discovery** | RSS feeds, Google News scraping |
| **Image Search** | Google Images scraping (cost-free), Unsplash, Pexels fallback |
| **Workers** | Distributed Celery workers with CPU/memory monitoring |
| **Docker** | Full `docker-compose.yml` for containerized deployment |

**Pipeline flow:**
```
RSS/Google News → Scrape → Deduplicate → AI Rewrite → Image Search → Save Draft
```

---

### 📋 Publisher — `services/publisher/`

A full-featured editorial dashboard for managing the content lifecycle — from AI-generated drafts to published articles on the Notion CMS.

#### Backend — `services/publisher/backend/`

| Feature | Details |
|---------|---------|
| **Framework** | FastAPI (async) |
| **Database** | SQLite via SQLAlchemy |
| **Cache** | Redis for config & session data |
| **Publishing** | Notion API integration (create/update pages) |
| **Backup** | Automated backup with Google Drive sync |
| **Auth** | Session-based authentication |

**Key API routes:**
- `/api/articles` — CRUD for articles with status management
- `/api/pipeline` — Pipeline config, daily source management, run control
- `/api/backup` — Export/import, scheduled backups, Google Drive sync
- `/api/images` — Upload, proxy, and manage article images
- `/api/publish` — One-click publish to Notion CMS

#### Frontend — `services/publisher/frontend/`

| Feature | Details |
|---------|---------|
| **Framework** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS (Material Design 3 tokens) |
| **State** | TanStack Query (React Query) |
| **Routing** | React Router v6 |
| **Icons** | Material Symbols |
| **Fonts** | Inter + Outfit (Google Fonts) |
| **Port** | `localhost:3000` |

**Dashboard pages:**

| Page | Description |
|------|-------------|
| **Articles** | Article list with search, filters, status indicators |
| **Article Editor** | Rich editor with image management, approve/reject/publish flow |
| **Compose** | AI article composer — paste a URL, pick an LLM, generate articles |
| **Pipeline** | Full pipeline control — sources, scheduling, run history, logs |
| **Workers** | Real-time Celery worker monitoring with CPU/memory charts |
| **FinOps** | LLM cost intelligence — token tracking, provider breakdown, VND/USD toggle |
| **Backup** | Backup management with Google Drive sync, version history |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.11
- **Redis** (running locally or via Docker)
- **PostgreSQL** (for news-pipeline)

### 1. Magazine Frontend

```bash
# Install dependencies
npm install

# Create .env with Notion API keys
cp .env.example .env

# Start dev server (port 3001)
npm run dev
```

### 2. News Pipeline

```bash
cd services/news-pipeline

# Create virtual environment
python -m venv .venv
.venv/Scripts/activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -e ".[dev]"

# Copy and configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start API server
uvicorn pipeline.api:app --host 0.0.0.0 --port 8002

# Start Celery worker (separate terminal)
celery -A workers.celery_app worker -l info
```

### 3. Publisher

```bash
cd services/publisher

# Backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev  # port 3000
```

---

## 🔐 Google Drive Backup

RetroLab supports automatic backup uploads to Google Drive with version history.

### Setup

1. Create an **OAuth Client ID** (Desktop app) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Download the JSON → save as `services/publisher/secrets/gdrive-oauth.json`
3. Run the one-time auth flow:
   ```bash
   cd services/publisher
   python -m backend.gdrive
   ```
4. Sign in via browser → token is saved to `secrets/gdrive-token.json`
5. Create a Google Drive folder and paste its ID in the Publisher Backup settings

The refresh token works on any machine — just copy the `secrets/` folder.

---

## 📁 Environment Variables

Each service has its own `.env.example` with all required variables documented:

| Service | File | Key Variables |
|---------|------|---------------|
| Magazine | `.env` | `NOTION_TOKEN`, `NOTION_DATABASE_ID` |
| Pipeline | `services/news-pipeline/.env` | `DATABASE_URL`, `REDIS_URL`, LLM API keys |
| Publisher | `services/publisher/.env` | `REDIS_URL`, `NOTION_TOKEN`, `NOTION_DATABASE_ID` |

---

## 🛡️ Security

- All secrets are stored in git-ignored `secrets/` directories
- `.env` files are excluded from version control
- Service Account keys and OAuth tokens never leave the server
- Session-based auth protects the Publisher dashboard

---

## 📊 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Magazine** | Next.js 15, React 19, Tailwind CSS, Notion API |
| **Pipeline API** | FastAPI, PostgreSQL, SQLAlchemy, Alembic |
| **Task Queue** | Celery, Redis |
| **AI/LLM** | Ollama, Google Gemini, Anthropic Claude |
| **Publisher API** | FastAPI, SQLite, Redis |
| **Publisher UI** | React, Vite, TypeScript, TanStack Query |
| **Backup** | Google Drive API v3 (OAuth2) |
| **Deployment** | Docker Compose |

---

## 📄 License

This project is private and proprietary.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/an6122003">an6122003</a>
</p>
