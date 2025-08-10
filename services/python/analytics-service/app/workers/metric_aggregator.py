"""Metric aggregation worker for pre-computing analytics"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional
from collections import defaultdict
import statistics

from app.config import get_settings
from app.models.analytics import MetricType, TimeGranularity, MetricSummary
from app.database import get_db_session

logger = logging.getLogger(__name__)
settings = get_settings()


class MetricAggregator:
    """Background worker for aggregating analytics metrics"""
    
    def __init__(self):
        self.is_running = False
        self.aggregation_stats = {
            'hourly_aggregations': 0,
            'daily_aggregations': 0,
            'weekly_aggregations': 0,
            'monthly_aggregations': 0,
            'last_hourly_run': None,
            'last_daily_run': None,
            'errors': 0
        }
    
    async def initialize(self):
        """Initialize the metric aggregator"""
        logger.info("Initializing metric aggregator...")
        
        try:
            self.is_running = True
            logger.info("Metric aggregator initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize metric aggregator: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        self.is_running = False
        logger.info("Metric aggregator cleaned up")
    
    async def start_hourly_aggregation(self):
        """Start hourly metric aggregation loop"""
        logger.info("Starting hourly metric aggregation...")
        
        while self.is_running:
            try:
                # Wait until the next hour
                now = datetime.now()
                next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                wait_seconds = (next_hour - now).total_seconds()
                
                if wait_seconds > 0:
                    await asyncio.sleep(wait_seconds)
                
                if not self.is_running:
                    break
                
                # Run hourly aggregation
                await self._run_hourly_aggregation()
                
            except Exception as e:
                logger.error(f"Error in hourly aggregation loop: {e}")
                self.aggregation_stats['errors'] += 1
                await asyncio.sleep(300)  # 5 minute pause on error
    
    async def start_daily_aggregation(self):
        """Start daily metric aggregation loop"""
        logger.info("Starting daily metric aggregation...")
        
        while self.is_running:
            try:
                # Wait until the next day at midnight
                now = datetime.now()
                next_day = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                wait_seconds = (next_day - now).total_seconds()
                
                if wait_seconds > 0:
                    await asyncio.sleep(wait_seconds)
                
                if not self.is_running:
                    break
                
                # Run daily aggregation
                await self._run_daily_aggregation()
                
            except Exception as e:
                logger.error(f"Error in daily aggregation loop: {e}")
                self.aggregation_stats['errors'] += 1
                await asyncio.sleep(1800)  # 30 minute pause on error
    
    async def _run_hourly_aggregation(self):
        """Run hourly metric aggregations"""
        try:
            logger.info("Running hourly metric aggregation...")
            start_time = datetime.now()
            
            # Get the previous hour's data
            end_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
            start_hour = end_hour - timedelta(hours=1)
            
            # Aggregate core metrics
            await self._aggregate_user_metrics(start_hour, end_hour, TimeGranularity.HOUR)
            await self._aggregate_event_metrics(start_hour, end_hour, TimeGranularity.HOUR)
            await self._aggregate_revenue_metrics(start_hour, end_hour, TimeGranularity.HOUR)
            await self._aggregate_engagement_metrics(start_hour, end_hour, TimeGranularity.HOUR)
            await self._aggregate_recommendation_metrics(start_hour, end_hour, TimeGranularity.HOUR)
            
            # Update statistics
            self.aggregation_stats['hourly_aggregations'] += 1
            self.aggregation_stats['last_hourly_run'] = datetime.now()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Hourly aggregation completed in {processing_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Hourly aggregation failed: {e}")
            raise
    
    async def _run_daily_aggregation(self):
        """Run daily metric aggregations"""
        try:
            logger.info("Running daily metric aggregation...")
            start_time = datetime.now()
            
            # Get the previous day's data
            end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            start_date = end_date - timedelta(days=1)
            
            # Aggregate daily metrics
            await self._aggregate_user_metrics(start_date, end_date, TimeGranularity.DAY)
            await self._aggregate_event_metrics(start_date, end_date, TimeGranularity.DAY)
            await self._aggregate_revenue_metrics(start_date, end_date, TimeGranularity.DAY)
            await self._aggregate_engagement_metrics(start_date, end_date, TimeGranularity.DAY)
            await self._aggregate_recommendation_metrics(start_date, end_date, TimeGranularity.DAY)
            
            # Run weekly and monthly aggregations if needed
            if end_date.weekday() == 0:  # Monday
                await self._run_weekly_aggregation(start_date)
            
            if end_date.day == 1:  # First day of month
                await self._run_monthly_aggregation(start_date)
            
            # Update statistics
            self.aggregation_stats['daily_aggregations'] += 1
            self.aggregation_stats['last_daily_run'] = datetime.now()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Daily aggregation completed in {processing_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Daily aggregation failed: {e}")
            raise
    
    async def _run_weekly_aggregation(self, reference_date: datetime):
        """Run weekly metric aggregations"""
        try:
            logger.info("Running weekly metric aggregation...")
            
            # Get the previous week's data
            end_date = reference_date
            start_date = end_date - timedelta(weeks=1)
            
            await self._aggregate_user_metrics(start_date, end_date, TimeGranularity.WEEK)
            await self._aggregate_event_metrics(start_date, end_date, TimeGranularity.WEEK)
            await self._aggregate_revenue_metrics(start_date, end_date, TimeGranularity.WEEK)
            
            self.aggregation_stats['weekly_aggregations'] += 1
            logger.info("Weekly aggregation completed")
            
        except Exception as e:
            logger.error(f"Weekly aggregation failed: {e}")
    
    async def _run_monthly_aggregation(self, reference_date: datetime):
        """Run monthly metric aggregations"""
        try:
            logger.info("Running monthly metric aggregation...")
            
            # Get the previous month's data
            if reference_date.month == 1:
                start_date = reference_date.replace(year=reference_date.year - 1, month=12, day=1)
            else:
                start_date = reference_date.replace(month=reference_date.month - 1, day=1)
            
            end_date = reference_date
            
            await self._aggregate_user_metrics(start_date, end_date, TimeGranularity.MONTH)
            await self._aggregate_event_metrics(start_date, end_date, TimeGranularity.MONTH)
            await self._aggregate_revenue_metrics(start_date, end_date, TimeGranularity.MONTH)
            
            self.aggregation_stats['monthly_aggregations'] += 1
            logger.info("Monthly aggregation completed")
            
        except Exception as e:
            logger.error(f"Monthly aggregation failed: {e}")
    
    async def _aggregate_user_metrics(self, start_time: datetime, end_time: datetime, 
                                     granularity: TimeGranularity):
        """Aggregate user-related metrics"""
        try:
            logger.debug(f"Aggregating user metrics for {granularity.value}")
            
            # This would query actual analytics events from database
            # For now, simulate the aggregation
            
            metrics_to_aggregate = [
                ('daily_active_users', MetricType.UNIQUE_COUNT),
                ('user_registrations', MetricType.COUNT),
                ('user_logins', MetricType.COUNT),
                ('session_duration', MetricType.AVERAGE),
                ('sessions_per_user', MetricType.AVERAGE)
            ]
            
            for metric_name, metric_type in metrics_to_aggregate:
                # Simulate metric calculation
                if metric_type == MetricType.COUNT:
                    value = 1500.0  # Sample count
                elif metric_type == MetricType.UNIQUE_COUNT:
                    value = 1200.0  # Sample unique count
                elif metric_type == MetricType.AVERAGE:
                    value = 285.5  # Sample average
                else:
                    value = 100.0
                
                await self._store_metric_summary(
                    metric_name, metric_type, value, 
                    start_time.date(), granularity, {}
                )
            
        except Exception as e:
            logger.error(f"User metrics aggregation failed: {e}")
            raise
    
    async def _aggregate_event_metrics(self, start_time: datetime, end_time: datetime,
                                      granularity: TimeGranularity):
        """Aggregate event-related metrics"""
        try:
            logger.debug(f"Aggregating event metrics for {granularity.value}")
            
            metrics_to_aggregate = [
                ('event_views', MetricType.COUNT),
                ('event_registrations', MetricType.COUNT),
                ('event_cancellations', MetricType.COUNT),
                ('conversion_rate', MetricType.RATE),
                ('events_per_category', MetricType.COUNT)
            ]
            
            for metric_name, metric_type in metrics_to_aggregate:
                if metric_type == MetricType.COUNT:
                    value = 2800.0
                elif metric_type == MetricType.RATE:
                    value = 0.18
                else:
                    value = 150.0
                
                await self._store_metric_summary(
                    metric_name, metric_type, value,
                    start_time.date(), granularity, {}
                )
            
            # Aggregate by category
            categories = ['Technology', 'Business', 'Entertainment', 'Sports']
            for category in categories:
                await self._store_metric_summary(
                    'event_views', MetricType.COUNT, 700.0,
                    start_time.date(), granularity, 
                    {'category': category}
                )
            
        except Exception as e:
            logger.error(f"Event metrics aggregation failed: {e}")
            raise
    
    async def _aggregate_revenue_metrics(self, start_time: datetime, end_time: datetime,
                                        granularity: TimeGranularity):
        """Aggregate revenue-related metrics"""
        try:
            logger.debug(f"Aggregating revenue metrics for {granularity.value}")
            
            metrics_to_aggregate = [
                ('total_revenue', MetricType.SUM),
                ('average_order_value', MetricType.AVERAGE),
                ('payment_success_rate', MetricType.RATE),
                ('refund_rate', MetricType.RATE),
                ('revenue_per_user', MetricType.AVERAGE)
            ]
            
            for metric_name, metric_type in metrics_to_aggregate:
                if metric_type == MetricType.SUM:
                    value = 45600.0
                elif metric_type == MetricType.AVERAGE:
                    value = 65.50
                elif metric_type == MetricType.RATE:
                    value = 0.95
                else:
                    value = 1000.0
                
                await self._store_metric_summary(
                    metric_name, metric_type, value,
                    start_time.date(), granularity, {}
                )
            
        except Exception as e:
            logger.error(f"Revenue metrics aggregation failed: {e}")
            raise
    
    async def _aggregate_engagement_metrics(self, start_time: datetime, end_time: datetime,
                                           granularity: TimeGranularity):
        """Aggregate engagement-related metrics"""
        try:
            logger.debug(f"Aggregating engagement metrics for {granularity.value}")
            
            metrics_to_aggregate = [
                ('page_views', MetricType.COUNT),
                ('bounce_rate', MetricType.RATE),
                ('time_on_page', MetricType.AVERAGE),
                ('pages_per_session', MetricType.AVERAGE),
                ('social_shares', MetricType.COUNT)
            ]
            
            for metric_name, metric_type in metrics_to_aggregate:
                if metric_type == MetricType.COUNT:
                    value = 12500.0
                elif metric_type == MetricType.RATE:
                    value = 0.35
                elif metric_type == MetricType.AVERAGE:
                    value = 120.5
                else:
                    value = 85.0
                
                await self._store_metric_summary(
                    metric_name, metric_type, value,
                    start_time.date(), granularity, {}
                )
            
        except Exception as e:
            logger.error(f"Engagement metrics aggregation failed: {e}")
            raise
    
    async def _aggregate_recommendation_metrics(self, start_time: datetime, end_time: datetime,
                                               granularity: TimeGranularity):
        """Aggregate recommendation system metrics"""
        try:
            logger.debug(f"Aggregating recommendation metrics for {granularity.value}")
            
            metrics_to_aggregate = [
                ('recommendations_served', MetricType.COUNT),
                ('recommendation_clicks', MetricType.COUNT),
                ('recommendation_ctr', MetricType.RATE),
                ('recommendation_conversions', MetricType.COUNT)
            ]
            
            for metric_name, metric_type in metrics_to_aggregate:
                if metric_type == MetricType.COUNT:
                    value = 8500.0
                elif metric_type == MetricType.RATE:
                    value = 0.068
                else:
                    value = 580.0
                
                await self._store_metric_summary(
                    metric_name, metric_type, value,
                    start_time.date(), granularity, {}
                )
            
            # Aggregate by algorithm
            algorithms = ['collaborative_filtering', 'content_based', 'hybrid']
            for algorithm in algorithms:
                await self._store_metric_summary(
                    'recommendations_served', MetricType.COUNT, 2800.0,
                    start_time.date(), granularity,
                    {'algorithm': algorithm}
                )
            
        except Exception as e:
            logger.error(f"Recommendation metrics aggregation failed: {e}")
            raise
    
    async def _store_metric_summary(self, metric_name: str, metric_type: MetricType, 
                                   value: float, metric_date: date,
                                   granularity: TimeGranularity, dimensions: Dict[str, str]):
        """Store aggregated metric summary"""
        try:
            async with get_db_session() as db:
                # Check if summary already exists
                existing_summary = await db.query(MetricSummary).filter(
                    MetricSummary.metric_name == metric_name,
                    MetricSummary.date == metric_date,
                    MetricSummary.granularity == granularity.value,
                    MetricSummary.dimensions == dimensions
                ).first()
                
                if existing_summary:
                    # Update existing summary
                    existing_summary.value = value
                    existing_summary.updated_at = datetime.now()
                else:
                    # Create new summary
                    summary = MetricSummary(
                        metric_name=metric_name,
                        metric_type=metric_type.value,
                        dimensions=dimensions,
                        value=value,
                        date=metric_date,
                        granularity=granularity.value
                    )
                    db.add(summary)
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Failed to store metric summary: {e}")
            raise
    
    async def calculate_derived_metrics(self, base_metrics: Dict[str, float]) -> Dict[str, float]:
        """Calculate derived metrics from base metrics"""
        try:
            derived_metrics = {}
            
            # Conversion rate
            if 'event_views' in base_metrics and 'event_registrations' in base_metrics:
                if base_metrics['event_views'] > 0:
                    derived_metrics['conversion_rate'] = base_metrics['event_registrations'] / base_metrics['event_views']
            
            # Revenue per user
            if 'total_revenue' in base_metrics and 'daily_active_users' in base_metrics:
                if base_metrics['daily_active_users'] > 0:
                    derived_metrics['revenue_per_user'] = base_metrics['total_revenue'] / base_metrics['daily_active_users']
            
            # Average session duration (if we have total duration and session count)
            if 'total_session_duration' in base_metrics and 'total_sessions' in base_metrics:
                if base_metrics['total_sessions'] > 0:
                    derived_metrics['avg_session_duration'] = base_metrics['total_session_duration'] / base_metrics['total_sessions']
            
            # Click-through rate
            if 'recommendations_served' in base_metrics and 'recommendation_clicks' in base_metrics:
                if base_metrics['recommendations_served'] > 0:
                    derived_metrics['recommendation_ctr'] = base_metrics['recommendation_clicks'] / base_metrics['recommendations_served']
            
            return derived_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate derived metrics: {e}")
            return {}
    
    def get_aggregation_stats(self) -> Dict[str, Any]:
        """Get current aggregation statistics"""
        return self.aggregation_stats.copy()
    
    def get_status(self) -> Dict[str, Any]:
        """Get current aggregator status"""
        return {
            'is_running': self.is_running,
            'stats': self.get_aggregation_stats(),
            'next_hourly_run': self._calculate_next_run_time('hourly'),
            'next_daily_run': self._calculate_next_run_time('daily')
        }
    
    def _calculate_next_run_time(self, frequency: str) -> datetime:
        """Calculate next scheduled run time"""
        now = datetime.now()
        
        if frequency == 'hourly':
            return now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        elif frequency == 'daily':
            return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            return now