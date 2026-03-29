# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RetroLab — Makefile (Linux / macOS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Local dev:
#   make install          Install all deps (npm + pip + .env)
#   make dev              Start everything (web + publisher + pipeline)
#   make web              Start Next.js frontend only (port 3001)
#   make publisher        Start publisher backend + frontend (8001/3000)
#   make pipeline         Start pipeline via Docker Compose
#   make stop             Stop all local services
#   make status           Check which services are running
#
# Deploy — Web → Cloud Run:
#   make build-web        Build web Docker image
#   make push-web         Push to Artifact Registry
#   make deploy-web       Build + push + deploy to Cloud Run
#   (or use GitHub Actions → Deploy Web to Cloud Run)
#
# Deploy — Pipeline + Publisher → Linux Server:
#   make deploy-server    Build & start all containers
#   make stop-server      Stop all server containers
#   make logs-server      Tail server logs
#
# Setup:
#   make gcp-setup        One-time Artifact Registry + Docker auth

SHELL := /bin/bash

.PHONY: help all dev web pipeline publisher pub-back pub-front \
		stop stop-dev stop-pipeline status logs-pipeline install clean \
		build-web build-publisher build-pipeline build-all \
		push-web deploy-web \
		deploy-server stop-server logs-server \
		nuke gcp-setup

.DEFAULT_GOAL := help

# ── Paths ─────────────────────────────────────────────────────
ROOT        := $(shell pwd)
PIPELINE    := $(ROOT)/services/news-pipeline
PUB_ROOT    := $(ROOT)/services/publisher
PUB_BACK    := $(PUB_ROOT)/backend
PUB_FRONT   := $(PUB_ROOT)/frontend

# ── Cloud Run config ─────────────────────────────────────────
GCP_PROJECT   ?= $(shell gcloud config get-value project 2>/dev/null)
GCP_REGION    ?= asia-southeast1
REGISTRY      ?= $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/retrolab

WEB_IMAGE     = $(REGISTRY)/web

# Read .env for build args (ignore errors if missing)
-include .env
export

# ── Helper: kill process on a port ────────────────────────────
define kill-port
	@pid=$$(lsof -ti :$(1) 2>/dev/null || ss -tlnp 2>/dev/null | grep ':$(1) ' | sed -n 's/.*pid=\([0-9]*\).*/\1/p'); \
	if [ -n "$$pid" ]; then \
		kill $$pid 2>/dev/null && echo "  Killed old process on port $(1) (PID $$pid)" || true; \
		sleep 0.5; \
	fi
endef

# ── Helper: stop local dev processes ──────────────────────────
define stop-dev-processes
	@for pidfile in /tmp/retrolab-web.pid /tmp/retrolab-pub-back.pid /tmp/retrolab-pub-front.pid; do \
		if [ -f "$$pidfile" ]; then \
			p=$$(cat "$$pidfile"); \
			kill "$$p" 2>/dev/null && echo "  Killed PID $$p ($$pidfile)" || true; \
			rm -f "$$pidfile"; \
		fi; \
	done
	@for port in 3000 3001 8001; do \
		p=$$(lsof -ti :$$port 2>/dev/null); \
		if [ -n "$$p" ]; then \
			kill $$p 2>/dev/null && echo "  Killed PID $$p on port $$port" || true; \
		fi; \
	done
endef


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LOCAL DEV
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

all: ## Start everything (web + publisher + pipeline)
	@echo ""
	@echo "  Starting ALL RetroLab Services (local dev)"
	@echo "  ============================================"
	@echo "  >> Stopping server deploy if running..."
	@-docker compose -f docker-compose.server.yml down 2>/dev/null || true
	@$(MAKE) -s web
	@$(MAKE) -s publisher
	@$(MAKE) -s pipeline
	@echo ""
	@echo "  [OK] All services launched!"
	@echo ""
	@echo "  +---------------------------------------------------+"
	@echo "  |  Next.js Frontend    ->  http://localhost:3001     |"
	@echo "  |  Publisher Frontend  ->  http://localhost:3000     |"
	@echo "  |  Publisher Backend   ->  http://localhost:8001     |"
	@echo "  |  Pipeline API        ->  http://localhost:8002     |"
	@echo "  |  PostgreSQL          ->  localhost:5432            |"
	@echo "  |  Redis               ->  localhost:6379            |"
	@echo "  +---------------------------------------------------+"
	@echo ""

dev: all ## Alias for 'all'

web: ## Start Next.js frontend (port 3001)
	$(call kill-port,3001)
	@echo "  >> Starting Next.js Frontend (port 3001)"
	@cd $(ROOT) && nohup npm run dev > /tmp/retrolab-web.log 2>&1 & echo "$$!" > /tmp/retrolab-web.pid
	@echo "  [OK] Next.js started (PID: $$(cat /tmp/retrolab-web.pid))"
	@echo "       Logs: tail -f /tmp/retrolab-web.log"

pub-back: ## Start publisher backend only (port 8001)
	$(call kill-port,8001)
	@echo "  >> Starting Publisher Backend (port 8001)"
	@if [ ! -f "$(PUB_ROOT)/.venv/bin/activate" ]; then \
		echo "  [X] No .venv found -- run 'make install' first."; \
		exit 1; \
	fi
	@cd $(PUB_ROOT) && . .venv/bin/activate && \
		nohup uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload > /tmp/retrolab-pub-back.log 2>&1 & echo "$$!" > /tmp/retrolab-pub-back.pid
	@echo "  [OK] Publisher backend started (PID: $$(cat /tmp/retrolab-pub-back.pid))"
	@echo "       Logs: tail -f /tmp/retrolab-pub-back.log"

pub-front: ## Start publisher frontend only (port 3000)
	$(call kill-port,3000)
	@echo "  >> Starting Publisher Frontend (port 3000)"
	@cd $(PUB_FRONT) && nohup npm run dev > /tmp/retrolab-pub-front.log 2>&1 & echo "$$!" > /tmp/retrolab-pub-front.pid
	@echo "  [OK] Publisher frontend started (PID: $$(cat /tmp/retrolab-pub-front.pid))"
	@echo "       Logs: tail -f /tmp/retrolab-pub-front.log"

publisher: ## Start publisher backend + frontend
	@$(MAKE) -s pub-back
	@$(MAKE) -s pub-front

pipeline: ## Start news pipeline via Docker Compose
	@echo "  >> Starting News Pipeline (Docker Compose)"
	@cd $(PIPELINE) && docker compose up -d --build
	@echo "  [OK] Pipeline containers started."
	@cd $(PIPELINE) && docker compose ps


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MANAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

stop: ## Stop ALL services (local dev + server deploy)
	@echo "  Stopping ALL RetroLab Services"
	@echo "  ============================================"
	@echo "  >> Stopping local pipeline containers..."
	@-cd $(PIPELINE) && docker compose down 2>/dev/null || true
	@echo "  >> Stopping server deploy containers..."
	@-docker compose -f docker-compose.server.yml down 2>/dev/null || true
	@echo "  >> Killing dev server processes..."
	$(call stop-dev-processes)
	@echo "  [OK] All services stopped."

stop-dev: ## Stop only local dev services (not server deploy)
	@echo "  Stopping local dev services"
	@echo "  ============================================"
	@echo "  >> Stopping local pipeline containers..."
	@-cd $(PIPELINE) && docker compose down 2>/dev/null || true
	@echo "  >> Killing dev server processes..."
	$(call stop-dev-processes)
	@echo "  [OK] Local dev stopped."

stop-pipeline: ## Stop only pipeline Docker containers
	@echo "  >> Stopping pipeline containers..."
	@cd $(PIPELINE) && docker compose down
	@echo "  [OK] Pipeline stopped."

nuke: ## Deep cleanup: remove ALL Docker containers, networks, and zombie proxies
	@echo "  ⚠️  Deep Docker Cleanup"
	@echo "  ============================================"
	@echo "  >> Stopping all compose stacks..."
	@-cd $(PIPELINE) && docker compose down 2>/dev/null || true
	@-docker compose -f docker-compose.server.yml down 2>/dev/null || true
	@echo "  >> Killing dev server processes..."
	$(call stop-dev-processes)
	@echo "  >> Removing ALL Docker containers..."
	@-docker ps -aq | xargs -r docker rm -f 2>/dev/null || true
	@echo "  >> Pruning unused Docker networks..."
	@-docker network prune -f 2>/dev/null || true
	@echo "  >> Pruning unused Docker volumes..."
	@-docker volume prune -f 2>/dev/null || true
	@echo ""
	@echo "  [OK] Docker environment is clean."
	@echo "  Run 'make dev' or 'make deploy-server' to start fresh."

status: ## Check which services are running
	@echo ""
	@echo "  Service Status"
	@echo "  ============================================"
	@for entry in "Next.js Frontend:3001" "Publisher Frontend:3000" "Publisher Backend:8001" "Pipeline API:8002" "PostgreSQL:5432" "Redis:6379"; do \
		name=$$(echo "$$entry" | cut -d: -f1); \
		port=$$(echo "$$entry" | cut -d: -f2); \
		if ss -tlnp 2>/dev/null | grep -q ":$$port " || lsof -i :$$port -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "  ✅ $$name (port $$port) -- running"; \
		else \
			echo "  ⬚  $$name (port $$port) -- stopped"; \
		fi; \
	done
	@echo ""

logs-pipeline: ## Tail pipeline Docker logs
	@cd $(PIPELINE) && docker compose logs -f --tail 50


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DOCKER BUILD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

build-web: ## Build Next.js blog Docker image
	@echo "  >> Building retrolab-web"
	docker build -f Dockerfile.web \
		--build-arg NOTION_API_KEY="$(NOTION_API_KEY)" \
		--build-arg NOTION_DATABASE_ID="$(NOTION_DATABASE_ID)" \
		--build-arg NEXT_PUBLIC_SUPABASE_URL="$(NEXT_PUBLIC_SUPABASE_URL)" \
		--build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$(NEXT_PUBLIC_SUPABASE_ANON_KEY)" \
		-t retrolab-web \
		-t $(WEB_IMAGE):latest \
		.
	@echo "  [OK] retrolab-web built"

build-publisher: ## Build Publisher Docker image (backend + frontend)
	@echo "  >> Building retrolab-publisher"
	docker build -f Dockerfile.publisher \
		-t retrolab-publisher \
		.
	@echo "  [OK] retrolab-publisher built"

build-pipeline: ## Build Pipeline Docker image
	@echo "  >> Building retrolab-pipeline"
	docker build -f services/news-pipeline/Dockerfile \
		-t retrolab-pipeline \
		services/news-pipeline/
	@echo "  [OK] retrolab-pipeline built"

build-all: build-web build-publisher build-pipeline ## Build all Docker images


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PUSH TO ARTIFACT REGISTRY (web only)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

push-web: build-web ## Push web image to Artifact Registry
	docker push $(WEB_IMAGE):latest


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DEPLOY — CLOUD RUN (web only, prefer GitHub Actions)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

deploy-web: push-web ## Deploy blog to Cloud Run
	gcloud run deploy retrolab-web \
		--image $(WEB_IMAGE):latest \
		--region $(GCP_REGION) \
		--platform managed \
		--allow-unauthenticated \
		--port 3001 \
		--memory 512Mi \
		--cpu 1 \
		--min-instances 0 \
		--max-instances 3 \
		--set-env-vars "NODE_ENV=production" \
		--set-env-vars "NOTION_API_KEY=$(NOTION_API_KEY)" \
		--set-env-vars "NOTION_DATABASE_ID=$(NOTION_DATABASE_ID)" \
		--set-env-vars "SUPABASE_SERVICE_ROLE_KEY=$(SUPABASE_SERVICE_ROLE_KEY)"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DEPLOY — LINUX SERVER (pipeline + publisher)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

deploy-server: ## Build & run pipeline + publisher on this server
	@echo ""
	@echo "  Deploying Server Services (Pipeline + Publisher)"
	@echo "  ============================================"
	@echo "  >> Stopping local dev if running..."
	@-cd $(PIPELINE) && docker compose down 2>/dev/null || true
	$(call stop-dev-processes)
	@echo "  >> Building and starting server containers..."
	@set -a && . $(PUB_ROOT)/.env && set +a && \
		docker compose -f docker-compose.server.yml up -d --build
	@echo ""
	@echo "  [OK] Server services deployed!"
	@echo ""
	@echo "  +---------------------------------------------------+"
	@echo "  |  Publisher            ->  http://localhost:9001     |"
	@echo "  |  Pipeline API         ->  http://localhost:9002     |"
	@echo "  |  PostgreSQL           ->  internal only             |"
	@echo "  |  Redis                ->  internal only             |"
	@echo "  +---------------------------------------------------+"
	@echo ""
	@set -a && . $(PUB_ROOT)/.env && set +a && \
		docker compose -f docker-compose.server.yml ps

stop-server: ## Stop all server services
	@set -a && . $(PUB_ROOT)/.env 2>/dev/null && set +a; \
		docker compose -f docker-compose.server.yml down
	@echo "  [OK] Server services stopped."

logs-server: ## Tail all server service logs
	docker compose -f docker-compose.server.yml logs -f --tail 50


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  INSTALL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

install: ## Install all dependencies (npm + pip + .env setup)
	@echo "  Installing Dependencies"
	@echo "  ============================================"
	@echo "  >> Installing Next.js dependencies..."
	cd $(ROOT) && npm install
	@echo "  >> Installing Publisher frontend dependencies..."
	cd $(PUB_FRONT) && npm install
	@echo "  >> Setting up Publisher Python venv..."
	@if [ ! -d "$(PUB_ROOT)/.venv" ]; then python3 -m venv $(PUB_ROOT)/.venv; fi
	$(PUB_ROOT)/.venv/bin/pip install -r $(PUB_BACK)/requirements.txt
	@echo "  >> Setting up Pipeline Python venv..."
	@if [ ! -d "$(PIPELINE)/.venv" ]; then python3 -m venv $(PIPELINE)/.venv; fi
	cd $(PIPELINE) && $(PIPELINE)/.venv/bin/pip install -e ".[dev]"
	@echo "  >> Creating .env files from templates..."
	@test -f $(ROOT)/.env     || (cp $(ROOT)/.env.example $(ROOT)/.env 2>/dev/null && echo "  Created .env") || true
	@test -f $(PUB_ROOT)/.env || (cp $(PUB_ROOT)/.env.example $(PUB_ROOT)/.env 2>/dev/null && echo "  Created services/publisher/.env") || true
	@test -f $(PUB_FRONT)/.env || (cp $(PUB_FRONT)/.env.example $(PUB_FRONT)/.env 2>/dev/null && echo "  Created services/publisher/frontend/.env") || true
	@test -f $(PIPELINE)/.env || (cp $(PIPELINE)/.env.example $(PIPELINE)/.env 2>/dev/null && echo "  Created services/news-pipeline/.env") || true
	@echo ""
	@echo "  [OK] All dependencies installed!"
	@echo "  ⚠  Edit .env files with your API keys before starting."

clean: ## Remove build artifacts and caches
	rm -rf .next/ dist/ build/
	rm -rf services/publisher/frontend/dist/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "  [OK] Cleaned."


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GCP SETUP (one-time)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

gcp-setup: ## One-time GCP setup (Artifact Registry + auth)
	gcloud artifacts repositories create retrolab \
		--repository-format=docker \
		--location=$(GCP_REGION) \
		--description="RetroLab container images"
	gcloud auth configure-docker $(GCP_REGION)-docker.pkg.dev
	@echo "  [OK] Artifact Registry configured."


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HELP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

help: ## Show this help
	@echo ""
	@echo "  RetroLab — Makefile"
	@echo "  ════════════════════════════════════════════"
	@echo ""
	@echo "  LOCAL DEV"
	@grep -E '^(all|dev|web|publisher|pub-back|pub-front|pipeline):.*?## .*$$' $(MAKEFILE_LIST) | \
		sed 's/^Makefile://' | awk 'BEGIN {FS = ":.*?## "}; {printf "    %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "  MANAGE"
	@grep -E '^(stop|stop-dev|stop-pipeline|nuke|status|logs-pipeline|install|clean):.*?## .*$$' $(MAKEFILE_LIST) | \
		sed 's/^Makefile://' | awk 'BEGIN {FS = ":.*?## "}; {printf "    %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "  DOCKER BUILD"
	@grep -E '^build-.*:.*?## .*$$' $(MAKEFILE_LIST) | \
		sed 's/^Makefile://' | awk 'BEGIN {FS = ":.*?## "}; {printf "    %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "  DEPLOY"
	@grep -E '^(deploy-web|deploy-server|stop-server|logs-server):.*?## .*$$' $(MAKEFILE_LIST) | \
		sed 's/^Makefile://' | awk 'BEGIN {FS = ":.*?## "}; {printf "    %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "  SETUP"
	@grep -E '^(gcp-setup):.*?## .*$$' $(MAKEFILE_LIST) | \
		sed 's/^Makefile://' | awk 'BEGIN {FS = ":.*?## "}; {printf "    %-20s %s\n", $$1, $$2}'
	@echo ""
