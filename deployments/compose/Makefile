# Events Platform Docker Compose Management
# Complete orchestration for hybrid Go/Python microservices

# Environment Configuration
ENV_FILE ?= .env
COMPOSE_FILE ?= docker-compose.yml
COMPOSE_PROJECT_NAME = events-platform

# Docker Compose Commands
DOCKER_COMPOSE = docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) -p $(COMPOSE_PROJECT_NAME)
DOCKER_COMPOSE_DEV = $(DOCKER_COMPOSE) -f docker-compose.override.yml
DOCKER_COMPOSE_PROD = $(DOCKER_COMPOSE) -f docker-compose.production.yml

.PHONY: help setup dev prod build start stop restart logs health status clean backup restore

# Default target
help: ## Show this help message
	@echo "Events Platform Docker Compose Management"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\\n", $$1, $$2}' $(MAKEFILE_LIST)

# ==========================================================================
# ENVIRONMENT SETUP
# ==========================================================================

setup: ## Initial setup - create networks, volumes, and environment files
	@echo "🚀 Setting up Events Platform..."
	@docker network create events-platform-network 2>/dev/null || echo "Network already exists"
	@docker network create events-monitoring 2>/dev/null || echo "Monitoring network already exists"
	@mkdir -p data logs backups models
	@if [ ! -f .env ]; then cp .env .env.example && echo "📝 Created .env file from template"; fi
	@echo "✅ Setup completed"

init-secrets: ## Initialize production secrets (creates secret files)
	@echo "🔐 Initializing production secrets..."
	@mkdir -p secrets
	@echo "postgres123" > secrets/postgres_password.txt
	@echo "redis123" > secrets/redis_password.txt  
	@echo "your-super-secret-jwt-key-change-in-production-min-32-chars" > secrets/jwt_secret.txt
	@echo "elastic123" > secrets/elastic_password.txt
	@echo "⚠️ WARNING: Update secret files with actual production values!"
	@echo "✅ Secret files created in ./secrets/"

# ==========================================================================
# DEVELOPMENT COMMANDS
# ==========================================================================

dev: ## Start development environment with hot reload
	@echo "🚀 Starting development environment..."
	@$(DOCKER_COMPOSE_DEV) up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 30
	@make health
	@make dev-urls

dev-build: ## Build and start development environment
	@echo "🔨 Building and starting development environment..."
	@$(DOCKER_COMPOSE_DEV) up -d --build
	@make health

dev-logs: ## Show development logs
	@$(DOCKER_COMPOSE_DEV) logs -f

dev-shell: ## Open shell in service container (SERVICE=service-name)
	@test -n "$(SERVICE)" || (echo "❌ Please specify SERVICE=service-name" && exit 1)
	@$(DOCKER_COMPOSE_DEV) exec $(SERVICE) sh

dev-urls: ## Show development URLs
	@echo "🌐 Development Service URLs:"
	@echo "  • API Gateway: http://localhost:8080"
	@echo "  • User Service: http://localhost:8081"  
	@echo "  • Event Service: http://localhost:8082"
	@echo "  • Search Service: http://localhost:8083"
	@echo "  • WebSocket Gateway: http://localhost:8084"
	@echo "  • Curation Service: http://localhost:8091"
	@echo "  • Recommendation Engine: http://localhost:8092"
	@echo "  • Analytics Service: http://localhost:8093"
	@echo ""
	@echo "🛠️ Development Tools:"
	@echo "  • pgAdmin: http://localhost:8090 (admin@events-platform.com / admin123)"
	@echo "  • Redis Commander: http://localhost:8094"
	@echo "  • Elasticsearch Head: http://localhost:8096"
	@echo "  • Kafka UI: http://localhost:8089"
	@echo "  • MailHog: http://localhost:8025"

# ==========================================================================
# PRODUCTION COMMANDS  
# ==========================================================================

prod: init-secrets ## Start production environment
	@echo "🚀 Starting production environment..."
	@$(DOCKER_COMPOSE_PROD) up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 60
	@make health
	@echo "✅ Production environment ready"

prod-build: ## Build and start production environment
	@echo "🔨 Building and starting production environment..."
	@$(DOCKER_COMPOSE_PROD) up -d --build
	@make health

prod-deploy: ## Deploy production with zero downtime
	@echo "🚀 Deploying production with zero downtime..."
	@$(DOCKER_COMPOSE_PROD) pull
	@$(DOCKER_COMPOSE_PROD) up -d --no-deps --build
	@echo "✅ Production deployment completed"

prod-logs: ## Show production logs
	@$(DOCKER_COMPOSE_PROD) logs -f --tail=100

prod-scale: ## Scale production services (SERVICE=name REPLICAS=count)
	@test -n "$(SERVICE)" || (echo "❌ Please specify SERVICE=service-name" && exit 1)
	@test -n "$(REPLICAS)" || (echo "❌ Please specify REPLICAS=count" && exit 1)
	@$(DOCKER_COMPOSE_PROD) up -d --scale $(SERVICE)=$(REPLICAS)
	@echo "✅ Scaled $(SERVICE) to $(REPLICAS) replicas"

# ==========================================================================
# BUILD COMMANDS
# ==========================================================================

build: ## Build all service images
	@echo "🔨 Building all service images..."
	@$(DOCKER_COMPOSE) build

build-go: ## Build only Go services
	@echo "🔨 Building Go services..."
	@$(DOCKER_COMPOSE) build api-gateway user-service event-service search-service websocket-gateway

build-python: ## Build only Python services  
	@echo "🔨 Building Python services..."
	@$(DOCKER_COMPOSE) build curation-service recommendation-engine analytics-service message-bridge

build-no-cache: ## Build with no cache
	@echo "🔨 Building all images without cache..."
	@$(DOCKER_COMPOSE) build --no-cache

push: ## Push images to registry (requires REGISTRY variable)
	@test -n "$(REGISTRY)" || (echo "❌ Please specify REGISTRY=your-registry" && exit 1)
	@echo "📤 Pushing images to $(REGISTRY)..."
	@$(DOCKER_COMPOSE) push

# ==========================================================================
# SERVICE MANAGEMENT
# ==========================================================================

start: ## Start all services
	@echo "▶️ Starting all services..."
	@$(DOCKER_COMPOSE) up -d
	@make health

stop: ## Stop all services
	@echo "⏹️ Stopping all services..."
	@$(DOCKER_COMPOSE) down
	@echo "✅ All services stopped"

restart: ## Restart all services
	@echo "🔄 Restarting all services..."
	@$(DOCKER_COMPOSE) restart
	@make health

# Individual service management
start-infrastructure: ## Start only infrastructure services
	@echo "▶️ Starting infrastructure services..."
	@$(DOCKER_COMPOSE) up -d postgres redis elasticsearch nats kafka zookeeper

start-go-services: ## Start only Go services
	@echo "▶️ Starting Go services..."
	@$(DOCKER_COMPOSE) up -d api-gateway user-service event-service search-service websocket-gateway

start-python-services: ## Start only Python services
	@echo "▶️ Starting Python services..."
	@$(DOCKER_COMPOSE) up -d curation-service recommendation-engine analytics-service

# ==========================================================================
# MONITORING AND LOGGING
# ==========================================================================

logs: ## Show logs for all services
	@$(DOCKER_COMPOSE) logs -f

logs-go: ## Show logs for Go services
	@$(DOCKER_COMPOSE) logs -f api-gateway user-service event-service search-service websocket-gateway

logs-python: ## Show logs for Python services
	@$(DOCKER_COMPOSE) logs -f curation-service recommendation-engine analytics-service

logs-infra: ## Show infrastructure logs
	@$(DOCKER_COMPOSE) logs -f postgres redis elasticsearch nats kafka

logs-service: ## Show logs for specific service (SERVICE=service-name)
	@test -n "$(SERVICE)" || (echo "❌ Please specify SERVICE=service-name" && exit 1)
	@$(DOCKER_COMPOSE) logs -f $(SERVICE)

# ==========================================================================
# HEALTH AND STATUS
# ==========================================================================

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@echo ""
	@echo "Infrastructure Services:"
	@echo -n "  PostgreSQL: "
	@curl -sf http://localhost:5432 >/dev/null 2>&1 && echo "✅ OK" || (docker exec events-postgres pg_isready -U postgres >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR")
	@echo -n "  Redis: "
	@docker exec events-redis redis-cli ping 2>/dev/null | grep -q PONG && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  Elasticsearch: "
	@curl -sf http://localhost:9200/_cluster/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  NATS: "
	@curl -sf http://localhost:8222/varz >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  Kafka: "
	@docker exec events-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo ""
	@echo "Go Services:"
	@echo -n "  API Gateway: "
	@curl -sf http://localhost:8080/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  User Service: "
	@curl -sf http://localhost:8081/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  Event Service: "
	@curl -sf http://localhost:8082/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  Search Service: "
	@curl -sf http://localhost:8083/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  WebSocket Gateway: "
	@curl -sf http://localhost:8084/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo ""
	@echo "Python Services:"
	@echo -n "  Curation Service: "
	@curl -sf http://localhost:8091/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  Recommendation Engine: "
	@curl -sf http://localhost:8092/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "  Analytics Service: "
	@curl -sf http://localhost:8093/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"

status: ## Show status of all services
	@echo "📊 Service Status:"
	@$(DOCKER_COMPOSE) ps

stats: ## Show resource usage statistics
	@echo "📈 Resource Usage:"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep events-

# ==========================================================================
# DATABASE OPERATIONS
# ==========================================================================

db-migrate: ## Run database migrations
	@echo "🔄 Running database migrations..."
	@docker exec events-postgres psql -U postgres -d events_platform -c "\i /migrations/001_initial_schema.sql"
	@echo "✅ Database migrations completed"

db-seed: ## Seed database with test data
	@echo "🌱 Seeding database with test data..."
	@docker exec events-postgres psql -U postgres -d events_platform -c "\i /migrations/seeds/test_data.sql"
	@echo "✅ Database seeding completed"

db-backup: ## Backup database
	@echo "💾 Backing up database..."
	@mkdir -p backups
	@docker exec events-postgres pg_dump -U postgres events_platform | gzip > backups/postgres-$(shell date +%Y%m%d_%H%M%S).sql.gz
	@echo "✅ Database backup completed"

db-restore: ## Restore database (BACKUP_FILE=path/to/backup.sql.gz)
	@test -n "$(BACKUP_FILE)" || (echo "❌ Please specify BACKUP_FILE=path/to/backup" && exit 1)
	@echo "🔄 Restoring database from $(BACKUP_FILE)..."
	@gunzip -c $(BACKUP_FILE) | docker exec -i events-postgres psql -U postgres events_platform
	@echo "✅ Database restore completed"

db-shell: ## Open PostgreSQL shell
	@docker exec -it events-postgres psql -U postgres events_platform

redis-shell: ## Open Redis shell  
	@docker exec -it events-redis redis-cli -a redis123

# ==========================================================================
# TESTING
# ==========================================================================

test: ## Run all tests
	@echo "🧪 Running all tests..."
	@$(DOCKER_COMPOSE) exec api-gateway go test ./...
	@$(DOCKER_COMPOSE) exec user-service go test ./...
	@$(DOCKER_COMPOSE) exec event-service go test ./...
	@$(DOCKER_COMPOSE) exec search-service go test ./...
	@$(DOCKER_COMPOSE) exec websocket-gateway go test ./...
	@$(DOCKER_COMPOSE) exec curation-service python -m pytest
	@$(DOCKER_COMPOSE) exec recommendation-engine python -m pytest  
	@$(DOCKER_COMPOSE) exec analytics-service python -m pytest

test-integration: ## Run integration tests
	@echo "🔗 Running integration tests..."
	@docker run --rm --network events-platform-network -v $(PWD)/tests:/tests postman/newman run /tests/events-platform-integration.json

load-test: ## Run load tests (requires hey or similar tool)
	@echo "⚡ Running load tests..."
	@hey -n 1000 -c 50 http://localhost:8080/health

# ==========================================================================
# MAINTENANCE
# ==========================================================================

clean: ## Clean up containers, images, and volumes
	@echo "🧹 Cleaning up Docker resources..."
	@$(DOCKER_COMPOSE) down -v --remove-orphans
	@docker system prune -f
	@docker volume prune -f
	@echo "✅ Cleanup completed"

clean-all: ## Clean everything including images
	@echo "🧹 Cleaning all Docker resources..."
	@$(DOCKER_COMPOSE) down -v --remove-orphans --rmi all
	@docker system prune -af
	@docker volume prune -f
	@echo "✅ Complete cleanup finished"

backup: ## Backup all persistent data
	@echo "💾 Creating full backup..."
	@mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	@$(DOCKER_COMPOSE) exec -T postgres pg_dumpall -U postgres | gzip > backups/$(shell date +%Y%m%d_%H%M%S)/postgres-full.sql.gz
	@$(DOCKER_COMPOSE) exec -T redis redis-cli --rdb - | gzip > backups/$(shell date +%Y%m%d_%H%M%S)/redis.rdb.gz
	@tar czf backups/$(shell date +%Y%m%d_%H%M%S)/elasticsearch.tar.gz -C $(shell docker volume inspect events-platform_elasticsearch-data -f '{{.Mountpoint}}') .
	@echo "✅ Full backup completed in backups/$(shell date +%Y%m%d_%H%M%S)/"

update: ## Update all service images
	@echo "📦 Updating service images..."
	@$(DOCKER_COMPOSE) pull
	@$(DOCKER_COMPOSE) up -d
	@make health
	@echo "✅ Update completed"

# ==========================================================================
# DEVELOPMENT UTILITIES
# ==========================================================================

format: ## Format Go and Python code
	@echo "✨ Formatting code..."
	@find services/go -name "*.go" -exec gofmt -w {} \;
	@find services/python -name "*.py" -exec black {} \;
	@echo "✅ Code formatting completed"

lint: ## Run linters
	@echo "🔍 Running linters..."
	@golangci-lint run services/go/...
	@flake8 services/python/
	@echo "✅ Linting completed"

docs: ## Generate API documentation
	@echo "📚 Generating API documentation..."
	@swagger generate spec -o docs/api/swagger.json
	@echo "✅ Documentation generated"

# ==========================================================================
# MONITORING
# ==========================================================================

monitoring: ## Start monitoring stack
	@echo "📊 Starting monitoring stack..."
	@cd ../../monitoring && make setup
	@echo "✅ Monitoring stack ready at http://localhost:3000"

metrics: ## Show metrics endpoint URLs
	@echo "📈 Metrics Endpoints:"
	@echo "  • API Gateway: http://localhost:8080/metrics"
	@echo "  • User Service: http://localhost:8081/metrics"
	@echo "  • Event Service: http://localhost:8082/metrics"
	@echo "  • Search Service: http://localhost:8083/metrics"
	@echo "  • WebSocket Gateway: http://localhost:8084/metrics"
	@echo "  • Curation Service: http://localhost:8091/metrics"
	@echo "  • Recommendation Engine: http://localhost:8092/metrics"
	@echo "  • Analytics Service: http://localhost:8093/metrics"

# ==========================================================================
# ENVIRONMENT INFORMATION
# ==========================================================================

info: ## Show environment information
	@echo "ℹ️ Events Platform Information:"
	@echo "  Environment: $(ENV_FILE)"
	@echo "  Compose File: $(COMPOSE_FILE)"
	@echo "  Project Name: $(COMPOSE_PROJECT_NAME)"
	@echo "  Docker Version: $(shell docker --version)"
	@echo "  Docker Compose Version: $(shell docker-compose --version)"
	@echo ""
	@echo "📊 Container Statistics:"
	@docker system df
	@echo ""
	@echo "🌐 Network Information:"
	@docker network ls | grep events

env: ## Show environment variables
	@echo "🌍 Environment Variables:"
	@grep -v '^#' $(ENV_FILE) | grep -v '^$$'