.PHONY: dev help install build run stop serve ci install-e2e

PORT ?= 5173

help: ## Show this help message
	@grep -E '^[a-zA-Z_0-9-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "Installing frontend dependencies..."
	@(cd v2/frontend && npm install)

build: install ## Build frontend
	@echo "Building frontend..."
	@(cd v2/frontend && npm run build)

run: install ## Run frontend in development mode (use PORT=XXXX for custom port)
	@echo "Starting development server on port $(PORT)..."
	@(cd v2/frontend && PORT=$(PORT) npm run dev)

stop: ## Stop the development server
	@lsof -ti:$(PORT) | xargs kill 2>/dev/null && echo "Stopped server on port $(PORT)" || echo "No server running on port $(PORT)"

install-e2e: ## Install E2E test dependencies
	@(cd v2 && npm install)

ci: install install-e2e build ## Run unit and E2E tests
	@(cd v2/frontend && npm test)
	@(cd v2 && npm run test:e2e)

SERVE_PORT ?= 8080
serve: ## Serve a directory over HTTP for prototypes (use DIR=path SERVE_PORT=XXXX)
	@bin/serve $(DIR) --port $(SERVE_PORT)
