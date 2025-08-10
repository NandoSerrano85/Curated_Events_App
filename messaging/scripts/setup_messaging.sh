#!/bin/bash

# Message Queue Setup Script for Events Platform
# Sets up NATS, Kafka, and bridge services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Setting up Events Platform messaging infrastructure...${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $service to be ready on port $port...${NC}"
    
    while ! nc -z localhost $port >/dev/null 2>&1; do
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED}❌ $service failed to start after $max_attempts attempts${NC}"
            return 1
        fi
        echo "Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${GREEN}✅ $service is ready${NC}"
    return 0
}

# Check required tools
echo -e "${YELLOW}🔍 Checking required tools...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose${NC}"
    exit 1
fi

if ! command_exists nc; then
    echo -e "${RED}❌ netcat not found. Please install netcat${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required tools found${NC}"

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p data/nats
mkdir -p data/kafka
mkdir -p data/zookeeper
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning

# Start services with Docker Compose
echo -e "${YELLOW}🐳 Starting message queue services...${NC}"

# Stop any existing services
docker-compose down

# Start core services first
echo -e "${YELLOW}📦 Starting Zookeeper and NATS...${NC}"
docker-compose up -d zookeeper nats

# Wait for Zookeeper
if ! wait_for_service "Zookeeper" 2181; then
    echo -e "${RED}❌ Failed to start Zookeeper${NC}"
    exit 1
fi

# Wait for NATS
if ! wait_for_service "NATS" 4222; then
    echo -e "${RED}❌ Failed to start NATS${NC}"
    exit 1
fi

# Start Kafka
echo -e "${YELLOW}📊 Starting Kafka...${NC}"
docker-compose up -d kafka

# Wait for Kafka
if ! wait_for_service "Kafka" 9092; then
    echo -e "${RED}❌ Failed to start Kafka${NC}"
    exit 1
fi

# Start supporting services
echo -e "${YELLOW}🔧 Starting supporting services...${NC}"
docker-compose up -d schema-registry kafka-ui redis

# Wait for Schema Registry
if ! wait_for_service "Schema Registry" 8081; then
    echo -e "${YELLOW}⚠️ Schema Registry failed to start (optional service)${NC}"
fi

# Wait for Redis
if ! wait_for_service "Redis" 6379; then
    echo -e "${RED}❌ Failed to start Redis${NC}"
    exit 1
fi

# Create Kafka topics
echo -e "${YELLOW}📋 Creating Kafka topics...${NC}"

# Wait a bit more for Kafka to be fully ready
sleep 10

# List of topics to create
TOPICS=(
    "analytics-events:6:1"
    "user-interactions:6:1"
    "event-metrics:6:1"
    "ml-training-data:3:1"
    "model-updates:3:1"
    "recommendation-events:6:1"
    "system-metrics:3:1"
    "audit-logs:6:1"
    "error-events:6:1"
    "batch-processing:3:1"
    "data-pipeline:6:1"
    "etl-events:3:1"
)

for topic_config in "${TOPICS[@]}"; do
    IFS=':' read -r topic partitions replication <<< "$topic_config"
    
    echo "Creating topic: $topic (partitions: $partitions, replication: $replication)"
    
    docker exec events-platform-kafka kafka-topics \
        --create \
        --topic "$topic" \
        --partitions "$partitions" \
        --replication-factor "$replication" \
        --bootstrap-server localhost:9092 \
        --if-not-exists
done

echo -e "${GREEN}✅ Kafka topics created${NC}"

# Start bridge service (if available)
if [ -f "./bridge/Dockerfile" ]; then
    echo -e "${YELLOW}🌉 Starting NATS-Kafka bridge...${NC}"
    docker-compose up -d message-bridge
    
    # Wait for bridge
    sleep 5
    if docker ps | grep -q "events-platform-message-bridge"; then
        echo -e "${GREEN}✅ Message bridge started${NC}"
    else
        echo -e "${YELLOW}⚠️ Message bridge failed to start (optional service)${NC}"
    fi
fi

# Health checks
echo -e "${YELLOW}🏥 Performing health checks...${NC}"

# NATS health check
if nc -z localhost 4222; then
    echo -e "${GREEN}✅ NATS healthy${NC}"
else
    echo -e "${RED}❌ NATS unhealthy${NC}"
fi

# Kafka health check
if docker exec events-platform-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Kafka healthy${NC}"
else
    echo -e "${RED}❌ Kafka unhealthy${NC}"
fi

# Redis health check
if docker exec events-platform-redis redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis healthy${NC}"
else
    echo -e "${RED}❌ Redis unhealthy${NC}"
fi

# Show topic information
echo -e "${YELLOW}📊 Kafka topic information:${NC}"
docker exec events-platform-kafka kafka-topics \
    --list \
    --bootstrap-server localhost:9092

# Create environment configuration
echo -e "${YELLOW}📝 Creating environment configuration...${NC}"

cat > ../.env.messaging << EOF
# Message Queue Configuration
NATS_URL=nats://localhost:4222
NATS_CLUSTER_URL=nats://localhost:6222
NATS_MONITORING_URL=http://localhost:8222

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081
KAFKA_CONNECT_URL=http://localhost:8083

REDIS_URL=redis://localhost:6379

# Monitoring
KAFKA_UI_URL=http://localhost:8089
GRAFANA_URL=http://localhost:3001

# Bridge Service
BRIDGE_NATS_SERVERS=nats://localhost:4222
BRIDGE_KAFKA_SERVERS=localhost:9092
EOF

echo -e "${GREEN}✅ Environment configuration created at ../.env.messaging${NC}"

# Show service URLs
echo ""
echo -e "${GREEN}🎉 Message queue setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Service URLs:${NC}"
echo -e "  • NATS Server: nats://localhost:4222"
echo -e "  • NATS Monitoring: http://localhost:8222"
echo -e "  • Kafka: localhost:9092"
echo -e "  • Kafka UI: http://localhost:8089"
echo -e "  • Schema Registry: http://localhost:8081"
echo -e "  • Redis: redis://localhost:6379"
echo ""
echo -e "${YELLOW}🔧 Management Commands:${NC}"
echo -e "  • View logs: docker-compose logs -f [service]"
echo -e "  • Stop services: docker-compose down"
echo -e "  • Restart services: docker-compose restart"
echo -e "  • View topics: docker exec events-platform-kafka kafka-topics --list --bootstrap-server localhost:9092"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo -e "  1. Source the environment: source ../.env.messaging"
echo -e "  2. Test connections with your services"
echo -e "  3. Monitor services via web UIs"
echo ""
echo -e "${GREEN}✨ Happy messaging!${NC}"