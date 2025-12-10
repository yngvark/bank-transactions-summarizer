.PHONY: run help

help: ## Show this help message
	@grep -E '^[a-zA-Z_0-9-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

run: ## Run the app and open in browser
	@echo "Starting application..."
	@(cd source && make run) & \
	sleep 3 && \
	open http://localhost:3000
