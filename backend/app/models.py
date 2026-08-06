"""
Database Models
---------------
SQLAlchemy models for ResearchMind AI.
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
)

from app.database import Base


# --------------------------------------------------
# Uploaded Documents
# --------------------------------------------------

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String(255), nullable=False)

    file_path = Column(String(500), nullable=False)

    file_size = Column(Integer, nullable=False)

    total_pages = Column(Integer, default=0)

    total_chunks = Column(Integer, default=0)

    status = Column(
        String(50),
        default="Processing"
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# --------------------------------------------------
# Chat History
# --------------------------------------------------

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)

    question = Column(Text, nullable=False)

    answer = Column(Text, nullable=False)

    source_documents = Column(Text)

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# --------------------------------------------------
# Upload Progress
# --------------------------------------------------

class UploadProgress(Base):
    __tablename__ = "upload_progress"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String(255))

    progress = Column(Integer, default=0)

    current_step = Column(String(100))

    completed = Column(Boolean, default=False)