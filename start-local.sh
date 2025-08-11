#!/bin/bash

# Curated Events Platform - Local Development Starter
# This script starts all services locally without cloud dependencies

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/.local-dev-pids"

# Create logs directory
mkdir -p "$LOG_DIR"

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Kill processes by PID file
    if [[ -f "$PID_FILE" ]]; then
        while IFS= read -r pid; do
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "  Killing process $pid"
                kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Kill processes by port
    echo "  Cleaning up service ports..."
    for port in 8080 8081 8082 8083 8084 8091 8092 8093 3000 3001; do
        if lsof -ti:$port > /dev/null 2>&1; then
            echo "    Killing process on port $port"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Kill by process name patterns
    pkill -f "go run.*main.go" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "python.*main.py" 2>/dev/null || true
    
    # Stop Docker containers
    echo "  Stopping Docker infrastructure..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.local.yml down > /dev/null 2>&1 || true
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Print banner
echo -e "${BLUE}"
echo "🎉 Curated Events Platform - Local Development"
echo "=============================================="
echo -e "${NC}"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is required but not installed${NC}"
    exit 1
fi

# Check Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is required but not installed${NC}"
    echo "Please install Go from https://golang.org/dl/"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 is required but not installed${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Start infrastructure services
echo -e "${BLUE}🏗️  Starting infrastructure services...${NC}"
cd "$PROJECT_ROOT"

# Create docker-compose file for local development
cat > docker-compose.local.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: events-postgres
    environment:
      POSTGRES_DB: events_platform
      POSTGRES_USER: events_user
      POSTGRES_PASSWORD: events_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schemas/postgresql:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U events_user -d events_platform"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: events-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  nats:
    image: nats:2.9-alpine
    container_name: events-nats
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["-js", "--name", "events-nats", "--store_dir", "/data"]
    volumes:
      - nats_data:/data
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "4222"]
      interval: 5s
      timeout: 3s
      retries: 5

  elasticsearch:
    image: elasticsearch:8.8.0
    container_name: events-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
  redis_data:
  nats_data:
  elasticsearch_data:
EOF

# Start infrastructure
echo "  Starting PostgreSQL, Redis, NATS, and Elasticsearch..."
docker-compose -f docker-compose.local.yml up -d

# Wait for services to be healthy
echo "  Waiting for infrastructure services to be ready..."
sleep 5

# Check service health
services=("postgres" "redis" "nats" "elasticsearch")
for service in "${services[@]}"; do
    echo -n "    Waiting for $service... "
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f docker-compose.local.yml ps | grep "$service" | grep -q "healthy\|Up"; then
            echo -e "${GREEN}✓${NC}"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        echo -e "${RED}✗ Timeout waiting for $service${NC}"
        exit 1
    fi
done

# Install dependencies for Go services
echo -e "${BLUE}📦 Installing Go dependencies...${NC}"
cd "$PROJECT_ROOT"
if [[ -f go.mod ]]; then
    go mod download
fi

# Install dependencies for Python services
echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
if [[ -f services/python/requirements.txt ]]; then
    cd "$PROJECT_ROOT/services/python"
    python3 -m pip install -r requirements.txt > "$LOG_DIR/python-deps.log" 2>&1 || {
        echo -e "${YELLOW}⚠️  Python dependencies installation failed, check $LOG_DIR/python-deps.log${NC}"
    }
fi

# Install dependencies for frontend
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd "$PROJECT_ROOT/frontend/web-app"
if [[ ! -d node_modules ]]; then
    npm install > "$LOG_DIR/frontend-deps.log" 2>&1 || {
        echo -e "${YELLOW}⚠️  Frontend dependencies installation failed, check $LOG_DIR/frontend-deps.log${NC}"
    }
fi

# Function to start a service and track its PID
start_service() {
    local name="$1"
    local command="$2"
    local log_file="$LOG_DIR/$name.log"
    local expected_port="$3"
    
    echo -n "  Starting $name... "
    
    # Check if port is already in use and kill the process if needed
    if [[ -n "$expected_port" ]]; then
        if lsof -ti:$expected_port > /dev/null 2>&1; then
            echo -n "(killing existing process on port $expected_port) "
            lsof -ti:$expected_port | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # Clear the log file
    > "$log_file"
    
    # Start the service in the background
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    
    # Store PID for cleanup
    echo "$pid" >> "$PID_FILE"
    
    # Wait for service to start (check if port is listening)
    if [[ -n "$expected_port" ]]; then
        timeout=30
        while [ $timeout -gt 0 ]; do
            if nc -z localhost "$expected_port" 2>/dev/null; then
                echo -e "${GREEN}✓ (PID: $pid, Port: $expected_port)${NC}"
                return 0
            fi
            # Check if process died early
            if ! ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}✗ Process died early${NC}"
                echo "  Check log: $log_file"
                return 1
            fi
            sleep 1
            timeout=$((timeout-1))
        done
        echo -e "${RED}✗ Failed to start on port $expected_port${NC}"
        echo "  Check log: $log_file"
        return 1
    else
        sleep 2
        if ps -p "$pid" > /dev/null; then
            echo -e "${GREEN}✓ (PID: $pid)${NC}"
            return 0
        else
            echo -e "${RED}✗ Process died${NC}"
            echo "  Check log: $log_file"
            return 1
        fi
    fi
}

# Start Go services
echo -e "${BLUE}🚀 Starting Go services...${NC}"

# API Gateway (8080)
start_service "api-gateway" \
    "cd '$PROJECT_ROOT/services/go/api-gateway' && go run main.go" \
    "8080"

# User Service (8081)
start_service "user-service" \
    "cd '$PROJECT_ROOT/services/go/user-service' && go run main.go" \
    "8081"

# Event Service (8082)
start_service "event-service" \
    "cd '$PROJECT_ROOT/services/go/event-service' && go run main.go" \
    "8082"

# Search Service (8083)
start_service "search-service" \
    "cd '$PROJECT_ROOT/services/go/search-service' && go run main.go" \
    "8083"

# WebSocket Gateway (8084)
start_service "websocket-gateway" \
    "cd '$PROJECT_ROOT/services/go/websocket-gateway' && go run main.go" \
    "8084"

# Start Python services
echo -e "${BLUE}🐍 Starting Python services...${NC}"

# Ensure Python virtual environment exists
if [ ! -d "$PROJECT_ROOT/services/python/events-venv" ]; then
    echo "  Creating Python virtual environment..."
    cd "$PROJECT_ROOT/services/python"
    python3 -m venv events-venv
    source events-venv/bin/activate
    pip install fastapi uvicorn pydantic-settings python-dotenv
    echo "  ✅ Python virtual environment created"
fi

# Curation Service (8091)
start_service "curation-service" \
    "'$PROJECT_ROOT/services/python/start-curation.sh'" \
    "8091"

# Recommendation Engine (8092)
start_service "recommendation-engine" \
    "'$PROJECT_ROOT/services/python/start-recommendation.sh'" \
    "8092"

# Analytics Service (8093)
start_service "analytics-service" \
    "'$PROJECT_ROOT/services/python/start-analytics.sh'" \
    "8093"

# Start frontend services
echo -e "${BLUE}🌐 Starting frontend services...${NC}"

# Web App (3000)
start_service "web-app" \
    "cd '$PROJECT_ROOT/frontend/web-app' && npm run dev" \
    "3000"

# Admin Panel (3001)
start_service "admin-panel" \
    "cd '$PROJECT_ROOT/frontend/admin-panel' && npm run dev -- --port 3001" \
    "3001"

# Success message
echo -e "${GREEN}"
echo "🎉 All services started successfully!"
echo "=================================="
echo ""
echo "🌐 Frontend Services:"
echo "  • Web App:        http://localhost:3000"
echo "  • Admin Panel:    http://localhost:3001"
echo ""
echo "🔌 Backend API:"
echo "  • API Gateway:    http://localhost:8080"
echo "  • User Service:   http://localhost:8081" 
echo "  • Event Service:  http://localhost:8082"
echo "  • Search Service: http://localhost:8083"
echo "  • WebSocket:      ws://localhost:8084"
echo ""
echo "🐍 Python Services:"
echo "  • Curation:       http://localhost:8091"
echo "  • Recommendations: http://localhost:8092" 
echo "  • Analytics:      http://localhost:8093"
echo ""
echo "🗄️  Infrastructure:"
echo "  • PostgreSQL:     localhost:5432"
echo "  • Redis:          localhost:6379"
echo "  • NATS:           localhost:4222"
echo "  • Elasticsearch:  http://localhost:9200"
echo ""
echo "📊 Health Check: curl http://localhost:8080/health"
echo "📝 Logs: $LOG_DIR/"
echo ""
echo "Press Ctrl+C to stop all services"
echo -e "${NC}"

# Keep the script running and monitor services
while true; do
    sleep 5
    
    # Check if any service has died and restart if needed
    while IFS= read -r pid; do
        if ! ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  A service (PID: $pid) has stopped${NC}"
        fi
    done < "$PID_FILE" 2>/dev/null || true
done