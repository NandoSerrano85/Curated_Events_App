"""Curation data models"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class CurationStatus(str, Enum):
    """Curation status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class ContentCategory(str, Enum):
    """Content category enumeration"""
    TECHNOLOGY = "technology"
    BUSINESS = "business"
    ARTS = "arts"
    MUSIC = "music"
    SPORTS = "sports"
    EDUCATION = "education"
    HEALTH = "health"
    FOOD = "food"
    TRAVEL = "travel"
    NETWORKING = "networking"
    ENTERTAINMENT = "entertainment"
    OTHER = "other"


class QualityScore(BaseModel):
    """Quality score breakdown"""
    overall: float = Field(..., ge=0.0, le=1.0)
    content_quality: float = Field(..., ge=0.0, le=1.0)
    information_completeness: float = Field(..., ge=0.0, le=1.0)
    readability: float = Field(..., ge=0.0, le=1.0)
    professionalism: float = Field(..., ge=0.0, le=1.0)
    
    class Config:
        schema_extra = {
            "example": {
                "overall": 0.85,
                "content_quality": 0.9,
                "information_completeness": 0.8,
                "readability": 0.85,
                "professionalism": 0.9
            }
        }


class SentimentAnalysis(BaseModel):
    """Sentiment analysis results"""
    score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    label: str = Field(..., regex="^(positive|negative|neutral)$")
    
    class Config:
        schema_extra = {
            "example": {
                "score": 0.7,
                "confidence": 0.92,
                "label": "positive"
            }
        }


class CategoryPrediction(BaseModel):
    """Category prediction results"""
    category: ContentCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    alternatives: List[Dict[str, float]] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "category": "technology",
                "confidence": 0.89,
                "alternatives": [
                    {"business": 0.65},
                    {"education": 0.45}
                ]
            }
        }


class ContentFlags(BaseModel):
    """Content safety and quality flags"""
    is_spam: bool = False
    spam_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    is_inappropriate: bool = False
    inappropriate_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    has_profanity: bool = False
    is_duplicate: bool = False
    duplicate_event_id: Optional[UUID] = None
    needs_human_review: bool = False
    
    class Config:
        schema_extra = {
            "example": {
                "is_spam": False,
                "spam_confidence": 0.1,
                "is_inappropriate": False,
                "inappropriate_confidence": 0.05,
                "has_profanity": False,
                "is_duplicate": False,
                "duplicate_event_id": None,
                "needs_human_review": False
            }
        }


class CurationResult(BaseModel):
    """Complete curation analysis result"""
    event_id: UUID
    curation_score: float = Field(..., ge=0.0, le=1.0)
    status: CurationStatus
    quality_score: QualityScore
    sentiment_analysis: SentimentAnalysis
    category_prediction: CategoryPrediction
    content_flags: ContentFlags
    recommendations: List[str] = Field(default_factory=list)
    processing_time: float  # in seconds
    model_version: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "curation_score": 0.85,
                "status": "approved",
                "quality_score": {
                    "overall": 0.85,
                    "content_quality": 0.9,
                    "information_completeness": 0.8,
                    "readability": 0.85,
                    "professionalism": 0.9
                },
                "sentiment_analysis": {
                    "score": 0.7,
                    "confidence": 0.92,
                    "label": "positive"
                },
                "category_prediction": {
                    "category": "technology",
                    "confidence": 0.89,
                    "alternatives": [{"business": 0.65}]
                },
                "content_flags": {
                    "is_spam": False,
                    "spam_confidence": 0.1,
                    "is_inappropriate": False,
                    "inappropriate_confidence": 0.05,
                    "has_profanity": False,
                    "is_duplicate": False,
                    "needs_human_review": False
                },
                "recommendations": ["Consider adding more technical details"],
                "processing_time": 2.5,
                "model_version": "1.0.0"
            }
        }


class EventAnalysisRequest(BaseModel):
    """Request for event analysis"""
    event_id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    short_description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    organizer_name: str = Field(..., min_length=1, max_length=255)
    venue_name: Optional[str] = None
    is_virtual: bool = False
    price: Optional[float] = None
    images: List[str] = Field(default_factory=list)
    force_reanalyze: bool = False
    
    @validator("tags")
    def validate_tags(cls, v):
        if len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        return [tag.lower().strip() for tag in v if tag.strip()]
    
    class Config:
        schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "AI and Machine Learning Conference 2024",
                "description": "Join us for an exciting day of presentations and workshops on the latest developments in AI and ML...",
                "short_description": "Premier AI/ML conference featuring industry experts",
                "category": "technology",
                "tags": ["ai", "machine learning", "conference", "technology"],
                "organizer_name": "Tech Events Inc.",
                "venue_name": "Convention Center",
                "is_virtual": False,
                "price": 299.99,
                "images": ["https://example.com/event-banner.jpg"],
                "force_reanalyze": False
            }
        }


class BatchAnalysisRequest(BaseModel):
    """Request for batch event analysis"""
    events: List[EventAnalysisRequest] = Field(..., min_items=1, max_items=50)
    priority: str = Field(default="normal", regex="^(low|normal|high|urgent)$")
    
    class Config:
        schema_extra = {
            "example": {
                "events": [
                    {
                        "event_id": "550e8400-e29b-41d4-a716-446655440000",
                        "title": "Sample Event",
                        "description": "Sample description...",
                        "organizer_name": "Sample Organizer"
                    }
                ],
                "priority": "normal"
            }
        }


class SimilarityAnalysisRequest(BaseModel):
    """Request for similarity analysis between events"""
    event_id: UUID
    compare_with: List[UUID] = Field(..., min_items=1, max_items=100)
    similarity_threshold: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)
    
    class Config:
        schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "compare_with": ["660e8400-e29b-41d4-a716-446655440001"],
                "similarity_threshold": 0.7
            }
        }


class SimilarityResult(BaseModel):
    """Similarity analysis result"""
    event_id_1: UUID
    event_id_2: UUID
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    semantic_similarity: float = Field(..., ge=0.0, le=1.0)
    category_similarity: float = Field(..., ge=0.0, le=1.0)
    tag_similarity: float = Field(..., ge=0.0, le=1.0)
    is_duplicate: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "event_id_1": "550e8400-e29b-41d4-a716-446655440000",
                "event_id_2": "660e8400-e29b-41d4-a716-446655440001",
                "similarity_score": 0.85,
                "semantic_similarity": 0.9,
                "category_similarity": 1.0,
                "tag_similarity": 0.75,
                "is_duplicate": False,
                "confidence": 0.92
            }
        }


class ModelPerformanceMetrics(BaseModel):
    """Model performance metrics"""
    model_name: str
    version: str
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    inference_time_avg: float  # milliseconds
    last_updated: datetime
    sample_size: int
    
    class Config:
        schema_extra = {
            "example": {
                "model_name": "sentiment_analyzer",
                "version": "1.0.0",
                "accuracy": 0.92,
                "precision": 0.89,
                "recall": 0.94,
                "f1_score": 0.91,
                "inference_time_avg": 45.5,
                "sample_size": 1000
            }
        }


# Database models
class EventCuration(Base):
    """Database model for event curation results"""
    __tablename__ = "event_curations"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    event_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    curation_score = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    
    # Detailed scores
    quality_score = Column(JSON, nullable=False)
    sentiment_analysis = Column(JSON, nullable=False)
    category_prediction = Column(JSON, nullable=False)
    content_flags = Column(JSON, nullable=False)
    
    # Metadata
    recommendations = Column(JSON, default=list)
    processing_time = Column(Float, nullable=False)
    model_version = Column(String(50), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "event_id": str(self.event_id),
            "curation_score": self.curation_score,
            "status": self.status,
            "quality_score": self.quality_score,
            "sentiment_analysis": self.sentiment_analysis,
            "category_prediction": self.category_prediction,
            "content_flags": self.content_flags,
            "recommendations": self.recommendations or [],
            "processing_time": self.processing_time,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class EventSimilarity(Base):
    """Database model for event similarity analysis"""
    __tablename__ = "event_similarities"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    event_id_1 = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    event_id_2 = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    similarity_score = Column(Float, nullable=False)
    semantic_similarity = Column(Float, nullable=False)
    category_similarity = Column(Float, nullable=False)
    tag_similarity = Column(Float, nullable=False)
    is_duplicate = Column(Boolean, default=False)
    confidence = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "event_id_1": str(self.event_id_1),
            "event_id_2": str(self.event_id_2),
            "similarity_score": self.similarity_score,
            "semantic_similarity": self.semantic_similarity,
            "category_similarity": self.category_similarity,
            "tag_similarity": self.tag_similarity,
            "is_duplicate": self.is_duplicate,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ModelMetrics(Base):
    """Database model for ML model performance metrics"""
    __tablename__ = "model_metrics"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    inference_time_avg = Column(Float, nullable=False)
    sample_size = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "model_name": self.model_name,
            "version": self.version,
            "accuracy": self.accuracy,
            "precision": self.precision,
            "recall": self.recall,
            "f1_score": self.f1_score,
            "inference_time_avg": self.inference_time_avg,
            "sample_size": self.sample_size,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }