# Database Schemas and Configurations

This directory contains database schemas, migrations, and configurations for the hybrid Events Platform architecture.

## Directory Structure

```
database/
├── schemas/           # Database schema definitions
│   ├── postgresql/    # PostgreSQL schemas (primary database)
│   ├── elasticsearch/ # Elasticsearch mappings and settings
│   └── redis/         # Redis configurations
├── migrations/        # Database migration scripts
│   ├── go/           # Go service migrations (using golang-migrate)
│   └── python/       # Python service migrations (using Alembic)
├── seeds/            # Seed data for development/testing
├── configs/          # Database configuration files
└── scripts/          # Utility scripts for database management
```

## Database Architecture

The platform uses a polyglot persistence approach:

### Primary Databases
- **PostgreSQL**: Main relational database for users, events, and core data
- **Elasticsearch**: Search engine for full-text search and analytics
- **Redis**: Caching and session storage

### Service-Specific Databases
- **Go Services**: Share the main PostgreSQL database
- **Python Services**: Use separate PostgreSQL database for analytics data
- **Real-time Analytics**: Optional ClickHouse for high-volume analytics

## Getting Started

1. Install required tools:
   ```bash
   # PostgreSQL
   brew install postgresql

   # Elasticsearch
   brew install elasticsearch

   # Redis
   brew install redis

   # Migration tools
   go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
   pip install alembic
   ```

2. Set up databases:
   ```bash
   # Start services
   brew services start postgresql
   brew services start elasticsearch
   brew services start redis

   # Create databases
   createdb events_db
   createdb events_analytics
   ```

3. Run migrations:
   ```bash
   # Go services
   cd migrations/go
   migrate -path . -database "postgres://localhost/events_db?sslmode=disable" up

   # Python services
   cd migrations/python
   alembic upgrade head
   ```

## Environment Configuration

Set the following environment variables:

```bash
# Main Database
DATABASE_URL=postgresql://user:password@localhost:5432/events_db

# Analytics Database
ANALYTICS_DATABASE_URL=postgresql://user:password@localhost:5432/events_analytics

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Redis
REDIS_URL=redis://localhost:6379
```