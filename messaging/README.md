# Message Queue Configuration

This directory contains message queue configurations and utilities for the hybrid Events Platform architecture.

## Architecture Overview

The platform uses a polyglot messaging approach:

### NATS for Go Services
- **Use Case**: Inter-service communication between Go microservices
- **Pattern**: Request-Reply, Pub-Sub, Streaming
- **Services**: API Gateway ↔ User Service ↔ Event Service ↔ Search Service ↔ WebSocket Gateway

### Kafka for Python Services
- **Use Case**: Event streaming, analytics data pipeline, ML training data
- **Pattern**: Event sourcing, Stream processing, Data integration
- **Services**: Analytics Service, Recommendation Engine, Curation Service

### Message Flow

```
┌─────────────────┐    NATS     ┌─────────────────┐
│   Go Services   │◄───────────►│   Go Services   │
│                 │             │                 │
└─────────┬───────┘             └─────────────────┘
          │                              │
          │ Bridge                       │ Events
          ▼                              ▼
┌─────────────────┐    Kafka    ┌─────────────────┐
│ Python Services │◄───────────►│ Python Services │
│                 │             │                 │
└─────────────────┘             └─────────────────┘
```

## Message Types

### NATS Messages (Go Services)
- User authentication events
- Event CRUD operations
- Search requests/responses
- Real-time notifications
- WebSocket connection management

### Kafka Messages (Python Services)
- Analytics events
- User interaction tracking
- Recommendation training data
- ML model updates
- Batch processing jobs

## Topics and Subjects

### NATS Subjects
```
events.created
events.updated
events.deleted
users.registered
users.login
users.updated
notifications.send
search.query
websocket.broadcast
payments.completed
```

### Kafka Topics
```
analytics-events
user-interactions
recommendation-events
ml-training-data
model-updates
batch-processing
system-metrics
audit-logs
```

## Getting Started

1. Install message brokers:
   ```bash
   # NATS
   brew install nats-server
   
   # Kafka
   brew install kafka
   ```

2. Start services:
   ```bash
   # Start NATS
   nats-server --config ./nats/nats-server.conf
   
   # Start Kafka
   kafka-server-start /usr/local/etc/kafka/server.properties
   ```

3. Configure services:
   ```bash
   # Set environment variables
   export NATS_URL=nats://localhost:4222
   export KAFKA_BROKERS=localhost:9092
   ```

## Monitoring

- NATS: Web dashboard on http://localhost:8222
- Kafka: Use Kafka Manager or AKHQ for monitoring