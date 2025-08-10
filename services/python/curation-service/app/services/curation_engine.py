"""Core curation engine with ML/AI analysis capabilities"""
import asyncio
import logging
import time
from typing import Dict, List, Optional, Tuple
from uuid import UUID

import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModel
from sentence_transformers import SentenceTransformer
import torch
from sklearn.metrics.pairwise import cosine_similarity

from app.config import get_settings
from app.models.curation import (
    EventAnalysisRequest, CurationResult, CurationStatus,
    QualityScore, SentimentAnalysis, CategoryPrediction, 
    ContentFlags, ContentCategory, SimilarityResult
)
from app.utils.text_processing import (
    clean_text, extract_keywords, calculate_readability,
    detect_profanity, detect_spam_patterns
)

logger = logging.getLogger(__name__)
settings = get_settings()


class CurationEngine:
    """Advanced ML-powered event curation engine"""
    
    def __init__(self):
        self.sentiment_analyzer = None
        self.category_classifier = None
        self.text_embedder = None
        self.spam_detector = None
        self.inappropriate_content_detector = None
        self.model_version = "1.0.0"
        self._initialized = False
        
    async def initialize(self):
        """Initialize all ML models"""
        if self._initialized:
            return
            
        logger.info("Initializing ML models...")
        start_time = time.time()
        
        try:
            # Load sentiment analysis model
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model=settings.SENTIMENT_MODEL,
                tokenizer=settings.SENTIMENT_MODEL,
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Load text embedding model for similarity analysis
            self.text_embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
            
            # Load category classification model (custom or pre-trained)
            self.category_classifier = pipeline(
                "text-classification",
                model=settings.TEXT_CLASSIFICATION_MODEL,
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Initialize spam detector (simple rule-based for now)
            self.spam_detector = self._initialize_spam_detector()
            
            # Initialize inappropriate content detector
            self.inappropriate_content_detector = self._initialize_content_filter()
            
            self._initialized = True
            
            elapsed_time = time.time() - start_time
            logger.info(f"ML models initialized successfully in {elapsed_time:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Failed to initialize ML models: {e}")
            raise
    
    def _initialize_spam_detector(self):
        """Initialize spam detection patterns"""
        spam_patterns = [
            r"click here now",
            r"limited time offer",
            r"act fast",
            r"100% guaranteed",
            r"free money",
            r"make money fast",
            r"no experience required",
            r"work from home",
            r"congratulations you have won",
            r"urgent response required"
        ]
        return spam_patterns
    
    def _initialize_content_filter(self):
        """Initialize inappropriate content filter"""
        # In a real implementation, this would use a more sophisticated model
        inappropriate_patterns = [
            r"explicit content",
            r"adult only",
            r"18\+",
            r"xxx",
            r"gambling",
            r"casino"
        ]
        return inappropriate_patterns
    
    async def analyze_event(self, request: EventAnalysisRequest) -> CurationResult:
        """Perform complete curation analysis on an event"""
        if not self._initialized:
            await self.initialize()
        
        logger.info(f"Starting curation analysis for event {request.event_id}")
        start_time = time.time()
        
        try:
            # Combine text content for analysis
            full_text = self._combine_text_content(request)
            
            # Run all analysis tasks concurrently
            tasks = [
                self._analyze_sentiment(full_text),
                self._analyze_quality(request),
                self._predict_category(full_text, request.category),
                self._analyze_content_flags(request),
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            sentiment_analysis = results[0]
            quality_score = results[1]
            category_prediction = results[2]
            content_flags = results[3]
            
            # Handle any exceptions
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Analysis task {i} failed: {result}")
                    raise result
            
            # Calculate overall curation score
            curation_score = self._calculate_curation_score(
                quality_score, sentiment_analysis, content_flags
            )
            
            # Determine curation status
            status = self._determine_status(curation_score, content_flags)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                request, quality_score, sentiment_analysis, content_flags
            )
            
            processing_time = time.time() - start_time
            
            result = CurationResult(
                event_id=request.event_id,
                curation_score=curation_score,
                status=status,
                quality_score=quality_score,
                sentiment_analysis=sentiment_analysis,
                category_prediction=category_prediction,
                content_flags=content_flags,
                recommendations=recommendations,
                processing_time=processing_time,
                model_version=self.model_version
            )
            
            logger.info(f"Curation analysis completed for event {request.event_id} "
                       f"with score {curation_score:.3f} in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Curation analysis failed for event {request.event_id}: {e}")
            raise
    
    async def analyze_similarity(self, text1: str, text2: str, 
                               tags1: List[str], tags2: List[str],
                               category1: str, category2: str) -> SimilarityResult:
        """Analyze similarity between two events"""
        if not self._initialized:
            await self.initialize()
        
        try:
            # Generate embeddings for semantic similarity
            embeddings = self.text_embedder.encode([text1, text2])
            semantic_similarity = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
            
            # Calculate tag similarity (Jaccard similarity)
            tags1_set = set(tag.lower() for tag in tags1)
            tags2_set = set(tag.lower() for tag in tags2)
            
            if tags1_set or tags2_set:
                intersection = len(tags1_set.intersection(tags2_set))
                union = len(tags1_set.union(tags2_set))
                tag_similarity = intersection / union if union > 0 else 0.0
            else:
                tag_similarity = 0.0
            
            # Calculate category similarity
            category_similarity = 1.0 if category1.lower() == category2.lower() else 0.0
            
            # Calculate overall similarity score
            similarity_score = (
                semantic_similarity * 0.6 +
                tag_similarity * 0.25 +
                category_similarity * 0.15
            )
            
            # Determine if it's a duplicate
            is_duplicate = similarity_score > settings.SIMILARITY_THRESHOLD
            
            # Calculate confidence based on consistency of similarity metrics
            confidence = self._calculate_similarity_confidence(
                semantic_similarity, tag_similarity, category_similarity
            )
            
            return SimilarityResult(
                event_id_1=UUID("00000000-0000-0000-0000-000000000001"),  # Placeholder
                event_id_2=UUID("00000000-0000-0000-0000-000000000002"),  # Placeholder
                similarity_score=similarity_score,
                semantic_similarity=semantic_similarity,
                category_similarity=category_similarity,
                tag_similarity=tag_similarity,
                is_duplicate=is_duplicate,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Similarity analysis failed: {e}")
            raise
    
    def _combine_text_content(self, request: EventAnalysisRequest) -> str:
        """Combine all text content for analysis"""
        content_parts = [request.title, request.description]
        
        if request.short_description:
            content_parts.append(request.short_description)
        
        if request.tags:
            content_parts.append(" ".join(request.tags))
        
        if request.organizer_name:
            content_parts.append(request.organizer_name)
        
        if request.venue_name:
            content_parts.append(request.venue_name)
        
        return " ".join(content_parts)
    
    async def _analyze_sentiment(self, text: str) -> SentimentAnalysis:
        """Analyze sentiment of event content"""
        try:
            # Truncate text if too long
            text = text[:settings.MAX_TEXT_LENGTH]
            
            result = self.sentiment_analyzer(text)[0]
            
            # Map sentiment labels to standardized format
            label_mapping = {
                "POSITIVE": "positive",
                "NEGATIVE": "negative", 
                "NEUTRAL": "neutral"
            }
            
            label = label_mapping.get(result["label"].upper(), "neutral")
            confidence = result["score"]
            
            # Convert to -1 to 1 scale
            if label == "positive":
                score = confidence
            elif label == "negative":
                score = -confidence
            else:
                score = 0.0
            
            return SentimentAnalysis(
                score=score,
                confidence=confidence,
                label=label
            )
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            # Return neutral sentiment as fallback
            return SentimentAnalysis(score=0.0, confidence=0.5, label="neutral")
    
    async def _analyze_quality(self, request: EventAnalysisRequest) -> QualityScore:
        """Analyze content quality"""
        try:
            # Content quality metrics
            content_quality = self._assess_content_quality(request.description)
            
            # Information completeness
            completeness = self._assess_information_completeness(request)
            
            # Readability assessment
            readability = calculate_readability(request.description)
            
            # Professionalism assessment
            professionalism = self._assess_professionalism(request)
            
            # Overall quality score
            overall = (
                content_quality * 0.3 +
                completeness * 0.25 +
                readability * 0.25 +
                professionalism * 0.2
            )
            
            return QualityScore(
                overall=overall,
                content_quality=content_quality,
                information_completeness=completeness,
                readability=readability,
                professionalism=professionalism
            )
            
        except Exception as e:
            logger.error(f"Quality analysis failed: {e}")
            # Return default scores as fallback
            return QualityScore(
                overall=0.5,
                content_quality=0.5,
                information_completeness=0.5,
                readability=0.5,
                professionalism=0.5
            )
    
    async def _predict_category(self, text: str, provided_category: Optional[str]) -> CategoryPrediction:
        """Predict event category"""
        try:
            # If category is provided and valid, use it with high confidence
            if provided_category:
                try:
                    category_enum = ContentCategory(provided_category.lower())
                    return CategoryPrediction(
                        category=category_enum,
                        confidence=0.95,
                        alternatives=[]
                    )
                except ValueError:
                    pass  # Invalid category, continue with prediction
            
            # Use ML model to predict category
            text = text[:settings.MAX_TEXT_LENGTH]
            
            # Simple keyword-based classification for now
            # In production, this would use a trained classification model
            category_keywords = {
                ContentCategory.TECHNOLOGY: ["tech", "ai", "software", "programming", "data", "digital"],
                ContentCategory.BUSINESS: ["business", "marketing", "entrepreneurship", "startup", "finance"],
                ContentCategory.ARTS: ["art", "gallery", "exhibition", "creative", "design"],
                ContentCategory.MUSIC: ["music", "concert", "band", "song", "album", "performance"],
                ContentCategory.SPORTS: ["sports", "game", "tournament", "competition", "athletic"],
                ContentCategory.EDUCATION: ["education", "learning", "course", "workshop", "training"],
                ContentCategory.HEALTH: ["health", "medical", "wellness", "fitness", "nutrition"],
                ContentCategory.FOOD: ["food", "restaurant", "cooking", "cuisine", "chef"],
                ContentCategory.TRAVEL: ["travel", "trip", "vacation", "destination", "tour"],
                ContentCategory.NETWORKING: ["networking", "meetup", "professional", "connect"],
                ContentCategory.ENTERTAINMENT: ["entertainment", "show", "movie", "comedy", "fun"]
            }
            
            text_lower = text.lower()
            category_scores = {}
            
            for category, keywords in category_keywords.items():
                score = sum(1 for keyword in keywords if keyword in text_lower)
                if score > 0:
                    category_scores[category] = score / len(keywords)
            
            if category_scores:
                # Get best match
                best_category = max(category_scores.items(), key=lambda x: x[1])
                
                # Calculate alternatives
                alternatives = [
                    {cat.value: score} 
                    for cat, score in sorted(category_scores.items(), key=lambda x: x[1], reverse=True)[1:3]
                ]
                
                return CategoryPrediction(
                    category=best_category[0],
                    confidence=min(best_category[1] * 2, 1.0),  # Scale up confidence
                    alternatives=alternatives
                )
            else:
                # Default to "other" category
                return CategoryPrediction(
                    category=ContentCategory.OTHER,
                    confidence=0.3,
                    alternatives=[]
                )
                
        except Exception as e:
            logger.error(f"Category prediction failed: {e}")
            return CategoryPrediction(
                category=ContentCategory.OTHER,
                confidence=0.3,
                alternatives=[]
            )
    
    async def _analyze_content_flags(self, request: EventAnalysisRequest) -> ContentFlags:
        """Analyze content for safety and quality flags"""
        try:
            full_text = self._combine_text_content(request)
            
            # Spam detection
            is_spam, spam_confidence = self._detect_spam(full_text)
            
            # Inappropriate content detection
            is_inappropriate, inappropriate_confidence = self._detect_inappropriate_content(full_text)
            
            # Profanity detection
            has_profanity = detect_profanity(full_text)
            
            # Determine if human review is needed
            needs_human_review = (
                spam_confidence > 0.5 or
                inappropriate_confidence > 0.5 or
                has_profanity or
                len(request.description) < settings.MIN_DESCRIPTION_LENGTH
            )
            
            return ContentFlags(
                is_spam=is_spam,
                spam_confidence=spam_confidence,
                is_inappropriate=is_inappropriate,
                inappropriate_confidence=inappropriate_confidence,
                has_profanity=has_profanity,
                is_duplicate=False,  # This would be checked separately
                duplicate_event_id=None,
                needs_human_review=needs_human_review
            )
            
        except Exception as e:
            logger.error(f"Content flags analysis failed: {e}")
            return ContentFlags(needs_human_review=True)
    
    def _assess_content_quality(self, description: str) -> float:
        """Assess content quality based on various factors"""
        score = 0.8  # Base score
        
        # Length assessment
        if len(description) < settings.MIN_DESCRIPTION_LENGTH:
            score -= 0.3
        elif len(description) > settings.MAX_DESCRIPTION_LENGTH:
            score -= 0.1
        
        # Grammar and spelling (simplified)
        # In production, this would use a grammar checker
        sentences = description.split('.')
        if len(sentences) < 2:
            score -= 0.2
        
        # Information density
        words = description.split()
        unique_words = set(word.lower() for word in words)
        if len(words) > 0:
            uniqueness_ratio = len(unique_words) / len(words)
            if uniqueness_ratio < 0.4:
                score -= 0.2
        
        return max(0.0, min(1.0, score))
    
    def _assess_information_completeness(self, request: EventAnalysisRequest) -> float:
        """Assess how complete the event information is"""
        score = 0.5  # Base score
        
        # Required fields completeness
        if request.title and len(request.title.strip()) > 0:
            score += 0.1
        if request.description and len(request.description) >= settings.MIN_DESCRIPTION_LENGTH:
            score += 0.2
        if request.organizer_name and len(request.organizer_name.strip()) > 0:
            score += 0.1
        
        # Optional but valuable fields
        if request.short_description:
            score += 0.05
        if request.category:
            score += 0.05
        if request.tags:
            score += 0.05
        if request.venue_name or request.is_virtual:
            score += 0.1
        if request.images:
            score += 0.05
        if request.price is not None:
            score += 0.05
        
        return max(0.0, min(1.0, score))
    
    def _assess_professionalism(self, request: EventAnalysisRequest) -> float:
        """Assess professionalism of the event"""
        score = 0.7  # Base score
        
        # Title assessment
        if request.title.isupper():
            score -= 0.2  # All caps is less professional
        if '!!!' in request.title:
            score -= 0.1  # Excessive exclamation
        
        # Description assessment
        if request.description.count('!') > 3:
            score -= 0.1
        if any(word in request.description.lower() for word in ['amazing', 'incredible', 'unbelievable']):
            score -= 0.05  # Excessive superlatives
        
        # Contact information presence
        if '@' in request.description:  # Email present
            score += 0.1
        
        return max(0.0, min(1.0, score))
    
    def _detect_spam(self, text: str) -> Tuple[bool, float]:
        """Detect spam content"""
        spam_indicators = detect_spam_patterns(text)
        confidence = min(len(spam_indicators) * 0.3, 1.0)
        is_spam = confidence > settings.SPAM_DETECTION_THRESHOLD
        
        return is_spam, confidence
    
    def _detect_inappropriate_content(self, text: str) -> Tuple[bool, float]:
        """Detect inappropriate content"""
        inappropriate_count = 0
        text_lower = text.lower()
        
        for pattern in self.inappropriate_content_detector:
            if pattern in text_lower:
                inappropriate_count += 1
        
        confidence = min(inappropriate_count * 0.4, 1.0)
        is_inappropriate = confidence > settings.INAPPROPRIATE_CONTENT_THRESHOLD
        
        return is_inappropriate, confidence
    
    def _calculate_curation_score(self, quality_score: QualityScore, 
                                sentiment_analysis: SentimentAnalysis,
                                content_flags: ContentFlags) -> float:
        """Calculate overall curation score"""
        # Base score from quality
        score = quality_score.overall * settings.QUALITY_WEIGHT
        
        # Sentiment contribution
        sentiment_contribution = (sentiment_analysis.score + 1) / 2  # Normalize to 0-1
        score += sentiment_contribution * settings.SENTIMENT_WEIGHT
        
        # Penalties for flags
        if content_flags.is_spam:
            score *= 0.1  # Heavy penalty for spam
        if content_flags.is_inappropriate:
            score *= 0.2  # Heavy penalty for inappropriate content
        if content_flags.has_profanity:
            score *= 0.7  # Moderate penalty for profanity
        
        return max(0.0, min(1.0, score))
    
    def _determine_status(self, curation_score: float, content_flags: ContentFlags) -> CurationStatus:
        """Determine curation status based on score and flags"""
        if content_flags.is_spam or content_flags.is_inappropriate:
            return CurationStatus.REJECTED
        
        if content_flags.needs_human_review:
            return CurationStatus.NEEDS_REVIEW
        
        if curation_score >= 0.8:
            return CurationStatus.APPROVED
        elif curation_score >= 0.6:
            return CurationStatus.NEEDS_REVIEW
        else:
            return CurationStatus.REJECTED
    
    def _generate_recommendations(self, request: EventAnalysisRequest,
                                quality_score: QualityScore,
                                sentiment_analysis: SentimentAnalysis,
                                content_flags: ContentFlags) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        # Quality-based recommendations
        if quality_score.information_completeness < 0.7:
            recommendations.append("Consider adding more detailed information about the event")
        
        if quality_score.readability < 0.6:
            recommendations.append("Improve text readability with shorter sentences and clearer language")
        
        if len(request.description) < settings.MIN_DESCRIPTION_LENGTH:
            recommendations.append("Add more descriptive content to better explain the event")
        
        # Sentiment-based recommendations
        if sentiment_analysis.score < -0.3:
            recommendations.append("Consider using more positive and engaging language")
        
        # Content flags recommendations
        if content_flags.needs_human_review:
            recommendations.append("This content will be reviewed by our moderation team")
        
        # Missing information recommendations
        if not request.tags:
            recommendations.append("Add relevant tags to help people discover your event")
        
        if not request.short_description:
            recommendations.append("Add a short description for better event preview")
        
        if not request.images:
            recommendations.append("Add images to make your event more attractive")
        
        return recommendations
    
    def _calculate_similarity_confidence(self, semantic_sim: float, 
                                       tag_sim: float, category_sim: float) -> float:
        """Calculate confidence in similarity assessment"""
        # Higher confidence when metrics agree
        similarities = [semantic_sim, tag_sim, category_sim]
        mean_sim = np.mean(similarities)
        variance = np.var(similarities)
        
        # Lower variance means higher confidence
        confidence = 1.0 - min(variance * 2, 0.5)  # Cap variance impact
        confidence = max(confidence, 0.5)  # Minimum confidence
        
        return confidence