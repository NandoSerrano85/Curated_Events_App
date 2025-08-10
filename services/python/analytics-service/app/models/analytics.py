"""Analytics data models and schemas"""
from datetime import datetime, date
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean, JSON, Date
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class MetricType(str, Enum):
    """Types of metrics tracked"""
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    MEDIAN = "median"
    PERCENTILE = "percentile"
    UNIQUE_COUNT = "unique_count"
    RATE = "rate"
    RATIO = "ratio"


class TimeGranularity(str, Enum):
    """Time granularity for analytics"""
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class AnalyticsEventType(str, Enum):
    """Types of analytics events"""
    USER_REGISTRATION = "user_registration"
    USER_LOGIN = "user_login"
    EVENT_VIEW = "event_view"
    EVENT_CLICK = "event_click"
    EVENT_REGISTRATION = "event_registration"
    EVENT_CANCELLATION = "event_cancellation"
    SEARCH_QUERY = "search_query"
    RECOMMENDATION_VIEW = "recommendation_view"
    RECOMMENDATION_CLICK = "recommendation_click"
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    EMAIL_SENT = "email_sent"
    EMAIL_OPENED = "email_opened"
    EMAIL_CLICKED = "email_clicked"
    PUSH_NOTIFICATION_SENT = "push_notification_sent"
    PUSH_NOTIFICATION_CLICKED = "push_notification_clicked"


class ReportType(str, Enum):
    """Types of reports available"""
    USER_ENGAGEMENT = "user_engagement"
    EVENT_PERFORMANCE = "event_performance"
    REVENUE_ANALYSIS = "revenue_analysis"
    FUNNEL_ANALYSIS = "funnel_analysis"
    COHORT_ANALYSIS = "cohort_analysis"
    A_B_TEST_RESULTS = "ab_test_results"
    RECOMMENDATION_PERFORMANCE = "recommendation_performance"
    GEOGRAPHIC_ANALYSIS = "geographic_analysis"
    TREND_ANALYSIS = "trend_analysis"
    CUSTOM = "custom"


class UserSegment(str, Enum):
    """User segmentation categories"""
    NEW_USERS = "new_users"
    ACTIVE_USERS = "active_users"
    POWER_USERS = "power_users"
    AT_RISK_USERS = "at_risk_users"
    CHURNED_USERS = "churned_users"
    VIP_USERS = "vip_users"
    ORGANIZERS = "organizers"
    ATTENDEES = "attendees"


class AnalyticsEvent(BaseModel):
    """Real-time analytics event"""
    event_id: UUID = Field(default_factory=uuid4)
    event_type: AnalyticsEventType
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    entity_id: Optional[UUID] = None  # Event ID, recommendation ID, etc.
    entity_type: Optional[str] = None  # "event", "recommendation", etc.
    
    # Event properties
    properties: Dict[str, Any] = Field(default_factory=dict)
    
    # Context information
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    
    # Location data
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Timing
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        schema_extra = {
            "example": {
                "event_type": "event_view",
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "session_id": "sess_123",
                "entity_id": "660e8400-e29b-41d4-a716-446655440001",
                "entity_type": "event",
                "properties": {
                    "event_title": "AI Conference 2024",
                    "event_category": "technology",
                    "view_duration": 45
                },
                "country": "US",
                "city": "San Francisco"
            }
        }


class MetricQuery(BaseModel):
    """Query for analytics metrics"""
    metric_name: str
    metric_type: MetricType
    dimensions: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    date_range: Dict[str, date]
    granularity: TimeGranularity = TimeGranularity.DAY
    
    @validator("date_range")
    def validate_date_range(cls, v):
        if "start" not in v or "end" not in v:
            raise ValueError("date_range must contain 'start' and 'end' keys")
        if v["start"] > v["end"]:
            raise ValueError("start date must be before end date")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "metric_name": "event_registrations",
                "metric_type": "count",
                "dimensions": ["event_category", "user_segment"],
                "filters": {"event_category": ["technology", "business"]},
                "date_range": {"start": "2024-01-01", "end": "2024-01-31"},
                "granularity": "day"
            }
        }


class MetricResult(BaseModel):
    """Result of a metrics query"""
    metric_name: str
    metric_type: MetricType
    value: Union[float, int, Dict[str, Any]]
    dimensions: Dict[str, str] = Field(default_factory=dict)
    timestamp: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "metric_name": "event_registrations",
                "metric_type": "count",
                "value": 1250,
                "dimensions": {"event_category": "technology"},
                "timestamp": "2024-01-15T00:00:00Z"
            }
        }


class FunnelStep(BaseModel):
    """Step in a conversion funnel"""
    step_number: int
    step_name: str
    event_type: AnalyticsEventType
    filters: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "step_number": 1,
                "step_name": "Event View",
                "event_type": "event_view",
                "filters": {"event_category": "technology"}
            }
        }


class FunnelAnalysisRequest(BaseModel):
    """Request for funnel analysis"""
    funnel_name: str
    steps: List[FunnelStep] = Field(..., min_items=2, max_items=10)
    date_range: Dict[str, date]
    segment_by: Optional[str] = None
    conversion_window_days: int = Field(default=7, ge=1, le=90)
    
    class Config:
        schema_extra = {
            "example": {
                "funnel_name": "Event Registration Funnel",
                "steps": [
                    {
                        "step_number": 1,
                        "step_name": "Event View",
                        "event_type": "event_view"
                    },
                    {
                        "step_number": 2,
                        "step_name": "Registration Started",
                        "event_type": "event_click"
                    },
                    {
                        "step_number": 3,
                        "step_name": "Registration Completed",
                        "event_type": "event_registration"
                    }
                ],
                "date_range": {"start": "2024-01-01", "end": "2024-01-31"},
                "conversion_window_days": 7
            }
        }


class FunnelResult(BaseModel):
    """Result of funnel analysis"""
    funnel_name: str
    total_users: int
    steps: List[Dict[str, Any]]
    overall_conversion_rate: float
    drop_off_points: List[Dict[str, Any]]
    
    class Config:
        schema_extra = {
            "example": {
                "funnel_name": "Event Registration Funnel",
                "total_users": 10000,
                "steps": [
                    {"step_name": "Event View", "users": 10000, "conversion_rate": 1.0},
                    {"step_name": "Registration Started", "users": 3000, "conversion_rate": 0.3},
                    {"step_name": "Registration Completed", "users": 2400, "conversion_rate": 0.8}
                ],
                "overall_conversion_rate": 0.24,
                "drop_off_points": [
                    {"from_step": "Event View", "to_step": "Registration Started", "drop_rate": 0.7}
                ]
            }
        }


class CohortAnalysisRequest(BaseModel):
    """Request for cohort analysis"""
    cohort_type: str = Field(..., regex="^(acquisition|behavioral)$")
    cohort_period: str = Field(..., regex="^(daily|weekly|monthly)$")
    date_range: Dict[str, date]
    metric_event: AnalyticsEventType
    cohort_definition: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "cohort_type": "acquisition",
                "cohort_period": "weekly",
                "date_range": {"start": "2024-01-01", "end": "2024-03-31"},
                "metric_event": "user_login",
                "cohort_definition": {"registration_event": "user_registration"}
            }
        }


class CohortData(BaseModel):
    """Cohort analysis data"""
    cohort_group: str
    cohort_size: int
    periods: Dict[str, float]  # period -> retention rate
    
    class Config:
        schema_extra = {
            "example": {
                "cohort_group": "2024-W01",
                "cohort_size": 500,
                "periods": {
                    "week_0": 1.0,
                    "week_1": 0.65,
                    "week_2": 0.48,
                    "week_4": 0.32
                }
            }
        }


class UserSegmentAnalysis(BaseModel):
    """User segment analysis results"""
    segment: UserSegment
    user_count: int
    percentage: float
    characteristics: Dict[str, Any]
    metrics: Dict[str, float]
    
    class Config:
        schema_extra = {
            "example": {
                "segment": "power_users",
                "user_count": 1250,
                "percentage": 15.5,
                "characteristics": {
                    "avg_events_per_month": 8.5,
                    "avg_session_duration": 420,
                    "preferred_categories": ["technology", "business"]
                },
                "metrics": {
                    "conversion_rate": 0.45,
                    "lifetime_value": 890.0,
                    "churn_probability": 0.12
                }
            }
        }


class TrendAnalysis(BaseModel):
    """Trend analysis results"""
    metric_name: str
    trend_direction: str = Field(..., regex="^(up|down|stable|volatile)$")
    trend_strength: float = Field(..., ge=0.0, le=1.0)
    seasonal_patterns: Dict[str, float] = Field(default_factory=dict)
    anomalies: List[Dict[str, Any]] = Field(default_factory=list)
    forecast: Optional[List[Dict[str, Any]]] = None
    
    class Config:
        schema_extra = {
            "example": {
                "metric_name": "daily_active_users",
                "trend_direction": "up",
                "trend_strength": 0.75,
                "seasonal_patterns": {
                    "monday": 0.85,
                    "friday": 1.15,
                    "weekend": 0.65
                },
                "anomalies": [
                    {
                        "date": "2024-01-15",
                        "value": 5500,
                        "expected": 3200,
                        "severity": "high"
                    }
                ]
            }
        }


class ReportRequest(BaseModel):
    """Request for generating reports"""
    report_type: ReportType
    report_name: str
    date_range: Dict[str, date]
    filters: Dict[str, Any] = Field(default_factory=dict)
    dimensions: List[str] = Field(default_factory=list)
    metrics: List[str] = Field(default_factory=list)
    format: str = Field(default="json", regex="^(json|csv|xlsx|pdf)$")
    
    # Visualization options
    include_charts: bool = True
    chart_types: List[str] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "report_type": "user_engagement",
                "report_name": "Monthly User Engagement Report",
                "date_range": {"start": "2024-01-01", "end": "2024-01-31"},
                "filters": {"user_type": "premium"},
                "dimensions": ["user_segment", "event_category"],
                "metrics": ["daily_active_users", "session_duration", "events_per_user"],
                "format": "pdf",
                "include_charts": True,
                "chart_types": ["line", "bar", "pie"]
            }
        }


class ABTestResult(BaseModel):
    """A/B test analysis results"""
    test_id: str
    test_name: str
    variants: Dict[str, Dict[str, Any]]
    winner: Optional[str] = None
    confidence_level: float
    statistical_significance: bool
    metrics: Dict[str, Dict[str, float]]
    
    class Config:
        schema_extra = {
            "example": {
                "test_id": "homepage_cta_test",
                "test_name": "Homepage CTA Button Test",
                "variants": {
                    "control": {"users": 5000, "conversions": 250},
                    "variant_a": {"users": 5000, "conversions": 320}
                },
                "winner": "variant_a",
                "confidence_level": 0.95,
                "statistical_significance": True,
                "metrics": {
                    "conversion_rate": {"control": 0.05, "variant_a": 0.064},
                    "lift": {"variant_a": 0.28}
                }
            }
        }


class DashboardWidget(BaseModel):
    """Dashboard widget configuration"""
    widget_id: str
    widget_type: str = Field(..., regex="^(metric|chart|table|map)$")
    title: str
    metric_query: MetricQuery
    chart_config: Dict[str, Any] = Field(default_factory=dict)
    refresh_interval_seconds: int = Field(default=300, ge=30)
    
    class Config:
        schema_extra = {
            "example": {
                "widget_id": "daily_registrations",
                "widget_type": "chart",
                "title": "Daily Event Registrations",
                "metric_query": {
                    "metric_name": "event_registrations",
                    "metric_type": "count",
                    "date_range": {"start": "2024-01-01", "end": "2024-01-31"},
                    "granularity": "day"
                },
                "chart_config": {
                    "chart_type": "line",
                    "colors": ["#007bff"],
                    "show_trend": True
                },
                "refresh_interval_seconds": 300
            }
        }


# Database Models
class AnalyticsEventDB(Base):
    """Database model for analytics events"""
    __tablename__ = "analytics_events"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    event_type = Column(String(50), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), index=True)
    session_id = Column(String(100), index=True)
    entity_id = Column(PGUUID(as_uuid=True), index=True)
    entity_type = Column(String(50), index=True)
    
    properties = Column(JSON, default=dict)
    
    # Context
    user_agent = Column(Text)
    ip_address = Column(String(45))
    referrer = Column(Text)
    utm_source = Column(String(100))
    utm_medium = Column(String(100))
    utm_campaign = Column(String(100))
    
    # Location
    country = Column(String(2))
    region = Column(String(100))
    city = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "event_type": self.event_type,
            "user_id": str(self.user_id) if self.user_id else None,
            "session_id": self.session_id,
            "entity_id": str(self.entity_id) if self.entity_id else None,
            "entity_type": self.entity_type,
            "properties": self.properties or {},
            "user_agent": self.user_agent,
            "ip_address": self.ip_address,
            "referrer": self.referrer,
            "utm_source": self.utm_source,
            "utm_medium": self.utm_medium,
            "utm_campaign": self.utm_campaign,
            "country": self.country,
            "region": self.region,
            "city": self.city,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


class MetricSummary(Base):
    """Database model for pre-computed metric summaries"""
    __tablename__ = "metric_summaries"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_type = Column(String(20), nullable=False)
    dimensions = Column(JSON, default=dict)
    value = Column(Float, nullable=False)
    
    date = Column(Date, nullable=False, index=True)
    granularity = Column(String(20), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "metric_name": self.metric_name,
            "metric_type": self.metric_type,
            "dimensions": self.dimensions or {},
            "value": self.value,
            "date": self.date.isoformat() if self.date else None,
            "granularity": self.granularity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class UserSegmentDB(Base):
    """Database model for user segments"""
    __tablename__ = "user_segments"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    segment = Column(String(50), nullable=False, index=True)
    confidence_score = Column(Float, default=1.0)
    characteristics = Column(JSON, default=dict)
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "segment": self.segment,
            "confidence_score": self.confidence_score,
            "characteristics": self.characteristics or {},
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }