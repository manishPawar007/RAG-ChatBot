"""
DocuMind AI
-----------
Upload Router
"""

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import UPLOAD_FOLDER
from app.database import SessionLocal
from app.models import Document

from app.services.parser import parse_pdf
from app.services.chunking import chunk_document
from app.services.embeddings import generate_embeddings
from app.services.vector_store import store_chunks
from app.services.ollama import (
    summarize_document,
    generate_key_points
)

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)


# =====================================================
# Upload PDF
# =====================================================

@router.post("/")
def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF and process it.
    """

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    document_id = str(uuid.uuid4())

    upload_dir = Path(UPLOAD_FOLDER)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"{document_id}_{file.filename}"

    try:

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        parsed = parse_pdf(file_path)

        chunks = chunk_document(parsed["pages"])

        embeddings = generate_embeddings(
            [chunk["text"] for chunk in chunks]
        )

        store_chunks(
            document_id=document_id,
            filename=file.filename,
            chunks=chunks,
            embeddings=embeddings
        )

        summary = summarize_document(
            parsed["text"]
        )

        key_points = generate_key_points(
            parsed["text"]
        )

        db = SessionLocal()

        try:

            document = Document(
                filename=file.filename,
                file_path=str(file_path),
                file_size=file_path.stat().st_size,
                total_pages=parsed["metadata"]["pages"],
                total_chunks=len(chunks),
                status="Completed"
            )

            db.add(document)
            db.commit()
            db.refresh(document)
            db_id = document.id

        finally:
            db.close()

        return {
            "success": True,
            "document_id": db_id,
            "filename": file.filename,
            "pages": parsed["metadata"]["pages"],
            "chunks": len(chunks),
            "summary": summary,
            "key_points": key_points,
            "metadata": parsed["metadata"]
        }

    except Exception as exc:

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )