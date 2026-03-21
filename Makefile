.PHONY: dev help install build run stop

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
