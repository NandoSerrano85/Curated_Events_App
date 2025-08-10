"""Configuration settings for the Curation Service"""
import os
from functools import lru_cache
from typing import List, Optional

from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Service settings
    SERVICE_NAME: str = "curation-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8091
    LOG_LEVEL: str = "INFO"
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Database settings
    DATABASE_URL: str = "postgresql://user:password@localhost/events_db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Redis settings
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DECODE_RESPONSES: bool = True
    
    # Kafka settings
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_GROUP_ID: str = "curation-service"
    KAFKA_AUTO_OFFSET_RESET: str = "earliest"
    KAFKA_ENABLE_AUTO_COMMIT: bool = True
    
    # ML/AI Model settings
    MODEL_CACHE_DIR: str = "./models"
    SENTIMENT_MODEL: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    CATEGORY_MODEL: str = "microsoft/DialoGPT-medium"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    TEXT_CLASSIFICATION_MODEL: str = "distilbert-base-uncased"
    
    # Model inference settings
    MAX_TEXT_LENGTH: int = 512
    BATCH_SIZE: int = 32
    MODEL_CACHE_TTL: int = 3600  # 1 hour
    SIMILARITY_THRESHOLD: float = 0.7
    
    # Curation scoring weights
    SENTIMENT_WEIGHT: float = 0.2
    QUALITY_WEIGHT: float = 0.3
    RELEVANCE_WEIGHT: float = 0.3
    POPULARITY_WEIGHT: float = 0.2
    
    # Content analysis settings
    MIN_DESCRIPTION_LENGTH: int = 50
    MAX_DESCRIPTION_LENGTH: int = 5000
    SPAM_DETECTION_THRESHOLD: float = 0.8
    INAPPROPRIATE_CONTENT_THRESHOLD: float = 0.7
    
    # Background processing
    WORKER_CONCURRENCY: int = 4
    BATCH_PROCESSING_SIZE: int = 50
    PROCESSING_TIMEOUT: int = 300  # 5 minutes
    
    # External services
    EVENT_SERVICE_URL: str = "http://event-service:8082"
    USER_SERVICE_URL: str = "http://user-service:8081"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8090"
    
    # Monitoring and metrics
    PROMETHEUS_ENABLED: bool = True
    METRICS_PORT: int = 9091
    HEALTH_CHECK_TIMEOUT: int = 30
    
    # Security
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("DATABASE_URL", pre=True)
    def validate_database_url(cls, v):
        if not v or not v.startswith(("postgresql://", "postgres://")):
            raise ValueError("DATABASE_URL must be a valid PostgreSQL connection string")
        return v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()