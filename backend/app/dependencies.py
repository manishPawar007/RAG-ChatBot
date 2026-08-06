"""
Shared FastAPI Dependencies
"""

from sqlalchemy.orm import Session

from app.database import get_db


def get_database() -> Session:
    """
    Dependency wrapper for database session.
    """
    return next(get_db())