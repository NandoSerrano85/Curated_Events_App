"""Real-time analytics engine for processing streaming data"""
import asyncio
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import numpy as np
from uuid import UUID

from app.config import get_settings
from app.models.analytics import (
    AnalyticsEvent, AnalyticsEventType, MetricType, 
    MetricResult, TrendAnalysis
)

logger = logging.getLogger(__name__)
settings = get_settings()


class RealTimeAnalyticsEngine:
    """Real-time analytics engine for processing streaming events"""
    
    def __init__(self):
        self.is_initialized = False
        self.event_buffer = deque(maxlen=10000)  # Rolling buffer for recent events
        self.metric_windows = {}  # Sliding windows for different metrics
        self.active_sessions = {}  # Track active user sessions
        self.trend_analyzers = {}  # Trend analysis per metric
        self.alert_thresholds = settings.ALERT_THRESHOLDS
        self.anomaly_detectors = {}
        
        # Real-time counters
        self.current_counters = defaultdict(lambda: defaultdict(float))
        self.window_counters = defaultdict(lambda: deque(maxlen=100))
        
        # Performance tracking
        self.processing_stats = {
            'events_processed': 0,
            'errors': 0,
            'avg_processing_time': 0.0,
            'last_processed_at': None
        }
        
    async def initialize(self):
        """Initialize the real-time analytics engine"""
        if self.is_initialized:
            return
            
        logger.info("Initializing real-time analytics engine...")
        
        try:
            # Initialize metric windows
            self._initialize_metric_windows()
            
            # Initialize trend analyzers
            self._initialize_trend_analyzers()
            
            # Initialize anomaly detectors
            self._initialize_anomaly_detectors()
            
            # Start background tasks
            await self._start_background_tasks()
            
            self.is_initialized = True
            logger.info("Real-time analytics engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize real-time analytics engine: {e}")
            raise
    
    def _initialize_metric_windows(self):
        """Initialize sliding windows for different metrics"""
        window_size = settings.REAL_TIME_WINDOW_SECONDS
        
        # Core metrics
        metrics = [
            'active_users',
            'page_views',
            'event_registrations',
            'search_queries',
            'recommendation_clicks',
            'payment_completions',
            'errors',
            'response_time'
        ]
        
        for metric in metrics:
            self.metric_windows[metric] = {
                'data': deque(maxlen=window_size),
                'timestamps': deque(maxlen=window_size),
                'sum': 0.0,
                'count': 0,
                'last_value': 0.0
            }
    
    def _initialize_trend_analyzers(self):
        """Initialize trend analysis components"""
        for metric in self.metric_windows.keys():
            self.trend_analyzers[metric] = {
                'values': deque(maxlen=1440),  # 24 hours of minute data
                'timestamps': deque(maxlen=1440),
                'trend_direction': 'stable',
                'trend_strength': 0.0,
                'last_analysis': None
            }
    
    def _initialize_anomaly_detectors(self):
        """Initialize anomaly detection for metrics"""
        for metric in self.metric_windows.keys():
            self.anomaly_detectors[metric] = {
                'baseline_values': deque(maxlen=1000),
                'threshold_multiplier': 2.0,
                'last_anomaly': None,
                'anomaly_count': 0
            }
    
    async def _start_background_tasks(self):
        """Start background processing tasks"""
        # Start metric computation task
        asyncio.create_task(self._compute_metrics_loop())
        
        # Start trend analysis task
        asyncio.create_task(self._analyze_trends_loop())
        
        # Start anomaly detection task
        asyncio.create_task(self._detect_anomalies_loop())
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_loop())
    
    async def process_event(self, event: AnalyticsEvent) -> None:
        """Process a real-time analytics event"""
        try:
            start_time = datetime.now()
            
            # Add to event buffer
            self.event_buffer.append(event)
            
            # Update session tracking
            await self._update_session_tracking(event)
            
            # Update real-time counters
            await self._update_counters(event)
            
            # Update metric windows
            await self._update_metric_windows(event)
            
            # Check for alerts
            await self._check_alerts(event)
            
            # Update processing stats
            processing_time = (datetime.now() - start_time).total_seconds()
            self._update_processing_stats(processing_time, success=True)
            
        except Exception as e:
            logger.error(f"Failed to process analytics event: {e}")
            self._update_processing_stats(0, success=False)
    
    async def _update_session_tracking(self, event: AnalyticsEvent):
        """Update active session tracking"""
        if not event.user_id or not event.session_id:
            return
        
        user_id = str(event.user_id)
        session_key = f"{user_id}:{event.session_id}"
        
        now = datetime.now()
        
        if session_key not in self.active_sessions:
            self.active_sessions[session_key] = {
                'user_id': user_id,
                'session_id': event.session_id,
                'start_time': now,
                'last_activity': now,
                'event_count': 0,
                'page_views': 0,
                'events_viewed': set(),
                'categories_viewed': set()
            }
        
        session = self.active_sessions[session_key]
        session['last_activity'] = now
        session['event_count'] += 1
        
        # Track specific activities
        if event.event_type == AnalyticsEventType.EVENT_VIEW:
            session['page_views'] += 1
            if event.entity_id:
                session['events_viewed'].add(str(event.entity_id))
            
            # Track categories
            if event.properties.get('event_category'):
                session['categories_viewed'].add(event.properties['event_category'])
    
    async def _update_counters(self, event: AnalyticsEvent):
        """Update real-time counters"""
        timestamp = event.timestamp
        minute_key = timestamp.replace(second=0, microsecond=0)
        
        # Global counters
        self.current_counters['total']['events'] += 1
        
        # Event type counters
        self.current_counters['event_type'][event.event_type.value] += 1
        
        # User counters
        if event.user_id:
            user_minute_key = f"user_{minute_key}"
            if user_minute_key not in self.current_counters:
                self.current_counters[user_minute_key] = set()
            self.current_counters[user_minute_key].add(str(event.user_id))
        
        # Geographic counters
        if event.country:
            self.current_counters['country'][event.country] += 1
        
        if event.city:
            self.current_counters['city'][event.city] += 1
        
        # Device/platform counters
        if event.user_agent:
            # Simplified device detection
            if 'Mobile' in event.user_agent:
                self.current_counters['device']['mobile'] += 1
            elif 'Tablet' in event.user_agent:
                self.current_counters['device']['tablet'] += 1
            else:
                self.current_counters['device']['desktop'] += 1
    
    async def _update_metric_windows(self, event: AnalyticsEvent):
        """Update sliding window metrics"""
        timestamp = event.timestamp
        
        # Update relevant metrics based on event type
        metric_mappings = {
            AnalyticsEventType.USER_LOGIN: ['active_users'],
            AnalyticsEventType.EVENT_VIEW: ['page_views'],
            AnalyticsEventType.EVENT_REGISTRATION: ['event_registrations'],
            AnalyticsEventType.SEARCH_QUERY: ['search_queries'],
            AnalyticsEventType.RECOMMENDATION_CLICK: ['recommendation_clicks'],
            AnalyticsEventType.PAYMENT_COMPLETED: ['payment_completions']
        }
        
        metrics_to_update = metric_mappings.get(event.event_type, [])
        
        for metric in metrics_to_update:
            if metric in self.metric_windows:
                window = self.metric_windows[metric]
                
                # Add new data point
                window['data'].append(1.0)
                window['timestamps'].append(timestamp)
                window['sum'] += 1.0
                window['count'] += 1
                window['last_value'] = 1.0
        
        # Update response time metric if available
        if event.properties.get('response_time'):
            response_time = event.properties['response_time']
            window = self.metric_windows.get('response_time')
            if window:
                window['data'].append(response_time)
                window['timestamps'].append(timestamp)
                window['sum'] += response_time
                window['count'] += 1
                window['last_value'] = response_time
    
    async def _check_alerts(self, event: AnalyticsEvent):
        """Check for alert conditions"""
        try:
            # High error rate alert
            if event.event_type in [AnalyticsEventType.PAYMENT_FAILED]:
                await self._check_error_rate_alert()
            
            # Response time alert
            if event.properties.get('response_time'):
                response_time = event.properties['response_time']
                if response_time > self.alert_thresholds['high_latency_ms']:
                    await self._trigger_alert('high_latency', {
                        'response_time': response_time,
                        'threshold': self.alert_thresholds['high_latency_ms'],
                        'event_id': str(event.event_id)
                    })
            
            # Traffic spike alert
            await self._check_traffic_spike_alert()
            
        except Exception as e:
            logger.error(f"Alert checking failed: {e}")
    
    async def _check_error_rate_alert(self):
        """Check for high error rate"""
        try:
            now = datetime.now()
            five_minutes_ago = now - timedelta(minutes=5)
            
            # Count errors and total events in last 5 minutes
            error_count = 0
            total_count = 0
            
            for event in self.event_buffer:
                if event.timestamp >= five_minutes_ago:
                    total_count += 1
                    if event.event_type in [
                        AnalyticsEventType.PAYMENT_FAILED,
                        # Add other error event types
                    ]:
                        error_count += 1
            
            if total_count > 0:
                error_rate = error_count / total_count
                if error_rate > self.alert_thresholds['high_error_rate']:
                    await self._trigger_alert('high_error_rate', {
                        'error_rate': error_rate,
                        'error_count': error_count,
                        'total_count': total_count,
                        'threshold': self.alert_thresholds['high_error_rate']
                    })
                    
        except Exception as e:
            logger.error(f"Error rate alert check failed: {e}")
    
    async def _check_traffic_spike_alert(self):
        """Check for unusual traffic spikes"""
        try:
            # Get current minute's event count
            current_minute = datetime.now().replace(second=0, microsecond=0)
            current_count = 0
            
            for event in self.event_buffer:
                event_minute = event.timestamp.replace(second=0, microsecond=0)
                if event_minute == current_minute:
                    current_count += 1
            
            # Calculate baseline (average of last 10 minutes)
            baseline_counts = []
            for i in range(1, 11):
                minute = current_minute - timedelta(minutes=i)
                count = sum(1 for event in self.event_buffer 
                           if event.timestamp.replace(second=0, microsecond=0) == minute)
                baseline_counts.append(count)
            
            if baseline_counts:
                baseline_avg = np.mean(baseline_counts)
                if baseline_avg > 0:
                    multiplier = current_count / baseline_avg
                    if multiplier > self.alert_thresholds['unusual_traffic_multiplier']:
                        await self._trigger_alert('traffic_spike', {
                            'current_count': current_count,
                            'baseline_avg': baseline_avg,
                            'multiplier': multiplier,
                            'threshold': self.alert_thresholds['unusual_traffic_multiplier']
                        })
                        
        except Exception as e:
            logger.error(f"Traffic spike alert check failed: {e}")
    
    async def _trigger_alert(self, alert_type: str, data: Dict[str, Any]):
        """Trigger an alert"""
        alert = {
            'type': alert_type,
            'data': data,
            'timestamp': datetime.now(),
            'severity': self._get_alert_severity(alert_type, data)
        }
        
        logger.warning(f"Analytics alert triggered: {alert_type}", extra=alert)
        
        # In a real implementation, this would:
        # 1. Store alert in database
        # 2. Send to notification service
        # 3. Update monitoring dashboard
        # 4. Trigger automated responses if configured
    
    def _get_alert_severity(self, alert_type: str, data: Dict[str, Any]) -> str:
        """Determine alert severity"""
        severity_rules = {
            'high_error_rate': 'high' if data.get('error_rate', 0) > 0.1 else 'medium',
            'high_latency': 'high' if data.get('response_time', 0) > 5000 else 'medium',
            'traffic_spike': 'medium' if data.get('multiplier', 0) > 5.0 else 'low'
        }
        
        return severity_rules.get(alert_type, 'low')
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """Get current real-time metrics"""
        try:
            now = datetime.now()
            metrics = {}
            
            # Active sessions
            active_session_count = 0
            for session in self.active_sessions.values():
                if now - session['last_activity'] < timedelta(minutes=30):
                    active_session_count += 1
            
            metrics['active_sessions'] = active_session_count
            
            # Events per minute (last 5 minutes)
            five_minutes_ago = now - timedelta(minutes=5)
            recent_events = [e for e in self.event_buffer if e.timestamp >= five_minutes_ago]
            metrics['events_per_minute'] = len(recent_events) / 5
            
            # Top event types
            event_type_counts = defaultdict(int)
            for event in recent_events:
                event_type_counts[event.event_type.value] += 1
            
            metrics['top_event_types'] = dict(
                sorted(event_type_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            )
            
            # Geographic distribution
            country_counts = defaultdict(int)
            for event in recent_events:
                if event.country:
                    country_counts[event.country] += 1
            
            metrics['top_countries'] = dict(
                sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            )
            
            # Metric windows summary
            window_metrics = {}
            for metric_name, window in self.metric_windows.items():
                if window['count'] > 0:
                    window_metrics[metric_name] = {
                        'current_value': window['last_value'],
                        'total': window['sum'],
                        'average': window['sum'] / window['count'],
                        'data_points': len(window['data'])
                    }
            
            metrics['window_metrics'] = window_metrics
            
            # Processing performance
            metrics['processing_stats'] = self.processing_stats.copy()
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get real-time metrics: {e}")
            return {}
    
    async def get_trend_analysis(self, metric_name: str) -> Optional[TrendAnalysis]:
        """Get trend analysis for a specific metric"""
        if metric_name not in self.trend_analyzers:
            return None
        
        try:
            analyzer = self.trend_analyzers[metric_name]
            
            if len(analyzer['values']) < 10:  # Need minimum data points
                return None
            
            values = list(analyzer['values'])
            timestamps = list(analyzer['timestamps'])
            
            # Simple trend analysis
            trend_direction, trend_strength = self._analyze_trend(values)
            
            # Detect anomalies
            anomalies = self._detect_value_anomalies(values, timestamps)
            
            return TrendAnalysis(
                metric_name=metric_name,
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                seasonal_patterns={},  # Would be computed with more sophisticated analysis
                anomalies=anomalies
            )
            
        except Exception as e:
            logger.error(f"Trend analysis failed for {metric_name}: {e}")
            return None
    
    def _analyze_trend(self, values: List[float]) -> Tuple[str, float]:
        """Analyze trend direction and strength"""
        if len(values) < 2:
            return "stable", 0.0
        
        # Simple linear trend
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]
        
        # Determine direction
        if abs(slope) < 0.1:
            direction = "stable"
        elif slope > 0:
            direction = "up"
        else:
            direction = "down"
        
        # Calculate strength (normalized)
        strength = min(abs(slope) / (np.mean(values) + 1e-6), 1.0)
        
        return direction, strength
    
    def _detect_value_anomalies(self, values: List[float], 
                               timestamps: List[datetime]) -> List[Dict[str, Any]]:
        """Detect anomalies in metric values"""
        if len(values) < 10:
            return []
        
        anomalies = []
        mean_val = np.mean(values)
        std_val = np.std(values)
        threshold = 2.0 * std_val
        
        for i, (value, timestamp) in enumerate(zip(values, timestamps)):
            if abs(value - mean_val) > threshold:
                anomalies.append({
                    'timestamp': timestamp.isoformat(),
                    'value': value,
                    'expected': mean_val,
                    'deviation': abs(value - mean_val),
                    'severity': 'high' if abs(value - mean_val) > 3 * std_val else 'medium'
                })
        
        return anomalies[-10:]  # Return last 10 anomalies
    
    async def _compute_metrics_loop(self):
        """Background loop for computing aggregated metrics"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Update trend analyzers with current window values
                for metric_name, window in self.metric_windows.items():
                    if window['count'] > 0:
                        avg_value = window['sum'] / window['count']
                        
                        analyzer = self.trend_analyzers[metric_name]
                        analyzer['values'].append(avg_value)
                        analyzer['timestamps'].append(datetime.now())
                        
                        # Reset window counters
                        window['sum'] = 0.0
                        window['count'] = 0
                
            except Exception as e:
                logger.error(f"Metrics computation loop error: {e}")
    
    async def _analyze_trends_loop(self):
        """Background loop for trend analysis"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                for metric_name in self.trend_analyzers.keys():
                    await self.get_trend_analysis(metric_name)
                
            except Exception as e:
                logger.error(f"Trend analysis loop error: {e}")
    
    async def _detect_anomalies_loop(self):
        """Background loop for anomaly detection"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                for metric_name, detector in self.anomaly_detectors.items():
                    window = self.metric_windows.get(metric_name)
                    if window and window['count'] > 0:
                        current_value = window['last_value']
                        baseline_values = list(detector['baseline_values'])
                        
                        if len(baseline_values) > 10:
                            mean_baseline = np.mean(baseline_values)
                            threshold = mean_baseline * detector['threshold_multiplier']
                            
                            if current_value > threshold:
                                # Anomaly detected
                                detector['anomaly_count'] += 1
                                detector['last_anomaly'] = datetime.now()
                                
                                await self._trigger_alert('anomaly_detected', {
                                    'metric': metric_name,
                                    'current_value': current_value,
                                    'baseline': mean_baseline,
                                    'threshold': threshold
                                })
                        
                        # Update baseline
                        detector['baseline_values'].append(current_value)
                
            except Exception as e:
                logger.error(f"Anomaly detection loop error: {e}")
    
    async def _cleanup_loop(self):
        """Background loop for cleanup tasks"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                # Clean up old sessions
                now = datetime.now()
                expired_sessions = []
                
                for session_key, session in self.active_sessions.items():
                    if now - session['last_activity'] > timedelta(hours=2):
                        expired_sessions.append(session_key)
                
                for session_key in expired_sessions:
                    del self.active_sessions[session_key]
                
                logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
                
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
    
    def _update_processing_stats(self, processing_time: float, success: bool):
        """Update processing performance stats"""
        self.processing_stats['events_processed'] += 1
        if not success:
            self.processing_stats['errors'] += 1
        
        # Update average processing time
        current_avg = self.processing_stats['avg_processing_time']
        count = self.processing_stats['events_processed']
        new_avg = ((current_avg * (count - 1)) + processing_time) / count
        self.processing_stats['avg_processing_time'] = new_avg
        
        self.processing_stats['last_processed_at'] = datetime.now()
    
    async def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Get information about active sessions"""
        now = datetime.now()
        active_sessions = []
        
        for session in self.active_sessions.values():
            if now - session['last_activity'] < timedelta(minutes=30):
                session_info = session.copy()
                session_info['events_viewed'] = list(session_info['events_viewed'])
                session_info['categories_viewed'] = list(session_info['categories_viewed'])
                session_info['duration_minutes'] = (
                    now - session_info['start_time']
                ).total_seconds() / 60
                active_sessions.append(session_info)
        
        return active_sessions
    
    def get_engine_status(self) -> Dict[str, Any]:
        """Get engine status and performance info"""
        return {
            'initialized': self.is_initialized,
            'buffer_size': len(self.event_buffer),
            'active_sessions': len(self.active_sessions),
            'metric_windows': len(self.metric_windows),
            'processing_stats': self.processing_stats,
            'memory_usage': {
                'event_buffer': len(self.event_buffer),
                'metric_windows': sum(len(w['data']) for w in self.metric_windows.values()),
                'trend_analyzers': sum(len(t['values']) for t in self.trend_analyzers.values())
            }
        }