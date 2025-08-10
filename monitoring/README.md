# Monitoring and Observability

This directory contains monitoring and observability configurations for the Events Platform hybrid architecture.

## Architecture Overview

The monitoring stack uses industry-standard tools:

### Core Components
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notification
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics

### Service Monitoring
- **Go Services**: Custom Prometheus metrics via middleware
- **Python Services**: Metrics via prometheus-client library
- **Databases**: PostgreSQL, Redis, Elasticsearch exporters
- **Message Queues**: NATS and Kafka JMX metrics

## Metrics Categories

### Application Metrics
```
# Go Services
http_requests_total
http_request_duration_seconds
database_queries_total
cache_operations_total
websocket_connections_current

# Python Services
ml_predictions_total
recommendation_requests_total
analytics_events_processed_total
model_training_duration_seconds
data_processing_queue_size
```

### Infrastructure Metrics
```
# System
node_cpu_usage_percent
node_memory_usage_bytes
node_disk_usage_bytes
node_network_receive_bytes

# Containers
container_cpu_usage_percent
container_memory_usage_bytes
container_network_receive_bytes
```

### Business Metrics
```
# Events Platform
events_created_total
user_registrations_total
event_registrations_total
payments_completed_total
search_queries_total
```

## Dashboards

### Available Dashboards
1. **Platform Overview**: High-level KPIs and health status
2. **Go Services**: Performance metrics for all Go microservices
3. **Python Services**: ML/Analytics service performance
4. **Infrastructure**: System and container metrics
5. **Database Performance**: PostgreSQL, Redis, Elasticsearch
6. **Message Queues**: NATS and Kafka metrics
7. **Business Intelligence**: User behavior and business metrics

### Custom Dashboards
- Real-time event registration monitoring
- ML model performance tracking
- User engagement analytics
- Revenue and conversion metrics

## Alerting

### Alert Categories
- **Critical**: Service down, database connection lost
- **Warning**: High response times, memory usage > 80%
- **Info**: Deployment events, scheduled maintenance

### Notification Channels
- Slack integration
- Email notifications
- PagerDuty for critical alerts
- Webhook for custom integrations

## Getting Started

1. Start monitoring stack:
   ```bash
   cd monitoring
   make setup
   ```

2. Access dashboards:
   - Grafana: http://localhost:3000 (admin/admin)
   - Prometheus: http://localhost:9090
   - Alertmanager: http://localhost:9093

3. Import custom dashboards:
   ```bash
   make import-dashboards
   ```

## Configuration

### Environment Variables
```bash
# Prometheus
PROMETHEUS_URL=http://localhost:9090
PROMETHEUS_RETENTION=15d

# Grafana
GRAFANA_URL=http://localhost:3000
GRAFANA_ADMIN_PASSWORD=admin

# Alertmanager
ALERTMANAGER_URL=http://localhost:9093
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

## Monitoring Targets

The system monitors:

### Services
- API Gateway (8080)
- User Service (8081)
- Event Service (8082)
- Search Service (8083)
- WebSocket Gateway (8084)
- Curation Service (8091)
- Recommendation Engine (8092)
- Analytics Service (8093)

### Infrastructure
- PostgreSQL (5432)
- Redis (6379)
- Elasticsearch (9200)
- NATS (4222, 8222)
- Kafka (9092, 9101)