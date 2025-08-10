"""Hybrid recommendation algorithm combining multiple approaches"""
import logging
import numpy as np
from typing import Dict, List, Optional, Any
from uuid import UUID
import asyncio
from datetime import datetime, timedelta

from app.config import get_settings
from app.models.recommendation import (
    RecommendationItem, RecommendationAlgorithm, RecommendationRequest,
    RecommendationResponse, UserInteraction
)
from app.algorithms.collaborative_filtering import CollaborativeFilteringRecommender
from app.algorithms.content_based import ContentBasedRecommender

logger = logging.getLogger(__name__)
settings = get_settings()


class HybridRecommender:
    """Hybrid recommender combining collaborative filtering and content-based approaches"""
    
    def __init__(self):
        self.collaborative_recommender = CollaborativeFilteringRecommender()
        self.content_recommender = ContentBasedRecommender()
        self.model_version = "1.0.0"
        self.is_initialized = False
        
        # Algorithm weights (can be dynamically adjusted)
        self.weights = {
            'collaborative': settings.COLLABORATIVE_WEIGHT,
            'content': settings.CONTENT_WEIGHT,
            'popularity': settings.POPULARITY_WEIGHT,
            'diversity': settings.DIVERSITY_WEIGHT
        }
        
        # Performance tracking
        self.algorithm_performance = {
            'collaborative': {'accuracy': 0.75, 'diversity': 0.6, 'coverage': 0.8},
            'content': {'accuracy': 0.70, 'diversity': 0.8, 'coverage': 0.9},
            'popularity': {'accuracy': 0.60, 'diversity': 0.3, 'coverage': 0.5}
        }
    
    async def initialize(self):
        """Initialize all recommendation algorithms"""
        if self.is_initialized:
            return
        
        logger.info("Initializing hybrid recommender...")
        
        try:
            # Initialize content-based recommender
            await self.content_recommender.initialize()
            
            # Load existing models if available
            await self.collaborative_recommender.load_model()
            await self.content_recommender.load_model()
            
            self.is_initialized = True
            logger.info("Hybrid recommender initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize hybrid recommender: {e}")
            raise
    
    async def get_recommendations(self, request: RecommendationRequest,
                                user_preferences: Dict[str, Any],
                                user_interactions: List[Dict[str, Any]]) -> RecommendationResponse:
        """Generate hybrid recommendations"""
        if not self.is_initialized:
            await self.initialize()
        
        start_time = datetime.now()
        logger.info(f"Generating hybrid recommendations for user {request.user_id}")
        
        try:
            # Determine user type for algorithm selection
            user_type = self._determine_user_type(user_interactions)
            
            # Get recommendations from different algorithms
            recommendations_by_algorithm = await self._get_multi_algorithm_recommendations(
                request, user_preferences, user_interactions, user_type
            )
            
            # Combine recommendations using hybrid approach
            hybrid_recommendations = await self._combine_recommendations(
                recommendations_by_algorithm, request, user_type
            )
            
            # Apply diversity and exploration
            final_recommendations = await self._apply_diversity_and_exploration(
                hybrid_recommendations, request
            )
            
            # Calculate metadata
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            user_profile_completeness = self._calculate_profile_completeness(
                user_preferences, user_interactions
            )
            
            # Determine algorithm used (dominant one)
            algorithm_used = self._get_dominant_algorithm(recommendations_by_algorithm)
            
            response = RecommendationResponse(
                user_id=request.user_id,
                recommendations=final_recommendations,
                total_count=len(final_recommendations),
                algorithm_used=algorithm_used,
                context=request.context,
                processing_time_ms=processing_time,
                model_version=self.model_version,
                user_profile_completeness=user_profile_completeness,
                cold_start_user=user_type == 'cold_start',
                fallback_used=len(user_interactions) < settings.MIN_INTERACTIONS_FOR_CF
            )
            
            logger.info(f"Generated {len(final_recommendations)} hybrid recommendations "
                       f"in {processing_time:.2f}ms")
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to generate hybrid recommendations: {e}")
            raise
    
    async def _get_multi_algorithm_recommendations(self, request: RecommendationRequest,
                                                 user_preferences: Dict[str, Any],
                                                 user_interactions: List[Dict[str, Any]],
                                                 user_type: str) -> Dict[str, List[RecommendationItem]]:
        """Get recommendations from multiple algorithms"""
        recommendations = {}
        
        # Convert interactions for collaborative filtering
        cf_interactions = [
            UserInteraction(
                user_id=UUID(interaction['user_id']),
                event_id=UUID(interaction['event_id']),
                interaction_type=interaction['interaction_type'],
                rating=interaction.get('rating')
            )
            for interaction in user_interactions
        ]
        
        # Collaborative Filtering (if user has enough interactions)
        if user_type != 'cold_start' and self.collaborative_recommender.is_trained:
            try:
                cf_recs = await self.collaborative_recommender.get_recommendations(
                    request.user_id, 
                    min(request.count * 2, 50),  # Get more than needed for diversity
                    request.exclude_events
                )
                recommendations['collaborative'] = cf_recs
                logger.info(f"Got {len(cf_recs)} collaborative filtering recommendations")
            except Exception as e:
                logger.warning(f"Collaborative filtering failed: {e}")
                recommendations['collaborative'] = []
        else:
            recommendations['collaborative'] = []
        
        # Content-Based Filtering
        if self.content_recommender.is_trained:
            try:
                content_recs = await self.content_recommender.get_recommendations(
                    request.user_id,
                    user_preferences,
                    user_interactions,
                    min(request.count * 2, 50),
                    request.exclude_events
                )
                recommendations['content'] = content_recs
                logger.info(f"Got {len(content_recs)} content-based recommendations")
            except Exception as e:
                logger.warning(f"Content-based filtering failed: {e}")
                recommendations['content'] = []
        else:
            recommendations['content'] = []
        
        # Popularity-based (fallback)
        try:
            popularity_recs = await self._get_popularity_recommendations(
                request, min(request.count, 20)
            )
            recommendations['popularity'] = popularity_recs
            logger.info(f"Got {len(popularity_recs)} popularity-based recommendations")
        except Exception as e:
            logger.warning(f"Popularity-based recommendations failed: {e}")
            recommendations['popularity'] = []
        
        # Location-based (if location provided)
        if request.location and settings.ENABLE_LOCATION_BASED:
            try:
                location_recs = await self._get_location_based_recommendations(
                    request, min(request.count, 15)
                )
                recommendations['location'] = location_recs
                logger.info(f"Got {len(location_recs)} location-based recommendations")
            except Exception as e:
                logger.warning(f"Location-based recommendations failed: {e}")
                recommendations['location'] = []
        
        # Trending events (if enabled)
        if settings.ENABLE_TRENDING_BOOST:
            try:
                trending_recs = await self._get_trending_recommendations(
                    request, min(request.count // 2, 10)
                )
                recommendations['trending'] = trending_recs
                logger.info(f"Got {len(trending_recs)} trending recommendations")
            except Exception as e:
                logger.warning(f"Trending recommendations failed: {e}")
                recommendations['trending'] = []
        
        return recommendations
    
    async def _combine_recommendations(self, recommendations_by_algorithm: Dict[str, List[RecommendationItem]],
                                     request: RecommendationRequest, user_type: str) -> List[RecommendationItem]:
        """Combine recommendations from different algorithms using weighted scoring"""
        try:
            # Adjust weights based on user type and algorithm performance
            adjusted_weights = self._adjust_weights(user_type, recommendations_by_algorithm)
            
            # Create a unified scoring system
            event_scores = {}
            event_details = {}
            
            for algorithm, recs in recommendations_by_algorithm.items():
                weight = adjusted_weights.get(algorithm, 0.0)
                
                for rec in recs:
                    event_id = str(rec.event_id)
                    
                    # Store event details (use first occurrence)
                    if event_id not in event_details:
                        event_details[event_id] = rec
                    
                    # Combine scores with weights
                    if event_id not in event_scores:
                        event_scores[event_id] = {
                            'total_score': 0.0,
                            'algorithm_scores': {},
                            'confidence': 0.0,
                            'reasons': set(),
                            'algorithms': set()
                        }
                    
                    # Weight the score by algorithm performance and preference
                    weighted_score = rec.score * weight * rec.confidence
                    event_scores[event_id]['total_score'] += weighted_score
                    event_scores[event_id]['algorithm_scores'][algorithm] = rec.score
                    event_scores[event_id]['confidence'] = max(
                        event_scores[event_id]['confidence'], rec.confidence
                    )
                    event_scores[event_id]['reasons'].update(rec.reasons)
                    event_scores[event_id]['algorithms'].add(algorithm)
            
            # Sort events by combined score
            sorted_events = sorted(
                event_scores.items(),
                key=lambda x: x[1]['total_score'],
                reverse=True
            )
            
            # Create final recommendation list
            combined_recommendations = []
            for rank, (event_id, score_data) in enumerate(sorted_events[:request.count * 2], 1):
                if event_id not in event_details:
                    continue
                
                original_rec = event_details[event_id]
                
                # Determine primary algorithm
                primary_algorithm = max(
                    score_data['algorithm_scores'].items(),
                    key=lambda x: x[1]
                )[0] if score_data['algorithm_scores'] else 'hybrid'
                
                # Create hybrid recommendation
                hybrid_rec = RecommendationItem(
                    event_id=original_rec.event_id,
                    score=min(1.0, score_data['total_score']),
                    algorithm=RecommendationAlgorithm.HYBRID,
                    confidence=score_data['confidence'],
                    rank=rank,
                    reasons=list(score_data['reasons'])[:3],
                    title=original_rec.title,
                    short_description=original_rec.short_description,
                    category=original_rec.category,
                    tags=original_rec.tags,
                    start_time=original_rec.start_time,
                    is_virtual=original_rec.is_virtual,
                    price=original_rec.price,
                    venue_name=original_rec.venue_name,
                    organizer_name=original_rec.organizer_name,
                    image_url=original_rec.image_url
                )
                
                combined_recommendations.append(hybrid_rec)
            
            return combined_recommendations
            
        except Exception as e:
            logger.error(f"Failed to combine recommendations: {e}")
            return []
    
    def _adjust_weights(self, user_type: str, 
                       recommendations_by_algorithm: Dict[str, List[RecommendationItem]]) -> Dict[str, float]:
        """Adjust algorithm weights based on user type and availability"""
        weights = self.weights.copy()
        
        # Adjust for user type
        if user_type == 'cold_start':
            # For new users, rely more on content and popularity
            weights['collaborative'] = 0.1
            weights['content'] = 0.5
            weights['popularity'] = 0.3
            weights['diversity'] = 0.1
        elif user_type == 'active':
            # For active users, use standard weights
            pass
        elif user_type == 'sparse':
            # For users with few interactions, balance content and collaborative
            weights['collaborative'] = 0.3
            weights['content'] = 0.4
            weights['popularity'] = 0.2
            weights['diversity'] = 0.1
        
        # Adjust based on algorithm availability and performance
        available_algorithms = set(recommendations_by_algorithm.keys())
        
        # If collaborative filtering has no recommendations, redistribute its weight
        if 'collaborative' in available_algorithms and not recommendations_by_algorithm['collaborative']:
            cf_weight = weights['collaborative']
            weights['collaborative'] = 0.0
            weights['content'] += cf_weight * 0.6
            weights['popularity'] += cf_weight * 0.4
        
        # If content-based has no recommendations, redistribute its weight
        if 'content' in available_algorithms and not recommendations_by_algorithm['content']:
            content_weight = weights['content']
            weights['content'] = 0.0
            weights['collaborative'] += content_weight * 0.6
            weights['popularity'] += content_weight * 0.4
        
        # Normalize weights
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        
        logger.info(f"Adjusted weights for {user_type} user: {weights}")
        return weights
    
    def _determine_user_type(self, user_interactions: List[Dict[str, Any]]) -> str:
        """Determine user type based on interaction history"""
        num_interactions = len(user_interactions)
        
        if num_interactions == 0:
            return 'cold_start'
        elif num_interactions < settings.MIN_INTERACTIONS_FOR_CF:
            return 'sparse'
        elif num_interactions >= 20:
            return 'active'
        else:
            return 'normal'
    
    async def _apply_diversity_and_exploration(self, recommendations: List[RecommendationItem],
                                             request: RecommendationRequest) -> List[RecommendationItem]:
        """Apply diversity and exploration to recommendations"""
        try:
            if not recommendations:
                return recommendations
            
            # Apply diversity factor if specified
            diversity_factor = request.diversity_factor or settings.DIVERSITY_FACTOR
            
            if diversity_factor > 0:
                recommendations = await self._diversify_recommendations(
                    recommendations, diversity_factor
                )
            
            # Apply exploration (inject some random/serendipitous recommendations)
            if settings.EXPLORATION_FACTOR > 0:
                recommendations = await self._add_exploration_items(
                    recommendations, request
                )
            
            # Final ranking and truncation
            final_recommendations = recommendations[:request.count]
            
            # Update ranks
            for i, rec in enumerate(final_recommendations, 1):
                rec.rank = i
            
            return final_recommendations
            
        except Exception as e:
            logger.error(f"Failed to apply diversity and exploration: {e}")
            return recommendations[:request.count]
    
    async def _diversify_recommendations(self, recommendations: List[RecommendationItem],
                                       diversity_factor: float) -> List[RecommendationItem]:
        """Diversify recommendations to avoid over-concentration in categories"""
        try:
            if diversity_factor <= 0 or not recommendations:
                return recommendations
            
            # Group by category
            category_groups = {}
            for rec in recommendations:
                category = rec.category or 'unknown'
                if category not in category_groups:
                    category_groups[category] = []
                category_groups[category].append(rec)
            
            # Apply diversity by limiting items per category
            max_per_category = max(1, int(len(recommendations) * (1 - diversity_factor) / len(category_groups)))
            
            diversified = []
            remaining = recommendations.copy()
            
            # First pass: take top items from each category
            round_robin = True
            while remaining and round_robin:
                round_robin = False
                for category in category_groups:
                    category_items = [r for r in remaining if (r.category or 'unknown') == category]
                    if category_items:
                        # Take highest scored item from this category
                        best_item = max(category_items, key=lambda x: x.score)
                        diversified.append(best_item)
                        remaining.remove(best_item)
                        round_robin = True
                        
                        if len(diversified) >= len(recommendations):
                            break
                
                if len(diversified) >= len(recommendations):
                    break
            
            # Add any remaining high-scored items
            remaining.sort(key=lambda x: x.score, reverse=True)
            diversified.extend(remaining[:len(recommendations) - len(diversified)])
            
            return diversified
            
        except Exception as e:
            logger.error(f"Failed to diversify recommendations: {e}")
            return recommendations
    
    async def _add_exploration_items(self, recommendations: List[RecommendationItem],
                                   request: RecommendationRequest) -> List[RecommendationItem]:
        """Add some exploration/serendipitous items"""
        try:
            exploration_count = max(1, int(len(recommendations) * settings.EXPLORATION_FACTOR))
            
            if exploration_count > 0:
                # Get some random popular events not in current recommendations
                current_event_ids = {rec.event_id for rec in recommendations}
                exclude_events = list(current_event_ids) + (request.exclude_events or [])
                
                exploration_recs = await self._get_popularity_recommendations(
                    request, exploration_count * 2
                )
                
                # Filter out already included events
                exploration_recs = [
                    rec for rec in exploration_recs 
                    if rec.event_id not in current_event_ids
                ][:exploration_count]
                
                # Mark as exploration items
                for rec in exploration_recs:
                    rec.reasons = ["Explore something new"] + rec.reasons[:2]
                    rec.algorithm = RecommendationAlgorithm.HYBRID
                    rec.score *= 0.8  # Slightly lower score to indicate exploration
                
                # Insert exploration items at strategic positions
                combined = recommendations[:-exploration_count] + exploration_recs
                combined.sort(key=lambda x: x.score, reverse=True)
                
                return combined
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to add exploration items: {e}")
            return recommendations
    
    async def _get_popularity_recommendations(self, request: RecommendationRequest,
                                            count: int) -> List[RecommendationItem]:
        """Get popularity-based recommendations as fallback"""
        # This would typically query the database for most popular events
        # For now, return empty list - would be implemented with actual data access
        return []
    
    async def _get_location_based_recommendations(self, request: RecommendationRequest,
                                                count: int) -> List[RecommendationItem]:
        """Get location-based recommendations"""
        # This would use geolocation to find nearby events
        # For now, return empty list - would be implemented with actual data access
        return []
    
    async def _get_trending_recommendations(self, request: RecommendationRequest,
                                          count: int) -> List[RecommendationItem]:
        """Get trending/viral events"""
        # This would identify events with high recent engagement
        # For now, return empty list - would be implemented with actual data access
        return []
    
    def _calculate_profile_completeness(self, preferences: Dict[str, Any],
                                       interactions: List[Dict[str, Any]]) -> float:
        """Calculate user profile completeness score"""
        score = 0.0
        
        # Preferences completeness
        if preferences:
            if preferences.get('preferred_categories'):
                score += 0.2
            if preferences.get('preferred_locations'):
                score += 0.15
            if preferences.get('interests'):
                score += 0.15
            if preferences.get('price_range_min') is not None:
                score += 0.1
            if preferences.get('price_range_max') is not None:
                score += 0.1
        
        # Interaction history completeness
        num_interactions = len(interactions)
        if num_interactions > 0:
            interaction_score = min(0.3, num_interactions / 50)  # Cap at 30%
            score += interaction_score
        
        return min(1.0, score)
    
    def _get_dominant_algorithm(self, recommendations_by_algorithm: Dict[str, List[RecommendationItem]]) -> RecommendationAlgorithm:
        """Determine which algorithm contributed most to final recommendations"""
        if not recommendations_by_algorithm:
            return RecommendationAlgorithm.HYBRID
        
        # Count recommendations by algorithm
        algorithm_counts = {
            alg: len(recs) for alg, recs in recommendations_by_algorithm.items()
        }
        
        if not algorithm_counts:
            return RecommendationAlgorithm.HYBRID
        
        dominant_alg = max(algorithm_counts.items(), key=lambda x: x[1])[0]
        
        # Map to enum
        algorithm_mapping = {
            'collaborative': RecommendationAlgorithm.COLLABORATIVE_FILTERING,
            'content': RecommendationAlgorithm.CONTENT_BASED,
            'popularity': RecommendationAlgorithm.POPULARITY_BASED,
            'location': RecommendationAlgorithm.LOCATION_BASED,
            'trending': RecommendationAlgorithm.TRENDING
        }
        
        return algorithm_mapping.get(dominant_alg, RecommendationAlgorithm.HYBRID)
    
    async def train_models(self, events_data: List[Dict[str, Any]], 
                          interactions_data: List[UserInteraction]):
        """Train all recommendation models"""
        logger.info("Training hybrid recommendation models...")
        
        try:
            # Train collaborative filtering if enough interactions
            if len(interactions_data) >= settings.MIN_INTERACTIONS_FOR_CF:
                await self.collaborative_recommender.train(interactions_data)
            
            # Train content-based filtering
            if events_data:
                await self.content_recommender.train(events_data)
            
            logger.info("Hybrid recommendation models trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train models: {e}")
            raise
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about all models"""
        return {
            "hybrid": {
                "version": self.model_version,
                "weights": self.weights,
                "performance": self.algorithm_performance
            },
            "collaborative": self.collaborative_recommender.get_model_info(),
            "content_based": self.content_recommender.get_model_info()
        }