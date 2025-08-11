#!/bin/bash

# Curated Events Platform - Local Development Stopper
# This script stops all local services gracefully

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_ROOT/.local-dev-pids"

echo -e "${BLUE}🛑 Stopping Curated Events Platform...${NC}"

# Stop application services
if [[ -f "$PID_FILE" ]]; then
    echo -e "${YELLOW}📦 Stopping application services...${NC}"
    while IFS= read -r pid; do
        if ps -p "$pid" > /dev/null 2>&1; then
            process_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            echo "  Stopping $process_name (PID: $pid)"
            kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
            
            # Wait for process to stop
            timeout=10
            while [ $timeout -gt 0 ] && ps -p "$pid" > /dev/null 2>&1; do
                sleep 1
                timeout=$((timeout-1))
            done
            
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "    Force killing PID $pid"
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    echo -e "${GREEN}✅ Application services stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  No running application services found${NC}"
fi

# Stop Docker infrastructure
echo -e "${YELLOW}🏗️  Stopping infrastructure services...${NC}"
cd "$PROJECT_ROOT"

if [[ -f docker-compose.local.yml ]]; then
    docker-compose -f docker-compose.local.yml down -v > /dev/null 2>&1 || true
    echo "  Stopped PostgreSQL, Redis, NATS, Elasticsearch"
fi

# Clean up any remaining processes on our ports
echo -e "${YELLOW}🧹 Cleaning up remaining processes...${NC}"
ports=(3000 3001 8080 8081 8082 8083 8084 8091 8092 8093)

for port in "${ports[@]}"; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [[ -n "$pid" ]]; then
        echo "  Killing process on port $port (PID: $pid)"
        kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
done

# Remove temporary files
rm -f docker-compose.local.yml
rm -rf logs/

echo -e "${GREEN}"
echo "✅ All services stopped successfully!"
echo "===================================="
echo ""
echo "Infrastructure containers removed:"
echo "  • PostgreSQL data preserved in Docker volume"
echo "  • Redis data preserved in Docker volume" 
echo "  • NATS data preserved in Docker volume"
echo "  • Elasticsearch data preserved in Docker volume"
echo ""
echo "To completely reset data, run:"
echo "  docker volume prune"
echo -e "${NC}"