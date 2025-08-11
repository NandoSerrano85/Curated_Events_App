# Events Platform Development Guide

Comprehensive development guide for contributors and developers working on the Events Platform.

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Go Services Development](#go-services-development)
- [Python Services Development](#python-services-development)
- [Database Development](#database-development)
- [Testing Guidelines](#testing-guidelines)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)
- [Code Style & Standards](#code-style--standards)
- [Development Tools](#development-tools)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## 🚀 Development Environment Setup

### Prerequisites

```bash
# Required tools
- Docker 20.0+
- Docker Compose 2.0+
- Go 1.21+
- Python 3.11+
- Node.js 18+ (for tooling)
- Git 2.30+
- Make
```

### Initial Setup

1. **Clone and Setup**
   ```bash
   git clone https://github.com/your-org/events-platform.git
   cd events-platform
   
   # Setup development environment
   cd deployments/compose
   make setup
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit configuration for your local setup
   nano .env
   ```

3. **Start Development Environment**
   ```bash
   # Start all services with hot reload
   make dev
   
   # Verify everything is working
   make health
   make dev-urls
   ```

### IDE Setup

#### **Visual Studio Code**

Create `.vscode/settings.json`:
```json
{
  "go.testFlags": ["-v"],
  "go.testTimeout": "10s",
  "go.lintTool": "golangci-lint",
  "go.lintOnSave": "workspace",
  "python.defaultInterpreter": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

Extensions:
```json
{
  "recommendations": [
    "golang.go",
    "ms-python.python",
    "ms-python.flake8",
    "ms-python.black-formatter",
    "bradlc.vscode-tailwindcss",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-vscode.docker"
  ]
}
```

#### **GoLand/PyCharm Setup**

1. **Go Configuration**
   - Set GOROOT to Go 1.21+ installation
   - Set GOPATH to your workspace
   - Enable Go modules
   - Configure golangci-lint

2. **Python Configuration**
   - Set Python interpreter to project venv
   - Configure Black formatter
   - Enable flake8 linter
   - Set up pytest runner

## 📁 Project Structure

### Overview
```
events-platform/
├── services/                    # Microservices
│   ├── go/                     # Go services
│   │   ├── api-gateway/        # Main API gateway
│   │   ├── user-service/       # User management
│   │   ├── event-service/      # Event operations
│   │   ├── search-service/     # Search functionality
│   │   └── websocket-gateway/  # Real-time communication
│   └── python/                 # Python ML services
│       ├── curation-service/   # Content curation
│       ├── recommendation-engine/ # Recommendations
│       └── analytics-service/  # Analytics & insights
├── database/                   # Database schemas & migrations
├── messaging/                  # Message queue configurations
├── monitoring/                 # Observability stack
├── docker/                     # Docker configurations
├── deployments/               # Deployment manifests
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── tests/                     # Integration & E2E tests
```

### Go Service Structure
```
services/go/api-gateway/
├── cmd/
│   └── api-gateway/           # Main application
│       └── main.go
├── internal/                  # Private application code
│   ├── config/               # Configuration
│   ├── handlers/             # HTTP handlers
│   ├── middleware/           # HTTP middleware
│   ├── services/             # Business logic
│   ├── repository/           # Data access
│   └── models/               # Data models
├── pkg/                      # Public packages
├── tests/                    # Unit tests
├── Dockerfile
├── go.mod
└── go.sum
```

### Python Service Structure
```
services/python/curation-service/
├── app/                      # Application code
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   ├── api/                 # API routes
│   ├── core/                # Configuration
│   └── utils/               # Utilities
├── tests/                   # Unit tests
├── requirements.txt         # Dependencies
├── requirements-dev.txt     # Dev dependencies
├── Dockerfile
└── pyproject.toml          # Project configuration
```

## 🔄 Development Workflow

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/amazing-feature
   ```

2. **Development Cycle**
   ```bash
   # Start development services
   make dev
   
   # Make changes to code
   # Services auto-reload on file changes
   
   # Run tests frequently
   make test
   
   # Check code quality
   make lint
   make format
   ```

3. **Pre-commit Checks**
   ```bash
   # Install pre-commit hooks
   pip install pre-commit
   pre-commit install
   
   # Run all checks
   pre-commit run --all-files
   ```

### Git Workflow

#### **Commit Convention**
```bash
# Format: type(scope): description
git commit -m "feat(api): add user profile endpoint"
git commit -m "fix(search): resolve pagination bug"
git commit -m "docs(readme): update installation instructions"
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

#### **Branch Naming**
```bash
feature/user-profile-management
fix/search-pagination-bug
chore/update-dependencies
hotfix/critical-security-issue
```

### Code Review Process

1. **Create Pull Request**
   - Use the provided PR template
   - Include detailed description
   - Add relevant labels and assignees
   - Link related issues

2. **Automated Checks**
   - All CI checks must pass
   - Code coverage >= 80%
   - No security vulnerabilities
   - Documentation updated

3. **Manual Review**
   - At least one approval required
   - Address all review comments
   - Squash commits if requested

## 🔧 Go Services Development

### Service Architecture

#### **Standard Service Structure**
```go
// cmd/service/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/events-platform/service/internal/config"
    "github.com/events-platform/service/internal/server"
)

func main() {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Create server
    srv, err := server.New(cfg)
    if err != nil {
        log.Fatal("Failed to create server:", err)
    }

    // Start server
    go func() {
        if err := srv.Start(); err != nil {
            log.Fatal("Server failed:", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("Server shutdown failed:", err)
    }
}
```

#### **Configuration Management**
```go
// internal/config/config.go
package config

import (
    "os"
    "strconv"
    "time"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    NATS     NATSConfig
    Logger   LoggerConfig
}

type ServerConfig struct {
    Port         string
    ReadTimeout  time.Duration
    WriteTimeout time.Duration
    IdleTimeout  time.Duration
}

func Load() (*Config, error) {
    return &Config{
        Server: ServerConfig{
            Port:         getEnv("PORT", "8080"),
            ReadTimeout:  getDuration("READ_TIMEOUT", 30*time.Second),
            WriteTimeout: getDuration("WRITE_TIMEOUT", 30*time.Second),
            IdleTimeout:  getDuration("IDLE_TIMEOUT", 120*time.Second),
        },
        Database: DatabaseConfig{
            URL:             getEnv("DATABASE_URL", ""),
            MaxOpenConns:    getInt("DB_MAX_OPEN_CONNS", 25),
            MaxIdleConns:    getInt("DB_MAX_IDLE_CONNS", 10),
            ConnMaxLifetime: getDuration("DB_CONN_MAX_LIFETIME", 300*time.Second),
        },
        // ... other configs
    }, nil
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

#### **HTTP Server Setup**
```go
// internal/server/server.go
package server

import (
    "context"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/events-platform/service/internal/config"
    "github.com/events-platform/service/internal/handlers"
    "github.com/events-platform/service/internal/middleware"
)

type Server struct {
    config *config.Config
    router *gin.Engine
    server *http.Server
}

func New(cfg *config.Config) (*Server, error) {
    router := gin.New()
    
    // Middleware
    router.Use(middleware.Logger())
    router.Use(middleware.Recovery())
    router.Use(middleware.CORS())
    router.Use(middleware.RequestID())
    
    // Health check
    router.GET("/health", handlers.HealthCheck)
    router.GET("/metrics", handlers.Metrics)
    
    // API routes
    v1 := router.Group("/api/v1")
    v1.Use(middleware.Auth())
    {
        // Add your routes here
    }

    server := &http.Server{
        Addr:         ":" + cfg.Server.Port,
        Handler:      router,
        ReadTimeout:  cfg.Server.ReadTimeout,
        WriteTimeout: cfg.Server.WriteTimeout,
        IdleTimeout:  cfg.Server.IdleTimeout,
    }

    return &Server{
        config: cfg,
        router: router,
        server: server,
    }, nil
}

func (s *Server) Start() error {
    return s.server.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
    return s.server.Shutdown(ctx)
}
```

### Database Integration

#### **Repository Pattern**
```go
// internal/repository/user.go
package repository

import (
    "context"
    "database/sql"
    "fmt"

    "github.com/events-platform/service/internal/models"
)

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
    query := `
        INSERT INTO users (email, password_hash, name, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, created_at`
    
    return r.db.QueryRowContext(ctx, query, 
        user.Email, user.PasswordHash, user.Name).
        Scan(&user.ID, &user.CreatedAt)
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
    user := &models.User{}
    query := `
        SELECT id, email, name, created_at, updated_at
        FROM users WHERE id = $1`
    
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID, &user.Email, &user.Name,
        &user.CreatedAt, &user.UpdatedAt)
    
    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("user not found")
    }
    
    return user, err
}
```

#### **Database Migrations**
```go
// internal/database/migrate.go
package database

import (
    "database/sql"
    "fmt"
    
    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(db *sql.DB, migrationsPath string) error {
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return fmt.Errorf("could not create migration driver: %w", err)
    }

    m, err := migrate.NewWithDatabaseInstance(
        "file://"+migrationsPath,
        "postgres", driver)
    if err != nil {
        return fmt.Errorf("could not create migrate instance: %w", err)
    }

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return fmt.Errorf("could not run migrations: %w", err)
    }

    return nil
}
```

### Testing

#### **Unit Testing**
```go
// internal/handlers/user_test.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

type MockUserService struct {
    mock.Mock
}

func (m *MockUserService) CreateUser(user *models.User) error {
    args := m.Called(user)
    return args.Error(0)
}

func TestCreateUser(t *testing.T) {
    tests := []struct {
        name           string
        requestBody    interface{}
        mockSetup      func(*MockUserService)
        expectedStatus int
        expectedError  string
    }{
        {
            name: "valid user creation",
            requestBody: map[string]interface{}{
                "email": "test@example.com",
                "name":  "Test User",
                "password": "password123",
            },
            mockSetup: func(m *MockUserService) {
                m.On("CreateUser", mock.AnythingOfType("*models.User")).Return(nil)
            },
            expectedStatus: http.StatusCreated,
        },
        {
            name: "invalid email",
            requestBody: map[string]interface{}{
                "email": "invalid-email",
                "name":  "Test User",
                "password": "password123",
            },
            expectedStatus: http.StatusBadRequest,
            expectedError:  "validation failed",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            mockService := new(MockUserService)
            if tt.mockSetup != nil {
                tt.mockSetup(mockService)
            }

            handler := &UserHandler{userService: mockService}
            
            gin.SetMode(gin.TestMode)
            router := gin.New()
            router.POST("/users", handler.CreateUser)

            // Request
            body, _ := json.Marshal(tt.requestBody)
            req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewBuffer(body))
            req.Header.Set("Content-Type", "application/json")
            
            w := httptest.NewRecorder()
            router.ServeHTTP(w, req)

            // Assert
            assert.Equal(t, tt.expectedStatus, w.Code)
            
            if tt.expectedError != "" {
                var response map[string]interface{}
                json.Unmarshal(w.Body.Bytes(), &response)
                assert.Contains(t, response["error"].(map[string]interface{})["message"], tt.expectedError)
            }

            mockService.AssertExpectations(t)
        })
    }
}
```

#### **Integration Testing**
```go
// tests/integration/user_test.go
package integration

import (
    "bytes"
    "encoding/json"
    "net/http"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
)

type UserIntegrationTestSuite struct {
    suite.Suite
    baseURL string
    client  *http.Client
}

func (suite *UserIntegrationTestSuite) SetupSuite() {
    suite.baseURL = "http://localhost:8081"
    suite.client = &http.Client{}
}

func (suite *UserIntegrationTestSuite) TestUserRegistration() {
    // Test data
    userData := map[string]interface{}{
        "email":    "integration@example.com",
        "name":     "Integration Test User",
        "password": "password123",
    }

    // Create request
    body, _ := json.Marshal(userData)
    req, _ := http.NewRequest(http.MethodPost, 
        suite.baseURL+"/api/v1/auth/register", 
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")

    // Make request
    resp, err := suite.client.Do(req)
    suite.NoError(err)
    defer resp.Body.Close()

    // Assert response
    suite.Equal(http.StatusCreated, resp.StatusCode)

    var response map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&response)
    
    suite.True(response["success"].(bool))
    suite.Contains(response["data"], "user")
    suite.Contains(response["data"], "token")
}

func TestUserIntegrationTestSuite(t *testing.T) {
    suite.Run(t, new(UserIntegrationTestSuite))
}
```

## 🐍 Python Services Development

### Service Architecture

#### **FastAPI Application Structure**
```python
# app/main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
import logging

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api import api_router
from app.database.connection import database
from app.services.ml_service import MLService

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Events Platform ML Service",
    description="Machine Learning service for event recommendations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(api_router, prefix="/api/v1")

# Startup/shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting ML service...")
    
    # Connect to database
    await database.connect()
    
    # Initialize ML models
    ml_service = MLService()
    await ml_service.initialize()
    
    logger.info("ML service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down ML service...")
    await database.disconnect()
    logger.info("ML service shutdown complete")

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
```

#### **Configuration Management**
```python
# app/core/config.py
from pydantic import BaseSettings, validator
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Server
    PORT: int = 8091
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_GROUP_ID: str = "ml-service"
    
    # ML Configuration
    MODEL_PATH: str = "/app/models"
    DATA_PATH: str = "/app/data"
    BATCH_SIZE: int = 1000
    MODEL_UPDATE_INTERVAL: int = 3600  # seconds
    
    # Security
    SECRET_KEY: str
    CORS_ORIGINS: List[str] = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### **Database Models**
```python
# app/models/event.py
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), index=True)
    tags = Column(JSONB)
    date = Column(DateTime, nullable=False, index=True)
    location = Column(JSONB)
    capacity = Column(Integer)
    price = Column(Float, default=0.0)
    features = Column(JSONB)  # ML features
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Event(id={self.id}, title='{self.title}')>"

class UserInteraction(Base):
    __tablename__ = "user_interactions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    event_id = Column(Integer, nullable=False, index=True)
    interaction_type = Column(String(50), nullable=False)  # view, register, favorite
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    metadata = Column(JSONB)
    
    def __repr__(self):
        return f"<UserInteraction(user_id={self.user_id}, event_id={self.event_id}, type='{self.interaction_type}')>"
```

#### **API Routes**
```python
# app/api/recommendations.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging

from app.services.recommendation_service import RecommendationService
from app.models.schemas import RecommendationRequest, RecommendationResponse
from app.core.dependencies import get_recommendation_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/recommendations/events", response_model=List[RecommendationResponse])
async def get_personalized_recommendations(
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
    algorithm: str = Query("hybrid", description="Algorithm type"),
    category: Optional[str] = Query(None, description="Filter by category"),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get personalized event recommendations for a user."""
    try:
        recommendations = await service.get_personalized_recommendations(
            user_id=user_id,
            limit=limit,
            algorithm=algorithm,
            category=category
        )
        return recommendations
    except Exception as e:
        logger.error(f"Failed to get recommendations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/recommendations/events/{event_id}/similar")
async def get_similar_events(
    event_id: int,
    limit: int = Query(5, ge=1, le=20),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get events similar to the specified event."""
    try:
        similar_events = await service.get_similar_events(event_id, limit)
        return similar_events
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get similar events for event {event_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/recommendations/feedback")
async def submit_recommendation_feedback(
    feedback: RecommendationFeedback,
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Submit feedback on recommendation quality."""
    try:
        await service.process_feedback(feedback)
        return {"message": "Feedback submitted successfully"}
    except Exception as e:
        logger.error(f"Failed to process feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Machine Learning Development

#### **ML Service Architecture**
```python
# app/services/ml_service.py
import asyncio
import logging
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import aiofiles

logger = logging.getLogger(__name__)

class MLService:
    """Base ML service with common functionality."""
    
    def __init__(self):
        self.models: Dict[str, any] = {}
        self.vectorizers: Dict[str, any] = {}
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize ML models and vectorizers."""
        try:
            await self._load_models()
            await self._load_vectorizers()
            self.is_initialized = True
            logger.info("ML service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ML service: {e}")
            raise
    
    async def _load_models(self):
        """Load pre-trained models from disk."""
        model_files = [
            ("nmf_model", "models/nmf_model.joblib"),
            ("user_similarity", "models/user_similarity_matrix.joblib"),
            ("item_similarity", "models/item_similarity_matrix.joblib"),
        ]
        
        for model_name, file_path in model_files:
            try:
                async with aiofiles.open(file_path, 'rb') as f:
                    model_data = await f.read()
                    self.models[model_name] = joblib.loads(model_data)
                logger.info(f"Loaded model: {model_name}")
            except FileNotFoundError:
                logger.warning(f"Model file not found: {file_path}")
            except Exception as e:
                logger.error(f"Failed to load model {model_name}: {e}")
    
    async def _load_vectorizers(self):
        """Load text vectorizers."""
        try:
            async with aiofiles.open("models/tfidf_vectorizer.joblib", 'rb') as f:
                vectorizer_data = await f.read()
                self.vectorizers["tfidf"] = joblib.loads(vectorizer_data)
        except Exception as e:
            logger.warning(f"Failed to load vectorizer: {e}")
            # Create new vectorizer if not found
            self.vectorizers["tfidf"] = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2)
            )

class RecommendationEngine(MLService):
    """Advanced recommendation engine with multiple algorithms."""
    
    def __init__(self):
        super().__init__()
        self.user_profiles = {}
        self.item_features = {}
        
    async def get_collaborative_recommendations(
        self, 
        user_id: int, 
        limit: int = 10
    ) -> List[Dict]:
        """Get recommendations using collaborative filtering."""
        if "user_similarity" not in self.models:
            raise ValueError("User similarity model not available")
        
        # Get similar users
        user_similarities = self.models["user_similarity"][user_id]
        similar_users = np.argsort(user_similarities)[::-1][1:11]  # Top 10 similar users
        
        # Aggregate recommendations from similar users
        recommendations = await self._aggregate_user_preferences(similar_users)
        
        return recommendations[:limit]
    
    async def get_content_based_recommendations(
        self, 
        user_id: int, 
        limit: int = 10
    ) -> List[Dict]:
        """Get recommendations using content-based filtering."""
        # Get user's interaction history
        user_events = await self._get_user_events(user_id)
        
        if not user_events:
            return await self._get_popular_events(limit)
        
        # Create user profile from event features
        user_profile = await self._create_user_profile(user_events)
        
        # Find similar events
        all_events = await self._get_all_events()
        similarities = []
        
        for event in all_events:
            if event['id'] not in [e['id'] for e in user_events]:
                similarity = self._calculate_content_similarity(user_profile, event)
                similarities.append((event, similarity))
        
        # Sort by similarity and return top recommendations
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [event for event, _ in similarities[:limit]]
    
    async def get_hybrid_recommendations(
        self, 
        user_id: int, 
        limit: int = 10,
        weights: Dict[str, float] = None
    ) -> List[Dict]:
        """Get hybrid recommendations combining multiple approaches."""
        if weights is None:
            weights = {"collaborative": 0.4, "content": 0.35, "popularity": 0.25}
        
        # Get recommendations from different algorithms
        collaborative_recs = await self.get_collaborative_recommendations(user_id, limit * 2)
        content_recs = await self.get_content_based_recommendations(user_id, limit * 2)
        popularity_recs = await self._get_trending_events(limit)
        
        # Combine recommendations with weights
        combined_scores = {}
        
        # Process collaborative recommendations
        for i, rec in enumerate(collaborative_recs):
            event_id = rec['id']
            score = weights["collaborative"] * (1.0 - i / len(collaborative_recs))
            combined_scores[event_id] = combined_scores.get(event_id, 0) + score
        
        # Process content-based recommendations
        for i, rec in enumerate(content_recs):
            event_id = rec['id']
            score = weights["content"] * (1.0 - i / len(content_recs))
            combined_scores[event_id] = combined_scores.get(event_id, 0) + score
        
        # Process popularity recommendations
        for i, rec in enumerate(popularity_recs):
            event_id = rec['id']
            score = weights["popularity"] * (1.0 - i / len(popularity_recs))
            combined_scores[event_id] = combined_scores.get(event_id, 0) + score
        
        # Sort by combined score and return top recommendations
        sorted_recs = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Fetch event details for top recommendations
        top_event_ids = [event_id for event_id, _ in sorted_recs[:limit]]
        recommendations = await self._get_events_by_ids(top_event_ids)
        
        return recommendations
```

### Testing Python Services

#### **Unit Testing with Pytest**
```python
# tests/test_recommendation_service.py
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from app.services.recommendation_service import RecommendationService

@pytest.fixture
def recommendation_service():
    """Create recommendation service with mocked dependencies."""
    service = RecommendationService()
    service.ml_engine = AsyncMock()
    service.database = AsyncMock()
    return service

@pytest.mark.asyncio
async def test_get_personalized_recommendations(recommendation_service):
    """Test getting personalized recommendations."""
    # Arrange
    user_id = 123
    limit = 10
    expected_recommendations = [
        {
            "id": 1,
            "title": "Tech Conference",
            "score": 0.95,
            "reasons": ["Based on your interests"]
        }
    ]
    
    recommendation_service.ml_engine.get_hybrid_recommendations.return_value = expected_recommendations
    
    # Act
    result = await recommendation_service.get_personalized_recommendations(
        user_id=user_id,
        limit=limit,
        algorithm="hybrid"
    )
    
    # Assert
    assert len(result) == 1
    assert result[0]["id"] == 1
    assert result[0]["title"] == "Tech Conference"
    recommendation_service.ml_engine.get_hybrid_recommendations.assert_called_once_with(
        user_id, limit
    )

@pytest.mark.asyncio
async def test_get_similar_events(recommendation_service):
    """Test getting similar events."""
    # Arrange
    event_id = 456
    limit = 5
    expected_similar = [
        {"id": 2, "title": "Similar Event", "similarity_score": 0.85}
    ]
    
    recommendation_service.ml_engine.get_similar_events.return_value = expected_similar
    
    # Act
    result = await recommendation_service.get_similar_events(event_id, limit)
    
    # Assert
    assert len(result) == 1
    assert result[0]["id"] == 2
    recommendation_service.ml_engine.get_similar_events.assert_called_once_with(
        event_id, limit
    )

class TestRecommendationEngine:
    """Test the ML recommendation engine."""
    
    @pytest.fixture
    def engine(self):
        from app.services.ml_service import RecommendationEngine
        engine = RecommendationEngine()
        engine.is_initialized = True
        return engine
    
    @pytest.mark.asyncio
    async def test_content_similarity_calculation(self, engine):
        """Test content similarity calculation."""
        # Mock user profile and event
        user_profile = {
            "categories": {"technology": 0.8, "business": 0.6},
            "tags": {"machine-learning": 0.9, "ai": 0.7},
            "location_preference": "San Francisco"
        }
        
        event = {
            "category": "technology",
            "tags": ["machine-learning", "conference"],
            "location": "San Francisco, CA"
        }
        
        # Calculate similarity
        similarity = engine._calculate_content_similarity(user_profile, event)
        
        # Assert high similarity for matching content
        assert similarity > 0.7
```

#### **Integration Testing**
```python
# tests/integration/test_recommendation_api.py
import pytest
import httpx
import asyncio
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_get_recommendations_endpoint(client):
    """Test the recommendations endpoint."""
    response = await client.get("/api/v1/recommendations/events?user_id=123&limit=5")
    
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) <= 5

@pytest.mark.asyncio
async def test_similar_events_endpoint(client):
    """Test the similar events endpoint."""
    event_id = 456
    response = await client.get(f"/api/v1/recommendations/events/{event_id}/similar?limit=3")
    
    assert response.status_code == 200
    data = response.json()
    assert "similar_events" in data
    assert len(data["similar_events"]) <= 3
```

## 🗄️ Database Development

### Migration Management

#### **Go Migrations (golang-migrate)**
```sql
-- migrations/001_initial_schema.up.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile JSONB DEFAULT '{}',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    tags JSONB DEFAULT '[]',
    date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location JSONB NOT NULL,
    capacity INTEGER,
    price DECIMAL(10,2) DEFAULT 0.00,
    created_by BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_location_gin ON events USING gin(location);
CREATE INDEX idx_events_tags_gin ON events USING gin(tags);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_users_email ON users(email);

-- Full-text search
CREATE INDEX idx_events_search ON events USING gin(
    to_tsvector('english', title || ' ' || coalesce(description, ''))
);
```

```sql
-- migrations/001_initial_schema.down.sql
DROP INDEX IF EXISTS idx_events_search;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_tags_gin;
DROP INDEX IF EXISTS idx_events_location_gin;
DROP INDEX IF EXISTS idx_events_category;
DROP INDEX IF EXISTS idx_events_date;

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
```

#### **Python Migrations (Alembic)**
```python
# migrations/versions/001_initial_schema.py
"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-15 10:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # User interactions table
    op.create_table(
        'user_interactions',
        sa.Column('id', sa.BigInteger, primary_key=True),
        sa.Column('user_id', sa.BigInteger, nullable=False, index=True),
        sa.Column('event_id', sa.BigInteger, nullable=False, index=True),
        sa.Column('interaction_type', sa.String(50), nullable=False),
        sa.Column('timestamp', sa.DateTime, server_default=sa.func.now(), index=True),
        sa.Column('metadata', postgresql.JSONB),
    )
    
    # Analytics events table (partitioned)
    op.execute("""
        CREATE TABLE analytics_events (
            id BIGSERIAL,
            user_id BIGINT,
            event_type VARCHAR(100) NOT NULL,
            event_data JSONB NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (id, timestamp)
        ) PARTITION BY RANGE (timestamp);
    """)
    
    # Create initial partitions
    op.execute("""
        CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
        FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
    """)

def downgrade():
    op.drop_table('analytics_events_2024_01')
    op.drop_table('analytics_events')
    op.drop_table('user_interactions')
```

### Database Performance Optimization

#### **Query Optimization**
```sql
-- Optimized event search query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    e.id, e.title, e.description, e.date, e.location,
    u.name as organizer_name,
    COUNT(r.id) as registration_count
FROM events e
JOIN users u ON e.created_by = u.id
LEFT JOIN event_registrations r ON e.id = r.event_id AND r.status = 'confirmed'
WHERE 
    e.date >= NOW() 
    AND e.status = 'upcoming'
    AND e.category = ANY($1)
    AND ST_DWithin(
        ST_Point((e.location->>'lng')::float, (e.location->>'lat')::float)::geography,
        ST_Point($2, $3)::geography,
        $4
    )
GROUP BY e.id, u.id
ORDER BY e.date ASC, registration_count DESC
LIMIT $5;

-- Supporting indexes
CREATE INDEX CONCURRENTLY idx_events_upcoming_category_date 
ON events (category, date) 
WHERE status = 'upcoming' AND date >= NOW();

CREATE INDEX CONCURRENTLY idx_events_location_gist 
ON events USING gist(
    ST_Point((location->>'lng')::float, (location->>'lat')::float)
) 
WHERE status = 'upcoming';
```

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── go/                 # Go service unit tests
│   │   ├── handlers/       # Handler tests
│   │   ├── services/       # Service tests
│   │   └── repository/     # Repository tests
│   └── python/             # Python service unit tests
│       ├── api/            # API tests
│       ├── services/       # Service tests
│       └── ml/             # ML model tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   ├── database/          # Database integration tests
│   └── messaging/         # Message queue tests
├── e2e/                   # End-to-end tests
│   ├── user_flows/        # User workflow tests
│   └── performance/       # Load tests
└── fixtures/              # Test data and fixtures
```

### Test Data Management

#### **Test Fixtures**
```go
// tests/fixtures/users.go
package fixtures

import (
    "github.com/events-platform/service/internal/models"
)

func NewUser(overrides ...func(*models.User)) *models.User {
    user := &models.User{
        Email:        "test@example.com",
        Name:         "Test User",
        PasswordHash: "$2a$10$hash",
        Verified:     true,
    }
    
    for _, override := range overrides {
        override(user)
    }
    
    return user
}

func AdminUser() *models.User {
    return NewUser(func(u *models.User) {
        u.Email = "admin@example.com"
        u.Name = "Admin User"
        u.Role = "admin"
    })
}
```

```python
# tests/fixtures/events.py
import pytest
from datetime import datetime, timedelta
from app.models.event import Event

@pytest.fixture
def sample_event():
    """Create a sample event for testing."""
    return Event(
        id=1,
        title="Test Conference",
        description="A test conference",
        category="technology",
        tags=["tech", "conference"],
        date=datetime.now() + timedelta(days=30),
        location={
            "name": "Test Venue",
            "address": "123 Test St",
            "coordinates": {"lat": 37.7749, "lng": -122.4194}
        },
        capacity=100,
        price=99.99,
        created_by=1
    )

@pytest.fixture
def event_factory():
    """Factory for creating test events."""
    def _create_event(**kwargs):
        defaults = {
            "title": "Test Event",
            "category": "technology",
            "date": datetime.now() + timedelta(days=7),
            "location": {"name": "Test Location"},
            "capacity": 50,
            "created_by": 1
        }
        defaults.update(kwargs)
        return Event(**defaults)
    
    return _create_event
```

### Performance Testing

#### **Load Testing with k6**
```javascript
// tests/performance/api_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users  
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
        http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    },
};

const BASE_URL = 'http://localhost:8080';

export function setup() {
    // Authenticate and get token
    let loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
    }), {
        headers: { 'Content-Type': 'application/json' },
    });
    
    return { token: loginRes.json('data.token') };
}

export default function (data) {
    let headers = {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json',
    };
    
    // Test event listing
    let listRes = http.get(`${BASE_URL}/api/v1/events?limit=20`, { headers });
    check(listRes, {
        'list events status is 200': (r) => r.status === 200,
        'list events response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    // Test event search
    let searchRes = http.get(`${BASE_URL}/api/v1/search/events?q=tech&limit=10`, { headers });
    check(searchRes, {
        'search events status is 200': (r) => r.status === 200,
        'search events response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    // Test recommendations
    let recRes = http.get(`${BASE_URL}/api/v1/recommendations/events?user_id=123&limit=5`, { headers });
    check(recRes, {
        'recommendations status is 200': (r) => r.status === 200,
        'recommendations response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    sleep(1);
}

export function teardown(data) {
    // Cleanup if needed
}
```

## 🐛 Debugging

### Go Service Debugging

#### **Debug Configuration**
```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug API Gateway",
            "type": "go",
            "request": "launch",
            "mode": "auto",
            "program": "./cmd/api-gateway",
            "env": {
                "PORT": "8080",
                "DATABASE_URL": "postgres://postgres:postgres123@localhost:5432/events_platform?sslmode=disable",
                "DEBUG": "true"
            },
            "args": [],
            "showLog": true
        }
    ]
}
```

#### **Profiling**
```go
// Enable pprof in development
import (
    _ "net/http/pprof"
    "net/http"
)

// Add pprof endpoint in debug mode
if cfg.Debug {
    go func() {
        log.Println("Starting pprof server on :6060")
        log.Println(http.ListenAndServe(":6060", nil))
    }()
}

// Usage:
// go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
// go tool pprof http://localhost:6060/debug/pprof/heap
```

### Python Service Debugging

#### **Debug Configuration**
```python
# Development debugging setup
if settings.DEBUG:
    import logging
    logging.basicConfig(level=logging.DEBUG)
    
    # Enable asyncio debug mode
    import asyncio
    asyncio.get_event_loop().set_debug(True)
    
    # Add debug middleware
    @app.middleware("http")
    async def debug_middleware(request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
```

#### **Memory Profiling**
```python
# Memory profiling with memory_profiler
from memory_profiler import profile

@profile
async def memory_intensive_function():
    """Function to profile for memory usage."""
    # Your code here
    pass

# Usage: python -m memory_profiler your_script.py
```

### Common Debugging Techniques

#### **Distributed Tracing**
```go
// Add tracing to Go services
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

func (h *EventHandler) CreateEvent(c *gin.Context) {
    ctx := c.Request.Context()
    tracer := otel.Tracer("event-service")
    
    ctx, span := tracer.Start(ctx, "create_event")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("event.title", req.Title),
        attribute.String("user.id", userID),
    )
    
    // Your handler logic
    event, err := h.eventService.CreateEvent(ctx, req)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to create event")
        return
    }
    
    span.SetStatus(codes.Ok, "event created successfully")
}
```

## 🚀 Performance Optimization

### Go Service Optimization

#### **Memory Management**
```go
// Use sync.Pool for object reuse
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 0, 1024)
    },
}

func processData(data []byte) {
    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf[:0])
    
    // Use buffer for processing
}

// Optimize JSON marshaling
type Event struct {
    ID          int64     `json:"id"`
    Title       string    `json:"title"`
    Date        time.Time `json:"date"`
    // Use json:",omitempty" for optional fields
    Description *string   `json:"description,omitempty"`
}
```

#### **Database Optimization**
```go
// Use prepared statements
type EventRepository struct {
    db *sql.DB
    stmts map[string]*sql.Stmt
}

func (r *EventRepository) Init() error {
    queries := map[string]string{
        "create": `INSERT INTO events (title, description, date) VALUES ($1, $2, $3) RETURNING id`,
        "getByID": `SELECT id, title, description, date FROM events WHERE id = $1`,
    }
    
    r.stmts = make(map[string]*sql.Stmt)
    for name, query := range queries {
        stmt, err := r.db.Prepare(query)
        if err != nil {
            return err
        }
        r.stmts[name] = stmt
    }
    
    return nil
}

// Use connection pooling
func setupDatabase(cfg *config.Database) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.URL)
    if err != nil {
        return nil, err
    }
    
    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    
    return db, nil
}
```

### Python Service Optimization

#### **Async Optimization**
```python
# Use async database operations
import asyncpg
import aioredis
from asyncio import gather

class OptimizedService:
    def __init__(self):
        self.db_pool = None
        self.redis = None
    
    async def initialize(self):
        # Create connection pools
        self.db_pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            max_queries=50000,
            max_inactive_connection_lifetime=300,
        )
        
        self.redis = aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    
    async def get_events_optimized(self, user_id: int):
        """Optimized event fetching with parallel queries."""
        
        # Execute multiple queries in parallel
        user_task = self.get_user(user_id)
        events_task = self.get_events()
        recommendations_task = self.get_recommendations(user_id)
        
        user, events, recommendations = await gather(
            user_task, events_task, recommendations_task
        )
        
        return {
            "user": user,
            "events": events,
            "recommendations": recommendations
        }
```

#### **Caching Strategies**
```python
# Multi-level caching
import asyncio
from functools import wraps
import pickle
import hashlib

def cached(expire_time: int = 300):
    """Async cache decorator with Redis backend."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key_data = f"{func.__name__}:{args}:{sorted(kwargs.items())}"
            cache_key = hashlib.md5(key_data.encode()).hexdigest()
            
            # Try to get from cache
            cached_result = await redis.get(cache_key)
            if cached_result:
                return pickle.loads(cached_result)
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await redis.setex(
                cache_key, 
                expire_time, 
                pickle.dumps(result)
            )
            
            return result
        return wrapper
    return decorator

# Usage
@cached(expire_time=600)  # Cache for 10 minutes
async def get_user_recommendations(user_id: int):
    # Expensive recommendation calculation
    return recommendations
```

This comprehensive development guide provides everything needed for developers to contribute effectively to the Events Platform project. It covers setup, development workflows, testing strategies, debugging techniques, and performance optimization for both Go and Python services.