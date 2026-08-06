"""
DocuMind AI
-----------
Text Chunking Service
"""

from typing import Dict, List


# ======================================================
# Configuration
# ======================================================

DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 150


# ======================================================
# Clean Text
# ======================================================

def clean_text(text: str) -> str:
    """
    Remove unnecessary whitespace.
    """

    return " ".join(text.split())


# ======================================================
# Chunk a Single Page
# ======================================================

def chunk_page(
    text: str,
    page_number: int,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP
) -> List[Dict]:
    """
    Split a page into overlapping chunks.
    """

    text = clean_text(text)

    if not text:
        return []

    chunks = []

    start = 0
    chunk_id = 1

    while start < len(text):

        end = min(start + chunk_size, len(text))

        chunk_text = text[start:end]

        chunks.append(
            {
                "page": page_number,
                "chunk": chunk_id,
                "text": chunk_text,
                "start": start,
                "end": end
            }
        )

        if end >= len(text):
            break

        start = end - overlap

        chunk_id += 1

    return chunks


# ======================================================
# Chunk Entire Document
# ======================================================

def chunk_document(
    total_pages: List[Dict],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP
) -> List[Dict]:
    """
    Chunk all pages in the document.
    """

    document_chunks = []

    global_chunk = 1

    for page in total_pages:

        page_chunks = chunk_page(
            page["text"],
            page["page"],
            chunk_size,
            overlap
        )

        for chunk in page_chunks:

            chunk["id"] = global_chunk

            document_chunks.append(chunk)

            global_chunk += 1

    return document_chunks


# ======================================================
# Chunk Statistics
# ======================================================

def chunk_statistics(chunks: List[Dict]) -> Dict:
    """
    Return useful chunk statistics.
    """

    if not chunks:

        return {
            "total_chunks": 0,
            "average_size": 0
        }

    lengths = [

        len(chunk["text"])

        for chunk in chunks

    ]

    return {

        "total_chunks": len(chunks),

        "average_size": int(sum(lengths) / len(lengths)),

        "largest_chunk": max(lengths),

        "smallest_chunk": min(lengths)

    }