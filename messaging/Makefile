# Messaging Infrastructure Makefile for Events Platform

# Service URLs
NATS_URL ?= nats://localhost:4222
KAFKA_BOOTSTRAP_SERVERS ?= localhost:9092
REDIS_URL ?= redis://localhost:6379

# Docker Compose file
COMPOSE_FILE = docker-compose.yml

.PHONY: help setup start stop restart logs health-check clean topics bridge test

# Default target
help: ## Show this help message
	@echo "Events Platform Messaging Infrastructure"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Setup and start services
setup: ## Set up and start all messaging services
	@echo "🚀 Setting up messaging infrastructure..."
	@./scripts/setup_messaging.sh

start: ## Start all messaging services
	@echo "▶️ Starting messaging services..."
	@docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Services started"

stop: ## Stop all messaging services
	@echo "⏹️ Stopping messaging services..."
	@docker-compose -f $(COMPOSE_FILE) down
	@echo "✅ Services stopped"

restart: ## Restart all messaging services
	@echo "🔄 Restarting messaging services..."
	@docker-compose -f $(COMPOSE_FILE) restart
	@echo "✅ Services restarted"

# Individual service management
start-nats: ## Start only NATS
	@docker-compose -f $(COMPOSE_FILE) up -d nats
	@echo "✅ NATS started"

start-kafka: ## Start Kafka and Zookeeper
	@docker-compose -f $(COMPOSE_FILE) up -d zookeeper kafka
	@echo "✅ Kafka started"

start-redis: ## Start Redis
	@docker-compose -f $(COMPOSE_FILE) up -d redis
	@echo "✅ Redis started"

start-bridge: ## Start message bridge
	@docker-compose -f $(COMPOSE_FILE) up -d message-bridge
	@echo "✅ Bridge started"

# Monitoring and logging
logs: ## Show logs for all services
	@docker-compose -f $(COMPOSE_FILE) logs -f

logs-nats: ## Show NATS logs
	@docker-compose -f $(COMPOSE_FILE) logs -f nats

logs-kafka: ## Show Kafka logs
	@docker-compose -f $(COMPOSE_FILE) logs -f kafka

logs-bridge: ## Show bridge logs
	@docker-compose -f $(COMPOSE_FILE) logs -f message-bridge

# Health checks
health-check: ## Check health of all services
	@echo "🏥 Checking service health..."
	@echo -n "NATS: "
	@nc -z localhost 4222 >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Kafka: "
	@docker exec events-platform-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Redis: "
	@docker exec events-platform-redis redis-cli ping 2>/dev/null | grep -q PONG && echo "✅ OK" || echo "❌ ERROR"
	@echo -n "Zookeeper: "
	@nc -z localhost 2181 >/dev/null 2>&1 && echo "✅ OK" || echo "❌ ERROR"

nats-info: ## Show NATS server information
	@echo "📊 NATS Server Information:"
	@curl -s http://localhost:8222/varz | jq '.' 2>/dev/null || echo "NATS monitoring not available"

kafka-info: ## Show Kafka cluster information
	@echo "📊 Kafka Cluster Information:"
	@docker exec events-platform-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

redis-info: ## Show Redis information
	@echo "📊 Redis Information:"
	@docker exec events-platform-redis redis-cli info server

# Topic and subject management
topics: ## List Kafka topics
	@echo "📋 Kafka Topics:"
	@docker exec events-platform-kafka kafka-topics \
		--list \
		--bootstrap-server localhost:9092

create-topic: ## Create Kafka topic (requires TOPIC, PARTITIONS, REPLICATION)
	@test -n "$(TOPIC)" || (echo "❌ Please specify TOPIC=name" && exit 1)
	@docker exec events-platform-kafka kafka-topics \
		--create \
		--topic $(TOPIC) \
		--partitions $(or $(PARTITIONS),6) \
		--replication-factor $(or $(REPLICATION),1) \
		--bootstrap-server localhost:9092 \
		--if-not-exists
	@echo "✅ Topic '$(TOPIC)' created"

delete-topic: ## Delete Kafka topic (requires TOPIC)
	@test -n "$(TOPIC)" || (echo "❌ Please specify TOPIC=name" && exit 1)
	@docker exec events-platform-kafka kafka-topics \
		--delete \
		--topic $(TOPIC) \
		--bootstrap-server localhost:9092
	@echo "✅ Topic '$(TOPIC)' deleted"

topic-info: ## Show Kafka topic information (requires TOPIC)
	@test -n "$(TOPIC)" || (echo "❌ Please specify TOPIC=name" && exit 1)
	@docker exec events-platform-kafka kafka-topics \
		--describe \
		--topic $(TOPIC) \
		--bootstrap-server localhost:9092

# Producer and consumer tools
produce: ## Send message to Kafka topic (requires TOPIC and MESSAGE)
	@test -n "$(TOPIC)" || (echo "❌ Please specify TOPIC=name" && exit 1)
	@test -n "$(MESSAGE)" || (echo "❌ Please specify MESSAGE=content" && exit 1)
	@echo "$(MESSAGE)" | docker exec -i events-platform-kafka kafka-console-producer \
		--topic $(TOPIC) \
		--bootstrap-server localhost:9092
	@echo "✅ Message sent to topic '$(TOPIC)'"

consume: ## Consume messages from Kafka topic (requires TOPIC)
	@test -n "$(TOPIC)" || (echo "❌ Please specify TOPIC=name" && exit 1)
	@echo "🎧 Consuming from topic '$(TOPIC)' (Press Ctrl+C to stop)..."
	@docker exec -it events-platform-kafka kafka-console-consumer \
		--topic $(TOPIC) \
		--from-beginning \
		--bootstrap-server localhost:9092

# Bridge management
bridge-health: ## Check bridge service health
	@docker exec events-platform-message-bridge python -c "\
import asyncio; \
from bridge import BridgeService; \
service = BridgeService(); \
health = asyncio.run(service.health()); \
print('Bridge Health:', health)" 2>/dev/null || echo "Bridge not available"

bridge-restart: ## Restart message bridge
	@docker-compose -f $(COMPOSE_FILE) restart message-bridge
	@echo "✅ Bridge restarted"

# Testing and development
test-nats: ## Test NATS connection
	@echo "🧪 Testing NATS connection..."
	@echo "test message" | docker run --rm -i --network messaging_events-network \
		nats:latest nats pub test.subject --server nats://nats:4222 || \
		echo "❌ NATS test failed"

test-kafka: ## Test Kafka connection
	@echo "🧪 Testing Kafka connection..."
	@echo "test message" | docker exec -i events-platform-kafka kafka-console-producer \
		--topic test-topic \
		--bootstrap-server localhost:9092 \
		2>/dev/null && echo "✅ Kafka test passed" || echo "❌ Kafka test failed"

test-redis: ## Test Redis connection
	@echo "🧪 Testing Redis connection..."
	@docker exec events-platform-redis redis-cli set test "test value" >/dev/null && \
		docker exec events-platform-redis redis-cli get test >/dev/null && \
		docker exec events-platform-redis redis-cli del test >/dev/null && \
		echo "✅ Redis test passed" || echo "❌ Redis test failed"

# Monitoring URLs
urls: ## Show service URLs
	@echo "🌐 Service URLs:"
	@echo "  • NATS Server: nats://localhost:4222"
	@echo "  • NATS Monitoring: http://localhost:8222"
	@echo "  • Kafka: localhost:9092"
	@echo "  • Kafka UI: http://localhost:8089"
	@echo "  • Schema Registry: http://localhost:8081"
	@echo "  • Redis: redis://localhost:6379"
	@echo "  • Grafana: http://localhost:3001"

# Performance and monitoring
performance: ## Show performance metrics
	@echo "📈 Performance Metrics:"
	@echo ""
	@echo "NATS Stats:"
	@curl -s http://localhost:8222/connz?subs=1 | jq '.connections[] | {cid, in_msgs, out_msgs, in_bytes, out_bytes}' 2>/dev/null || echo "NATS stats not available"
	@echo ""
	@echo "Kafka Consumer Groups:"
	@docker exec events-platform-kafka kafka-consumer-groups \
		--bootstrap-server localhost:9092 \
		--list 2>/dev/null || echo "No consumer groups"

monitor: ## Start monitoring (real-time stats)
	@echo "👀 Starting real-time monitoring (Press Ctrl+C to stop)..."
	@watch -n 2 'echo "=== NATS Stats ===" && curl -s http://localhost:8222/varz | jq ".in_msgs,.out_msgs,.connections" 2>/dev/null; echo "=== Kafka Topics ===" && docker exec events-platform-kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | wc -l'

# Backup and restore
backup: ## Backup messaging data
	@echo "💾 Creating messaging backup..."
	@mkdir -p backups
	@docker exec events-platform-kafka kafka-topics \
		--list \
		--bootstrap-server localhost:9092 > backups/kafka-topics-$(shell date +%Y%m%d_%H%M%S).txt
	@docker exec events-platform-redis redis-cli \
		--rdb backups/redis-$(shell date +%Y%m%d_%H%M%S).rdb
	@echo "✅ Backup completed in ./backups/"

# Cleanup
clean: ## Stop services and remove volumes
	@echo "🧹 Cleaning up messaging infrastructure..."
	@docker-compose -f $(COMPOSE_FILE) down -v
	@docker system prune -f
	@echo "✅ Cleanup completed"

reset: ## Reset all messaging data (DANGER: destroys all data)
	@echo "⚠️ WARNING: This will destroy all messaging data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose -f $(COMPOSE_FILE) down -v
	@docker volume prune -f
	@echo "🗑️ All messaging data reset"
	@make setup

# Development helpers
dev-setup: setup ## Complete development setup
	@echo "🎉 Development messaging environment ready!"

# Environment
env: ## Show environment variables
	@echo "🌍 Environment Configuration:"
	@echo "  NATS_URL=$(NATS_URL)"
	@echo "  KAFKA_BOOTSTRAP_SERVERS=$(KAFKA_BOOTSTRAP_SERVERS)" 
	@echo "  REDIS_URL=$(REDIS_URL)"
	@echo ""
	@echo "📁 Configuration files:"
	@echo "  • NATS config: ./nats/nats-server.conf"
	@echo "  • Kafka config: ./kafka/server.properties"
	@echo "  • Bridge config: ./bridge/bridge.py"