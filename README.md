# Events Platform

A comprehensive, production-ready events management platform built with a hybrid Go/Python microservices architecture. Features real-time capabilities, advanced ML-powered recommendations, sophisticated analytics, and enterprise-grade observability.

![Architecture Overview](docs/images/architecture-overview.png)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/events-platform.git
cd events-platform

# Start the complete platform
cd deployments/compose
make setup
make dev

# Access the platform
open http://localhost:8080
```

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Features](#-features)  
- [Services](#-services)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [API Documentation](#-api-documentation)
- [Monitoring](#-monitoring)
- [Contributing](#-contributing)
- [License](#-license)

## 🏗️ Architecture Overview

Events Platform implements a hybrid microservices architecture combining the performance of Go services with the ML capabilities of Python services, unified through sophisticated messaging and monitoring systems.

### Core Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend/Mobile   │────│    Load Balancer    │────│    API Gateway     │
│    Applications     │    │      (Nginx)        │    │       (Go)          │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                                                │
                    ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
                    │                                           │                                           │
            ┌───────────────┐                          ┌───────────────┐                          ┌───────────────┐
            │ User Service  │                          │ Event Service │                          │Search Service │
            │     (Go)      │                          │     (Go)      │                          │     (Go)      │
            └───────────────┘                          └───────────────┘                          └───────────────┘
                    │                                           │                                           │
                    └───────────────────────────────────────────┼───────────────────────────────────────────┘
                                                                │
                    ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
                    │                                           │                                           │
            ┌───────────────┐                          ┌───────────────┐                          ┌───────────────┐
            │   WebSocket   │                          │   Curation    │                          │Recommendation │
            │   Gateway     │                          │   Service     │                          │    Engine     │
            │     (Go)      │                          │   (Python)    │                          │   (Python)    │
            └───────────────┘                          └───────────────┘                          └───────────────┘
                    │                                           │                                           │
                    └───────────────────────────────────────────┼───────────────────────────────────────────┘
                                                                │
                                                        ┌───────────────┐
                                                        │   Analytics   │
                                                        │    Service    │
                                                        │   (Python)    │
                                                        └───────────────┘
```

### Technology Stack

#### **Go Services** (High-Performance Core)
- **Language**: Go 1.21+
- **Framework**: Gin HTTP framework
- **Database**: PostgreSQL with GORM ORM
- **Cache**: Redis
- **Messaging**: NATS with JetStream
- **Search**: Elasticsearch integration
- **Monitoring**: Prometheus metrics

#### **Python Services** (ML/Analytics Engine)  
- **Language**: Python 3.11+
- **Framework**: FastAPI with async support
- **ML Libraries**: scikit-learn, pandas, numpy, sentence-transformers
- **Database**: PostgreSQL with SQLAlchemy
- **Messaging**: Kafka with aiokafka
- **Analytics**: Real-time processing with sliding windows

#### **Infrastructure**
- **Database**: PostgreSQL 15 (primary), Redis 7 (cache)
- **Search**: Elasticsearch 8.8
- **Messaging**: NATS 2.9 (Go services), Kafka 7.4 (Python services)
- **Monitoring**: Prometheus + Grafana + Alertmanager
- **Deployment**: Docker + Docker Compose + Kubernetes

## ✨ Features

### 🎯 **Core Event Management**
- **Event Lifecycle**: Complete CRUD operations with state management
- **User Management**: Registration, authentication, profile management
- **Event Discovery**: Advanced search with filters, categories, and location-based queries
- **Registration System**: Event booking with capacity management and waitlists
- **Real-time Updates**: WebSocket connections for live event updates

### 🤖 **AI-Powered Intelligence**
- **Hybrid Recommendation Engine**: Collaborative filtering + content-based + matrix factorization
- **Content Curation**: ML-driven event categorization and tagging
- **Predictive Analytics**: User behavior prediction and trend analysis
- **Smart Search**: Semantic search with auto-suggestions and typo tolerance
- **Anomaly Detection**: Real-time detection of unusual patterns

### 📊 **Advanced Analytics**
- **Real-time Processing**: Streaming analytics with sliding windows
- **User Behavior Tracking**: Comprehensive event and interaction logging  
- **Business Intelligence**: Revenue analytics, conversion tracking, and KPI monitoring
- **Performance Metrics**: Service health, response times, and system metrics
- **Custom Dashboards**: Grafana dashboards for operational insights

### 🔒 **Enterprise Security**
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection with configurable limits
- **Input Validation**: Comprehensive request validation and sanitization
- **CORS Protection**: Cross-origin request security
- **Audit Logging**: Complete audit trail for compliance

### 🚀 **Production Ready**
- **High Availability**: Multi-instance deployment with load balancing
- **Auto Scaling**: Kubernetes HPA and VPA support
- **Observability**: Comprehensive metrics, logs, and distributed tracing
- **Backup & Recovery**: Automated database backups and disaster recovery
- **CI/CD Ready**: GitHub Actions workflows and deployment automation

## 🛠️ Services

### Go Microservices

#### **API Gateway** (`services/go/api-gateway`)
- **Port**: 8080
- **Purpose**: Request routing, authentication, rate limiting
- **Features**: JWT middleware, request validation, metrics collection
- **Health Check**: `GET /health`

#### **User Service** (`services/go/user-service`)  
- **Port**: 8081
- **Purpose**: User management, authentication, profiles
- **Features**: Registration, login, password reset, profile updates
- **Key Endpoints**: `/auth/register`, `/auth/login`, `/users/profile`

#### **Event Service** (`services/go/event-service`)
- **Port**: 8082
- **Purpose**: Event CRUD operations, registrations, capacity management
- **Features**: Event creation, updates, registration handling, notifications
- **Key Endpoints**: `/events`, `/events/{id}/register`, `/events/search`

#### **Search Service** (`services/go/search-service`)
- **Port**: 8083  
- **Purpose**: Elasticsearch integration, search optimization
- **Features**: Full-text search, filters, autocomplete, geospatial queries
- **Key Endpoints**: `/search/events`, `/search/suggest`, `/search/filters`

#### **WebSocket Gateway** (`services/go/websocket-gateway`)
- **Port**: 8084
- **Purpose**: Real-time communication, live updates
- **Features**: WebSocket connections, room management, broadcast messaging
- **Key Endpoints**: `/ws` (WebSocket endpoint), `/ws/rooms`, `/ws/broadcast`

### Python ML Services

#### **Curation Service** (`services/python/curation-service`)
- **Port**: 8091
- **Purpose**: ML-powered content curation and categorization  
- **Features**: Event categorization, content analysis, tag generation
- **Key Endpoints**: `/curate/events`, `/curate/categories`, `/curate/tags`

#### **Recommendation Engine** (`services/python/recommendation-engine`)
- **Port**: 8092
- **Purpose**: Personalized event recommendations
- **Features**: Collaborative filtering, content-based recommendations, hybrid algorithms
- **Key Endpoints**: `/recommend/events`, `/recommend/similar`, `/recommend/trending`

#### **Analytics Service** (`services/python/analytics-service`)
- **Port**: 8093
- **Purpose**: Real-time analytics and behavioral analysis
- **Features**: Event tracking, user behavior analysis, predictive modeling
- **Key Endpoints**: `/analytics/events`, `/analytics/users`, `/analytics/insights`

### Infrastructure Services

#### **Message Bridge** (`messaging/bridge`)
- **Port**: 8095
- **Purpose**: NATS ↔ Kafka message translation
- **Features**: Bidirectional message routing, format transformation, error handling

## 🚀 Getting Started

### Prerequisites

- **Docker**: 20.0+ and Docker Compose 2.0+
- **Go**: 1.21+ (for local development)
- **Python**: 3.11+ (for local development)  
- **Node.js**: 18+ (for frontend development)
- **Make**: For using provided Makefiles

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/events-platform.git
   cd events-platform
   ```

2. **Environment Setup**
   ```bash
   cd deployments/compose
   make setup
   ```

3. **Configure Environment**
   ```bash
   # Copy and edit environment file
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Environment**
   ```bash
   make dev
   ```

5. **Verify Installation**
   ```bash
   make health
   ```

### First Steps

1. **Access the Platform**
   - API Gateway: http://localhost:8080
   - API Documentation: http://localhost:8080/docs
   - Monitoring: http://localhost:3000 (admin/admin123)

2. **Create Test User**
   ```bash
   curl -X POST http://localhost:8080/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

3. **Create Sample Event**
   ```bash
   # First login to get JWT token
   TOKEN=$(curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')
   
   # Create event
   curl -X POST http://localhost:8080/events \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Sample Event","description":"A sample event","date":"2024-12-01T18:00:00Z","location":"San Francisco, CA","capacity":100}'
   ```

## 💻 Development

### Development Environment

The development environment includes hot-reload, debugging tools, and development databases:

```bash
# Start with hot reload and debugging
make dev

# View logs
make dev-logs

# Access development tools
make dev-urls
```

#### **Development Tools**
- **pgAdmin**: http://localhost:8090 (Database management)
- **Redis Commander**: http://localhost:8094 (Redis management)  
- **Kafka UI**: http://localhost:8089 (Kafka management)
- **Elasticsearch Head**: http://localhost:8096 (Elasticsearch management)
- **MailHog**: http://localhost:8025 (Email testing)

### Local Development

#### **Go Services**
```bash
# Navigate to service directory
cd services/go/api-gateway

# Install dependencies
go mod download

# Run with hot reload
air -c .air.toml

# Run tests
go test ./...

# Format code
gofmt -w .
```

#### **Python Services**
```bash
# Navigate to service directory  
cd services/python/curation-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn main:app --reload --port 8091

# Run tests
pytest

# Format code
black .
```

### Code Structure

```
events-platform/
├── services/
│   ├── go/                     # Go microservices
│   │   ├── api-gateway/        # Main API gateway
│   │   ├── user-service/       # User management
│   │   ├── event-service/      # Event operations
│   │   ├── search-service/     # Search functionality
│   │   └── websocket-gateway/  # Real-time features
│   └── python/                 # Python ML services
│       ├── curation-service/   # Content curation
│       ├── recommendation-engine/ # Recommendations
│       └── analytics-service/  # Analytics & insights
├── database/                   # Database schemas & migrations
│   ├── schemas/               # SQL schema definitions
│   └── migrations/            # Database migrations
├── messaging/                  # Message queue configurations
│   ├── nats/                  # NATS configuration
│   ├── kafka/                 # Kafka configuration  
│   └── bridge/                # Message bridge service
├── monitoring/                 # Observability stack
│   ├── prometheus/            # Metrics collection
│   ├── grafana/              # Dashboards
│   └── alertmanager/         # Alert management
├── docker/                     # Docker configurations
├── deployments/               # Deployment manifests
│   ├── compose/              # Docker Compose files
│   └── kubernetes/           # Kubernetes manifests
└── docs/                      # Documentation
```

## 🚀 Production Deployment

### Docker Compose Production

```bash
# Initialize secrets
make init-secrets

# Deploy production environment
make prod

# Scale services
make prod-scale SERVICE=api-gateway REPLICAS=3

# Monitor deployment
make health
make prod-logs
```

### Kubernetes Deployment

```bash
# Apply namespace and secrets
kubectl apply -f deployments/kubernetes/namespace.yaml
kubectl apply -f deployments/kubernetes/secrets.yaml

# Deploy services
kubectl apply -f deployments/kubernetes/

# Verify deployment
kubectl get pods -n events-platform
kubectl get services -n events-platform
```

### Environment Configuration

#### **Production Environment Variables**
```bash
# Security
JWT_SECRET=your-production-jwt-secret-min-32-characters-long
POSTGRES_PASSWORD=your-secure-production-postgres-password
REDIS_PASSWORD=your-secure-production-redis-password

# Performance  
ENVIRONMENT=production
LOG_LEVEL=warn
BCRYPT_COST=14

# Scaling
API_GATEWAY_REPLICAS=3
EVENT_SERVICE_REPLICAS=3
RECOMMENDATION_ENGINE_REPLICAS=2

# External Services
SMTP_HOST=smtp.your-provider.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Health Checks & Monitoring

All services include comprehensive health checks:
- **Readiness Probes**: Service is ready to accept traffic
- **Liveness Probes**: Service is running and healthy  
- **Startup Probes**: Service has started successfully

```bash
# Check overall system health
make health

# Monitor performance
make stats

# View metrics
curl http://localhost:8080/metrics
```

## 📖 API Documentation

### Authentication

The platform uses JWT-based authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### **Authentication** (`/auth`)
```bash
# Register new user
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

# Login
POST /auth/login  
{
  "email": "user@example.com",
  "password": "password123"
}

# Refresh token
POST /auth/refresh
```

#### **Events** (`/events`)
```bash
# List events
GET /events?page=1&limit=20&category=tech&location=san-francisco

# Get event details
GET /events/{id}

# Create event (authenticated)
POST /events
{
  "title": "Tech Conference 2024",
  "description": "Annual technology conference",
  "date": "2024-12-01T09:00:00Z",
  "location": "San Francisco, CA",
  "capacity": 500,
  "category": "technology",
  "tags": ["tech", "conference", "networking"]
}

# Register for event
POST /events/{id}/register

# Cancel registration  
DELETE /events/{id}/register
```

#### **Search** (`/search`)
```bash
# Search events
GET /search/events?q=tech&location=san-francisco&date_from=2024-01-01

# Get suggestions
GET /search/suggest?q=techno

# Advanced search with filters
POST /search/advanced
{
  "query": "technology conference",
  "filters": {
    "category": ["technology", "business"],
    "location": "San Francisco",
    "date_range": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "price_range": {
      "min": 0,
      "max": 100
    }
  }
}
```

#### **Recommendations** (`/recommend`)
```bash
# Get personalized recommendations (authenticated)
GET /recommend/events?limit=10&type=collaborative

# Get similar events
GET /recommend/events/{id}/similar?limit=5

# Get trending events
GET /recommend/trending?category=tech&location=san-francisco
```

#### **Real-time** (`/ws`)
```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:8084/ws');

// Subscribe to event updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'event_updates',
  event_id: 'event-123'
}));

// Listen for updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event update:', data);
};
```

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

## 📊 Monitoring

### Observability Stack

The platform includes comprehensive monitoring with Prometheus, Grafana, and Alertmanager:

```bash
# Start monitoring stack
cd monitoring
make setup

# Access dashboards
open http://localhost:3000  # Grafana (admin/admin123)
open http://localhost:9090  # Prometheus  
open http://localhost:9093  # Alertmanager
```

### Key Metrics

#### **Application Metrics**
- Request rate, response times, error rates
- Active users, event registrations, revenue
- WebSocket connections, message queue throughput  
- ML model performance, recommendation accuracy

#### **Infrastructure Metrics**
- CPU, memory, disk usage
- Database connections, query performance
- Cache hit rates, message queue lag
- Network throughput, container health

### Dashboards

#### **Platform Overview** 
- System health, active services, alert count
- Request rates, response times, error rates
- Business metrics: events created, user registrations

#### **Service Performance**
- Individual service metrics
- Database and cache performance
- Message queue statistics

#### **Business Intelligence**  
- User engagement metrics
- Revenue and conversion tracking
- Event popularity and trends

### Alerting

Alerts are configured for:
- **Critical**: Service down, database failures, high error rates
- **Warning**: High response times, resource usage, slow queries
- **Info**: Deployments, maintenance events, capacity warnings

Notification channels:
- Slack integration for team notifications
- Email alerts for critical issues
- PagerDuty for on-call escalation

## 🧪 Testing

### Test Suite

```bash
# Run all tests
make test

# Run Go service tests
cd services/go/api-gateway
go test ./...

# Run Python service tests  
cd services/python/curation-service
pytest

# Run integration tests
make test-integration

# Run load tests
make load-test
```

### Test Coverage

- **Unit Tests**: Individual function and method testing
- **Integration Tests**: Service-to-service communication
- **End-to-End Tests**: Complete user workflow testing
- **Load Tests**: Performance under high traffic
- **Security Tests**: Authentication and authorization testing

## 🔧 Configuration

### Service Configuration

Each service supports configuration through:
1. **Environment Variables**: Runtime configuration
2. **Config Files**: Service-specific settings  
3. **Command Line Arguments**: Override specific settings
4. **Feature Flags**: Enable/disable functionality

### Environment Files

```bash
# Development
.env                    # Local development settings
.env.development       # Development-specific overrides

# Production  
.env.production        # Production settings
secrets/               # Production secrets (not in VCS)
```

### Feature Flags

```bash
# Enable/disable features
FEATURE_RECOMMENDATIONS_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
FEATURE_REAL_TIME_NOTIFICATIONS=true
FEATURE_PAYMENT_PROCESSING=true
FEATURE_ML_ENHANCED_SEARCH=true
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- **Go**: Follow `gofmt` and `golangci-lint` standards
- **Python**: Follow PEP 8, use `black` formatter and `flake8` linter
- **Tests**: Maintain >80% code coverage
- **Documentation**: Update docs for any API changes
- **Commits**: Use conventional commit messages

### Pull Request Process

1. Ensure all tests pass
2. Update documentation as needed  
3. Add/update tests for new functionality
4. Follow the pull request template
5. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- **API Docs**: http://localhost:8080/docs (when running locally)
- **Architecture Guide**: [docs/architecture.md](docs/architecture.md)
- **Deployment Guide**: [docs/deployment.md](docs/deployment.md)
- **Development Guide**: [docs/development.md](docs/development.md)

### Getting Help

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/your-org/events-platform/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/your-org/events-platform/discussions)  
- **Email**: Contact us at support@events-platform.com

### Community

- **Discord**: Join our community server
- **Twitter**: Follow [@EventsPlatform](https://twitter.com/eventsplatform) for updates
- **Blog**: Read our technical blog at [blog.events-platform.com](https://blog.events-platform.com)

## 🙏 Acknowledgments

- **Go Community**: For excellent tooling and libraries
- **Python ML Community**: For powerful machine learning libraries
- **CNCF Projects**: Prometheus, Grafana, NATS for excellent infrastructure tools
- **Docker & Kubernetes**: For containerization and orchestration
- **Open Source Contributors**: All the amazing open source projects we build upon

---

**Built with ❤️ by the Events Platform Team**

For questions, suggestions, or contributions, please reach out through our community channels or create an issue on GitHub.

---

*Last updated: January 2024*