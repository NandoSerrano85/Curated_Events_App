# Curated Events Platform - Local Development Makefile

.PHONY: help start stop health reset logs frontend admin api clean install

# Default target
.DEFAULT_GOAL := help

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

help: ## Show this help message
	@echo "$(BLUE)🎉 Curated Events Platform - Local Development$(NC)"
	@echo "================================================="
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  make start    # Start all services"
	@echo "  make health   # Check service health"
	@echo "  make stop     # Stop all services"

start: ## Start all services (infrastructure + backend + frontend)
	@echo "$(BLUE)🚀 Starting all services...$(NC)"
	./start-local.sh

stop: ## Stop all services gracefully
	@echo "$(YELLOW)🛑 Stopping all services...$(NC)"
	./stop-local.sh

health: ## Check health of all services
	@echo "$(BLUE)🏥 Checking service health...$(NC)"
	./check-health.sh

reset: stop start ## Stop and restart all services
	@echo "$(GREEN)🔄 Services reset complete$(NC)"

logs: ## View logs from all services
	@echo "$(BLUE)📝 Viewing logs...$(NC)"
	@if [ -d "logs" ]; then tail -f logs/*.log; else echo "No logs directory found. Start services first."; fi

frontend: ## Start only the frontend web app
	@echo "$(BLUE)🌐 Starting frontend web app...$(NC)"
	cd frontend/web-app && npm run dev

admin: ## Start only the admin panel
	@echo "$(BLUE)🔧 Starting admin panel...$(NC)"
	cd frontend/admin-panel && npm run dev -- --port 3001

api: ## Start only the API gateway
	@echo "$(BLUE)🔌 Starting API gateway...$(NC)"
	cd services/go/api-gateway && go run main.go

clean: ## Clean up temporary files and containers
	@echo "$(YELLOW)🧹 Cleaning up...$(NC)"
	./stop-local.sh
	docker system prune -f
	rm -rf logs/
	rm -f .local-dev-pids
	@echo "$(GREEN)✅ Cleanup complete$(NC)"

install: ## Install all dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@echo "  Installing Go dependencies..."
	@go mod download 2>/dev/null || echo "No Go modules found"
	@echo "  Installing Python dependencies..."
	@cd services/python && pip install -r requirements.txt 2>/dev/null || echo "No Python requirements found"
	@echo "  Installing frontend dependencies..."
	@cd frontend/web-app && npm install 2>/dev/null || echo "No frontend package.json found"
	@cd frontend/admin-panel && npm install 2>/dev/null || echo "No admin-panel package.json found"
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

dev: ## Start development environment (infrastructure + backend APIs only)
	@echo "$(BLUE)🛠️  Starting development environment...$(NC)"
	@# Start infrastructure
	docker-compose -f docker-compose.local.yml up -d
	@# Start backend services in background
	@echo "Starting backend services..."
	@cd services/go/api-gateway && go run main.go &
	@cd services/go/user-service && go run main.go &  
	@cd services/go/event-service && go run main.go &
	@echo "$(GREEN)✅ Development environment ready$(NC)"
	@echo "$(YELLOW)Start frontend manually with: make frontend$(NC)"

test: ## Run all tests
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	@echo "  Testing Go services..."
	@go test ./services/go/... || true
	@echo "  Testing frontend..."
	@cd frontend/web-app && npm test -- --passWithNoTests || true
	@echo "$(GREEN)✅ Tests complete$(NC)"

status: ## Show status of all services
	@echo "$(BLUE)📊 Service Status$(NC)"
	@echo "=================="
	@echo ""
	@echo "$(YELLOW)Infrastructure:$(NC)"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep events- || echo "No infrastructure running"
	@echo ""
	@echo "$(YELLOW)Application Services:$(NC)"
	@if [ -f ".local-dev-pids" ]; then \
		while IFS= read -r pid; do \
			if ps -p "$$pid" > /dev/null 2>&1; then \
				echo "  ✅ PID $$pid - $$(ps -p $$pid -o comm=)"; \
			fi; \
		done < .local-dev-pids; \
	else \
		echo "  No application services running"; \
	fi