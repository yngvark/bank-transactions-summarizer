.PHONY: run dev help install build

help: ## Show this help message
	@grep -E '^[a-zA-Z_0-9-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for both backend and frontend
	@echo "Installing backend dependencies..."
	@(cd backend && npm install)
	@echo "Installing frontend dependencies..."
	@(cd frontend && npm install)

build: ## Build both backend and frontend
	@echo "Building backend..."
	@(cd backend && npm run build)
	@echo "Building frontend..."
	@(cd frontend && npm run build)

dev: ## Run both backend and frontend in development mode
	@echo "Starting development servers..."
	@(cd backend && npm run dev) & \
	(cd frontend && npm run dev) & \
	sleep 3 && \
	open http://localhost:5173
	@wait

run: build ## Run production build
	@echo "Starting production server..."
	@(cd backend && npm start)
