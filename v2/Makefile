.PHONY: dev help install build

help: ## Show this help message
	@grep -E '^[a-zA-Z_0-9-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "Installing frontend dependencies..."
	@(cd frontend && npm install)

build: ## Build frontend
	@echo "Building frontend..."
	@(cd frontend && npm run build)

dev: ## Run frontend in development mode
	@echo "Starting development server..."
	@(cd frontend && npm run dev) & \
	sleep 2 && \
	open http://localhost:5173
	@wait
