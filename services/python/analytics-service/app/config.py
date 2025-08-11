"""Configuration settings for the Analytics Service"""
import os
from functools import lru_cache
from typing import List, Optional, Dict, Any

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Service settings
    SERVICE_NAME: str = "analytics-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8093
    LOG_LEVEL: str = "INFO"
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Database settings
    DATABASE_URL: str = "postgresql://events_user:events_password@localhost/events_platform"
    DATABASE_POOL_SIZE: int = 15
    DATABASE_MAX_OVERFLOW: int = 25
    
    # Analytics database (separate for heavy analytics queries)
    ANALYTICS_DATABASE_URL: str = "postgresql://user:password@localhost/events_analytics"
    
    # ClickHouse for high-performance analytics (optional)
    CLICKHOUSE_URL: Optional[str] = None
    CLICKHOUSE_USERNAME: Optional[str] = None
    CLICKHOUSE_PASSWORD: Optional[str] = None
    
    # Redis settings
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DECODE_RESPONSES: bool = True
    CACHE_TTL: int = 1800  # 30 minutes
    
    # Kafka settings
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_GROUP_ID: str = "analytics-service"
    KAFKA_AUTO_OFFSET_RESET: str = "earliest"
    KAFKA_ENABLE_AUTO_COMMIT: bool = True
    
    # Real-time analytics settings
    REAL_TIME_WINDOW_SECONDS: int = 300  # 5 minutes
    BATCH_PROCESSING_SIZE: int = 1000
    STREAM_PROCESSING_ENABLED: bool = True
    
    # Data processing settings
    DATA_RETENTION_DAYS: int = 365
    RAW_DATA_RETENTION_DAYS: int = 90
    AGGREGATION_INTERVALS: List[str] = ["1h", "1d", "1w", "1M"]
    
    # Analytics computation settings
    COHORT_ANALYSIS_PERIODS: List[str] = ["daily", "weekly", "monthly"]
    FUNNEL_ANALYSIS_WINDOW_DAYS: int = 30
    USER_SEGMENTATION_REFRESH_HOURS: int = 6
    TREND_ANALYSIS_MIN_DAYS: int = 7
    
    # Machine learning settings
    PREDICTIVE_MODELING_ENABLED: bool = True
    ANOMALY_DETECTION_ENABLED: bool = True
    SEASONAL_DECOMPOSITION_ENABLED: bool = True
    FORECASTING_HORIZON_DAYS: int = 30
    
    # Performance settings
    PARALLEL_WORKERS: int = 4
    MAX_CONCURRENT_QUERIES: int = 10
    QUERY_TIMEOUT_SECONDS: int = 300
    HEAVY_QUERY_TIMEOUT_SECONDS: int = 900
    
    # Alerting settings
    ALERTING_ENABLED: bool = True
    ALERT_THRESHOLDS: Dict[str, float] = {
        "high_error_rate": 0.05,  # 5%
        "low_conversion_rate": 0.02,  # 2%
        "high_latency_ms": 1000,  # 1 second
        "unusual_traffic_multiplier": 2.0,
        "registration_drop_threshold": 0.3  # 30% drop
    }
    
    # Reporting settings
    REPORT_GENERATION_ENABLED: bool = True
    MAX_REPORT_ROWS: int = 100000
    REPORT_CACHE_TTL_HOURS: int = 24
    SCHEDULED_REPORTS_ENABLED: bool = True
    
    # Data export settings
    EXPORT_FORMATS: List[str] = ["csv", "json", "xlsx", "parquet"]
    MAX_EXPORT_ROWS: int = 1000000
    EXPORT_STORAGE_PATH: str = "./exports"
    
    # External services
    EVENT_SERVICE_URL: str = "http://event-service:8082"
    USER_SERVICE_URL: str = "http://user-service:8081"
    RECOMMENDATION_SERVICE_URL: str = "http://recommendation-engine:8092"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8090"
    
    # Monitoring and observability
    PROMETHEUS_ENABLED: bool = True
    METRICS_PORT: int = 9093
    HEALTH_CHECK_TIMEOUT: int = 30
    
    # Data visualization settings
    VISUALIZATION_ENABLED: bool = True
    CHART_GENERATION_ENABLED: bool = True
    DASHBOARD_REFRESH_SECONDS: int = 30
    
    # Privacy and compliance
    GDPR_COMPLIANCE_ENABLED: bool = True
    DATA_ANONYMIZATION_ENABLED: bool = True
    PII_DETECTION_ENABLED: bool = True
    
    # Feature flags
    ENABLE_REAL_TIME_DASHBOARDS: bool = True
    ENABLE_PREDICTIVE_ANALYTICS: bool = True
    ENABLE_BEHAVIORAL_ANALYTICS: bool = True
    ENABLE_A_B_TEST_ANALYSIS: bool = True
    ENABLE_REVENUE_ANALYTICS: bool = True
    ENABLE_GEO_ANALYTICS: bool = True
    
    # Security
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    API_KEY_HEADER: str = "X-API-Key"
    RATE_LIMIT_PER_MINUTE: int = 100
    
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
    
    @field_validator("AGGREGATION_INTERVALS", mode="before")
    def parse_aggregation_intervals(cls, v):
        if isinstance(v, str):
            return [interval.strip() for interval in v.split(",")]
        return v
    
    @field_validator("COHORT_ANALYSIS_PERIODS", mode="before")
    def parse_cohort_periods(cls, v):
        if isinstance(v, str):
            return [period.strip() for period in v.split(",")]
        return v
    
    @field_validator("EXPORT_FORMATS", mode="before")
    def parse_export_formats(cls, v):
        if isinstance(v, str):
            return [fmt.strip() for fmt in v.split(",")]
        return v
    
    @field_validator("ALERT_THRESHOLDS", mode="before")
    def parse_alert_thresholds(cls, v):
        if isinstance(v, str):
            # Parse from string format: "key1:value1,key2:value2"
            result = {}
            for pair in v.split(","):
                if ":" in pair:
                    key, value = pair.split(":", 1)
                    try:
                        result[key.strip()] = float(value.strip())
                    except ValueError:
                        continue
            return result
        return v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()