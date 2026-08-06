"""
ResearchMind AI
-----------
FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    PROJECT_NAME,
    VERSION
)

from app.database import create_database

from app.routers.health import router as health_router
from app.routers.upload import router as upload_router
from app.routers.documents import router as documents_router
from app.routers.chat import router as chat_router

# --------------------------------------------------
# Application Lifespan
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once when the application starts.
    """

    create_database()

    print("=" * 60)
    print("🚀 ResearchMind AI Started Successfully")
    print("=" * 60)

    yield

    print("=" * 60)
    print("🛑 ResearchMind AI Stopped")
    print("=" * 60)


# --------------------------------------------------
# FastAPI App
# --------------------------------------------------

app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    description="Chat with your documents using RAG + Ollama",
    lifespan=lifespan
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Routers
# --------------------------------------------------

app.include_router(health_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(chat_router)


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint.
    """

    return {
        "message": "Welcome to ResearchMind AI 🚀",
        "version": VERSION,
        "docs": "/docs",
        "health": "/health"
    }