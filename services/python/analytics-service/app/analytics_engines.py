"""Analytics engines initialization"""
import logging
from app.engines.real_time_analytics import RealTimeAnalyticsEngine

logger = logging.getLogger(__name__)

# Global analytics engines
real_time_engine = RealTimeAnalyticsEngine()


async def init_analytics_engines():
    """Initialize all analytics engines"""
    try:
        logger.info("Initializing analytics engines...")
        
        # Initialize real-time analytics engine
        await real_time_engine.initialize()
        
        logger.info("Analytics engines initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize analytics engines: {e}")
        raise