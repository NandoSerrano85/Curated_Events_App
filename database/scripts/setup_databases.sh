#!/bin/bash

# Database setup script for Events Platform
# This script sets up PostgreSQL, Elasticsearch, and Redis for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_USER="events_user"
POSTGRES_PASSWORD="events_password"
MAIN_DB="events_db"
ANALYTICS_DB="events_analytics"
REDIS_PASSWORD="redis_password_here"

echo -e "${GREEN}🚀 Setting up Events Platform databases...${NC}"

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
            exit 1
        fi
        echo "Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${GREEN}✅ $service is ready${NC}"
}

# Check required tools
echo -e "${YELLOW}🔍 Checking required tools...${NC}"

if ! command_exists psql; then
    echo -e "${RED}❌ PostgreSQL client not found. Please install PostgreSQL${NC}"
    exit 1
fi

if ! command_exists redis-cli; then
    echo -e "${RED}❌ Redis CLI not found. Please install Redis${NC}"
    exit 1
fi

if ! command_exists curl; then
    echo -e "${RED}❌ curl not found. Please install curl${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required tools found${NC}"

# Start services (if they're not running)
echo -e "${YELLOW}🔧 Starting database services...${NC}"

# Start PostgreSQL
if ! pgrep -x "postgres" > /dev/null; then
    if command_exists brew; then
        brew services start postgresql
    elif command_exists systemctl; then
        sudo systemctl start postgresql
    else
        echo -e "${YELLOW}⚠️ Please start PostgreSQL manually${NC}"
    fi
    wait_for_service "PostgreSQL" 5432
fi

# Start Redis
if ! pgrep -x "redis-server" > /dev/null; then
    if command_exists brew; then
        brew services start redis
    elif command_exists systemctl; then
        sudo systemctl start redis
    else
        echo -e "${YELLOW}⚠️ Please start Redis manually${NC}"
    fi
    wait_for_service "Redis" 6379
fi

# Start Elasticsearch
if ! pgrep -f "elasticsearch" > /dev/null; then
    if command_exists brew; then
        brew services start elasticsearch
    elif command_exists systemctl; then
        sudo systemctl start elasticsearch
    else
        echo -e "${YELLOW}⚠️ Please start Elasticsearch manually${NC}"
    fi
    wait_for_service "Elasticsearch" 9200
fi

# Setup PostgreSQL
echo -e "${YELLOW}🐘 Setting up PostgreSQL databases...${NC}"

# Create user if not exists
psql -h localhost -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$POSTGRES_USER'" | grep -q 1 || \
    psql -h localhost -U postgres -c "CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';"

# Create main database
psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$MAIN_DB'" | grep -q 1 || {
    psql -h localhost -U postgres -c "CREATE DATABASE $MAIN_DB OWNER $POSTGRES_USER;"
    echo -e "${GREEN}✅ Created main database: $MAIN_DB${NC}"
}

# Create analytics database
psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$ANALYTICS_DB'" | grep -q 1 || {
    psql -h localhost -U postgres -c "CREATE DATABASE $ANALYTICS_DB OWNER $POSTGRES_USER;"
    echo -e "${GREEN}✅ Created analytics database: $ANALYTICS_DB${NC}"
}

# Grant privileges
psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $MAIN_DB TO $POSTGRES_USER;"
psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $ANALYTICS_DB TO $POSTGRES_USER;"

# Run schema migrations for main database
echo -e "${YELLOW}📋 Setting up main database schema...${NC}"
if [ -f "../schemas/postgresql/01_core_schema.sql" ]; then
    psql -h localhost -U $POSTGRES_USER -d $MAIN_DB -f "../schemas/postgresql/01_core_schema.sql"
    echo -e "${GREEN}✅ Main database schema created${NC}"
fi

# Run schema migrations for analytics database
echo -e "${YELLOW}📊 Setting up analytics database schema...${NC}"
if [ -f "../schemas/postgresql/02_analytics_schema.sql" ]; then
    psql -h localhost -U $POSTGRES_USER -d $ANALYTICS_DB -f "../schemas/postgresql/02_analytics_schema.sql"
    echo -e "${GREEN}✅ Analytics database schema created${NC}"
fi

# Setup Elasticsearch indexes
echo -e "${YELLOW}🔍 Setting up Elasticsearch indexes...${NC}"

# Wait for Elasticsearch to be fully ready
sleep 5

# Create events index
if [ -f "../schemas/elasticsearch/events_index_mapping.json" ]; then
    curl -X PUT "localhost:9200/events" \
         -H "Content-Type: application/json" \
         -d @../schemas/elasticsearch/events_index_mapping.json \
         --silent --show-error
    echo -e "${GREEN}✅ Events index created${NC}"
fi

# Create users index
if [ -f "../schemas/elasticsearch/users_index_mapping.json" ]; then
    curl -X PUT "localhost:9200/users" \
         -H "Content-Type: application/json" \
         -d @../schemas/elasticsearch/users_index_mapping.json \
         --silent --show-error
    echo -e "${GREEN}✅ Users index created${NC}"
fi

# Setup Redis
echo -e "${YELLOW}📦 Configuring Redis...${NC}"

# Test Redis connection
redis-cli ping > /dev/null 2>&1 && echo -e "${GREEN}✅ Redis is running${NC}" || {
    echo -e "${RED}❌ Redis connection failed${NC}"
    exit 1
}

# Create .env file template
echo -e "${YELLOW}📝 Creating environment configuration template...${NC}"

cat > "../../../.env.template" << EOF
# Database Configuration
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$MAIN_DB
ANALYTICS_DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$ANALYTICS_DB

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Service Configuration
API_GATEWAY_PORT=8080
USER_SERVICE_PORT=8081
EVENT_SERVICE_PORT=8082
SEARCH_SERVICE_PORT=8083
WEBSOCKET_GATEWAY_PORT=8084

# Python Services
CURATION_SERVICE_PORT=8091
RECOMMENDATION_ENGINE_PORT=8092
ANALYTICS_SERVICE_PORT=8093

# External Services
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
SENDGRID_API_KEY=your_sendgrid_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Development Settings
DEBUG=true
LOG_LEVEL=info
EOF

echo -e "${GREEN}✅ Environment template created at .env.template${NC}"

# Insert some sample data
echo -e "${YELLOW}🌱 Inserting sample data...${NC}"

# Sample categories
psql -h localhost -U $POSTGRES_USER -d $MAIN_DB << EOF
INSERT INTO event_categories (name, slug, description, icon, color) VALUES
('Technology', 'technology', 'Tech conferences and workshops', 'tech', '#007bff'),
('Business', 'business', 'Business and entrepreneurship events', 'business', '#28a745'),
('Entertainment', 'entertainment', 'Music, arts, and entertainment', 'music', '#dc3545'),
('Sports', 'sports', 'Sports and fitness activities', 'sports', '#fd7e14'),
('Education', 'education', 'Educational workshops and seminars', 'education', '#6f42c1')
ON CONFLICT (name) DO NOTHING;
EOF

echo -e "${GREEN}✅ Sample categories inserted${NC}"

# Check service health
echo -e "${YELLOW}🏥 Checking service health...${NC}"

# PostgreSQL health check
psql -h localhost -U $POSTGRES_USER -d $MAIN_DB -c "SELECT 1;" > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ PostgreSQL main database healthy${NC}"

psql -h localhost -U $POSTGRES_USER -d $ANALYTICS_DB -c "SELECT 1;" > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ PostgreSQL analytics database healthy${NC}"

# Redis health check
redis-cli ping > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ Redis healthy${NC}"

# Elasticsearch health check
curl -s "localhost:9200/_cluster/health" | grep -q '"status":"green\|yellow"' && \
    echo -e "${GREEN}✅ Elasticsearch healthy${NC}"

echo ""
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo -e "  • PostgreSQL main database: $MAIN_DB"
echo -e "  • PostgreSQL analytics database: $ANALYTICS_DB"
echo -e "  • Elasticsearch indexes: events, users"
echo -e "  • Redis cache configured"
echo -e "  • Sample data inserted"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo -e "  1. Copy .env.template to .env and update with your values"
echo -e "  2. Run database migrations: make migrate"
echo -e "  3. Start the services: make dev"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"