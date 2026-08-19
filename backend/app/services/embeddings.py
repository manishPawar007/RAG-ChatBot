"""
DocuMind AI
-----------
Embedding Service
Generates vector embeddings using SentenceTransformers.
"""

from typing import List

from sentence_transformers import SentenceTransformer

# ======================================================
# Model Configuration
# ======================================================

MODEL_NAME = "all-MiniLM-L6-v2"

_model: SentenceTransformer | None = None


# ======================================================
# Load Model
# ======================================================

def load_model() -> SentenceTransformer:
    """
    Load embedding model only once.
    """

    global _model

    if _model is None:
        print("=" * 60)
        print(f"Loading embedding model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        print("Embedding model loaded successfully.")
        print("=" * 60)

    return _model


# ======================================================
# Generate Single Embedding
# ======================================================

def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for one text.
    """

    model = load_model()

    embedding = model.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embedding.tolist()


# ======================================================
# Generate Batch Embeddings
# ======================================================

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts.
    """

    if not texts:
        return []

    model = load_model()

    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embeddings.tolist()


# ======================================================
# Query Embedding
# ======================================================

def generate_query_embedding(query: str) -> List[float]:
    """
    Generate embedding for user query.
    """

    return generate_embedding(query)


# ======================================================
# Cosine Similarity
# ======================================================

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    """

    import numpy as np

    a = np.array(vec1)
    b = np.array(vec2)

    denom = (np.linalg.norm(a) * np.linalg.norm(b))

    if denom == 0:
        return 0.0

    return float(np.dot(a, b) / denom)


# ======================================================
# Embedding Dimension
# ======================================================

def embedding_dimension() -> int:
    """
    Return embedding size.
    """

    model = load_model()

    return model.get_sentence_embedding_dimension()


# ======================================================
# Health Check
# ======================================================

def embedding_health() -> dict:
    """
    Verify model is operational.
    """

    model = load_model()

    vector = model.encode("DocuMind AI")

    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "dimension": len(vector)
    }