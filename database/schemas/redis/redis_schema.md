# Redis Schema and Key Patterns

Redis is used for caching, session storage, and real-time data in the Events Platform.

## Key Naming Convention

All keys follow the pattern: `{service}:{entity}:{identifier}:{field?}`

Examples:
- `user:session:123e4567-e89b-12d3-a456-426614174000`
- `event:cache:550e8400-e29b-41d4-a716-446655440000`
- `search:popular:queries`
- `rate_limit:user:123:api_calls`

## Key Patterns by Service

### User Service
```
# User sessions
user:session:{session_id} -> Hash
  - user_id: UUID
  - email: string
  - role: string
  - created_at: timestamp
  - last_activity: timestamp
  - ip_address: string
  - user_agent: string

# User preferences cache
user:preferences:{user_id} -> Hash
  - preferred_categories: JSON array
  - preferred_locations: JSON array
  - interests: JSON array
  - price_range_min: number
  - price_range_max: number
  - notification_settings: JSON

# Password reset tokens
user:password_reset:{token} -> String (user_id)
  TTL: 1 hour

# Email verification tokens
user:email_verification:{token} -> String (user_id)
  TTL: 24 hours

# Rate limiting
rate_limit:user:{user_id}:{endpoint} -> String (request_count)
  TTL: varies by endpoint (1 minute to 1 hour)
```

### Event Service
```
# Event cache (full event data)
event:cache:{event_id} -> Hash
  - title: string
  - description: string
  - start_time: timestamp
  - end_time: timestamp
  - venue_name: string
  - is_virtual: boolean
  - status: string
  - cached_at: timestamp
  TTL: 1 hour

# Event statistics
event:stats:{event_id} -> Hash
  - view_count: number
  - registration_count: number
  - favorite_count: number
  - share_count: number
  - last_updated: timestamp
  TTL: 5 minutes

# Event availability
event:availability:{event_id} -> Hash
  - max_attendees: number
  - current_registrations: number
  - available_spots: number
  - is_full: boolean
  TTL: 2 minutes

# Featured events
events:featured -> List (event_ids)
  TTL: 1 hour

# Events by category
events:category:{category_id} -> Sorted Set (event_id -> popularity_score)
  TTL: 30 minutes

# Trending events
events:trending -> Sorted Set (event_id -> trending_score)
  TTL: 15 minutes
```

### Search Service
```
# Popular search queries
search:popular:queries -> Sorted Set (query -> search_count)
  TTL: 1 day

# Recent searches by user
search:recent:{user_id} -> List (queries)
  TTL: 7 days
  Max length: 20

# Search autocomplete
search:autocomplete:{prefix} -> Set (suggestions)
  TTL: 4 hours

# Search results cache
search:results:{query_hash} -> String (JSON results)
  TTL: 30 minutes

# Search filters cache
search:filters:categories -> Set (category names)
search:filters:locations -> Set (location names)
search:filters:tags -> Set (tag names)
  TTL: 2 hours
```

### Analytics Service
```
# Real-time metrics
analytics:metrics:current -> Hash
  - active_users: number
  - events_per_minute: number
  - registrations_per_hour: number
  - last_updated: timestamp
  TTL: 1 minute

# User activity tracking
analytics:activity:{user_id} -> List (activity_events)
  TTL: 24 hours
  Max length: 1000

# Real-time counters
analytics:counters:{metric_name}:{time_window} -> String (count)
  TTL: varies (5 minutes to 1 hour)

# Session tracking
analytics:session:{session_id} -> Hash
  - user_id: UUID
  - start_time: timestamp
  - last_activity: timestamp
  - page_views: number
  - events_viewed: Set
  TTL: 30 minutes after last activity

# A/B test assignments
ab_test:{experiment_id}:{user_id} -> String (variant)
  TTL: experiment duration
```

### Recommendation Engine
```
# User recommendations cache
recommendations:{user_id} -> String (JSON array)
  TTL: 4 hours

# Event similarity cache
event:similarity:{event_id} -> Sorted Set (similar_event_id -> similarity_score)
  TTL: 24 hours

# User interaction cache (for real-time recommendations)
user:interactions:{user_id} -> List (interaction_events)
  TTL: 7 days
  Max length: 500

# Model cache
ml:model:{model_name}:version -> String (version_number)
ml:model:{model_name}:data -> Binary (model_data)
  TTL: varies
```

### WebSocket Gateway
```
# Active connections
websocket:connections -> Set (connection_ids)

# User connection mapping
websocket:user:{user_id} -> Set (connection_ids)
  TTL: until disconnect

# Room subscriptions
websocket:room:{room_id} -> Set (connection_ids)
  TTL: until last member leaves

# Message queues for offline users
websocket:queue:{user_id} -> List (messages)
  TTL: 1 hour
  Max length: 100
```

## Data Types Used

### Hash
- User sessions
- Event cache
- Metrics and counters
- User preferences

### Set
- Connection tracking
- Search suggestions
- Event attendees
- User roles

### Sorted Set
- Popular/trending items
- Leaderboards
- Time-based rankings
- Search results

### List
- Recent activities
- Message queues
- Activity logs
- Search history

### String
- Simple counters
- Tokens
- JSON cache
- Binary data

## Memory Optimization

### Key Expiration
- Session data: 30 minutes - 24 hours
- Cache data: 5 minutes - 4 hours
- Temporary tokens: 1 hour - 24 hours
- Activity logs: 24 hours - 7 days

### Data Compression
- Large JSON objects are compressed
- Binary data uses Redis binary strings
- Use appropriate data structures (Sorted Set vs List)

### Cleanup Strategies
- Automatic TTL expiration
- Batch cleanup jobs for large datasets
- LRU eviction policy for memory pressure

## Monitoring and Alerts

### Key Metrics
- Memory usage per key pattern
- Hit/miss ratios for cache keys
- Key expiration rates
- Connection counts

### Alerts
- Memory usage > 80%
- Cache hit ratio < 70%
- Connection count > 1000
- Slow query detection

## Configuration

### Redis Instance Settings
```
# Memory
maxmemory 4gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Performance
tcp-keepalive 300
timeout 300
```

### Connection Pools
- Go services: 100 max connections
- Python services: 50 max connections
- Connection timeout: 30 seconds
- Read timeout: 10 seconds
- Write timeout: 10 seconds