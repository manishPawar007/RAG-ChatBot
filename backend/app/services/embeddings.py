"""
ResearchMind AI
-----------
Embedding Service
Generates vector embeddings using SentenceTransformers (all-MiniLM-L6-v2) with lightweight fallback.
"""

import math
import hashlib
from typing import List

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

_model = None
_model_failed = False


def load_model():
    """
    Load embedding model lazily inside try-except block.
    """
    global _model, _model_failed

    if _model_failed:
        return None

    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("=" * 60)
            print(f"Loading embedding model: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME)
            print("Embedding model loaded successfully.")
            print("=" * 60)
        except Exception as e:
            print(f"SentenceTransformers load fallback ({e}). Using hash vectorizer.")
            _model_failed = True
            _model = None

    return _model


def _lightweight_hash_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    Generate deterministic 384-dim normalized vector using word n-gram hashing.
    """
    words = text.lower().split()
    vector = [0.0] * dim
    if not words:
        return vector

    for i, word in enumerate(words):
        h1 = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16) % dim
        vector[h1] += 1.0
        if i < len(words) - 1:
            bigram = f"{word}_{words[i+1]}"
            h2 = int(hashlib.md5(bigram.encode("utf-8")).hexdigest(), 16) % dim
            vector[h2] += 1.5

    norm = math.sqrt(sum(x * x for x in vector))
    if norm > 0:
        vector = [x / norm for x in vector]

    return vector


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for one text.
    """
    model = load_model()
    if model is not None:
        try:
            embedding = model.encode(
                text,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            return embedding.tolist()
        except Exception as e:
            print(f"Model encode error: {e}")

    return _lightweight_hash_embedding(text)


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts.
    """
    if not texts:
        return []

    model = load_model()
    if model is not None:
        try:
            embeddings = model.encode(
                texts,
                batch_size=32,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            return embeddings.tolist()
        except Exception as e:
            print(f"Batch model encode error: {e}")

    return [_lightweight_hash_embedding(t) for t in texts]


def generate_query_embedding(query: str) -> List[float]:
    """
    Generate query embedding.
    """
    return generate_embedding(query)