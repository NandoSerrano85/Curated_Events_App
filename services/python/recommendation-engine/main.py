#!/usr/bin/env python3
"""
Recommendation Engine - Hybrid ML-powered event recommendation system
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
from app.recommendation_models import init_models
from app.routers import recommendations, health, analytics
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
    logger.info("Starting Recommendation Engine...")
    
    # Initialize database
    await init_db()
    
    # Initialize Kafka
    await init_kafka()
    
    # Initialize ML models and recommendation systems
    await init_models()
    
    # Start background workers for model training and data processing
    await start_background_workers()
    
    logger.info("Recommendation Engine started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Recommendation Engine...")
    await close_kafka()
    await close_db()


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Events Platform - Recommendation Engine",
        description="Hybrid ML-powered event recommendation system with collaborative and content-based filtering",
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
    app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
    
    return app


app = create_app()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "recommendation-engine",
        "version": "1.0.0",
        "status": "healthy",
        "algorithms": ["collaborative_filtering", "content_based", "hybrid", "deep_learning", "popularity_based"]
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