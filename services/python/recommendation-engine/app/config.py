"""Configuration settings for the Recommendation Engine"""
import os
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Service settings
    SERVICE_NAME: str = "recommendation-engine"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8092
    LOG_LEVEL: str = "INFO"
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Database settings
    DATABASE_URL: str = "postgresql://events_user:events_password@localhost/events_platform"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Redis settings
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DECODE_RESPONSES: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    
    # Kafka settings
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_GROUP_ID: str = "recommendation-engine"
    KAFKA_AUTO_OFFSET_RESET: str = "earliest"
    KAFKA_ENABLE_AUTO_COMMIT: bool = True
    
    # ML Model settings
    MODEL_CACHE_DIR: str = "./models"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Recommendation algorithm settings
    DEFAULT_RECOMMENDATIONS_COUNT: int = 20
    MAX_RECOMMENDATIONS_COUNT: int = 100
    MIN_INTERACTIONS_FOR_CF: int = 5  # Minimum interactions for collaborative filtering
    
    # Collaborative Filtering settings
    CF_N_FACTORS: int = 50
    CF_N_EPOCHS: int = 100
    CF_LR_ALL: float = 0.005
    CF_REG_ALL: float = 0.02
    CF_MIN_RATING: int = 1
    CF_MAX_RATING: int = 5
    
    # Content-based filtering settings
    CONTENT_SIMILARITY_THRESHOLD: float = 0.3
    CATEGORY_WEIGHT: float = 0.3
    TAG_WEIGHT: float = 0.25
    DESCRIPTION_WEIGHT: float = 0.25
    LOCATION_WEIGHT: float = 0.2
    
    # Hybrid algorithm weights
    COLLABORATIVE_WEIGHT: float = 0.4
    CONTENT_WEIGHT: float = 0.35
    POPULARITY_WEIGHT: float = 0.15
    DIVERSITY_WEIGHT: float = 0.1
    
    # Deep learning settings
    DL_EMBEDDING_DIM: int = 128
    DL_HIDDEN_DIMS: List[int] = [256, 128, 64]
    DL_DROPOUT_RATE: float = 0.2
    DL_LEARNING_RATE: float = 0.001
    DL_BATCH_SIZE: int = 256
    DL_EPOCHS: int = 50
    
    # Real-time processing
    REAL_TIME_UPDATES: bool = True
    UPDATE_FREQUENCY_MINUTES: int = 30
    BATCH_SIZE: int = 1000
    
    # Cold start handling
    COLD_START_FALLBACK_ENABLED: bool = True
    COLD_START_MIN_POPULAR_EVENTS: int = 10
    NEW_USER_ONBOARDING_RECS: int = 15
    
    # Diversity and exploration
    DIVERSITY_FACTOR: float = 0.1
    EXPLORATION_FACTOR: float = 0.05  # % of random recommendations
    TEMPORAL_DECAY_FACTOR: float = 0.95
    
    # Performance settings
    PARALLEL_WORKERS: int = 4
    MODEL_INFERENCE_TIMEOUT: int = 30
    CACHE_WARM_UP: bool = True
    
    # A/B Testing settings
    AB_TESTING_ENABLED: bool = True
    AB_TEST_ALGORITHMS: List[str] = ["collaborative", "content", "hybrid", "deep_learning"]
    AB_TEST_TRAFFIC_SPLIT: float = 0.1  # 10% for experiments
    
    # External services
    EVENT_SERVICE_URL: str = "http://event-service:8082"
    USER_SERVICE_URL: str = "http://user-service:8081"
    CURATION_SERVICE_URL: str = "http://curation-service:8091"
    ANALYTICS_SERVICE_URL: str = "http://analytics-service:8093"
    
    # Monitoring and metrics
    PROMETHEUS_ENABLED: bool = True
    METRICS_PORT: int = 9092
    RECOMMENDATION_METRICS_ENABLED: bool = True
    MODEL_PERFORMANCE_TRACKING: bool = True
    
    # Security
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    
    # Feature flags
    ENABLE_DEEP_LEARNING: bool = True
    ENABLE_REAL_TIME_LEARNING: bool = True
    ENABLE_LOCATION_BASED: bool = True
    ENABLE_SOCIAL_RECOMMENDATIONS: bool = True
    ENABLE_TRENDING_BOOST: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("DATABASE_URL", mode="before")
    def validate_database_url(cls, v):
        if not v or not v.startswith(("postgresql://", "postgres://")):
            raise ValueError("DATABASE_URL must be a valid PostgreSQL connection string")
        return v
    
    @field_validator("DL_HIDDEN_DIMS", mode="before")
    def parse_hidden_dims(cls, v):
        if isinstance(v, str):
            return [int(x.strip()) for x in v.split(",")]
        return v
    
    @field_validator("AB_TEST_ALGORITHMS", mode="before")
    def parse_ab_test_algorithms(cls, v):
        if isinstance(v, str):
            return [alg.strip() for alg in v.split(",")]
        return v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()