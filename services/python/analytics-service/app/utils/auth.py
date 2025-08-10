"""Authentication utilities"""
from typing import Dict, Any, Optional
from fastapi import HTTPException, Depends, Header
from app.config import get_settings

settings = get_settings()


async def get_current_user(x_api_key: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get current user from API key or JWT token"""
    try:
        # This would implement actual authentication
        # For now, return a mock user for development
        if not x_api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Mock user data
        return {
            "user_id": "user_123",
            "email": "user@example.com",
            "role": "admin"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")