"""
Database Configuration
----------------------
Creates SQLAlchemy engine, session and database tables.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import DATABASE_URL

# --------------------------------------------------
# SQLAlchemy Engine
# --------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# --------------------------------------------------
# Session
# --------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# --------------------------------------------------
# Base Class
# --------------------------------------------------

Base = declarative_base()

# --------------------------------------------------
# Dependency
# --------------------------------------------------

def get_db():
    """
    Returns database session.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# --------------------------------------------------
# Create Database
# --------------------------------------------------

def create_database():
    """
    Creates all database tables.
    """

    # Import models so SQLAlchemy registers them
    from app import models

    Base.metadata.create_all(bind=engine)