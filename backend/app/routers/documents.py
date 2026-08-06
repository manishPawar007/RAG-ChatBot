"""
DocuMind AI
-----------
Documents Router
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.database import SessionLocal
from app.models import Document
from app.services.vector_store import delete_document

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


# =====================================================
# List Documents
# =====================================================

@router.get("/")
async def list_documents():
    """
    Return all uploaded documents.
    """

    db = SessionLocal()

    try:

        documents = db.query(Document).order_by(
            Document.uploaded_at.desc()
        ).all()

        return [
            {
                "id": doc.id,
                "filename": doc.filename,
                "file_size": doc.file_size,
                "total_pages": doc.total_pages,
                "total_chunks": doc.total_chunks,
                "status": doc.status,
                "uploaded_at": doc.uploaded_at
            }
            for doc in documents
        ]
    finally:
        db.close()


# =====================================================
# Get Document
# =====================================================

@router.get("/{document_id}")
async def get_document(document_id: str):
    """
    Get one uploaded document.
    """

    db = SessionLocal()

    try:

        document = db.query(Document).filter(
            Document.id == document_id
        ).first()

        if document is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found."
            )

        return {
            "file_path": document.file_path,
            "file_size": document.file_size,
            "total_pages": document.total_pages,
            "total_chunks": document.total_chunks,
            "status": document.status,
            "uploaded_at": document.uploaded_at,
        }

    finally:
        db.close()


# =====================================================
# Delete Document
# =====================================================

@router.delete("/{document_id}")
async def remove_document(document_id: str):
    """
    Delete document, vectors and file.
    """

    db = SessionLocal()

    try:

        document = db.query(Document).filter(
            Document.id == document_id
        ).first()

        if document is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found."
            )

        file_path = Path(document.file_path)

        if file_path.exists():
            file_path.unlink()

        delete_document(document.id)

        db.delete(document)

        db.commit()

        return {
            "success": True,
            "message": "Document deleted successfully."
        }

    finally:
        db.close()