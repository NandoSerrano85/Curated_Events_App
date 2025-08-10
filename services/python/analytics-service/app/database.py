"""Database connection and session management"""
import logging
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.analytics import Base

logger = logging.getLogger(__name__)
settings = get_settings()

# Global engine and session maker
engine = None
async_session_maker = None


async def init_db():
    """Initialize database connection"""
    global engine, async_session_maker
    
    try:
        logger.info("Initializing database connection...")
        
        # Create async engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            echo=settings.DEBUG
        )
        
        # Create session maker
        async_session_maker = async_sessionmaker(
            engine, 
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Create tables if they don't exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db():
    """Close database connections"""
    global engine
    
    try:
        if engine:
            await engine.dispose()
            logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")


async def get_db():
    """Dependency to get database session"""
    if not async_session_maker:
        raise Exception("Database not initialized")
    
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session():
    """Context manager for database sessions"""
    if not async_session_maker:
        raise Exception("Database not initialized")
    
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()