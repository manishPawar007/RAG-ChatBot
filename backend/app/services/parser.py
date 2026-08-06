"""
DocuMind AI
-----------
PDF Parser Service
"""

from pathlib import Path
from typing import Dict, List

import fitz  # PyMuPDF


# ======================================================
# Supported File Types
# ======================================================

SUPPORTED_EXTENSIONS = {".pdf"}


# ======================================================
# Validate File
# ======================================================

def validate_pdf(file_path: str | Path) -> Path:
    """
    Validate that the file exists and is a supported PDF.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only PDF files are supported.")

    return path


# ======================================================
# Extract Metadata
# ======================================================

def extract_metadata(document: fitz.Document) -> Dict:
    """
    Extract PDF metadata.
    """

    metadata = document.metadata or {}

    return {
        "title": metadata.get("title") or "",
        "author": metadata.get("author") or "",
        "subject": metadata.get("subject") or "",
        "creator": metadata.get("creator") or "",
        "producer": metadata.get("producer") or "",
        "keywords": metadata.get("keywords") or "",
        "pages": len(document)
    }


# ======================================================
# Extract Text Per Page
# ======================================================

def extract_pages(document: fitz.Document) -> List[Dict]:
    """
    Extract text from every page.
    """

    pages = []

    for page_number in range(len(document)):

        page = document.load_page(page_number)

        text = page.get_text("text").strip()

        pages.append(
            {
                "page": page_number + 1,
                "text": text
            }
        )

    return pages


# ======================================================
# Combine Text
# ======================================================

def combine_text(page_data: List[Dict]) -> str:
    """
    Merge all page text into one string.
    """

    return "\n\n".join(
        page["text"]
        for page in page_data
        if page["text"].strip()
    )


# ======================================================
# Parse PDF
# ======================================================

def parse_pdf(file_path: str | Path) -> Dict:
    """
    Complete PDF parsing pipeline.
    """

    path = validate_pdf(file_path)

    document = fitz.open(path)

    try:

        metadata = extract_metadata(document)

        pages = extract_pages(document)

        full_text = combine_text(pages)

        return {
            "filename": path.name,
            "file_path": str(path),
            "metadata": metadata,
            "pages": pages,
            "text": full_text
        }

    finally:

        document.close()