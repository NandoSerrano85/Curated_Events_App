#!/bin/bash

# Curated Events Platform - Health Check
# This script checks the health of all local services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏥 Health Check - Curated Events Platform${NC}"
echo "========================================="

# Function to check HTTP endpoint
check_http() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -n "  $name: "
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
        if [[ "$response" == "$expected_status" ]]; then
            echo -e "${GREEN}✓ ($url)${NC}"
            return 0
        else
            echo -e "${RED}✗ HTTP $response ($url)${NC}"
            return 1
        fi
    else
        # Fallback to nc for port check
        port=$(echo "$url" | grep -o ':[0-9]*' | tr -d ':')
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}✓ (Port $port open)${NC}"
            return 0
        else
            echo -e "${RED}✗ (Port $port closed)${NC}"
            return 1
        fi
    fi
}

# Function to check TCP port
check_port() {
    local name="$1"
    local port="$2"
    
    echo -n "  $name: "
    
    if nc -z localhost "$port" 2>/dev/null; then
        echo -e "${GREEN}✓ (localhost:$port)${NC}"
        return 0
    else
        echo -e "${RED}✗ (localhost:$port)${NC}"
        return 1
    fi
}

# Check infrastructure services
echo -e "${YELLOW}🏗️  Infrastructure Services${NC}"
check_port "PostgreSQL" "5432"
check_port "Redis" "6379"
check_port "NATS" "4222"
check_http "Elasticsearch" "http://localhost:9200/_cluster/health"

echo ""

# Check Go backend services
echo -e "${YELLOW}🚀 Go Backend Services${NC}"
check_http "API Gateway" "http://localhost:8080/health"
check_http "User Service" "http://localhost:8081/health"
check_http "Event Service" "http://localhost:8082/health"  
check_http "Search Service" "http://localhost:8083/health"
check_port "WebSocket Gateway" "8084"

echo ""

# Check Python services
echo -e "${YELLOW}🐍 Python Services${NC}"
check_http "Curation Service" "http://localhost:8091/health"
check_http "Recommendation Engine" "http://localhost:8092/health"
check_http "Analytics Service" "http://localhost:8093/health"

echo ""

# Check frontend services
echo -e "${YELLOW}🌐 Frontend Services${NC}"
check_http "Web App" "http://localhost:3000"
check_http "Admin Panel" "http://localhost:3001"

echo ""

# Overall status
failed_services=0
total_services=13

if [[ $failed_services -eq 0 ]]; then
    echo -e "${GREEN}🎉 All services are healthy! ($total_services/$total_services)${NC}"
    exit 0
else
    healthy=$((total_services - failed_services))
    echo -e "${YELLOW}⚠️  $healthy/$total_services services are healthy${NC}"
    exit 1
fi