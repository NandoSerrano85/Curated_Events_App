"""Content-based filtering recommendation algorithm"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from uuid import UUID
import asyncio
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import pickle
import os
from datetime import datetime, timedelta

from app.config import get_settings
from app.models.recommendation import RecommendationItem, RecommendationAlgorithm

logger = logging.getLogger(__name__)
settings = get_settings()


class ContentBasedRecommender:
    """Content-based filtering using event features and embeddings"""
    
    def __init__(self):
        self.text_vectorizer = None
        self.sentence_embedder = None
        self.event_features = {}
        self.event_embeddings = {}
        self.category_encoder = {}
        self.tag_vocabulary = set()
        self.is_trained = False
        self.model_version = "1.0.0"
        
    async def initialize(self):
        """Initialize models and vectorizers"""
        try:
            logger.info("Initializing content-based recommender...")
            
            # Initialize TF-IDF vectorizer for text features
            self.text_vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=2,
                max_df=0.8
            )
            
            # Initialize sentence transformer for semantic embeddings
            self.sentence_embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
            
            # Try to load existing model
            await self.load_model()
            
            logger.info("Content-based recommender initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize content-based recommender: {e}")
            raise
    
    async def train(self, events_data: List[Dict[str, Any]]) -> None:
        """Train the content-based model with event data"""
        if not events_data:
            logger.warning("No events data provided for training")
            return
        
        logger.info(f"Training content-based model with {len(events_data)} events")
        
        try:
            # Convert to DataFrame for easier processing
            df = pd.DataFrame(events_data)
            
            # Process event features
            await self._process_event_features(df)
            
            # Create text embeddings
            await self._create_text_embeddings(df)
            
            # Build category encoder
            self._build_category_encoder(df)
            
            # Build tag vocabulary
            self._build_tag_vocabulary(df)
            
            self.is_trained = True
            logger.info("Content-based model trained successfully")
            
            # Save model
            await self._save_model()
            
        except Exception as e:
            logger.error(f"Failed to train content-based model: {e}")
            raise
    
    async def _process_event_features(self, df: pd.DataFrame):
        """Extract and process event features"""
        try:
            self.event_features = {}
            
            for idx, event in df.iterrows():
                event_id = str(event['id'])
                
                # Combine text content
                text_content = self._combine_text_content(event)
                
                # Extract features
                features = {
                    'title': event.get('title', ''),
                    'description': event.get('description', ''),
                    'short_description': event.get('short_description', ''),
                    'category': event.get('category', ''),
                    'tags': event.get('tags', []),
                    'organizer_name': event.get('organizer_name', ''),
                    'venue_name': event.get('venue_name', ''),
                    'is_virtual': event.get('is_virtual', False),
                    'price': event.get('price', 0.0),
                    'text_content': text_content,
                    'start_time': event.get('start_time'),
                    'location': event.get('location', {}),
                    'images_count': len(event.get('images', [])),
                    'curation_score': event.get('curation_score', 0.5)
                }
                
                self.event_features[event_id] = features
            
            logger.info(f"Processed features for {len(self.event_features)} events")
            
        except Exception as e:
            logger.error(f"Failed to process event features: {e}")
            raise
    
    async def _create_text_embeddings(self, df: pd.DataFrame):
        """Create semantic embeddings for event text content"""
        try:
            texts = []
            event_ids = []
            
            for idx, event in df.iterrows():
                event_id = str(event['id'])
                text_content = self._combine_text_content(event)
                
                texts.append(text_content)
                event_ids.append(event_id)
            
            # Create embeddings in batches
            batch_size = 32
            embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                batch_embeddings = self.sentence_embedder.encode(batch_texts)
                embeddings.extend(batch_embeddings)
            
            # Store embeddings
            self.event_embeddings = {}
            for event_id, embedding in zip(event_ids, embeddings):
                self.event_embeddings[event_id] = embedding
            
            logger.info(f"Created embeddings for {len(self.event_embeddings)} events")
            
        except Exception as e:
            logger.error(f"Failed to create text embeddings: {e}")
            raise
    
    def _build_category_encoder(self, df: pd.DataFrame):
        """Build category encoder for categorical features"""
        categories = df['category'].dropna().unique()
        self.category_encoder = {cat: idx for idx, cat in enumerate(categories)}
        logger.info(f"Built category encoder with {len(categories)} categories")
    
    def _build_tag_vocabulary(self, df: pd.DataFrame):
        """Build tag vocabulary"""
        all_tags = []
        for tags in df['tags'].dropna():
            if isinstance(tags, list):
                all_tags.extend(tags)
        
        self.tag_vocabulary = set(all_tags)
        logger.info(f"Built tag vocabulary with {len(self.tag_vocabulary)} tags")
    
    def _combine_text_content(self, event: Dict[str, Any]) -> str:
        """Combine all text content for an event"""
        content_parts = []
        
        # Title (weighted more heavily)
        if event.get('title'):
            content_parts.extend([event['title']] * 3)
        
        # Description
        if event.get('description'):
            content_parts.append(event['description'])
        
        # Short description
        if event.get('short_description'):
            content_parts.append(event['short_description'])
        
        # Category (weighted)
        if event.get('category'):
            content_parts.extend([event['category']] * 2)
        
        # Tags (weighted)
        if event.get('tags') and isinstance(event['tags'], list):
            content_parts.extend(event['tags'] * 2)
        
        # Organizer name
        if event.get('organizer_name'):
            content_parts.append(event['organizer_name'])
        
        # Venue name
        if event.get('venue_name'):
            content_parts.append(event['venue_name'])
        
        return ' '.join(content_parts)
    
    async def get_recommendations(self, user_id: UUID, user_preferences: Dict[str, Any],
                                user_interactions: List[Dict[str, Any]], count: int = 20,
                                exclude_events: List[UUID] = None) -> List[RecommendationItem]:
        """Generate content-based recommendations for a user"""
        if not self.is_trained:
            logger.warning("Content-based model not trained yet")
            return []
        
        try:
            logger.info(f"Generating content-based recommendations for user {user_id}")
            
            # Build user profile from interactions and preferences
            user_profile = self._build_user_profile(user_preferences, user_interactions)
            
            # Calculate event scores
            event_scores = await self._calculate_event_scores(user_profile, exclude_events)
            
            # Sort by score and take top events
            sorted_events = sorted(event_scores.items(), key=lambda x: x[1], reverse=True)
            top_events = sorted_events[:count]
            
            # Create recommendation items
            recommendations = []
            for rank, (event_id, score) in enumerate(top_events, 1):
                event_features = self.event_features[event_id]
                
                # Generate explanation
                reasons = self._generate_explanation(user_profile, event_features)
                
                # Calculate confidence based on profile completeness
                confidence = self._calculate_confidence(user_profile, event_features)
                
                recommendations.append(RecommendationItem(
                    event_id=UUID(event_id),
                    score=min(1.0, max(0.0, score)),
                    algorithm=RecommendationAlgorithm.CONTENT_BASED,
                    confidence=confidence,
                    rank=rank,
                    reasons=reasons,
                    title=event_features['title'],
                    short_description=event_features['short_description'],
                    category=event_features['category'],
                    tags=event_features['tags'],
                    start_time=event_features['start_time'],
                    is_virtual=event_features['is_virtual'],
                    price=event_features['price'],
                    venue_name=event_features['venue_name'],
                    organizer_name=event_features['organizer_name']
                ))
            
            logger.info(f"Generated {len(recommendations)} content-based recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate content-based recommendations: {e}")
            return []
    
    def _build_user_profile(self, preferences: Dict[str, Any], 
                           interactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build user profile from preferences and interaction history"""
        profile = {
            'preferred_categories': set(),
            'preferred_tags': set(),
            'preferred_locations': set(),
            'price_preferences': {'min': 0, 'max': float('inf')},
            'virtual_preference': 0.5,  # 0 = prefer in-person, 1 = prefer virtual
            'text_preferences': [],
            'organizer_preferences': set(),
            'venue_preferences': set()
        }
        
        # Extract from explicit preferences
        if preferences:
            profile['preferred_categories'].update(preferences.get('preferred_categories', []))
            profile['preferred_tags'].update(preferences.get('interests', []))
            profile['preferred_locations'].update(preferences.get('preferred_locations', []))
            
            if preferences.get('price_range_min') is not None:
                profile['price_preferences']['min'] = preferences['price_range_min']
            if preferences.get('price_range_max') is not None:
                profile['price_preferences']['max'] = preferences['price_range_max']
        
        # Learn from interaction history
        for interaction in interactions:
            event_id = str(interaction['event_id'])
            if event_id in self.event_features:
                event = self.event_features[event_id]
                
                # Weight interactions by type
                weight = self._get_interaction_weight(interaction['interaction_type'])
                
                # Accumulate preferences
                if event['category']:
                    profile['preferred_categories'].add(event['category'])
                
                if event['tags']:
                    profile['preferred_tags'].update(event['tags'])
                
                if event['organizer_name']:
                    profile['organizer_preferences'].add(event['organizer_name'])
                
                if event['venue_name']:
                    profile['venue_preferences'].add(event['venue_name'])
                
                # Learn virtual preference
                if event['is_virtual']:
                    profile['virtual_preference'] = min(1.0, profile['virtual_preference'] + 0.1 * weight)
                else:
                    profile['virtual_preference'] = max(0.0, profile['virtual_preference'] - 0.1 * weight)
                
                # Collect text for content similarity
                profile['text_preferences'].append(event['text_content'])
        
        return profile
    
    def _get_interaction_weight(self, interaction_type: str) -> float:
        """Get weight for different interaction types"""
        weights = {
            'register': 1.0,
            'like': 0.8,
            'save': 0.8,
            'share': 0.7,
            'click': 0.5,
            'view': 0.3,
            'comment': 0.6,
            'rate': 0.9
        }
        return weights.get(interaction_type, 0.3)
    
    async def _calculate_event_scores(self, user_profile: Dict[str, Any], 
                                    exclude_events: List[UUID] = None) -> Dict[str, float]:
        """Calculate scores for all events based on user profile"""
        scores = {}
        exclude_event_ids = {str(event_id) for event_id in (exclude_events or [])}
        
        for event_id, event_features in self.event_features.items():
            if event_id in exclude_event_ids:
                continue
            
            score = 0.0
            
            # Category similarity
            category_score = self._calculate_category_similarity(user_profile, event_features)
            score += category_score * settings.CATEGORY_WEIGHT
            
            # Tag similarity
            tag_score = self._calculate_tag_similarity(user_profile, event_features)
            score += tag_score * settings.TAG_WEIGHT
            
            # Text/semantic similarity
            text_score = self._calculate_text_similarity(user_profile, event_features)
            score += text_score * settings.DESCRIPTION_WEIGHT
            
            # Location preference (if applicable)
            location_score = self._calculate_location_preference(user_profile, event_features)
            score += location_score * settings.LOCATION_WEIGHT
            
            # Price preference
            price_score = self._calculate_price_preference(user_profile, event_features)
            score *= price_score  # Multiplicative penalty for price mismatch
            
            # Virtual preference
            virtual_score = self._calculate_virtual_preference(user_profile, event_features)
            score *= virtual_score
            
            # Boost recent events
            time_score = self._calculate_time_relevance(event_features)
            score *= time_score
            
            # Curation score boost
            curation_boost = event_features.get('curation_score', 0.5)
            score *= (0.5 + 0.5 * curation_boost)
            
            scores[event_id] = score
        
        return scores
    
    def _calculate_category_similarity(self, user_profile: Dict[str, Any], 
                                     event_features: Dict[str, Any]) -> float:
        """Calculate category-based similarity score"""
        if not user_profile['preferred_categories']:
            return 0.5  # Neutral score if no preferences
        
        if event_features['category'] in user_profile['preferred_categories']:
            return 1.0
        
        # Could add category hierarchy similarity here
        return 0.1
    
    def _calculate_tag_similarity(self, user_profile: Dict[str, Any], 
                                event_features: Dict[str, Any]) -> float:
        """Calculate tag-based similarity score"""
        if not user_profile['preferred_tags'] or not event_features['tags']:
            return 0.5
        
        event_tags = set(event_features['tags'])
        intersection = user_profile['preferred_tags'].intersection(event_tags)
        union = user_profile['preferred_tags'].union(event_tags)
        
        if not union:
            return 0.5
        
        return len(intersection) / len(union)
    
    def _calculate_text_similarity(self, user_profile: Dict[str, Any], 
                                 event_features: Dict[str, Any]) -> float:
        """Calculate semantic text similarity"""
        if not user_profile['text_preferences']:
            return 0.5
        
        event_id = None
        for eid, features in self.event_features.items():
            if features == event_features:
                event_id = eid
                break
        
        if event_id is None or event_id not in self.event_embeddings:
            return 0.5
        
        event_embedding = self.event_embeddings[event_id]
        
        # Calculate similarity with user's preferred content
        max_similarity = 0.0
        for preferred_text in user_profile['text_preferences']:
            # Get embedding for preferred text
            preferred_embedding = self.sentence_embedder.encode([preferred_text])[0]
            
            # Calculate cosine similarity
            similarity = cosine_similarity(
                [event_embedding], [preferred_embedding]
            )[0][0]
            
            max_similarity = max(max_similarity, similarity)
        
        return max_similarity
    
    def _calculate_location_preference(self, user_profile: Dict[str, Any], 
                                     event_features: Dict[str, Any]) -> float:
        """Calculate location-based preference score"""
        if not user_profile['preferred_locations']:
            return 1.0  # No penalty if no location preferences
        
        if event_features['is_virtual']:
            # Virtual events match if user prefers online events
            return 1.0 if 'online' in user_profile['preferred_locations'] else 0.8
        
        if event_features['venue_name']:
            venue_location = event_features['venue_name'].lower()
            for preferred_loc in user_profile['preferred_locations']:
                if preferred_loc.lower() in venue_location:
                    return 1.0
        
        return 0.5  # Neutral if location doesn't match but isn't excluded
    
    def _calculate_price_preference(self, user_profile: Dict[str, Any], 
                                  event_features: Dict[str, Any]) -> float:
        """Calculate price preference score"""
        event_price = event_features.get('price', 0.0) or 0.0
        min_price = user_profile['price_preferences']['min']
        max_price = user_profile['price_preferences']['max']
        
        if min_price <= event_price <= max_price:
            return 1.0
        elif event_price < min_price:
            return 0.8  # Slight penalty for too cheap
        else:
            # Penalty increases with how much over budget
            over_budget_ratio = event_price / max_price if max_price > 0 else float('inf')
            return max(0.1, 1.0 / over_budget_ratio)
    
    def _calculate_virtual_preference(self, user_profile: Dict[str, Any], 
                                    event_features: Dict[str, Any]) -> float:
        """Calculate virtual event preference score"""
        virtual_pref = user_profile['virtual_preference']
        is_virtual = event_features['is_virtual']
        
        if is_virtual:
            return 0.5 + 0.5 * virtual_pref
        else:
            return 0.5 + 0.5 * (1 - virtual_pref)
    
    def _calculate_time_relevance(self, event_features: Dict[str, Any]) -> float:
        """Calculate time-based relevance score"""
        if not event_features.get('start_time'):
            return 0.8
        
        try:
            if isinstance(event_features['start_time'], str):
                start_time = datetime.fromisoformat(event_features['start_time'].replace('Z', '+00:00'))
            else:
                start_time = event_features['start_time']
            
            now = datetime.now(start_time.tzinfo)
            time_diff = start_time - now
            
            # Boost events happening soon (within 30 days)
            if timedelta(0) <= time_diff <= timedelta(days=30):
                return 1.0
            elif timedelta(days=30) < time_diff <= timedelta(days=90):
                return 0.9
            elif time_diff > timedelta(days=90):
                return 0.7
            else:
                return 0.1  # Past events
                
        except Exception:
            return 0.8
    
    def _generate_explanation(self, user_profile: Dict[str, Any], 
                            event_features: Dict[str, Any]) -> List[str]:
        """Generate explanation for recommendation"""
        reasons = []
        
        # Category match
        if event_features['category'] in user_profile['preferred_categories']:
            reasons.append(f"Matches your interest in {event_features['category']}")
        
        # Tag matches
        matching_tags = set(event_features['tags']).intersection(user_profile['preferred_tags'])
        if matching_tags:
            if len(matching_tags) == 1:
                reasons.append(f"Related to {list(matching_tags)[0]}")
            else:
                reasons.append(f"Related to {', '.join(list(matching_tags)[:2])}")
        
        # Organizer familiarity
        if event_features['organizer_name'] in user_profile['organizer_preferences']:
            reasons.append(f"From {event_features['organizer_name']}, an organizer you've engaged with before")
        
        # Virtual preference
        if event_features['is_virtual'] and user_profile['virtual_preference'] > 0.7:
            reasons.append("Virtual event matching your preference")
        elif not event_features['is_virtual'] and user_profile['virtual_preference'] < 0.3:
            reasons.append("In-person event matching your preference")
        
        # High curation score
        if event_features.get('curation_score', 0) > 0.8:
            reasons.append("High-quality event based on our content analysis")
        
        return reasons[:3]  # Limit to top 3 reasons
    
    def _calculate_confidence(self, user_profile: Dict[str, Any], 
                            event_features: Dict[str, Any]) -> float:
        """Calculate confidence in recommendation"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on profile completeness
        if user_profile['preferred_categories']:
            confidence += 0.1
        if user_profile['preferred_tags']:
            confidence += 0.1
        if user_profile['text_preferences']:
            confidence += 0.2
        if user_profile['preferred_locations']:
            confidence += 0.1
        
        return min(0.95, confidence)
    
    async def get_similar_events(self, event_id: UUID, count: int = 10) -> List[RecommendationItem]:
        """Get events similar to a given event"""
        if not self.is_trained:
            return []
        
        try:
            event_id_str = str(event_id)
            if event_id_str not in self.event_features:
                return []
            
            target_event = self.event_features[event_id_str]
            similarities = {}
            
            # Calculate similarities with all other events
            for other_id, other_event in self.event_features.items():
                if other_id == event_id_str:
                    continue
                
                similarity = await self._calculate_event_similarity(target_event, other_event)
                similarities[other_id] = similarity
            
            # Sort and get top similar events
            sorted_similar = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            top_similar = sorted_similar[:count]
            
            # Create recommendation items
            recommendations = []
            for rank, (similar_id, similarity) in enumerate(top_similar, 1):
                similar_event = self.event_features[similar_id]
                
                recommendations.append(RecommendationItem(
                    event_id=UUID(similar_id),
                    score=similarity,
                    algorithm=RecommendationAlgorithm.CONTENT_BASED,
                    confidence=0.8,
                    rank=rank,
                    reasons=[f"Similar content to the event you viewed"],
                    title=similar_event['title'],
                    short_description=similar_event['short_description'],
                    category=similar_event['category'],
                    tags=similar_event['tags'],
                    start_time=similar_event['start_time'],
                    is_virtual=similar_event['is_virtual'],
                    price=similar_event['price'],
                    venue_name=similar_event['venue_name'],
                    organizer_name=similar_event['organizer_name']
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get similar events: {e}")
            return []
    
    async def _calculate_event_similarity(self, event1: Dict[str, Any], 
                                        event2: Dict[str, Any]) -> float:
        """Calculate similarity between two events"""
        similarity = 0.0
        
        # Category similarity
        if event1['category'] == event2['category']:
            similarity += 0.3
        
        # Tag similarity
        tags1 = set(event1['tags'])
        tags2 = set(event2['tags'])
        if tags1 and tags2:
            tag_sim = len(tags1.intersection(tags2)) / len(tags1.union(tags2))
            similarity += 0.25 * tag_sim
        
        # Semantic similarity using embeddings
        event1_id = None
        event2_id = None
        
        for eid, features in self.event_features.items():
            if features == event1:
                event1_id = eid
            elif features == event2:
                event2_id = eid
        
        if (event1_id and event2_id and 
            event1_id in self.event_embeddings and 
            event2_id in self.event_embeddings):
            
            embedding1 = self.event_embeddings[event1_id]
            embedding2 = self.event_embeddings[event2_id]
            
            semantic_sim = cosine_similarity([embedding1], [embedding2])[0][0]
            similarity += 0.45 * semantic_sim
        
        return min(1.0, max(0.0, similarity))
    
    async def _save_model(self):
        """Save the trained model"""
        try:
            model_dir = settings.MODEL_CACHE_DIR
            os.makedirs(model_dir, exist_ok=True)
            
            model_data = {
                'event_features': self.event_features,
                'event_embeddings': self.event_embeddings,
                'category_encoder': self.category_encoder,
                'tag_vocabulary': list(self.tag_vocabulary),
                'model_version': self.model_version
            }
            
            model_path = os.path.join(model_dir, 'content_based_model.pkl')
            with open(model_path, 'wb') as f:
                pickle.dump(model_data, f)
            
            logger.info(f"Content-based model saved to {model_path}")
            
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    async def load_model(self):
        """Load a previously trained model"""
        try:
            model_path = os.path.join(settings.MODEL_CACHE_DIR, 'content_based_model.pkl')
            
            if not os.path.exists(model_path):
                logger.info("No saved content-based model found")
                return False
            
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.event_features = model_data['event_features']
            self.event_embeddings = model_data['event_embeddings']
            self.category_encoder = model_data['category_encoder']
            self.tag_vocabulary = set(model_data['tag_vocabulary'])
            self.model_version = model_data.get('model_version', '1.0.0')
            
            self.is_trained = True
            logger.info("Content-based model loaded successfully")
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
            "n_events": len(self.event_features),
            "n_categories": len(self.category_encoder),
            "n_tags": len(self.tag_vocabulary),
            "has_embeddings": len(self.event_embeddings) > 0
        }