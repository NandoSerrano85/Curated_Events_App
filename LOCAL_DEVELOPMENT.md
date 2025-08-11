# 🚀 Local Development Guide

This guide explains how to run the entire Curated Events Platform locally without any cloud dependencies.

## 📋 Prerequisites

Before running the platform locally, ensure you have the following installed:

### Required Software
- **Docker** & **Docker Compose** - For infrastructure services
- **Go 1.19+** - For backend services
- **Python 3.9+** - For ML/AI services  
- **Node.js 18+** & **npm** - For frontend applications

### Verification Commands
```bash
# Check versions
docker --version
docker-compose --version
go version
python3 --version
node --version
npm --version
```

## 🏃‍♂️ Quick Start

### 1. Start All Services
```bash
# Start the entire platform
./start-local.sh
```

This single command will:
- ✅ Check all prerequisites
- ✅ Start infrastructure (PostgreSQL, Redis, NATS, Elasticsearch)
- ✅ Install all dependencies
- ✅ Start all Go services
- ✅ Start all Python services
- ✅ Start all frontend applications

### 2. Access the Platform

Once all services are running, you can access:

**🌐 Frontend Applications:**
- **Main Web App**: http://localhost:3000
- **Admin Panel**: http://localhost:3001

**🔌 Backend APIs:**
- **API Gateway**: http://localhost:8080 *(main entry point)*
- **User Service**: http://localhost:8081
- **Event Service**: http://localhost:8082
- **Search Service**: http://localhost:8083
- **WebSocket Gateway**: ws://localhost:8084

**🐍 Python Services:**
- **Curation Service**: http://localhost:8091
- **Recommendation Engine**: http://localhost:8092
- **Analytics Service**: http://localhost:8093

**🗄️ Infrastructure:**
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **NATS**: localhost:4222
- **Elasticsearch**: http://localhost:9200

### 3. Health Check
```bash
# Check if all services are healthy
./check-health.sh
```

### 4. Stop All Services
```bash
# Gracefully stop all services
./stop-local.sh
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Web App (3000)    │    Admin Panel (3001)                  │
└─────────────────────┴─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (8080)                       │
└─────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Go Services   │ │ Python Services │ │   WebSocket     │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ • User (8081)   │ │ • Curation      │ │ • Gateway       │
│ • Event (8082)  │ │   (8091)        │ │   (8084)        │
│ • Search (8083) │ │ • Recommend     │ │                 │
│                 │ │   (8092)        │ │                 │
│                 │ │ • Analytics     │ │                 │
│                 │ │   (8093)        │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────┤
│ PostgreSQL │ Redis │ NATS │ Elasticsearch                   │
│   (5432)   │ (6379)│(4222)│    (9200)                       │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Environment Variables

The platform uses these environment variables (automatically configured):

```bash
# API Configuration
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8084

# Database Configuration  
POSTGRES_DB=events_platform
POSTGRES_USER=events_user
POSTGRES_PASSWORD=events_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# NATS Configuration
NATS_URL=nats://localhost:4222

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
```

### Custom Configuration

To override default settings, create environment files:

```bash
# Frontend configuration
echo "VITE_API_URL=http://localhost:8080" > frontend/web-app/.env.local

# Backend configuration (if needed)
export CUSTOM_CONFIG_VAR=value
```

## 🛠️ Development Workflow

### Making Changes

1. **Frontend Changes**: Hot reload automatically applies changes
2. **Go Services**: Restart individual services or use hot reload tools
3. **Python Services**: Auto-reload on file changes (development mode)

### Individual Service Management

#### Start Single Services
```bash
# Frontend only
cd frontend/web-app && npm run dev

# Go service
cd services/go/user-service && go run main.go

# Python service  
cd services/python/curation-service && python3 main.py
```

#### Logs and Debugging
```bash
# View logs for all services
tail -f logs/*.log

# View specific service log
tail -f logs/user-service.log

# Docker infrastructure logs
docker-compose -f docker-compose.local.yml logs -f
```

## 🧪 Testing

### API Testing
```bash
# Test API Gateway health
curl http://localhost:8080/health

# Test user registration
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test event listing
curl http://localhost:8080/events
```

### Frontend Testing
```bash
# Run frontend tests
cd frontend/web-app
npm test

# E2E tests (if available)
npm run test:e2e
```

## 📊 Monitoring

### Health Checks
- **Automated**: `./check-health.sh`
- **Manual**: Visit http://localhost:8080/health
- **Infrastructure**: Check Docker containers with `docker ps`

### Performance Monitoring
- **Frontend**: Browser DevTools
- **Backend**: Logs in `logs/` directory
- **Database**: Connect to PostgreSQL at localhost:5432

## 🗄️ Database Management

### Access Database
```bash
# PostgreSQL
docker exec -it events-postgres psql -U events_user -d events_platform

# Redis
docker exec -it events-redis redis-cli

# Elasticsearch
curl http://localhost:9200/_cat/indices
```

### Reset Data
```bash
# Stop services and remove data
./stop-local.sh
docker volume prune

# Restart with fresh data
./start-local.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:8080
kill <PID>

# Or use the stop script
./stop-local.sh
```

#### Service Won't Start
```bash
# Check logs
tail -f logs/<service-name>.log

# Check Docker services
docker-compose -f docker-compose.local.yml ps

# Restart infrastructure
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d
```

#### Dependencies Issues
```bash
# Reinstall Go dependencies
go mod download

# Reinstall Python dependencies  
cd services/python && pip install -r requirements.txt

# Reinstall Node dependencies
cd frontend/web-app && rm -rf node_modules && npm install
```

### Getting Help

1. **Check logs**: `tail -f logs/*.log`
2. **Health check**: `./check-health.sh`
3. **Reset everything**: `./stop-local.sh && ./start-local.sh`

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
# Go modules
go get -u ./...

# Python packages
pip install --upgrade -r services/python/requirements.txt

# Node packages
cd frontend/web-app && npm update
```

### Service Port Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Web App | 3000 | HTTP | Main frontend application |
| Admin Panel | 3001 | HTTP | Admin dashboard |
| API Gateway | 8080 | HTTP | Main API entry point |
| User Service | 8081 | HTTP | Authentication & user management |
| Event Service | 8082 | HTTP | Event CRUD operations |
| Search Service | 8083 | HTTP | Search & filtering |
| WebSocket Gateway | 8084 | WS | Real-time communications |
| Curation Service | 8091 | HTTP | AI-powered event curation |
| Recommendation Engine | 8092 | HTTP | ML recommendations |
| Analytics Service | 8093 | HTTP | Analytics & reporting |
| PostgreSQL | 5432 | TCP | Primary database |
| Redis | 6379 | TCP | Caching & sessions |
| NATS | 4222 | TCP | Message queue |
| Elasticsearch | 9200 | HTTP | Search engine |

---

🎉 **You're all set!** The platform should now be running locally without any cloud dependencies.