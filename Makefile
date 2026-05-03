.PHONY: dev help install build run run-bg stop serve ci install-e2e

PORT ?= 5173
PID_FILE ?= /tmp/bts-dev.pid
LOG_FILE ?= /tmp/bts-dev.log

help: ## Show this help message
	@grep -E '^[a-zA-Z_0-9-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "Installing frontend dependencies..."
	@(cd v2/frontend && pnpm install)

build: install ## Build frontend
	@echo "Building frontend..."
	@(cd v2/frontend && pnpm run build)

run: ## Run frontend in development mode, foreground (run `make install` first if deps changed)
	@echo "Starting development server on port $(PORT)..."
	@(cd v2/frontend && PORT=$(PORT) pnpm run dev)

run-bg: ## Start dev server detached in its own session (PID at $(PID_FILE), log at $(LOG_FILE))
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Dev server already running (PID $$(cat $(PID_FILE))). Run 'make stop' first."; exit 1; \
	fi
	@rm -f $(PID_FILE)
	@echo "Starting detached dev server on port $(PORT) (log: $(LOG_FILE))..."
	@cd v2/frontend && PORT=$(PORT) setsid pnpm run dev </dev/null >$(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE)
	@echo "Started (PID $$(cat $(PID_FILE))). Tail with: tail -f $(LOG_FILE). Stop with: make stop."

stop: ## Stop the development server (prefers PID file, falls back to fuser)
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			kill -- -$$PID 2>/dev/null || kill $$PID 2>/dev/null; \
			echo "Stopped server (PID $$PID)"; \
		else \
			echo "Stale PID file (process $$PID not running)"; \
		fi; \
		rm -f $(PID_FILE); \
	elif command -v fuser >/dev/null 2>&1; then \
		if fuser -k -TERM $(PORT)/tcp $(PORT)/tcp6 >/dev/null 2>&1; then \
			echo "Stopped server on port $(PORT) (no PID file, via fuser)"; \
		else \
			echo "No server running on port $(PORT)"; \
		fi; \
	else \
		echo "No PID file at $(PID_FILE), and fuser is unavailable. Start the dev server with 'make run-bg' so its PID is tracked, or stop it manually."; \
	fi

install-e2e: ## Install E2E test dependencies
	@(cd v2 && pnpm install)

ci: install install-e2e build ## Run unit and E2E tests
	@(cd v2/frontend && pnpm test)
	@(cd v2 && pnpm run test:e2e)

SERVE_PORT ?= 8080
serve: ## Serve a directory over HTTP for prototypes (use DIR=path SERVE_PORT=XXXX)
	@bin/serve $(DIR) --port $(SERVE_PORT)
