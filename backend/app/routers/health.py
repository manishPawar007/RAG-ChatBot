"""
Health Check Router
-------------------
Provides basic endpoints to verify the API is running.
"""

from datetime import datetime

from fastapi import APIRouter

router = APIRouter(
    prefix="/health",
    tags=["Health"]
)


@router.get("/")
async def health_check():
    """
    Basic API health check.
    """

    return {
        "status": "healthy",
        "project": "DocuMind AI",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/ping")
async def ping():
    """
    Simple ping endpoint.
    """

    return {
        "message": "pong"
    }