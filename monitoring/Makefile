# Monitoring Stack Makefile for Events Platform

# Service URLs
PROMETHEUS_URL ?= http://localhost:9090
GRAFANA_URL ?= http://localhost:3000
ALERTMANAGER_URL ?= http://localhost:9093

# Docker Compose file
COMPOSE_FILE = docker-compose.yml

# Grafana credentials
GRAFANA_USER = admin
GRAFANA_PASSWORD = admin123

.PHONY: help setup start stop restart logs health-check clean backup restore

# Default target
help: ## Show this help message
	@echo "Events Platform Monitoring Stack"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\\n", $$1, $$2}' $(MAKEFILE_LIST)

# Setup and start services
setup: ## Set up and start monitoring stack
	@echo "🚀 Setting up monitoring infrastructure..."
	@docker network create events-monitoring 2>/dev/null || true
	@docker network create events-platform-network 2>/dev/null || true
	@mkdir -p exporters/postgres
	@echo "queries:" > exporters/postgres/queries.yaml
	@make start
	@echo "⏳ Waiting for services to be ready..."
	@sleep 30
	@make import-dashboards
	@echo "✅ Monitoring stack ready!"
	@make urls

start: ## Start monitoring services
	@echo "▶️ Starting monitoring services..."
	@docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Services started"

stop: ## Stop monitoring services
	@echo "⏹️ Stopping monitoring services..."
	@docker-compose -f $(COMPOSE_FILE) down
	@echo "✅ Services stopped"

restart: ## Restart monitoring services
	@echo "🔄 Restarting monitoring services..."
	@docker-compose -f $(COMPOSE_FILE) restart
	@echo "✅ Services restarted"

# Individual service management
start-prometheus: ## Start only Prometheus
	@docker-compose -f $(COMPOSE_FILE) up -d prometheus
	@echo "✅ Prometheus started"

start-grafana: ## Start only Grafana
	@docker-compose -f $(COMPOSE_FILE) up -d grafana
	@echo "✅ Grafana started"

start-alertmanager: ## Start only Alertmanager
	@docker-compose -f $(COMPOSE_FILE) up -d alertmanager
	@echo "✅ Alertmanager started"

# Monitoring and logging
logs: ## Show logs for all services
	@docker-compose -f $(COMPOSE_FILE) logs -f

logs-prometheus: ## Show Prometheus logs
	@docker-compose -f $(COMPOSE_FILE) logs -f prometheus

logs-grafana: ## Show Grafana logs
	@docker-compose -f $(COMPOSE_FILE) logs -f grafana

logs-alertmanager: ## Show Alertmanager logs
	@docker-compose -f $(COMPOSE_FILE) logs -f alertmanager

# Health checks
health-check: ## Check health of all monitoring services
	@echo "🏥 Checking monitoring service health..."
	@echo -n "Prometheus: "
	@curl -sf $(PROMETHEUS_URL)/-/healthy >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Grafana: "
	@curl -sf $(GRAFANA_URL)/api/health >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Alertmanager: "
	@curl -sf $(ALERTMANAGER_URL)/-/healthy >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Node Exporter: "
	@curl -sf http://localhost:9100/metrics >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "cAdvisor: "
	@curl -sf http://localhost:8080/healthz >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Blackbox Exporter: "
	@curl -sf http://localhost:9115/-/healthy >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"

prometheus-status: ## Show Prometheus status and configuration
	@echo "📊 Prometheus Status:"
	@curl -s $(PROMETHEUS_URL)/api/v1/status/config | jq '.status' 2>/dev/null || echo "Prometheus not available"
	@echo ""
	@echo "📋 Active Targets:"
	@curl -s $(PROMETHEUS_URL)/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, instance: .labels.instance, health: .health}' 2>/dev/null || echo "Cannot retrieve targets"

grafana-status: ## Show Grafana status
	@echo "📊 Grafana Health:"
	@curl -s $(GRAFANA_URL)/api/health | jq '.' 2>/dev/null || echo "Grafana not available"
	@echo ""
	@echo "📋 Grafana Datasources:"
	@curl -s -u $(GRAFANA_USER):$(GRAFANA_PASSWORD) $(GRAFANA_URL)/api/datasources | jq '.[] | {name: .name, type: .type, url: .url}' 2>/dev/null || echo "Cannot retrieve datasources"

alertmanager-status: ## Show Alertmanager status
	@echo "📊 Alertmanager Status:"
	@curl -s $(ALERTMANAGER_URL)/api/v1/status | jq '.data' 2>/dev/null || echo "Alertmanager not available"
	@echo ""
	@echo "🚨 Active Alerts:"
	@curl -s $(ALERTMANAGER_URL)/api/v1/alerts | jq '.data[] | {labels: .labels, status: .status.state}' 2>/dev/null || echo "No active alerts"

# Dashboard management
import-dashboards: ## Import Grafana dashboards
	@echo "📊 Importing Grafana dashboards..."
	@sleep 5  # Wait for Grafana to be ready
	@for dashboard in grafana/dashboards/*.json; do \
		if [ -f "$$dashboard" ]; then \
			echo "Importing $$(basename $$dashboard)..."; \
			curl -s -X POST \
				-H "Content-Type: application/json" \
				-u $(GRAFANA_USER):$(GRAFANA_PASSWORD) \
				-d @$$dashboard \
				$(GRAFANA_URL)/api/dashboards/db >/dev/null 2>&1 && \
				echo "✅ $$(basename $$dashboard) imported" || \
				echo "❌ Failed to import $$(basename $$dashboard)"; \
		fi; \
	done

export-dashboards: ## Export Grafana dashboards
	@echo "📤 Exporting Grafana dashboards..."
	@mkdir -p backups/dashboards
	@curl -s -u $(GRAFANA_USER):$(GRAFANA_PASSWORD) $(GRAFANA_URL)/api/search | jq -r '.[].uid' | while read uid; do \
		if [ ! -z "$$uid" ]; then \
			curl -s -u $(GRAFANA_USER):$(GRAFANA_PASSWORD) $(GRAFANA_URL)/api/dashboards/uid/$$uid | \
			jq '.dashboard' > backups/dashboards/$$uid.json && \
			echo "✅ Exported dashboard: $$uid"; \
		fi; \
	done

# Configuration management
reload-prometheus: ## Reload Prometheus configuration
	@echo "🔄 Reloading Prometheus configuration..."
	@curl -X POST $(PROMETHEUS_URL)/-/reload && echo "✅ Prometheus config reloaded" || echo "❌ Failed to reload"

reload-alertmanager: ## Reload Alertmanager configuration
	@echo "🔄 Reloading Alertmanager configuration..."
	@curl -X POST $(ALERTMANAGER_URL)/-/reload && echo "✅ Alertmanager config reloaded" || echo "❌ Failed to reload"

validate-prometheus: ## Validate Prometheus configuration
	@echo "✅ Validating Prometheus configuration..."
	@docker run --rm -v $(PWD)/prometheus:/etc/prometheus prom/prometheus:v2.45.0 \
		promtool check config /etc/prometheus/prometheus.yml

validate-alertmanager: ## Validate Alertmanager configuration
	@echo "✅ Validating Alertmanager configuration..."
	@docker run --rm -v $(PWD)/alertmanager:/etc/alertmanager prom/alertmanager:v0.25.0 \
		amtool check-config /etc/alertmanager/alertmanager.yml

validate-all: validate-prometheus validate-alertmanager ## Validate all configurations

# Query and testing
query: ## Run Prometheus query (requires QUERY parameter)
	@test -n "$(QUERY)" || (echo "❌ Please specify QUERY=your_query" && exit 1)
	@curl -s -G $(PROMETHEUS_URL)/api/v1/query --data-urlencode "query=$(QUERY)" | jq '.data.result' 2>/dev/null

test-alerts: ## Test alert rules
	@echo "🧪 Testing alert rules..."
	@docker run --rm -v $(PWD)/prometheus:/etc/prometheus prom/prometheus:v2.45.0 \
		promtool test rules /etc/prometheus/alert_rules.yml

silence-alert: ## Create alert silence (requires ALERT_NAME)
	@test -n "$(ALERT_NAME)" || (echo "❌ Please specify ALERT_NAME=alertname" && exit 1)
	@curl -X POST $(ALERTMANAGER_URL)/api/v1/silences \
		-H "Content-Type: application/json" \
		-d '{"matchers":[{"name":"alertname","value":"$(ALERT_NAME)"}],"startsAt":"$(shell date -u +%Y-%m-%dT%H:%M:%S.000Z)","endsAt":"$(shell date -u -d "+1 hour" +%Y-%m-%dT%H:%M:%S.000Z)","createdBy":"monitoring-makefile","comment":"Silenced via Makefile"}'

# Backup and restore
backup: ## Backup monitoring data and configurations
	@echo "💾 Creating monitoring backup..."
	@mkdir -p backups
	@docker-compose -f $(COMPOSE_FILE) exec -T prometheus tar czf - /prometheus > backups/prometheus-data-$(shell date +%Y%m%d_%H%M%S).tar.gz
	@docker-compose -f $(COMPOSE_FILE) exec -T grafana tar czf - /var/lib/grafana > backups/grafana-data-$(shell date +%Y%m%d_%H%M%S).tar.gz
	@cp -r prometheus alertmanager grafana backups/config-$(shell date +%Y%m%d_%H%M%S)/
	@echo "✅ Backup completed in ./backups/"

restore: ## Restore monitoring data (requires BACKUP_DATE)
	@test -n "$(BACKUP_DATE)" || (echo "❌ Please specify BACKUP_DATE=YYYYMMDD_HHMMSS" && exit 1)
	@echo "🔄 Restoring monitoring data from $(BACKUP_DATE)..."
	@docker-compose -f $(COMPOSE_FILE) stop prometheus grafana
	@docker-compose -f $(COMPOSE_FILE) exec -T prometheus tar xzf - -C / < backups/prometheus-data-$(BACKUP_DATE).tar.gz
	@docker-compose -f $(COMPOSE_FILE) exec -T grafana tar xzf - -C / < backups/grafana-data-$(BACKUP_DATE).tar.gz
	@docker-compose -f $(COMPOSE_FILE) start prometheus grafana
	@echo "✅ Restore completed"

# Performance and maintenance
performance: ## Show performance metrics
	@echo "📈 Performance Metrics:"
	@echo ""
	@echo "Prometheus Stats:"
	@curl -s $(PROMETHEUS_URL)/api/v1/status/runtimeinfo | jq '.data' 2>/dev/null || echo "Prometheus stats not available"
	@echo ""
	@echo "System Resources:"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep events-

clean-prometheus: ## Clean old Prometheus data
	@echo "🧹 Cleaning old Prometheus data..."
	@docker-compose -f $(COMPOSE_FILE) exec prometheus \
		find /prometheus -name "*.tmp" -delete 2>/dev/null || true
	@echo "✅ Prometheus cleanup completed"

# URLs and access information
urls: ## Show service URLs
	@echo "🌐 Monitoring Service URLs:"
	@echo "  • Prometheus: $(PROMETHEUS_URL)"
	@echo "  • Grafana: $(GRAFANA_URL) (admin/admin123)"
	@echo "  • Alertmanager: $(ALERTMANAGER_URL)"
	@echo "  • Node Exporter: http://localhost:9100"
	@echo "  • cAdvisor: http://localhost:8080"
	@echo "  • Blackbox Exporter: http://localhost:9115"
	@echo "  • Pushgateway: http://localhost:9091"

# Development helpers
dev-setup: setup ## Complete development setup
	@echo "🎉 Development monitoring environment ready!"

# Cleanup
clean: ## Stop services and remove containers
	@echo "🧹 Cleaning up monitoring infrastructure..."
	@docker-compose -f $(COMPOSE_FILE) down --remove-orphans
	@docker system prune -f
	@echo "✅ Cleanup completed"

reset: ## Reset all monitoring data (DANGER: destroys all data)
	@echo "⚠️ WARNING: This will destroy all monitoring data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose -f $(COMPOSE_FILE) down -v
	@docker volume prune -f
	@echo "🗑️ All monitoring data reset"
	@make setup

# Environment
env: ## Show environment variables
	@echo "🌍 Monitoring Environment Configuration:"
	@echo "  PROMETHEUS_URL=$(PROMETHEUS_URL)"
	@echo "  GRAFANA_URL=$(GRAFANA_URL)"
	@echo "  ALERTMANAGER_URL=$(ALERTMANAGER_URL)"
	@echo "  GRAFANA_USER=$(GRAFANA_USER)"