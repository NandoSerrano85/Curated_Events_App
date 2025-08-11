#!/usr/bin/env python3
"""
Curation Service - ML/AI-powered event curation and content analysis
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
from app.ml_models import init_models
from app.routers import curation, health, models as models_router
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
    logger.info("Starting Curation Service...")
    
    # Initialize database
    await init_db()
    
    # Initialize Kafka
    await init_kafka()
    
    # Initialize ML models
    await init_models()
    
    # Start background workers
    await start_background_workers()
    
    logger.info("Curation Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Curation Service...")
    await close_kafka()
    await close_db()


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Events Platform - Curation Service",
        description="ML/AI-powered event curation and content analysis service",
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
    app.include_router(curation.router, prefix="/api/v1/curation", tags=["curation"])
    app.include_router(models_router.router, prefix="/api/v1/models", tags=["models"])
    
    return app


app = create_app()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "curation-service",
        "version": "1.0.0",
        "status": "healthy"
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