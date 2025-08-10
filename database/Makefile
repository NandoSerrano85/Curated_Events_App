# Database Management Makefile for Events Platform

# Database URLs (override with environment variables)
DATABASE_URL ?= postgresql://events_user:events_password@localhost:5432/events_db
ANALYTICS_DATABASE_URL ?= postgresql://events_user:events_password@localhost:5432/events_analytics
ELASTICSEARCH_URL ?= http://localhost:9200
REDIS_URL ?= redis://localhost:6379

# Migration tools
MIGRATE_VERSION ?= latest
GO_MIGRATE_PATH = migrations/go
PYTHON_ALEMBIC_PATH = migrations/python

.PHONY: help setup migrate-up migrate-down migrate-force migrate-version \
        seed-data reset-db backup restore health-check clean \
        setup-es setup-redis logs

# Default target
help: ## Show this help message
	@echo "Events Platform Database Management"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Database setup
setup: ## Set up all databases and run initial migrations
	@echo "🚀 Setting up Events Platform databases..."
	@./scripts/setup_databases.sh

# PostgreSQL Migrations (Go services)
migrate-up: ## Run all up migrations for Go services
	@echo "⬆️ Running up migrations for Go services..."
	@migrate -path $(GO_MIGRATE_PATH) -database "$(DATABASE_URL)?sslmode=disable" up

migrate-down: ## Run down migrations for Go services
	@echo "⬇️ Running down migrations for Go services..."
	@migrate -path $(GO_MIGRATE_PATH) -database "$(DATABASE_URL)?sslmode=disable" down 1

migrate-force: ## Force migration to specific version (requires VERSION=N)
	@echo "🔧 Forcing migration to version $(VERSION)..."
	@migrate -path $(GO_MIGRATE_PATH) -database "$(DATABASE_URL)?sslmode=disable" force $(VERSION)

migrate-version: ## Show current migration version
	@echo "📊 Current migration version:"
	@migrate -path $(GO_MIGRATE_PATH) -database "$(DATABASE_URL)?sslmode=disable" version

# Python Analytics Migrations (Alembic)
alembic-upgrade: ## Run Alembic upgrades for Python services
	@echo "⬆️ Running Alembic upgrades for Python services..."
	@cd $(PYTHON_ALEMBIC_PATH) && ANALYTICS_DATABASE_URL=$(ANALYTICS_DATABASE_URL) alembic upgrade head

alembic-downgrade: ## Downgrade Alembic migrations
	@echo "⬇️ Downgrading Alembic migrations..."
	@cd $(PYTHON_ALEMBIC_PATH) && ANALYTICS_DATABASE_URL=$(ANALYTICS_DATABASE_URL) alembic downgrade -1

alembic-revision: ## Create new Alembic revision (requires MESSAGE="description")
	@echo "📝 Creating new Alembic revision..."
	@cd $(PYTHON_ALEMBIC_PATH) && ANALYTICS_DATABASE_URL=$(ANALYTICS_DATABASE_URL) alembic revision --autogenerate -m "$(MESSAGE)"

alembic-history: ## Show Alembic migration history
	@echo "📚 Alembic migration history:"
	@cd $(PYTHON_ALEMBIC_PATH) && ANALYTICS_DATABASE_URL=$(ANALYTICS_DATABASE_URL) alembic history

# Elasticsearch setup
setup-es: ## Set up Elasticsearch indexes
	@echo "🔍 Setting up Elasticsearch indexes..."
	@curl -X DELETE "$(ELASTICSEARCH_URL)/events" 2>/dev/null || true
	@curl -X DELETE "$(ELASTICSEARCH_URL)/users" 2>/dev/null || true
	@curl -X PUT "$(ELASTICSEARCH_URL)/events" \
		-H "Content-Type: application/json" \
		-d @schemas/elasticsearch/events_index_mapping.json
	@curl -X PUT "$(ELASTICSEARCH_URL)/users" \
		-H "Content-Type: application/json" \
		-d @schemas/elasticsearch/users_index_mapping.json
	@echo "✅ Elasticsearch indexes created"

# Redis setup
setup-redis: ## Configure Redis
	@echo "📦 Configuring Redis..."
	@redis-cli ping && echo "✅ Redis is running" || (echo "❌ Redis not available" && exit 1)

# Sample data
seed-data: ## Insert sample/seed data
	@echo "🌱 Inserting seed data..."
	@psql "$(DATABASE_URL)" -f seeds/categories.sql
	@psql "$(DATABASE_URL)" -f seeds/sample_users.sql
	@psql "$(DATABASE_URL)" -f seeds/sample_events.sql
	@echo "✅ Seed data inserted"

# Database operations
reset-db: ## Reset all databases (WARNING: destroys all data)
	@echo "⚠️ WARNING: This will destroy all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🗑️ Resetting databases..."
	@migrate -path $(GO_MIGRATE_PATH) -database "$(DATABASE_URL)?sslmode=disable" drop -f
	@psql "$(ANALYTICS_DATABASE_URL)" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@curl -X DELETE "$(ELASTICSEARCH_URL)/events"
	@curl -X DELETE "$(ELASTICSEARCH_URL)/users"
	@redis-cli FLUSHALL
	@make setup
	@echo "✅ Databases reset"

backup: ## Create database backups
	@echo "💾 Creating database backups..."
	@mkdir -p backups
	@pg_dump "$(DATABASE_URL)" > backups/main_db_$(shell date +%Y%m%d_%H%M%S).sql
	@pg_dump "$(ANALYTICS_DATABASE_URL)" > backups/analytics_db_$(shell date +%Y%m%d_%H%M%S).sql
	@curl -X GET "$(ELASTICSEARCH_URL)/_snapshot/backup" > backups/elasticsearch_$(shell date +%Y%m%d_%H%M%S).json 2>/dev/null || true
	@redis-cli --rdb backups/redis_$(shell date +%Y%m%d_%H%M%S).rdb
	@echo "✅ Backups created in ./backups/"

restore: ## Restore from backup (requires BACKUP_FILE=path)
	@echo "📥 Restoring from backup: $(BACKUP_FILE)"
	@test -n "$(BACKUP_FILE)" || (echo "❌ Please specify BACKUP_FILE=path" && exit 1)
	@test -f "$(BACKUP_FILE)" || (echo "❌ Backup file not found" && exit 1)
	@psql "$(DATABASE_URL)" < "$(BACKUP_FILE)"
	@echo "✅ Restore completed"

# Health checks
health-check: ## Check database health
	@echo "🏥 Checking database health..."
	@echo -n "PostgreSQL (main): "
	@psql "$(DATABASE_URL)" -c "SELECT 1;" >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "PostgreSQL (analytics): "
	@psql "$(ANALYTICS_DATABASE_URL)" -c "SELECT 1;" >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Redis: "
	@redis-cli ping >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Elasticsearch: "
	@curl -s "$(ELASTICSEARCH_URL)/_cluster/health" | grep -q '"status":"green\|yellow"' && echo "✅ OK" || echo "❌ ERROR"

# Performance and monitoring
analyze: ## Run database analysis and optimization
	@echo "📈 Running database analysis..."
	@psql "$(DATABASE_URL)" -c "ANALYZE;"
	@psql "$(ANALYTICS_DATABASE_URL)" -c "ANALYZE;"
	@echo "✅ Analysis completed"

vacuum: ## Run database vacuum
	@echo "🧹 Running database vacuum..."
	@psql "$(DATABASE_URL)" -c "VACUUM ANALYZE;"
	@psql "$(ANALYTICS_DATABASE_URL)" -c "VACUUM ANALYZE;"
	@echo "✅ Vacuum completed"

stats: ## Show database statistics
	@echo "📊 Database Statistics:"
	@echo ""
	@echo "Main Database:"
	@psql "$(DATABASE_URL)" -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;"
	@echo ""
	@echo "Analytics Database:"
	@psql "$(ANALYTICS_DATABASE_URL)" -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;"

# Logs
logs: ## Show database logs
	@echo "📋 Recent database logs:"
	@tail -n 50 /usr/local/var/log/postgresql@14.log 2>/dev/null || \
		tail -n 50 /var/log/postgresql/postgresql-*.log 2>/dev/null || \
		echo "Log file not found"

# Cleanup
clean: ## Clean up temporary files and old backups
	@echo "🧹 Cleaning up..."
	@find backups/ -name "*.sql" -mtime +7 -delete 2>/dev/null || true
	@find backups/ -name "*.rdb" -mtime +7 -delete 2>/dev/null || true
	@find backups/ -name "*.json" -mtime +7 -delete 2>/dev/null || true
	@echo "✅ Cleanup completed"

# Development helpers
dev-setup: setup seed-data ## Complete development setup
	@echo "🎉 Development environment ready!"

test-connection: ## Test all database connections
	@echo "🔌 Testing database connections..."
	@psql "$(DATABASE_URL)" -c "SELECT 'Main DB Connected' as status;"
	@psql "$(ANALYTICS_DATABASE_URL)" -c "SELECT 'Analytics DB Connected' as status;"
	@redis-cli ping
	@curl -s "$(ELASTICSEARCH_URL)" | jq .version.number 2>/dev/null || echo "Elasticsearch connection failed"

# Monitoring
monitor: ## Show real-time database activity
	@echo "👀 Monitoring database activity (Press Ctrl+C to stop)..."
	@watch -n 2 'echo "Active Connections:" && psql "$(DATABASE_URL)" -c "SELECT count(*) FROM pg_stat_activity WHERE state = '\''active'\'';" && echo "Top Queries:" && psql "$(DATABASE_URL)" -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = '\''active'\'' LIMIT 5;"'