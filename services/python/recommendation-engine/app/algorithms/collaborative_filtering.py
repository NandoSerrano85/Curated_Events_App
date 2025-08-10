"""Collaborative filtering recommendation algorithm using matrix factorization"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from uuid import UUID
import asyncio
from scipy.sparse import csr_matrix
from sklearn.decomposition import NMF
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os

from app.config import get_settings
from app.models.recommendation import RecommendationItem, RecommendationAlgorithm, UserInteraction

logger = logging.getLogger(__name__)
settings = get_settings()


class CollaborativeFilteringRecommender:
    """Matrix factorization-based collaborative filtering recommender"""
    
    def __init__(self):
        self.model = None
        self.user_encoder = {}
        self.event_encoder = {}
        self.user_decoder = {}
        self.event_decoder = {}
        self.interaction_matrix = None
        self.user_factors = None
        self.item_factors = None
        self.user_bias = None
        self.item_bias = None
        self.global_bias = 0.0
        self.is_trained = False
        self.model_version = "1.0.0"
        
    async def train(self, interactions: List[UserInteraction]) -> None:
        """Train the collaborative filtering model"""
        if len(interactions) < settings.MIN_INTERACTIONS_FOR_CF:
            logger.warning(f"Not enough interactions ({len(interactions)}) for collaborative filtering training")
            return
        
        logger.info(f"Training collaborative filtering model with {len(interactions)} interactions")
        
        try:
            # Convert interactions to DataFrame
            df = pd.DataFrame([
                {
                    'user_id': str(interaction.user_id),
                    'event_id': str(interaction.event_id),
                    'rating': self._interaction_to_rating(interaction)
                }
                for interaction in interactions
            ])
            
            # Create user and event encoders
            unique_users = df['user_id'].unique()
            unique_events = df['event_id'].unique()
            
            self.user_encoder = {user: idx for idx, user in enumerate(unique_users)}
            self.event_encoder = {event: idx for idx, event in enumerate(unique_events)}
            self.user_decoder = {idx: user for user, idx in self.user_encoder.items()}
            self.event_decoder = {idx: event for event, idx in self.event_encoder.items()}
            
            # Create interaction matrix
            n_users = len(unique_users)
            n_events = len(unique_events)
            
            # Encode user and event IDs
            df['user_idx'] = df['user_id'].map(self.user_encoder)
            df['event_idx'] = df['event_id'].map(self.event_encoder)
            
            # Create sparse matrix
            self.interaction_matrix = csr_matrix(
                (df['rating'], (df['user_idx'], df['event_idx'])),
                shape=(n_users, n_events)
            )
            
            # Train matrix factorization model
            await self._train_matrix_factorization()
            
            self.is_trained = True
            logger.info("Collaborative filtering model trained successfully")
            
            # Save model
            await self._save_model()
            
        except Exception as e:
            logger.error(f"Failed to train collaborative filtering model: {e}")
            raise
    
    async def _train_matrix_factorization(self):
        """Train matrix factorization using NMF"""
        try:
            # Use Non-negative Matrix Factorization
            self.model = NMF(
                n_components=settings.CF_N_FACTORS,
                init='nndsvd',
                solver='mu',
                max_iter=settings.CF_N_EPOCHS,
                random_state=42
            )
            
            # Fit the model
            self.user_factors = self.model.fit_transform(self.interaction_matrix)
            self.item_factors = self.model.components_.T
            
            # Calculate biases
            self.global_bias = self.interaction_matrix.data.mean()
            
            # User biases
            user_means = np.array(self.interaction_matrix.mean(axis=1)).flatten()
            self.user_bias = user_means - self.global_bias
            
            # Item biases
            item_means = np.array(self.interaction_matrix.mean(axis=0)).flatten()
            self.item_bias = item_means - self.global_bias
            
            logger.info(f"Matrix factorization completed with {settings.CF_N_FACTORS} factors")
            
        except Exception as e:
            logger.error(f"Matrix factorization training failed: {e}")
            raise
    
    def _interaction_to_rating(self, interaction: UserInteraction) -> float:
        """Convert interaction to rating"""
        if interaction.rating is not None:
            return float(interaction.rating)
        
        # Convert interaction type to implicit rating
        type_ratings = {
            'register': 5.0,
            'like': 4.0,
            'save': 4.0,
            'share': 4.0,
            'click': 3.0,
            'view': 2.0,
            'comment': 3.5
        }
        
        base_rating = type_ratings.get(interaction.interaction_type, 2.0)
        
        # Adjust based on duration for view interactions
        if interaction.interaction_type == 'view' and interaction.duration_seconds:
            if interaction.duration_seconds > 300:  # 5 minutes
                base_rating += 1.0
            elif interaction.duration_seconds > 60:  # 1 minute
                base_rating += 0.5
        
        return min(5.0, base_rating)
    
    async def get_recommendations(self, user_id: UUID, count: int = 20, 
                                exclude_events: List[UUID] = None) -> List[RecommendationItem]:
        """Generate collaborative filtering recommendations for a user"""
        if not self.is_trained:
            logger.warning("Collaborative filtering model not trained yet")
            return []
        
        try:
            user_id_str = str(user_id)
            
            # Check if user is in training data
            if user_id_str not in self.user_encoder:
                logger.info(f"User {user_id} not in training data, using popularity-based fallback")
                return await self._get_popularity_based_recommendations(count, exclude_events)
            
            user_idx = self.user_encoder[user_id_str]
            
            # Calculate predicted ratings for all events
            user_vector = self.user_factors[user_idx]
            predicted_ratings = np.dot(user_vector, self.item_factors.T)
            
            # Add biases
            predicted_ratings += self.global_bias + self.user_bias[user_idx] + self.item_bias
            
            # Get events user hasn't interacted with
            user_interactions = set(self.interaction_matrix[user_idx].nonzero()[1])
            
            # Exclude events that user has already interacted with
            exclude_indices = user_interactions.copy()
            
            # Exclude specifically requested events
            if exclude_events:
                for event_id in exclude_events:
                    event_id_str = str(event_id)
                    if event_id_str in self.event_encoder:
                        exclude_indices.add(self.event_encoder[event_id_str])
            
            # Create recommendations
            recommendations = []
            event_scores = list(enumerate(predicted_ratings))
            event_scores.sort(key=lambda x: x[1], reverse=True)
            
            rank = 1
            for event_idx, score in event_scores:
                if event_idx in exclude_indices:
                    continue
                
                if len(recommendations) >= count:
                    break
                
                event_id = UUID(self.event_decoder[event_idx])
                
                # Calculate confidence based on user's interaction history
                confidence = min(0.9, 0.5 + (len(user_interactions) / 100))
                
                recommendations.append(RecommendationItem(
                    event_id=event_id,
                    score=min(1.0, max(0.0, score / 5.0)),  # Normalize to 0-1
                    algorithm=RecommendationAlgorithm.COLLABORATIVE_FILTERING,
                    confidence=confidence,
                    rank=rank,
                    reasons=[f"Users with similar preferences also liked this event"],
                    title="",  # Will be filled by the calling service
                    category="",
                    tags=[],
                    start_time=None,
                    is_virtual=False,
                    organizer_name=""
                ))
                
                rank += 1
            
            logger.info(f"Generated {len(recommendations)} collaborative filtering recommendations for user {user_id}")
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate collaborative filtering recommendations: {e}")
            return []
    
    async def get_similar_users(self, user_id: UUID, count: int = 10) -> List[Tuple[UUID, float]]:
        """Find users similar to the given user"""
        if not self.is_trained:
            return []
        
        try:
            user_id_str = str(user_id)
            if user_id_str not in self.user_encoder:
                return []
            
            user_idx = self.user_encoder[user_id_str]
            user_vector = self.user_factors[user_idx].reshape(1, -1)
            
            # Calculate similarities with all other users
            similarities = cosine_similarity(user_vector, self.user_factors)[0]
            
            # Get top similar users (excluding the user themselves)
            similar_indices = similarities.argsort()[::-1][1:count+1]
            
            similar_users = []
            for idx in similar_indices:
                similar_user_id = UUID(self.user_decoder[idx])
                similarity_score = similarities[idx]
                similar_users.append((similar_user_id, similarity_score))
            
            return similar_users
            
        except Exception as e:
            logger.error(f"Failed to find similar users: {e}")
            return []
    
    async def _get_popularity_based_recommendations(self, count: int, 
                                                  exclude_events: List[UUID] = None) -> List[RecommendationItem]:
        """Fallback to popularity-based recommendations for cold start users"""
        try:
            if self.interaction_matrix is None:
                return []
            
            # Calculate popularity scores (number of interactions per event)
            event_popularity = np.array(self.interaction_matrix.sum(axis=0)).flatten()
            
            # Get top popular events
            popular_indices = event_popularity.argsort()[::-1]
            
            exclude_indices = set()
            if exclude_events:
                for event_id in exclude_events:
                    event_id_str = str(event_id)
                    if event_id_str in self.event_encoder:
                        exclude_indices.add(self.event_encoder[event_id_str])
            
            recommendations = []
            rank = 1
            
            for event_idx in popular_indices:
                if event_idx in exclude_indices:
                    continue
                
                if len(recommendations) >= count:
                    break
                
                event_id = UUID(self.event_decoder[event_idx])
                popularity_score = event_popularity[event_idx]
                
                # Normalize popularity score
                max_popularity = event_popularity.max() if event_popularity.max() > 0 else 1
                normalized_score = popularity_score / max_popularity
                
                recommendations.append(RecommendationItem(
                    event_id=event_id,
                    score=normalized_score,
                    algorithm=RecommendationAlgorithm.POPULARITY_BASED,
                    confidence=0.6,
                    rank=rank,
                    reasons=["Popular event among all users"],
                    title="",
                    category="",
                    tags=[],
                    start_time=None,
                    is_virtual=False,
                    organizer_name=""
                ))
                
                rank += 1
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate popularity-based recommendations: {e}")
            return []
    
    async def get_event_similarity(self, event_id1: UUID, event_id2: UUID) -> float:
        """Calculate similarity between two events based on user interactions"""
        if not self.is_trained:
            return 0.0
        
        try:
            event_id1_str = str(event_id1)
            event_id2_str = str(event_id2)
            
            if (event_id1_str not in self.event_encoder or 
                event_id2_str not in self.event_encoder):
                return 0.0
            
            event_idx1 = self.event_encoder[event_id1_str]
            event_idx2 = self.event_encoder[event_id2_str]
            
            # Get event vectors from item factors
            event_vector1 = self.item_factors[event_idx1].reshape(1, -1)
            event_vector2 = self.item_factors[event_idx2].reshape(1, -1)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(event_vector1, event_vector2)[0][0]
            
            return max(0.0, similarity)
            
        except Exception as e:
            logger.error(f"Failed to calculate event similarity: {e}")
            return 0.0
    
    async def _save_model(self):
        """Save the trained model to disk"""
        try:
            model_dir = settings.MODEL_CACHE_DIR
            os.makedirs(model_dir, exist_ok=True)
            
            model_data = {
                'user_encoder': self.user_encoder,
                'event_encoder': self.event_encoder,
                'user_decoder': self.user_decoder,
                'event_decoder': self.event_decoder,
                'user_factors': self.user_factors,
                'item_factors': self.item_factors,
                'user_bias': self.user_bias,
                'item_bias': self.item_bias,
                'global_bias': self.global_bias,
                'model_version': self.model_version
            }
            
            model_path = os.path.join(model_dir, 'collaborative_filtering_model.pkl')
            with open(model_path, 'wb') as f:
                pickle.dump(model_data, f)
            
            logger.info(f"Collaborative filtering model saved to {model_path}")
            
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    async def load_model(self):
        """Load a previously trained model from disk"""
        try:
            model_path = os.path.join(settings.MODEL_CACHE_DIR, 'collaborative_filtering_model.pkl')
            
            if not os.path.exists(model_path):
                logger.info("No saved collaborative filtering model found")
                return False
            
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.user_encoder = model_data['user_encoder']
            self.event_encoder = model_data['event_encoder']
            self.user_decoder = model_data['user_decoder']
            self.event_decoder = model_data['event_decoder']
            self.user_factors = model_data['user_factors']
            self.item_factors = model_data['item_factors']
            self.user_bias = model_data['user_bias']
            self.item_bias = model_data['item_bias']
            self.global_bias = model_data['global_bias']
            self.model_version = model_data.get('model_version', '1.0.0')
            
            self.is_trained = True
            logger.info("Collaborative filtering model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def get_model_info(self) -> Dict:
        """Get information about the trained model"""
        if not self.is_trained:
            return {"trained": False}
        
        return {
            "trained": True,
            "model_version": self.model_version,
            "n_users": len(self.user_encoder),
            "n_events": len(self.event_encoder),
            "n_factors": settings.CF_N_FACTORS,
            "global_bias": float(self.global_bias)
        }