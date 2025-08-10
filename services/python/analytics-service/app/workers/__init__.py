"""Background workers for data processing"""
import logging
import asyncio
from typing import List

from .data_processor import DataProcessor
from .report_generator import ReportGenerator
from .metric_aggregator import MetricAggregator

logger = logging.getLogger(__name__)

# Global worker instances
data_processor = DataProcessor()
report_generator = ReportGenerator()
metric_aggregator = MetricAggregator()


async def start_background_workers():
    """Start all background worker tasks"""
    logger.info("Starting background workers...")
    
    try:
        # Initialize all workers
        await data_processor.initialize()
        await report_generator.initialize()
        await metric_aggregator.initialize()
        
        # Start worker tasks
        worker_tasks = []
        
        # Data processing workers
        worker_tasks.append(asyncio.create_task(data_processor.start_event_processing()))
        worker_tasks.append(asyncio.create_task(data_processor.start_batch_processing()))
        
        # Report generation worker
        worker_tasks.append(asyncio.create_task(report_generator.start_report_queue_processor()))
        
        # Metric aggregation workers
        worker_tasks.append(asyncio.create_task(metric_aggregator.start_hourly_aggregation()))
        worker_tasks.append(asyncio.create_task(metric_aggregator.start_daily_aggregation()))
        
        # User segmentation worker
        worker_tasks.append(asyncio.create_task(data_processor.start_user_segmentation()))
        
        logger.info(f"Started {len(worker_tasks)} background workers")
        
        # Store tasks for potential cleanup
        return worker_tasks
        
    except Exception as e:
        logger.error(f"Failed to start background workers: {e}")
        raise


async def stop_background_workers(worker_tasks: List[asyncio.Task]):
    """Stop all background worker tasks"""
    logger.info("Stopping background workers...")
    
    try:
        # Cancel all tasks
        for task in worker_tasks:
            if not task.done():
                task.cancel()
        
        # Wait for tasks to complete cancellation
        await asyncio.gather(*worker_tasks, return_exceptions=True)
        
        # Cleanup workers
        await data_processor.cleanup()
        await report_generator.cleanup()
        await metric_aggregator.cleanup()
        
        logger.info("Background workers stopped successfully")
        
    except Exception as e:
        logger.error(f"Error stopping background workers: {e}")


# Export main functions and instances
__all__ = [
    "start_background_workers",
    "stop_background_workers", 
    "data_processor",
    "report_generator",
    "metric_aggregator"
]