"""Recommendation data models and schemas"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

Base = declarative_base()


class RecommendationAlgorithm(str, Enum):
    """Recommendation algorithm types"""
    COLLABORATIVE_FILTERING = "collaborative_filtering"
    CONTENT_BASED = "content_based"
    HYBRID = "hybrid"
    DEEP_LEARNING = "deep_learning"
    POPULARITY_BASED = "popularity_based"
    LOCATION_BASED = "location_based"
    SOCIAL = "social"
    TRENDING = "trending"


class InteractionType(str, Enum):
    """User interaction types with events"""
    VIEW = "view"
    LIKE = "like"
    REGISTER = "register"
    SHARE = "share"
    CLICK = "click"
    SAVE = "save"
    COMMENT = "comment"
    RATE = "rate"


class RecommendationContext(str, Enum):
    """Context for recommendations"""
    HOME_FEED = "home_feed"
    EVENT_DETAIL = "event_detail"
    SEARCH_RESULTS = "search_results"
    CATEGORY_BROWSE = "category_browse"
    USER_PROFILE = "user_profile"
    ONBOARDING = "onboarding"
    EMAIL_DIGEST = "email_digest"
    PUSH_NOTIFICATION = "push_notification"


class UserPreferences(BaseModel):
    """User preferences for recommendations"""
    preferred_categories: List[str] = Field(default_factory=list)
    preferred_locations: List[str] = Field(default_factory=list)
    max_distance_km: Optional[float] = Field(None, ge=0, le=1000)
    price_range_min: Optional[float] = Field(None, ge=0)
    price_range_max: Optional[float] = Field(None, ge=0)
    preferred_times: List[str] = Field(default_factory=list)  # e.g., "weekday_evening"
    language_preferences: List[str] = Field(default_factory=list)
    accessibility_needs: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    avoid_categories: List[str] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "preferred_categories": ["technology", "business"],
                "preferred_locations": ["San Francisco", "Online"],
                "max_distance_km": 50.0,
                "price_range_min": 0.0,
                "price_range_max": 200.0,
                "preferred_times": ["weekday_evening", "weekend_afternoon"],
                "language_preferences": ["english"],
                "interests": ["artificial intelligence", "startups", "networking"]
            }
        }


class RecommendationRequest(BaseModel):
    """Request for event recommendations"""
    user_id: UUID
    context: RecommendationContext = RecommendationContext.HOME_FEED
    algorithm: Optional[RecommendationAlgorithm] = None
    count: int = Field(default=20, ge=1, le=100)
    exclude_events: List[UUID] = Field(default_factory=list)
    include_past_events: bool = False
    location: Optional[Dict[str, float]] = None  # {"latitude": x, "longitude": y}
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    diversity_factor: Optional[float] = Field(None, ge=0.0, le=1.0)
    explanation_level: str = Field(default="basic", regex="^(none|basic|detailed)$")
    
    @validator("location")
    def validate_location(cls, v):
        if v is not None:
            required_keys = {"latitude", "longitude"}
            if not required_keys.issubset(v.keys()):
                raise ValueError("Location must contain 'latitude' and 'longitude'")
            if not (-90 <= v["latitude"] <= 90):
                raise ValueError("Latitude must be between -90 and 90")
            if not (-180 <= v["longitude"] <= 180):
                raise ValueError("Longitude must be between -180 and 180")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "context": "home_feed",
                "algorithm": "hybrid",
                "count": 20,
                "exclude_events": [],
                "location": {"latitude": 37.7749, "longitude": -122.4194},
                "filters": {"category": "technology", "max_price": 100},
                "diversity_factor": 0.1,
                "explanation_level": "basic"
            }
        }


class RecommendationItem(BaseModel):
    """Individual recommendation item"""
    event_id: UUID
    score: float = Field(..., ge=0.0, le=1.0)
    algorithm: RecommendationAlgorithm
    reasons: List[str] = Field(default_factory=list)
    confidence: float = Field(..., ge=0.0, le=1.0)
    rank: int = Field(..., ge=1)
    
    # Event details (cached for performance)
    title: str
    short_description: Optional[str] = None
    category: str
    tags: List[str] = Field(default_factory=list)
    start_time: datetime
    is_virtual: bool
    price: Optional[float] = None
    venue_name: Optional[str] = None
    organizer_name: str
    image_url: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "score": 0.85,
                "algorithm": "hybrid",
                "reasons": ["Similar to events you've attended", "Popular in your area"],
                "confidence": 0.92,
                "rank": 1,
                "title": "AI Conference 2024",
                "category": "technology",
                "tags": ["ai", "machine learning"],
                "start_time": "2024-03-15T10:00:00Z",
                "is_virtual": False,
                "price": 299.99,
                "organizer_name": "Tech Events Inc."
            }
        }


class RecommendationResponse(BaseModel):
    """Response containing recommendations"""
    user_id: UUID
    recommendations: List[RecommendationItem]
    total_count: int
    algorithm_used: RecommendationAlgorithm
    context: RecommendationContext
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: float
    model_version: str
    ab_test_variant: Optional[str] = None
    
    # Metadata
    user_profile_completeness: float = Field(..., ge=0.0, le=1.0)
    cold_start_user: bool = False
    fallback_used: bool = False
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "recommendations": [],
                "total_count": 20,
                "algorithm_used": "hybrid",
                "context": "home_feed",
                "processing_time_ms": 45.5,
                "model_version": "1.0.0",
                "user_profile_completeness": 0.75,
                "cold_start_user": False,
                "fallback_used": False
            }
        }


class UserInteraction(BaseModel):
    """User interaction with an event"""
    user_id: UUID
    event_id: UUID
    interaction_type: InteractionType
    rating: Optional[int] = Field(None, ge=1, le=5)
    duration_seconds: Optional[int] = Field(None, ge=0)
    context: Optional[RecommendationContext] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "event_id": "660e8400-e29b-41d4-a716-446655440001",
                "interaction_type": "view",
                "rating": 4,
                "duration_seconds": 120,
                "context": "home_feed",
                "metadata": {"source": "recommendation", "rank": 3}
            }
        }


class SimilarEventsRequest(BaseModel):
    """Request for similar events"""
    event_id: UUID
    count: int = Field(default=10, ge=1, le=50)
    algorithm: RecommendationAlgorithm = RecommendationAlgorithm.CONTENT_BASED
    exclude_same_organizer: bool = False
    min_similarity_score: float = Field(default=0.3, ge=0.0, le=1.0)
    
    class Config:
        schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "count": 10,
                "algorithm": "content_based",
                "exclude_same_organizer": False,
                "min_similarity_score": 0.3
            }
        }


class ModelPerformanceMetrics(BaseModel):
    """Performance metrics for recommendation models"""
    algorithm: RecommendationAlgorithm
    model_version: str
    
    # Accuracy metrics
    precision_at_k: Dict[int, float] = Field(default_factory=dict)  # k = 5, 10, 20
    recall_at_k: Dict[int, float] = Field(default_factory=dict)
    ndcg_at_k: Dict[int, float] = Field(default_factory=dict)
    map_score: float  # Mean Average Precision
    
    # Diversity metrics
    intra_list_diversity: float
    catalog_coverage: float
    novelty_score: float
    
    # Business metrics
    click_through_rate: float
    conversion_rate: float
    user_satisfaction: float
    
    # Performance metrics
    avg_response_time_ms: float
    throughput_rps: float
    
    # Training metrics (if applicable)
    training_loss: Optional[float] = None
    validation_loss: Optional[float] = None
    
    evaluation_date: datetime
    sample_size: int
    
    class Config:
        schema_extra = {
            "example": {
                "algorithm": "hybrid",
                "model_version": "1.0.0",
                "precision_at_k": {5: 0.85, 10: 0.78, 20: 0.65},
                "recall_at_k": {5: 0.45, 10: 0.62, 20: 0.75},
                "ndcg_at_k": {5: 0.82, 10: 0.79, 20: 0.73},
                "map_score": 0.75,
                "intra_list_diversity": 0.65,
                "catalog_coverage": 0.45,
                "novelty_score": 0.55,
                "click_through_rate": 0.12,
                "conversion_rate": 0.08,
                "user_satisfaction": 4.2,
                "avg_response_time_ms": 45.5,
                "throughput_rps": 150.0,
                "sample_size": 10000
            }
        }


class ABTestConfig(BaseModel):
    """A/B test configuration"""
    test_id: str
    algorithms: List[RecommendationAlgorithm]
    traffic_split: Dict[str, float]  # algorithm -> percentage
    start_date: datetime
    end_date: datetime
    success_metrics: List[str]
    min_sample_size: int = 1000
    
    @validator("traffic_split")
    def validate_traffic_split(cls, v):
        total = sum(v.values())
        if abs(total - 1.0) > 0.01:
            raise ValueError("Traffic split percentages must sum to 1.0")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "test_id": "hybrid_vs_content_2024_q1",
                "algorithms": ["hybrid", "content_based"],
                "traffic_split": {"hybrid": 0.5, "content_based": 0.5},
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-03-31T23:59:59Z",
                "success_metrics": ["click_through_rate", "conversion_rate"],
                "min_sample_size": 1000
            }
        }


# Database Models
class UserInteractionDB(Base):
    """Database model for user interactions"""
    __tablename__ = "user_interactions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    event_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    interaction_type = Column(String(20), nullable=False)
    rating = Column(Integer)
    duration_seconds = Column(Integer)
    context = Column(String(50))
    metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "event_id": str(self.event_id),
            "interaction_type": self.interaction_type,
            "rating": self.rating,
            "duration_seconds": self.duration_seconds,
            "context": self.context,
            "metadata": self.metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class UserProfile(Base):
    """Database model for user recommendation profiles"""
    __tablename__ = "user_profiles"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), unique=True, nullable=False, index=True)
    
    # Preferences
    preferred_categories = Column(ARRAY(String), default=list)
    preferred_locations = Column(ARRAY(String), default=list)
    max_distance_km = Column(Float)
    price_range_min = Column(Float)
    price_range_max = Column(Float)
    preferred_times = Column(ARRAY(String), default=list)
    interests = Column(ARRAY(String), default=list)
    avoid_categories = Column(ARRAY(String), default=list)
    
    # Computed features
    activity_score = Column(Float, default=0.0)
    diversity_preference = Column(Float, default=0.5)
    novelty_preference = Column(Float, default=0.5)
    
    # Model-specific embeddings (stored as JSON)
    collaborative_embedding = Column(JSON)
    content_embedding = Column(JSON)
    deep_learning_embedding = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "preferred_categories": self.preferred_categories or [],
            "preferred_locations": self.preferred_locations or [],
            "max_distance_km": self.max_distance_km,
            "price_range_min": self.price_range_min,
            "price_range_max": self.price_range_max,
            "preferred_times": self.preferred_times or [],
            "interests": self.interests or [],
            "avoid_categories": self.avoid_categories or [],
            "activity_score": self.activity_score,
            "diversity_preference": self.diversity_preference,
            "novelty_preference": self.novelty_preference,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class RecommendationLog(Base):
    """Database model for recommendation logs"""
    __tablename__ = "recommendation_logs"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    context = Column(String(50), nullable=False)
    algorithm = Column(String(30), nullable=False)
    event_ids = Column(ARRAY(String), nullable=False)
    scores = Column(ARRAY(Float), nullable=False)
    
    processing_time_ms = Column(Float, nullable=False)
    model_version = Column(String(20), nullable=False)
    ab_test_variant = Column(String(50))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "context": self.context,
            "algorithm": self.algorithm,
            "event_ids": self.event_ids or [],
            "scores": self.scores or [],
            "processing_time_ms": self.processing_time_ms,
            "model_version": self.model_version,
            "ab_test_variant": self.ab_test_variant,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ModelPerformanceDB(Base):
    """Database model for model performance tracking"""
    __tablename__ = "model_performance"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    algorithm = Column(String(30), nullable=False)
    model_version = Column(String(20), nullable=False)
    
    # Metrics stored as JSON
    accuracy_metrics = Column(JSON, nullable=False)
    diversity_metrics = Column(JSON, nullable=False)
    business_metrics = Column(JSON, nullable=False)
    performance_metrics = Column(JSON, nullable=False)
    
    evaluation_date = Column(DateTime(timezone=True), nullable=False)
    sample_size = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "algorithm": self.algorithm,
            "model_version": self.model_version,
            "accuracy_metrics": self.accuracy_metrics or {},
            "diversity_metrics": self.diversity_metrics or {},
            "business_metrics": self.business_metrics or {},
            "performance_metrics": self.performance_metrics or {},
            "evaluation_date": self.evaluation_date.isoformat() if self.evaluation_date else None,
            "sample_size": self.sample_size,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }