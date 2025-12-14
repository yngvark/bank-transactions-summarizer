.PHONY: dev help install build

PORT ?= $(shell awk 'BEGIN{srand(); print int(rand()*6000)+3000}')

help: ## Show this help message
	@grep -E '^[a-zA-Z_0-9-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "Installing frontend dependencies..."
	@(cd v2/frontend && npm install)

build: ## Build frontend
	@echo "Building frontend..."
	@(cd v2/frontend && npm run build)

dev: ## Run frontend in development mode (use PORT=XXXX for custom port)
	@echo "Starting development server on port $(PORT)..."
	@(cd v2/frontend && PORT=$(PORT) npm run dev) & \
	sleep 2 && \
	open http://localhost:$(PORT)
	@wait
