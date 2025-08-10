"""Data processing worker for analytics events"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict, deque
import json

from app.config import get_settings
from app.models.analytics import (
    AnalyticsEvent, AnalyticsEventType, UserSegment, 
    AnalyticsEventDB, UserSegmentDB
)
from app.database import get_db_session

logger = logging.getLogger(__name__)
settings = get_settings()


class DataProcessor:
    """Background worker for processing analytics data"""
    
    def __init__(self):
        self.is_running = False
        self.event_queue = asyncio.Queue(maxsize=10000)
        self.batch_queue = asyncio.Queue(maxsize=1000)
        self.user_interaction_cache = defaultdict(list)
        self.processing_stats = {
            'events_processed': 0,
            'batches_processed': 0,
            'users_segmented': 0,
            'errors': 0,
            'last_processed_at': None
        }
    
    async def initialize(self):
        """Initialize the data processor"""
        logger.info("Initializing data processor...")
        
        try:
            # Initialize database connections and any required setup
            self.is_running = True
            logger.info("Data processor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize data processor: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        self.is_running = False
        logger.info("Data processor cleaned up")
    
    async def start_event_processing(self):
        """Start real-time event processing loop"""
        logger.info("Starting real-time event processing...")
        
        while self.is_running:
            try:
                # Process events from the queue
                if not self.event_queue.empty():
                    event = await self.event_queue.get()
                    await self._process_single_event(event)
                    self.event_queue.task_done()
                else:
                    # Short sleep to prevent busy waiting
                    await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in event processing loop: {e}")
                self.processing_stats['errors'] += 1
                await asyncio.sleep(1)  # Brief pause on error
    
    async def start_batch_processing(self):
        """Start batch processing loop for heavy analytics"""
        logger.info("Starting batch processing...")
        
        while self.is_running:
            try:
                # Run batch processing every 5 minutes
                await asyncio.sleep(300)
                
                if not self.is_running:
                    break
                
                await self._run_batch_processing()
                
            except Exception as e:
                logger.error(f"Error in batch processing loop: {e}")
                self.processing_stats['errors'] += 1
                await asyncio.sleep(60)  # Longer pause on batch error
    
    async def start_user_segmentation(self):
        """Start user segmentation processing"""
        logger.info("Starting user segmentation processing...")
        
        while self.is_running:
            try:
                # Run user segmentation every hour
                await asyncio.sleep(3600)
                
                if not self.is_running:
                    break
                
                await self._run_user_segmentation()
                
            except Exception as e:
                logger.error(f"Error in user segmentation: {e}")
                self.processing_stats['errors'] += 1
                await asyncio.sleep(300)  # 5 minute pause on error
    
    async def queue_event(self, event: AnalyticsEvent):
        """Queue an event for processing"""
        try:
            await self.event_queue.put(event)
        except asyncio.QueueFull:
            logger.warning("Event queue is full, dropping event")
            self.processing_stats['errors'] += 1
    
    async def _process_single_event(self, event: AnalyticsEvent):
        """Process a single analytics event"""
        try:
            start_time = datetime.now()
            
            # Store raw event in database
            await self._store_event(event)
            
            # Update user interaction cache
            if event.user_id:
                self._update_user_interaction_cache(event)
            
            # Trigger real-time analytics updates
            await self._update_real_time_metrics(event)
            
            # Check for alert conditions
            await self._check_event_alerts(event)
            
            # Update processing stats
            self.processing_stats['events_processed'] += 1
            self.processing_stats['last_processed_at'] = datetime.now()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.debug(f"Processed event {event.event_id} in {processing_time:.3f}s")
            
        except Exception as e:
            logger.error(f"Failed to process event {event.event_id}: {e}")
            self.processing_stats['errors'] += 1
    
    async def _store_event(self, event: AnalyticsEvent):
        """Store analytics event in database"""
        try:
            async with get_db_session() as db:
                db_event = AnalyticsEventDB(
                    id=event.event_id,
                    event_type=event.event_type.value,
                    user_id=event.user_id,
                    session_id=event.session_id,
                    entity_id=event.entity_id,
                    entity_type=event.entity_type,
                    properties=event.properties,
                    user_agent=event.user_agent,
                    ip_address=event.ip_address,
                    referrer=event.referrer,
                    utm_source=event.utm_source,
                    utm_medium=event.utm_medium,
                    utm_campaign=event.utm_campaign,
                    country=event.country,
                    region=event.region,
                    city=event.city,
                    latitude=event.latitude,
                    longitude=event.longitude,
                    timestamp=event.timestamp
                )
                
                db.add(db_event)
                await db.commit()
                
        except Exception as e:
            logger.error(f"Failed to store event in database: {e}")
            raise
    
    def _update_user_interaction_cache(self, event: AnalyticsEvent):
        """Update in-memory user interaction cache"""
        try:
            user_id = str(event.user_id)
            
            # Store relevant interactions for recommendation engine
            relevant_events = [
                AnalyticsEventType.EVENT_VIEW,
                AnalyticsEventType.EVENT_REGISTRATION,
                AnalyticsEventType.RECOMMENDATION_CLICK,
                AnalyticsEventType.SEARCH_QUERY
            ]
            
            if event.event_type in relevant_events:
                interaction = {
                    'event_id': str(event.event_id),
                    'event_type': event.event_type.value,
                    'entity_id': str(event.entity_id) if event.entity_id else None,
                    'timestamp': event.timestamp.isoformat(),
                    'properties': event.properties
                }
                
                # Keep only recent interactions (last 1000 per user)
                user_interactions = self.user_interaction_cache[user_id]
                user_interactions.append(interaction)
                
                # Trim old interactions
                if len(user_interactions) > 1000:
                    user_interactions.pop(0)
            
        except Exception as e:
            logger.error(f"Failed to update user interaction cache: {e}")
    
    async def _update_real_time_metrics(self, event: AnalyticsEvent):
        """Update real-time metrics based on event"""
        try:
            # This would update real-time metric aggregations
            # For now, just log the metric update
            logger.debug(f"Updating real-time metrics for event type: {event.event_type}")
            
        except Exception as e:
            logger.error(f"Failed to update real-time metrics: {e}")
    
    async def _check_event_alerts(self, event: AnalyticsEvent):
        """Check for alert conditions based on event"""
        try:
            # Check for payment failures
            if event.event_type == AnalyticsEventType.PAYMENT_FAILED:
                await self._handle_payment_failure_alert(event)
            
            # Check for high error rates
            if event.properties.get('error'):
                await self._handle_error_alert(event)
            
            # Check for unusual activity patterns
            if event.user_id:
                await self._check_user_activity_patterns(event)
            
        except Exception as e:
            logger.error(f"Failed to check event alerts: {e}")
    
    async def _handle_payment_failure_alert(self, event: AnalyticsEvent):
        """Handle payment failure alerts"""
        try:
            # This would implement actual alerting logic
            logger.warning(f"Payment failure detected: {event.event_id}")
            
        except Exception as e:
            logger.error(f"Failed to handle payment failure alert: {e}")
    
    async def _handle_error_alert(self, event: AnalyticsEvent):
        """Handle general error alerts"""
        try:
            error_message = event.properties.get('error', 'Unknown error')
            logger.warning(f"Error event detected: {error_message}")
            
        except Exception as e:
            logger.error(f"Failed to handle error alert: {e}")
    
    async def _check_user_activity_patterns(self, event: AnalyticsEvent):
        """Check for unusual user activity patterns"""
        try:
            user_id = str(event.user_id)
            user_interactions = self.user_interaction_cache.get(user_id, [])
            
            # Check for suspicious rapid activity
            recent_events = [
                i for i in user_interactions 
                if datetime.fromisoformat(i['timestamp']) > datetime.now() - timedelta(minutes=5)
            ]
            
            if len(recent_events) > 50:  # More than 50 events in 5 minutes
                logger.warning(f"Unusual activity pattern detected for user {user_id}: {len(recent_events)} events in 5 minutes")
            
        except Exception as e:
            logger.error(f"Failed to check user activity patterns: {e}")
    
    async def _run_batch_processing(self):
        """Run batch processing tasks"""
        try:
            logger.info("Running batch processing tasks...")
            
            # Process user behavior analytics
            await self._process_user_behavior_analytics()
            
            # Generate event performance summaries
            await self._generate_event_performance_summaries()
            
            # Clean up old data
            await self._cleanup_old_data()
            
            self.processing_stats['batches_processed'] += 1
            logger.info("Batch processing completed successfully")
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            raise
    
    async def _process_user_behavior_analytics(self):
        """Process user behavior patterns for insights"""
        try:
            # This would implement sophisticated user behavior analysis
            # For now, just log the processing
            logger.info("Processing user behavior analytics...")
            
            # Analyze user journey patterns
            # Identify drop-off points
            # Calculate engagement scores
            # Generate behavioral insights
            
        except Exception as e:
            logger.error(f"User behavior analytics processing failed: {e}")
    
    async def _generate_event_performance_summaries(self):
        """Generate performance summaries for events"""
        try:
            logger.info("Generating event performance summaries...")
            
            # This would aggregate event metrics
            # Calculate conversion rates
            # Generate performance rankings
            # Update event scores
            
        except Exception as e:
            logger.error(f"Event performance summary generation failed: {e}")
    
    async def _cleanup_old_data(self):
        """Clean up old analytics data based on retention policies"""
        try:
            logger.info("Cleaning up old analytics data...")
            
            cutoff_date = datetime.now() - timedelta(days=settings.RAW_DATA_RETENTION_DAYS)
            
            async with get_db_session() as db:
                # This would delete old analytics events
                # For now, just log the cleanup
                logger.info(f"Would cleanup events older than {cutoff_date}")
            
        except Exception as e:
            logger.error(f"Data cleanup failed: {e}")
    
    async def _run_user_segmentation(self):
        """Run user segmentation analysis"""
        try:
            logger.info("Running user segmentation analysis...")
            
            # Get user activity data
            user_segments = await self._calculate_user_segments()
            
            # Store segment assignments
            await self._store_user_segments(user_segments)
            
            self.processing_stats['users_segmented'] += len(user_segments)
            logger.info(f"User segmentation completed for {len(user_segments)} users")
            
        except Exception as e:
            logger.error(f"User segmentation failed: {e}")
    
    async def _calculate_user_segments(self) -> Dict[str, UserSegment]:
        """Calculate user segments based on activity patterns"""
        try:
            # This would implement actual user segmentation logic
            # For now, return sample segments
            sample_segments = {
                "user_001": UserSegment.POWER_USERS,
                "user_002": UserSegment.NEW_USERS,
                "user_003": UserSegment.ACTIVE_USERS
            }
            
            return sample_segments
            
        except Exception as e:
            logger.error(f"User segment calculation failed: {e}")
            return {}
    
    async def _store_user_segments(self, user_segments: Dict[str, UserSegment]):
        """Store user segment assignments in database"""
        try:
            async with get_db_session() as db:
                for user_id, segment in user_segments.items():
                    # Check if segment assignment exists
                    existing_segment = await db.query(UserSegmentDB).filter(
                        UserSegmentDB.user_id == user_id
                    ).first()
                    
                    if existing_segment:
                        # Update existing segment
                        existing_segment.segment = segment.value
                        existing_segment.assigned_at = datetime.now()
                    else:
                        # Create new segment assignment
                        new_segment = UserSegmentDB(
                            user_id=user_id,
                            segment=segment.value,
                            confidence_score=0.85,  # Would be calculated
                            characteristics={},  # Would include detailed characteristics
                            assigned_at=datetime.now()
                        )
                        db.add(new_segment)
                
                await db.commit()
                logger.info(f"Stored {len(user_segments)} user segment assignments")
            
        except Exception as e:
            logger.error(f"Failed to store user segments: {e}")
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get current processing statistics"""
        return self.processing_stats.copy()
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        return {
            'event_queue_size': self.event_queue.qsize(),
            'batch_queue_size': self.batch_queue.qsize(),
            'user_cache_size': len(self.user_interaction_cache),
            'is_running': self.is_running
        }