# Events Platform API Reference

Complete API documentation for the Events Platform microservices architecture.

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Common Patterns](#common-patterns)
- [API Gateway](#api-gateway)
- [User Service](#user-service)
- [Event Service](#event-service)
- [Search Service](#search-service)
- [WebSocket Gateway](#websocket-gateway)
- [Recommendation Engine](#recommendation-engine)
- [Analytics Service](#analytics-service)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [SDKs & Examples](#sdks--examples)

## 🌐 Overview

The Events Platform API follows RESTful principles with JSON request/response bodies. All endpoints return consistent response formats with proper HTTP status codes.

### Base URLs

- **Development**: `http://localhost:8080`
- **Staging**: `https://api-staging.events-platform.com`
- **Production**: `https://api.events-platform.com`

### API Version

Current version: **v1**

All endpoints are prefixed with `/api/v1` unless otherwise specified.

## 🔐 Authentication

### JWT Token Authentication

Most endpoints require authentication via JWT tokens passed in the Authorization header:

```http
Authorization: Bearer <jwt-token>
```

### Getting a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600,
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

### Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_here"
}
```

## 🔄 Common Patterns

### Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "data": {}, // Response data (success only)
  "error": {}, // Error details (error only)
  "message": "Human readable message",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Pagination

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Filtering and Sorting

```http
GET /api/v1/events?category=tech&location=san-francisco&sort=date&order=asc&page=1&limit=20
```

## 🚪 API Gateway

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "user-service": "healthy",
      "event-service": "healthy",
      "search-service": "healthy"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Metrics

```http
GET /metrics
```

Returns Prometheus metrics in text format.

## 👤 User Service

### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1-555-123-4567",
  "preferences": {
    "categories": ["technology", "business"],
    "location": "San Francisco, CA",
    "notifications": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1-555-123-4567",
      "verified": false,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully. Please check your email to verify your account."
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "remember_me": true
}
```

### Get User Profile

```http
GET /api/v1/users/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1-555-123-4567",
      "avatar": "https://cdn.events-platform.com/avatars/123.jpg",
      "bio": "Tech enthusiast and event organizer",
      "location": "San Francisco, CA",
      "preferences": {
        "categories": ["technology", "business"],
        "notifications": {
          "email": true,
          "push": true,
          "sms": false
        }
      },
      "stats": {
        "events_created": 5,
        "events_attended": 23,
        "events_registered": 8
      },
      "verified": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  }
}
```

### Update User Profile

```http
PUT /api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "bio": "Updated bio",
  "location": "New York, NY",
  "preferences": {
    "categories": ["technology", "business", "networking"],
    "notifications": {
      "email": true,
      "push": false,
      "sms": true
    }
  }
}
```

### Change Password

```http
POST /api/v1/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "old_password",
  "new_password": "new_password123",
  "confirm_password": "new_password123"
}
```

### Forgot Password

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "password_reset_token",
  "password": "new_password123",
  "confirm_password": "new_password123"
}
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### Delete Account

```http
DELETE /api/v1/users/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "user_password",
  "reason": "No longer need the service"
}
```

## 🎫 Event Service

### List Events

```http
GET /api/v1/events?page=1&limit=20&category=tech&location=san-francisco&date_from=2024-01-01&date_to=2024-12-31&sort=date&order=asc
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `category` (string): Event category filter
- `location` (string): Location filter
- `date_from` (string): Start date filter (ISO 8601)
- `date_to` (string): End date filter (ISO 8601)
- `sort` (string): Sort field (date, title, created_at, popularity)
- `order` (string): Sort order (asc, desc)
- `price_min` (number): Minimum price filter
- `price_max` (number): Maximum price filter
- `status` (string): Event status (upcoming, ongoing, completed, cancelled)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 456,
        "title": "Tech Conference 2024",
        "description": "Annual technology conference featuring the latest innovations",
        "category": "technology",
        "tags": ["tech", "innovation", "networking"],
        "date": "2024-03-15T09:00:00Z",
        "end_date": "2024-03-15T18:00:00Z",
        "timezone": "America/Los_Angeles",
        "location": {
          "name": "Moscone Center",
          "address": "747 Howard St, San Francisco, CA 94103",
          "coordinates": {
            "lat": 37.7842,
            "lng": -122.4016
          }
        },
        "capacity": 500,
        "registered_count": 234,
        "available_spots": 266,
        "price": {
          "currency": "USD",
          "amount": 99.99,
          "early_bird": 79.99,
          "early_bird_until": "2024-02-15T23:59:59Z"
        },
        "organizer": {
          "id": 789,
          "name": "Tech Events Inc",
          "avatar": "https://cdn.events-platform.com/organizers/789.jpg"
        },
        "images": [
          "https://cdn.events-platform.com/events/456/main.jpg",
          "https://cdn.events-platform.com/events/456/gallery1.jpg"
        ],
        "status": "upcoming",
        "created_at": "2024-01-01T12:00:00Z",
        "updated_at": "2024-01-10T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Get Event Details

```http
GET /api/v1/events/{event_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": 456,
      "title": "Tech Conference 2024",
      "description": "Comprehensive description of the event...",
      "agenda": [
        {
          "time": "09:00",
          "title": "Registration & Coffee",
          "description": "Welcome reception and networking",
          "speaker": null
        },
        {
          "time": "10:00",
          "title": "Opening Keynote",
          "description": "Future of Technology",
          "speaker": {
            "name": "Jane Smith",
            "bio": "CTO at TechCorp",
            "avatar": "https://cdn.events-platform.com/speakers/jane.jpg"
          }
        }
      ],
      "requirements": [
        "Bring your laptop",
        "Basic programming knowledge recommended"
      ],
      "registration_fields": [
        {
          "name": "dietary_restrictions",
          "type": "text",
          "required": false,
          "label": "Dietary Restrictions"
        },
        {
          "name": "t_shirt_size",
          "type": "select",
          "required": true,
          "label": "T-Shirt Size",
          "options": ["S", "M", "L", "XL", "XXL"]
        }
      ],
      "cancellation_policy": "Free cancellation up to 48 hours before the event",
      "refund_policy": "Full refund available up to 7 days before the event",
      // ... other fields from list response
    }
  }
}
```

### Create Event

```http
POST /api/v1/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Tech Meetup",
  "description": "Monthly tech meetup for developers",
  "category": "technology",
  "tags": ["tech", "networking", "developers"],
  "date": "2024-02-15T19:00:00Z",
  "end_date": "2024-02-15T22:00:00Z",
  "timezone": "America/Los_Angeles",
  "location": {
    "name": "WeWork",
    "address": "123 Main St, San Francisco, CA 94105",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  },
  "capacity": 50,
  "price": {
    "currency": "USD",
    "amount": 0,
    "type": "free"
  },
  "images": [
    "https://cdn.events-platform.com/uploads/temp/image1.jpg"
  ],
  "registration_required": true,
  "public": true
}
```

### Update Event

```http
PUT /api/v1/events/{event_id}
Authorization: Bearer <token>
Content-Type: application/json
```

### Delete Event

```http
DELETE /api/v1/events/{event_id}
Authorization: Bearer <token>
```

### Register for Event

```http
POST /api/v1/events/{event_id}/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "registration_data": {
    "dietary_restrictions": "Vegetarian",
    "t_shirt_size": "L"
  },
  "payment_method": "stripe_token_here", // If paid event
  "promo_code": "EARLYBIRD2024" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg_123456",
      "event_id": 456,
      "user_id": 123,
      "status": "confirmed",
      "registration_data": {
        "dietary_restrictions": "Vegetarian",
        "t_shirt_size": "L"
      },
      "payment": {
        "amount": 79.99,
        "currency": "USD",
        "status": "paid",
        "transaction_id": "txn_987654"
      },
      "ticket": {
        "qr_code": "https://api.events-platform.com/tickets/reg_123456/qr",
        "download_url": "https://api.events-platform.com/tickets/reg_123456/pdf"
      },
      "registered_at": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Successfully registered for Tech Conference 2024"
}
```

### Cancel Registration

```http
DELETE /api/v1/events/{event_id}/register
Authorization: Bearer <token>
```

### Get User Registrations

```http
GET /api/v1/users/registrations?status=upcoming&page=1&limit=20
Authorization: Bearer <token>
```

### Get Event Attendees (Organizer Only)

```http
GET /api/v1/events/{event_id}/attendees
Authorization: Bearer <token>
```

### Update Event Status

```http
PATCH /api/v1/events/{event_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "cancelled",
  "reason": "Venue unavailable"
}
```

## 🔍 Search Service

### Search Events

```http
GET /api/v1/search/events?q=technology conference&location=san francisco&date_from=2024-01-01&category=tech&price_max=100&page=1&limit=20
```

**Query Parameters:**
- `q` (string): Search query (searches title, description, tags)
- `location` (string): Location search
- `category` (string): Category filter
- `date_from/date_to` (string): Date range
- `price_min/price_max` (number): Price range
- `radius` (number): Search radius in miles (when lat/lng provided)
- `lat/lng` (number): Geographic coordinates
- `sort` (string): relevance, date, price, popularity
- `page/limit` (number): Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 456,
        "title": "Tech Conference 2024",
        "description": "Annual technology conference...",
        "score": 0.95,
        "highlighted": {
          "title": "<mark>Tech</mark> <mark>Conference</mark> 2024",
          "description": "Annual <mark>technology</mark> <mark>conference</mark>..."
        },
        // ... other event fields
      }
    ],
    "facets": {
      "categories": [
        {"name": "technology", "count": 45},
        {"name": "business", "count": 23},
        {"name": "networking", "count": 18}
      ],
      "locations": [
        {"name": "San Francisco, CA", "count": 34},
        {"name": "New York, NY", "count": 28}
      ],
      "price_ranges": [
        {"range": "Free", "count": 67},
        {"range": "$1-$50", "count": 34},
        {"range": "$51-$100", "count": 23}
      ]
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 89,
      "total_pages": 5
    }
  }
}
```

### Search Suggestions

```http
GET /api/v1/search/suggest?q=tech&type=events
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "tech conference",
      "technology meetup",
      "tech networking",
      "tech workshop"
    ]
  }
}
```

### Advanced Search

```http
POST /api/v1/search/advanced
Content-Type: application/json

{
  "query": {
    "text": "machine learning",
    "location": "San Francisco",
    "radius": 25
  },
  "filters": {
    "categories": ["technology", "education"],
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    },
    "price_range": {
      "min": 0,
      "max": 200
    },
    "capacity_range": {
      "min": 50,
      "max": 1000
    },
    "features": ["wheelchair_accessible", "live_streaming"]
  },
  "sort": {
    "field": "relevance",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Search Analytics

```http
GET /api/v1/search/analytics?period=7d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "top_queries": [
      {"query": "tech conference", "count": 145},
      {"query": "networking event", "count": 89},
      {"query": "workshop", "count": 67}
    ],
    "search_trends": [
      {"date": "2024-01-15", "searches": 234},
      {"date": "2024-01-16", "searches": 267}
    ],
    "popular_filters": [
      {"filter": "category:technology", "usage": 0.78},
      {"filter": "price:free", "usage": 0.45}
    ]
  }
}
```

## 🔌 WebSocket Gateway

### Connection

```javascript
const ws = new WebSocket('wss://ws.events-platform.com/ws');

// Authentication
ws.onopen = function() {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'jwt_token_here'
  }));
};
```

### Subscribe to Event Updates

```javascript
// Subscribe to specific event
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'event_updates',
  event_id: 456
}));

// Subscribe to user notifications
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'user_notifications',
  user_id: 123
}));
```

### Message Types

#### Event Registration Update
```json
{
  "type": "event_registration_update",
  "event_id": 456,
  "registered_count": 235,
  "available_spots": 265,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Event Status Change
```json
{
  "type": "event_status_change",
  "event_id": 456,
  "old_status": "upcoming",
  "new_status": "live",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### User Notification
```json
{
  "type": "notification",
  "user_id": 123,
  "notification": {
    "id": "notif_789",
    "title": "Event Starting Soon",
    "message": "Tech Conference 2024 starts in 30 minutes",
    "type": "event_reminder",
    "event_id": 456,
    "action_url": "https://events-platform.com/events/456"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Room Management

```javascript
// Join event chat room
ws.send(JSON.stringify({
  type: 'join_room',
  room: 'event_456_chat'
}));

// Send message to room
ws.send(JSON.stringify({
  type: 'room_message',
  room: 'event_456_chat',
  message: 'Hello everyone!'
}));
```

## 🤖 Recommendation Engine

### Get Personalized Recommendations

```http
GET /api/v1/recommendations/events?user_id=123&limit=10&algorithm=hybrid
Authorization: Bearer <token>
```

**Query Parameters:**
- `user_id` (integer): User ID (optional if authenticated)
- `limit` (integer): Number of recommendations (default: 10, max: 50)
- `algorithm` (string): collaborative, content, hybrid (default: hybrid)
- `category` (string): Filter by category
- `location` (string): Filter by location

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "event": {
          "id": 789,
          "title": "AI & Machine Learning Summit",
          "category": "technology",
          "date": "2024-02-20T09:00:00Z",
          "location": "San Francisco, CA",
          "price": 149.99,
          // ... other event fields
        },
        "score": 0.89,
        "reasons": [
          "Based on your interest in technology events",
          "Similar to Tech Conference 2024 which you registered for",
          "Popular among users with similar preferences"
        ],
        "algorithm_details": {
          "collaborative_score": 0.85,
          "content_score": 0.92,
          "popularity_score": 0.78,
          "final_score": 0.89
        }
      }
    ],
    "metadata": {
      "algorithm": "hybrid",
      "user_profile": {
        "categories": ["technology", "business"],
        "location": "San Francisco, CA",
        "activity_level": "high"
      },
      "generated_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Get Similar Events

```http
GET /api/v1/recommendations/events/{event_id}/similar?limit=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "similar_events": [
      {
        "event": {
          "id": 890,
          "title": "Developer Workshop Series",
          // ... event details
        },
        "similarity_score": 0.76,
        "similarity_factors": [
          "Same category (technology)",
          "Similar location (San Francisco Bay Area)",
          "Similar audience profile",
          "Related tags (programming, development)"
        ]
      }
    ],
    "reference_event": {
      "id": 456,
      "title": "Tech Conference 2024"
    }
  }
}
```

### Get Trending Events

```http
GET /api/v1/recommendations/trending?category=tech&location=san-francisco&period=7d&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trending_events": [
      {
        "event": {
          "id": 567,
          "title": "Startup Pitch Competition",
          // ... event details
        },
        "trend_score": 0.94,
        "metrics": {
          "registration_velocity": 45.2,  // registrations per day
          "search_volume": 234,           // recent searches
          "social_mentions": 89,          // social media mentions
          "view_growth": 1.34             // view growth rate
        },
        "trend_period": "7d"
      }
    ],
    "period": "7d",
    "location": "san-francisco",
    "category": "technology"
  }
}
```

### Update User Preferences

```http
POST /api/v1/recommendations/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "categories": ["technology", "business", "networking"],
  "locations": ["San Francisco, CA", "New York, NY"],
  "price_range": {
    "min": 0,
    "max": 200
  },
  "event_types": ["conference", "workshop", "meetup"],
  "schedule_preferences": {
    "weekdays": true,
    "weekends": true,
    "time_preferences": ["morning", "evening"]
  },
  "notification_frequency": "weekly"
}
```

### Feedback on Recommendations

```http
POST /api/v1/recommendations/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "recommendation_id": "rec_123456",
  "event_id": 789,
  "feedback": "liked",  // liked, disliked, not_interested, registered
  "reason": "Relevant to my interests"
}
```

## 📊 Analytics Service

### Event Analytics

```http
GET /api/v1/analytics/events/{event_id}?period=30d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": 456,
      "title": "Tech Conference 2024"
    },
    "metrics": {
      "views": {
        "total": 2345,
        "unique": 1876,
        "trend": 0.15  // 15% increase
      },
      "registrations": {
        "total": 234,
        "conversion_rate": 0.125,  // 12.5% from views
        "timeline": [
          {"date": "2024-01-01", "count": 5},
          {"date": "2024-01-02", "count": 12}
        ]
      },
      "engagement": {
        "social_shares": 89,
        "comments": 34,
        "favorites": 156,
        "average_session_duration": 180  // seconds
      },
      "demographics": {
        "age_groups": [
          {"range": "25-34", "count": 89, "percentage": 0.38},
          {"range": "35-44", "count": 67, "percentage": 0.29}
        ],
        "locations": [
          {"city": "San Francisco, CA", "count": 145},
          {"city": "New York, NY", "count": 67}
        ],
        "industries": [
          {"name": "Technology", "count": 123},
          {"name": "Finance", "count": 45}
        ]
      }
    },
    "period": "30d",
    "generated_at": "2024-01-15T10:30:00Z"
  }
}
```

### User Behavior Analytics

```http
GET /api/v1/analytics/users/{user_id}/behavior?period=90d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_profile": {
      "id": 123,
      "activity_level": "high",
      "engagement_score": 0.78
    },
    "behavior_patterns": {
      "session_frequency": 8.5,  // sessions per week
      "average_session_duration": 420,  // seconds
      "preferred_times": [
        {"day": "Tuesday", "hour": 19, "frequency": 0.15},
        {"day": "Wednesday", "hour": 14, "frequency": 0.12}
      ],
      "device_usage": [
        {"type": "mobile", "percentage": 0.65},
        {"type": "desktop", "percentage": 0.35}
      ]
    },
    "interests": {
      "categories": [
        {"name": "technology", "score": 0.89},
        {"name": "business", "score": 0.67}
      ],
      "tags": [
        {"name": "machine-learning", "score": 0.82},
        {"name": "networking", "score": 0.75}
      ]
    },
    "conversion_metrics": {
      "registration_rate": 0.23,  // 23% of viewed events
      "attendance_rate": 0.87,    // 87% of registered events
      "repeat_rate": 0.45         // 45% return for similar events
    }
  }
}
```

### Platform Analytics Dashboard

```http
GET /api/v1/analytics/dashboard?period=30d&granularity=daily
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_events": 1234,
      "active_users": 5678,
      "total_registrations": 9876,
      "revenue": {
        "amount": 125450.50,
        "currency": "USD",
        "growth": 0.18  // 18% growth
      }
    },
    "trends": {
      "daily_active_users": [
        {"date": "2024-01-01", "count": 456},
        {"date": "2024-01-02", "count": 489}
      ],
      "event_creation": [
        {"date": "2024-01-01", "count": 12},
        {"date": "2024-01-02", "count": 15}
      ],
      "registration_conversion": [
        {"date": "2024-01-01", "rate": 0.125},
        {"date": "2024-01-02", "rate": 0.132}
      ]
    },
    "top_performers": {
      "events": [
        {
          "id": 456,
          "title": "Tech Conference 2024",
          "registrations": 234,
          "revenue": 23456.78
        }
      ],
      "organizers": [
        {
          "id": 789,
          "name": "Tech Events Inc",
          "events_created": 5,
          "total_registrations": 567
        }
      ],
      "categories": [
        {"name": "technology", "events": 145, "registrations": 3456},
        {"name": "business", "events": 89, "registrations": 2134}
      ]
    }
  }
}
```

### Custom Analytics Query

```http
POST /api/v1/analytics/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "metrics": ["registrations", "views", "revenue"],
  "dimensions": ["category", "location", "date"],
  "filters": {
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "category": ["technology", "business"],
    "location": "San Francisco, CA"
  },
  "granularity": "daily",
  "sort": [
    {"field": "registrations", "order": "desc"}
  ],
  "limit": 100
}
```

## ❌ Error Codes

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Application Error Codes

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": {
      "field": "email",
      "reason": "Invalid email format",
      "value": "invalid-email"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

#### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid credentials
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `DUPLICATE_RESOURCE`: Resource already exists
- `CAPACITY_EXCEEDED`: Event capacity full
- `PAYMENT_REQUIRED`: Payment needed for paid event
- `PAYMENT_FAILED`: Payment processing failed
- `EVENT_CANCELLED`: Event has been cancelled
- `REGISTRATION_CLOSED`: Registration period ended
- `RATE_LIMIT_EXCEEDED`: Too many requests

## 🚦 Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642281600
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| Event Creation | 20 requests | 1 hour |
| Search | 100 requests | 1 minute |
| General API | 1000 requests | 1 hour |
| WebSocket | 50 connections | Per user |

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "window": 3600,
      "retry_after": 300
    }
  }
}
```

## 📱 SDKs & Examples

### JavaScript/TypeScript SDK

```bash
npm install @events-platform/sdk
```

```javascript
import { EventsClient } from '@events-platform/sdk';

const client = new EventsClient({
  apiUrl: 'https://api.events-platform.com',
  apiKey: 'your-api-key'
});

// Authenticate
await client.auth.login('user@example.com', 'password');

// List events
const events = await client.events.list({
  category: 'technology',
  location: 'San Francisco',
  limit: 20
});

// Create event
const newEvent = await client.events.create({
  title: 'New Event',
  description: 'Event description',
  date: '2024-03-15T19:00:00Z',
  location: {
    name: 'Venue Name',
    address: 'Address'
  }
});

// Register for event
await client.events.register(eventId, {
  registration_data: {
    dietary_restrictions: 'None'
  }
});
```

### Python SDK

```bash
pip install events-platform-sdk
```

```python
from events_platform import EventsClient

client = EventsClient(
    api_url='https://api.events-platform.com',
    api_key='your-api-key'
)

# Authenticate
client.auth.login('user@example.com', 'password')

# List events
events = client.events.list(
    category='technology',
    location='San Francisco',
    limit=20
)

# Get recommendations
recommendations = client.recommendations.get_personalized(
    user_id=123,
    limit=10,
    algorithm='hybrid'
)
```

### cURL Examples

#### Create Event with cURL
```bash
curl -X POST https://api.events-platform.com/api/v1/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Meetup",
    "description": "Monthly tech meetup",
    "category": "technology",
    "date": "2024-03-15T19:00:00Z",
    "location": {
      "name": "WeWork",
      "address": "123 Main St, San Francisco, CA"
    },
    "capacity": 50,
    "price": {
      "amount": 0,
      "currency": "USD",
      "type": "free"
    }
  }'
```

#### Search Events with cURL
```bash
curl -G "https://api.events-platform.com/api/v1/search/events" \
  -d "q=technology conference" \
  -d "location=san francisco" \
  -d "limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

This API reference provides comprehensive documentation for all Events Platform endpoints. For additional examples, interactive documentation, and SDKs in other languages, visit our [Developer Portal](https://developers.events-platform.com).