#!/usr/bin/env python3
"""
Analytics Service - Advanced data processing and analytics for the events platform
"""
import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db, close_db
from app.kafka_client import init_kafka, close_kafka
from app.analytics_engines import init_analytics_engines
from app.routers import analytics, reports, metrics, health
from app.workers import start_background_workers
from app.utils.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan event handler"""
    # Startup
    logger.info("Starting Analytics Service...")
    
    # Initialize database connections
    await init_db()
    
    # Initialize Kafka for real-time data streaming
    await init_kafka()
    
    # Initialize analytics engines and data processors
    await init_analytics_engines()
    
    # Start background workers for data processing
    await start_background_workers()
    
    logger.info("Analytics Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Analytics Service...")
    await close_kafka()
    await close_db()


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Events Platform - Analytics Service",
        description="Advanced analytics and data processing service with real-time insights",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
    app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
    app.include_router(metrics.router, prefix="/api/v1/metrics", tags=["metrics"])
    
    return app


app = create_app()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "analytics-service",
        "version": "1.0.0",
        "status": "healthy",
        "capabilities": [
            "real_time_analytics",
            "behavioral_analysis", 
            "predictive_modeling",
            "cohort_analysis",
            "funnel_analysis",
            "recommendation_analytics",
            "event_performance_tracking",
            "user_segmentation",
            "trend_analysis",
            "custom_reporting"
        ]
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=settings.DEBUG,
        access_log=True
    )