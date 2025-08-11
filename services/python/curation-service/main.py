#!/usr/bin/env python3
"""
Simplified Curation Service - Basic FastAPI service for local development
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import get_settings

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Events Platform - Curation Service",
        description="ML/AI-powered event curation and content analysis service",
        version="1.0.0",
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
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

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "curation-service"
    }

@app.post("/api/v1/curation/analyze")
async def analyze_event():
    """Placeholder curation analysis endpoint"""
    return {
        "message": "Curation analysis - implementation pending",
        "score": 0.8
    }

if __name__ == "__main__":
    logger.info(f"Starting Curation Service on port {settings.PORT}")
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=settings.DEBUG,
        access_log=True
    )