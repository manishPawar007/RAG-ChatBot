"""
Project Configuration
---------------------
Loads environment variables and exposes application settings.
"""

from pathlib import Path
from dotenv import load_dotenv
import os

# --------------------------------------------------
# Base Directory
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------------------
# Load .env
# --------------------------------------------------

ENV_FILE = BASE_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

# --------------------------------------------------
# Project Settings
# --------------------------------------------------

PROJECT_NAME = "ResearchMind AI"
VERSION = "1.0.0"

# --------------------------------------------------
# API
# --------------------------------------------------

API_PREFIX = "/api"

# --------------------------------------------------
# Database
# --------------------------------------------------

DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(exist_ok=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DATABASE_DIR / 'chatbot.db'}"
)

# --------------------------------------------------
# Upload Folder
# --------------------------------------------------

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# --------------------------------------------------
# ChromaDB
# --------------------------------------------------

CHROMA_DB_DIR = BASE_DIR / "chroma_db"
CHROMA_DB_DIR.mkdir(exist_ok=True)

# --------------------------------------------------
# Embedding Model
# --------------------------------------------------

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "all-MiniLM-L6-v2"
)

# --------------------------------------------------
# Ollama
# --------------------------------------------------

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "llama3.2:latest"
)

# --------------------------------------------------
# Chunk Settings
# --------------------------------------------------

CHUNK_SIZE = int(
    os.getenv("CHUNK_SIZE", 500)
)

CHUNK_OVERLAP = int(
    os.getenv("CHUNK_OVERLAP", 100)
)

# --------------------------------------------------
# Retrieval
# --------------------------------------------------

TOP_K_RESULTS = int(
    os.getenv("TOP_K_RESULTS", 5)
)
# --------------------------------------------------
# Compatibility Aliases
# --------------------------------------------------

UPLOAD_FOLDER = str(UPLOAD_DIR)

CHROMA_DB_PATH = str(CHROMA_DB_DIR)

OLLAMA_URL = OLLAMA_BASE_URL