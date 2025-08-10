# Events Platform Architecture

This document provides a comprehensive overview of the Events Platform architecture, design decisions, and implementation details.

## 🏗️ Architecture Overview

Events Platform is built using a hybrid microservices architecture that combines the performance and simplicity of Go services with the ML/AI capabilities of Python services. This approach allows us to leverage the strengths of both ecosystems while maintaining system coherence.

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **Go Services**: Handle high-throughput, low-latency operations (API gateway, user management, event operations)
- **Python Services**: Handle ML/AI workloads, data processing, and analytics
- **Clear boundaries**: Each service has a single, well-defined responsibility

### 2. **Polyglot Architecture**
- **Language Selection**: Choose the right language for each problem domain
- **Go**: Network services, APIs, real-time operations
- **Python**: Machine learning, data science, complex analytics

### 3. **Event-Driven Communication**
- **Asynchronous messaging**: Decoupled service communication
- **Event sourcing**: Audit trail and system state reconstruction
- **CQRS**: Separate read and write operations for optimal performance

### 4. **Observability-First**
- **Comprehensive monitoring**: Metrics, logs, and distributed tracing
- **Health checks**: Proactive system health monitoring  
- **Alerting**: Automated incident detection and notification

## 🌐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Frontend Layer                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Web Client    │  │  Mobile Apps    │  │  Admin Panel    │                │
│  │   (React/Vue)   │  │ (iOS/Android)   │  │   (React)       │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                 ┌─────────────┐
                                 │Load Balancer│
                                 │   (Nginx)   │
                                 └─────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Gateway Layer                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        API Gateway (Go)                                    │ │
│  │  • Request Routing     • Authentication    • Rate Limiting                 │ │
│  │  • Request Validation  • CORS Handling     • Metrics Collection           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Core Services Layer                                 │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │User Service │  │Event Service│  │Search Service│ │WebSocket    │           │
│  │    (Go)     │  │    (Go)     │  │    (Go)     │  │Gateway (Go) │           │
│  │             │  │             │  │             │  │             │           │
│  │• Auth       │  │• CRUD Ops   │  │• Full-text  │  │• Real-time  │           │
│  │• Profiles   │  │• Registration│ │• Geospatial │  │• Pub/Sub    │           │
│  │• JWT        │  │• Capacity   │  │• Faceted    │  │• Rooms      │           │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ML/Analytics Layer                                  │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Curation    │  │Recommendation│ │ Analytics   │  │   Message   │           │
│  │ Service     │  │   Engine    │  │  Service    │  │   Bridge    │           │
│  │ (Python)    │  │  (Python)   │  │  (Python)   │  │  (Python)   │           │
│  │             │  │             │  │             │  │             │           │
│  │• Content    │  │• Collaborative│ │• Real-time  │  │• NATS↔Kafka │           │
│  │• Categories │  │• Content-based│ │• Behavioral │  │• Translation│           │
│  │• ML Models  │  │• Hybrid Algo │  │• Predictive │  │• Routing    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                        │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ PostgreSQL  │  │    Redis    │  │Elasticsearch│  │   NATS +    │           │
│  │  (Primary)  │  │   (Cache)   │  │  (Search)   │  │   Kafka     │           │
│  │             │  │             │  │             │  │ (Messaging) │           │
│  │• Events     │  │• Sessions   │  │• Full-text  │  │• Events     │           │
│  │• Users      │  │• Temp Data  │  │• Analytics  │  │• Commands   │           │
│  │• Analytics  │  │• Leaderboard│  │• Logs       │  │• Pub/Sub    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Infrastructure Layer                                 │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Prometheus  │  │   Grafana   │  │Alertmanager │  │   Docker +  │           │
│  │ (Metrics)   │  │(Dashboards) │  │ (Alerts)    │  │ Kubernetes  │           │
│  │             │  │             │  │             │  │(Deployment) │           │
│  │• Collection │  │• Visualization│ │• Routing   │  │• Containers │           │
│  │• Storage    │  │• Alerting   │  │• Notification│ │• Orchestration│          │
│  │• Query      │  │• Analytics  │  │• Escalation │  │• Scaling    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Service Communication Patterns

### 1. **Synchronous Communication (HTTP/gRPC)**

#### **Use Cases**
- Direct user requests (API calls)
- Real-time data retrieval
- Service health checks
- Administrative operations

#### **Implementation**
- **HTTP REST APIs**: Primary synchronous communication
- **JWT Authentication**: Secure service-to-service calls
- **Circuit Breakers**: Prevent cascade failures
- **Retry Logic**: Handle transient failures

```go
// Example: Synchronous service call
func (s *EventService) GetRecommendations(userID int, eventID int) (*RecommendationResponse, error) {
    client := &http.Client{Timeout: 5 * time.Second}
    
    resp, err := client.Get(fmt.Sprintf("%s/recommend/events?user_id=%d&event_id=%d", 
        s.recommendationServiceURL, userID, eventID))
    if err != nil {
        return nil, fmt.Errorf("failed to get recommendations: %w", err)
    }
    defer resp.Body.Close()
    
    var recommendations RecommendationResponse
    if err := json.NewDecoder(resp.Body).Decode(&recommendations); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }
    
    return &recommendations, nil
}
```

### 2. **Asynchronous Communication (Messaging)**

#### **NATS (Go Services)**
- **Subjects**: Hierarchical message routing
- **JetStream**: Persistent messaging and stream processing
- **Request-Reply**: Synchronous-like patterns with async benefits

```go
// Go service publishing to NATS
func (s *EventService) PublishEventCreated(event *Event) error {
    data, err := json.Marshal(EventCreatedEvent{
        EventID:   event.ID,
        Title:     event.Title,
        CreatedBy: event.CreatedBy,
        Timestamp: time.Now(),
    })
    if err != nil {
        return err
    }
    
    return s.natsConn.Publish("events.created", data)
}
```

#### **Kafka (Python Services)**
- **Topics**: Categorized message streams
- **Partitioning**: Scalable message processing
- **Consumer Groups**: Load balancing and fault tolerance

```python
# Python service consuming from Kafka
async def handle_event_created(self, message: EventCreatedMessage):
    """Process event created notification."""
    try:
        # Update recommendation models
        await self.update_event_features(message.event_id)
        
        # Generate initial recommendations
        await self.generate_similar_events(message.event_id)
        
        # Update user preferences
        await self.update_user_preferences(message.created_by)
        
    except Exception as e:
        logger.error(f"Failed to process event created: {e}")
        raise
```

### 3. **Message Bridge (NATS ↔ Kafka)**

The message bridge service translates between NATS and Kafka, enabling seamless communication between Go and Python services.

```python
class MessageBridge:
    """Bidirectional message bridge between NATS and Kafka."""
    
    def __init__(self):
        self.nats = None
        self.kafka_producer = None
        self.kafka_consumer = None
        
    async def start(self):
        """Start the message bridge."""
        await self.connect_nats()
        await self.connect_kafka()
        
        # Start message routing
        await asyncio.gather(
            self.nats_to_kafka(),
            self.kafka_to_nats()
        )
    
    async def nats_to_kafka(self):
        """Route messages from NATS to Kafka."""
        async def message_handler(msg):
            kafka_topic = self.map_nats_to_kafka(msg.subject)
            if kafka_topic:
                await self.kafka_producer.send(kafka_topic, msg.data)
        
        await self.nats.subscribe("events.*", cb=message_handler)
    
    async def kafka_to_nats(self):
        """Route messages from Kafka to NATS."""
        async for message in self.kafka_consumer:
            nats_subject = self.map_kafka_to_nats(message.topic)
            if nats_subject:
                await self.nats.publish(nats_subject, message.value)
```

## 💾 Data Architecture

### 1. **Database Per Service Pattern**

Each service owns its data and database schema, ensuring loose coupling and independent evolution.

#### **PostgreSQL Schemas**

**Events Schema (Event Service)**
```sql
-- Events and related entities
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    location VARCHAR(500),
    capacity INTEGER,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned by date for performance
CREATE TABLE event_registrations (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id),
    user_id BIGINT NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active'
) PARTITION BY RANGE (registered_at);
```

**Users Schema (User Service)**
```sql
-- User accounts and authentication
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JWT token blacklist
CREATE TABLE token_blacklist (
    jti VARCHAR(255) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);
```

**Analytics Schema (Analytics Service)**
```sql
-- High-volume analytics data (partitioned)
CREATE TABLE analytics_events (
    id BIGSERIAL,
    user_id BIGINT,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Pre-aggregated metrics
CREATE TABLE metric_summaries (
    metric_name VARCHAR(100),
    dimensions JSONB,
    value DECIMAL,
    timestamp TIMESTAMPTZ,
    PRIMARY KEY (metric_name, dimensions, timestamp)
) PARTITION BY RANGE (timestamp);
```

### 2. **Caching Strategy (Redis)**

#### **Cache Patterns**
- **Cache-Aside**: Application manages cache
- **Write-Through**: Updates cache and database simultaneously
- **Write-Behind**: Asynchronous cache updates

#### **Cache Keys Structure**
```
user:{user_id}:profile           # User profile data
event:{event_id}:details         # Event information
search:query:{hash}:results      # Search results
recommendations:{user_id}:events # Personalized recommendations
session:{session_id}             # User sessions
ratelimit:{user_id}:{endpoint}   # Rate limiting counters
```

#### **Cache Implementation**
```go
type CacheService struct {
    client *redis.Client
}

func (c *CacheService) GetEvent(eventID int64) (*Event, error) {
    key := fmt.Sprintf("event:%d:details", eventID)
    
    // Try cache first
    cached, err := c.client.Get(context.Background(), key).Result()
    if err == nil {
        var event Event
        if err := json.Unmarshal([]byte(cached), &event); err == nil {
            return &event, nil
        }
    }
    
    // Cache miss - fetch from database
    event, err := c.fetchEventFromDB(eventID)
    if err != nil {
        return nil, err
    }
    
    // Update cache
    eventJSON, _ := json.Marshal(event)
    c.client.Set(context.Background(), key, eventJSON, 30*time.Minute)
    
    return event, nil
}
```

### 3. **Search Architecture (Elasticsearch)**

#### **Index Strategy**
- **events**: Primary event search index
- **users**: User search for admin features
- **analytics**: Log analysis and monitoring

#### **Event Index Mapping**
```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard",
        "search_analyzer": "standard"
      },
      "description": {
        "type": "text",
        "analyzer": "english"
      },
      "location": {
        "type": "geo_point"
      },
      "date": {
        "type": "date"
      },
      "category": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "price": {
        "type": "scaled_float",
        "scaling_factor": 100
      }
    }
  }
}
```

#### **Search Implementation**
```go
func (s *SearchService) SearchEvents(query SearchQuery) (*SearchResults, error) {
    searchRequest := esapi.SearchRequest{
        Index: []string{"events"},
        Body: strings.NewReader(fmt.Sprintf(`{
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": "%s",
                                "fields": ["title^2", "description", "tags"]
                            }
                        }
                    ],
                    "filter": [
                        {
                            "range": {
                                "date": {
                                    "gte": "%s"
                                }
                            }
                        }
                    ]
                }
            },
            "sort": [
                {"_score": {"order": "desc"}},
                {"date": {"order": "asc"}}
            ],
            "from": %d,
            "size": %d
        }`, query.Text, time.Now().Format(time.RFC3339), query.Offset, query.Limit)),
    }
    
    response, err := searchRequest.Do(context.Background(), s.client)
    if err != nil {
        return nil, err
    }
    defer response.Body.Close()
    
    return s.parseSearchResponse(response)
}
```

## 🤖 Machine Learning Architecture

### 1. **Recommendation Engine**

#### **Hybrid Approach**
The recommendation system combines multiple algorithms for optimal results:

1. **Collaborative Filtering**: User-based and item-based recommendations
2. **Content-Based Filtering**: Feature-based similarity matching  
3. **Matrix Factorization**: Dimensionality reduction using NMF
4. **Deep Learning**: Neural collaborative filtering (future enhancement)

#### **Implementation Architecture**
```python
class HybridRecommendationEngine:
    """Hybrid recommendation engine combining multiple approaches."""
    
    def __init__(self):
        self.collaborative_filter = CollaborativeFilteringEngine()
        self.content_filter = ContentBasedEngine()
        self.matrix_factorizer = MatrixFactorizationEngine()
        self.feature_extractor = FeatureExtractor()
        
    async def get_recommendations(self, user_id: int, num_recommendations: int = 10) -> List[Recommendation]:
        """Generate hybrid recommendations for a user."""
        
        # Get recommendations from each engine
        collab_recs = await self.collaborative_filter.recommend(user_id, num_recommendations * 2)
        content_recs = await self.content_filter.recommend(user_id, num_recommendations * 2)
        matrix_recs = await self.matrix_factorizer.recommend(user_id, num_recommendations * 2)
        
        # Combine and weight recommendations
        combined_scores = self.combine_recommendations([
            (collab_recs, 0.4),    # 40% weight
            (content_recs, 0.35),  # 35% weight  
            (matrix_recs, 0.25)    # 25% weight
        ])
        
        # Apply business rules and filters
        filtered_recs = await self.apply_business_rules(user_id, combined_scores)
        
        # Return top N recommendations
        return filtered_recs[:num_recommendations]
```

### 2. **Real-Time Analytics**

#### **Streaming Architecture**
```python
class RealTimeAnalyticsEngine:
    """Real-time analytics with sliding windows and anomaly detection."""
    
    def __init__(self):
        self.windows = {
            'user_activity': SlidingWindow(size=3600),  # 1 hour
            'event_popularity': SlidingWindow(size=1800),  # 30 minutes
            'system_health': SlidingWindow(size=300),   # 5 minutes
        }
        self.anomaly_detector = AnomalyDetector()
        
    async def process_event(self, event: AnalyticsEvent):
        """Process incoming analytics event."""
        
        # Update sliding windows
        for window_name, window in self.windows.items():
            if self.should_process_for_window(event, window_name):
                window.add_event(event)
        
        # Real-time metrics calculation
        metrics = self.calculate_metrics(event)
        await self.emit_metrics(metrics)
        
        # Anomaly detection
        if self.anomaly_detector.is_anomaly(event, metrics):
            await self.handle_anomaly(event, metrics)
```

### 3. **Feature Engineering Pipeline**

#### **Event Features**
```python
class EventFeatureExtractor:
    """Extract features from events for ML models."""
    
    def extract_features(self, event: Event) -> EventFeatures:
        """Extract comprehensive features from an event."""
        
        features = EventFeatures()
        
        # Basic features
        features.category_encoded = self.encode_category(event.category)
        features.time_features = self.extract_time_features(event.date)
        features.location_features = self.extract_location_features(event.location)
        
        # Text features
        features.text_embedding = self.text_embedder.embed(
            f"{event.title} {event.description}"
        )
        
        # Popularity features
        features.popularity_score = await self.calculate_popularity(event.id)
        
        # Historical features
        features.creator_features = await self.get_creator_features(event.created_by)
        
        return features
```

## 📊 Monitoring and Observability

### 1. **Metrics Collection**

#### **Application Metrics**
```go
// Go service metrics
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests processed",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    
    eventRegistrations = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "event_registrations_total", 
            Help: "Total event registrations",
        },
        []string{"event_id", "status"},
    )
)
```

```python
# Python service metrics
from prometheus_client import Counter, Histogram, Gauge

ml_predictions_total = Counter(
    'ml_predictions_total',
    'Total ML predictions made',
    ['model', 'status']
)

ml_model_accuracy = Gauge(
    'ml_model_accuracy',
    'Current model accuracy',
    ['model']
)

recommendation_latency = Histogram(
    'recommendation_latency_seconds',
    'Time to generate recommendations',
    ['algorithm']
)
```

### 2. **Distributed Tracing**

#### **Trace Context Propagation**
```go
func (s *EventService) CreateEvent(ctx context.Context, req *CreateEventRequest) (*Event, error) {
    // Start new span
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("event.title", req.Title),
        attribute.String("event.category", req.Category),
    )
    
    // Validate request
    if err := s.validateRequest(req); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return nil, err
    }
    
    // Save to database
    event, err := s.repository.Create(ctx, req)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "database error")
        return nil, err
    }
    
    // Publish event (async)
    go func() {
        if err := s.publisher.PublishEventCreated(event); err != nil {
            log.Error("Failed to publish event", "error", err)
        }
    }()
    
    span.SetStatus(codes.Ok, "event created")
    return event, nil
}
```

### 3. **Health Checks**

#### **Comprehensive Health Monitoring**
```go
type HealthChecker struct {
    db     *sql.DB
    redis  *redis.Client
    nats   *nats.Conn
    es     *elasticsearch.Client
}

func (h *HealthChecker) CheckHealth() HealthStatus {
    status := HealthStatus{
        Service:   "event-service",
        Status:    "healthy",
        Timestamp: time.Now(),
        Checks:    make(map[string]CheckResult),
    }
    
    // Database check
    if err := h.db.Ping(); err != nil {
        status.Checks["database"] = CheckResult{Status: "unhealthy", Error: err.Error()}
        status.Status = "unhealthy"
    } else {
        status.Checks["database"] = CheckResult{Status: "healthy"}
    }
    
    // Redis check
    if err := h.redis.Ping(context.Background()).Err(); err != nil {
        status.Checks["redis"] = CheckResult{Status: "unhealthy", Error: err.Error()}
        status.Status = "degraded" // Redis failure is not critical
    } else {
        status.Checks["redis"] = CheckResult{Status: "healthy"}
    }
    
    // NATS check
    if !h.nats.IsConnected() {
        status.Checks["nats"] = CheckResult{Status: "unhealthy", Error: "not connected"}
        status.Status = "unhealthy"
    } else {
        status.Checks["nats"] = CheckResult{Status: "healthy"}
    }
    
    return status
}
```

## 🔐 Security Architecture

### 1. **Authentication & Authorization**

#### **JWT Token Structure**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user123",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["events:read", "events:create"],
    "iat": 1640995200,
    "exp": 1641081600,
    "jti": "token-unique-id"
  }
}
```

#### **Permission System**
```go
type Permission string

const (
    PermissionEventsRead   Permission = "events:read"
    PermissionEventsCreate Permission = "events:create"
    PermissionEventsUpdate Permission = "events:update"
    PermissionEventsDelete Permission = "events:delete"
    PermissionUsersManage  Permission = "users:manage"
    PermissionAdminAccess  Permission = "admin:access"
)

func (s *AuthService) HasPermission(userID int64, permission Permission) bool {
    user, err := s.userRepo.GetByID(userID)
    if err != nil {
        return false
    }
    
    return contains(user.Permissions, permission)
}
```

### 2. **Input Validation**

#### **Request Validation**
```go
type CreateEventRequest struct {
    Title       string    `json:"title" validate:"required,min=3,max=255"`
    Description string    `json:"description" validate:"required,max=5000"`
    Date        time.Time `json:"date" validate:"required,future"`
    Location    string    `json:"location" validate:"required,max=500"`
    Capacity    int       `json:"capacity" validate:"required,min=1,max=100000"`
    Category    string    `json:"category" validate:"required,oneof=tech business arts sports"`
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
    var req CreateEventRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, ErrorResponse{Error: "Invalid request format"})
        return
    }
    
    if err := h.validator.Struct(&req); err != nil {
        c.JSON(400, ValidationErrorResponse{
            Error:   "Validation failed",
            Details: formatValidationErrors(err),
        })
        return
    }
    
    // Process valid request...
}
```

### 3. **Rate Limiting**

#### **Multi-Level Rate Limiting**
```go
type RateLimiter struct {
    globalLimiter  *rate.Limiter      // Overall system limit
    userLimiters   sync.Map           // Per-user limits
    ipLimiters     sync.Map           // Per-IP limits
}

func (rl *RateLimiter) Allow(userID int64, ip string) bool {
    // Check global limit
    if !rl.globalLimiter.Allow() {
        return false
    }
    
    // Check per-user limit
    userLimiter := rl.getUserLimiter(userID)
    if !userLimiter.Allow() {
        return false
    }
    
    // Check per-IP limit
    ipLimiter := rl.getIPLimiter(ip)
    return ipLimiter.Allow()
}
```

## 🚀 Deployment Architecture

### 1. **Container Strategy**

#### **Multi-Stage Docker Builds**
```dockerfile
# Go services - optimized build
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o app ./cmd/service

FROM alpine:3.18 AS runtime
RUN apk add --no-cache ca-certificates
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /build/app /app/
USER appuser
ENTRYPOINT ["/app/app"]
```

### 2. **Kubernetes Deployment**

#### **Service Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-service
  namespace: events-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-service
  template:
    metadata:
      labels:
        app: event-service
    spec:
      containers:
      - name: event-service
        image: events-platform/event-service:v1.0.0
        ports:
        - containerPort: 8082
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 8082
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8082
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 3. **Auto-Scaling**

#### **Horizontal Pod Autoscaler**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: event-service-hpa
  namespace: events-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: event-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🔄 Disaster Recovery

### 1. **Backup Strategy**

#### **Database Backups**
```bash
# Automated PostgreSQL backup
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql.gz"

# Create backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://events-platform-backups/postgres/

# Retain only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 2. **Recovery Procedures**

#### **Service Recovery**
```yaml
# Kubernetes Job for database recovery
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-restore
  namespace: events-platform
spec:
  template:
    spec:
      containers:
      - name: restore
        image: postgres:15
        command:
        - /bin/bash
        - -c
        - |
          # Download backup from S3
          aws s3 cp s3://events-platform-backups/postgres/latest.sql.gz /tmp/
          
          # Restore database
          gunzip -c /tmp/latest.sql.gz | psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
        env:
        - name: POSTGRES_HOST
          value: "postgres"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_DB
          value: "events_platform"
      restartPolicy: Never
```

## 📈 Performance Optimization

### 1. **Database Optimization**

#### **Query Optimization**
```sql
-- Optimized event search query with proper indexing
EXPLAIN ANALYZE
SELECT e.*, u.name as creator_name
FROM events e
JOIN users u ON e.created_by = u.id
WHERE e.date >= NOW()
  AND e.location_point <-> ST_Point($1, $2) < 50000  -- Within 50km
  AND e.category = ANY($3)
ORDER BY e.date ASC, e.created_at DESC
LIMIT 20;

-- Supporting indexes
CREATE INDEX CONCURRENTLY idx_events_date_category 
ON events(date, category) WHERE date >= NOW();

CREATE INDEX CONCURRENTLY idx_events_location_gist 
ON events USING gist(location_point);
```

### 2. **Caching Strategies**

#### **Multi-Level Caching**
```go
type MultiLevelCache struct {
    l1 *sync.Map          // In-memory cache
    l2 *redis.Client      // Redis cache  
    l3 DatabaseRepository // Database (fallback)
}

func (c *MultiLevelCache) GetEvent(eventID int64) (*Event, error) {
    // L1 Cache (in-memory)
    if event, ok := c.l1.Load(eventID); ok {
        return event.(*Event), nil
    }
    
    // L2 Cache (Redis)
    if event, err := c.getFromRedis(eventID); err == nil {
        c.l1.Store(eventID, event) // Populate L1
        return event, nil
    }
    
    // L3 Cache (Database)
    event, err := c.l3.GetEvent(eventID)
    if err != nil {
        return nil, err
    }
    
    // Populate caches
    c.l1.Store(eventID, event)
    c.setInRedis(eventID, event)
    
    return event, nil
}
```

## 📋 Architecture Decision Records (ADRs)

### ADR-001: Hybrid Go/Python Architecture

**Status**: Accepted

**Context**: Need to balance performance for API operations with ML/AI capabilities.

**Decision**: Use Go for high-performance services (APIs, real-time) and Python for ML/analytics services.

**Consequences**:
- **Positive**: Optimal language for each domain, better performance, rich ML ecosystem
- **Negative**: Increased complexity, multiple deployment pipelines, cross-language communication

### ADR-002: Message Queue Selection

**Status**: Accepted

**Context**: Need messaging system for microservices communication.

**Decision**: Use NATS for Go services and Kafka for Python services with a bridge.

**Consequences**:
- **Positive**: NATS optimal for Go, Kafka optimal for Python analytics, message bridge enables integration
- **Negative**: Additional complexity, need to maintain bridge service

### ADR-003: Database Strategy

**Status**: Accepted

**Context**: Need to balance consistency, performance, and scalability.

**Decision**: PostgreSQL as primary database with service-specific schemas, Redis for caching.

**Consequences**:
- **Positive**: ACID compliance, JSON support, excellent performance, proven scalability
- **Negative**: Single database dependency, potential scaling challenges

This architecture provides a robust, scalable, and maintainable foundation for the Events Platform while leveraging the strengths of both Go and Python ecosystems.