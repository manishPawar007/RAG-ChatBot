"""
DocuMind AI
-----------
ChromaDB Vector Store Service
"""

import uuid
from typing import Dict, List

import chromadb
from chromadb.config import Settings

from app.config import CHROMA_DB_PATH


# ======================================================
# Chroma Client
# ======================================================

client = chromadb.PersistentClient(
    path=CHROMA_DB_PATH,
    settings=Settings(anonymized_telemetry=False)
)

collection = client.get_or_create_collection(
    name="documents"
)


# ======================================================
# Store Chunks
# ======================================================

def store_chunks(
    document_id: str,
    filename: str,
    chunks: List[Dict],
    embeddings: List[List[float]]
):
    """
    Store document chunks into ChromaDB.
    """

    ids = []
    documents = []
    metadatas = []

    for chunk, embedding in zip(chunks, embeddings):

        chunk_id = str(uuid.uuid4())

        ids.append(chunk_id)

        documents.append(chunk["text"])

        metadatas.append(
            {
                "document_id": document_id,
                "filename": filename,
                "page": chunk["page"],
                "chunk": chunk["chunk"]
            }
        )

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )


# ======================================================
# Similarity Search
# ======================================================

def search(
    query_embedding: List[float],
    top_k: int = 5,
    document_id: str = None
):
    """
    Search similar chunks. If document_id is given, search by filename or document_id.
    If specific document query yields 0 results, fall back to searching all documents.
    """
    if document_id:
        doc_str = str(document_id).strip()
        if doc_str:
            # 1. Try matching filename in metadata
            try:
                res_fn = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where={"filename": doc_str}
                )
                if res_fn.get("documents", [[]])[0]:
                    return res_fn
            except Exception:
                pass

            # 2. Try matching document_id in metadata
            try:
                res_id = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where={"document_id": doc_str}
                )
                if res_id.get("documents", [[]])[0]:
                    return res_id
            except Exception:
                pass

    # 3. Fallback: Search across all stored document chunks
    return collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )


# ======================================================
# Get Document Chunks
# ======================================================

def get_document_chunks(document_id: str):
    """
    Retrieve all chunks for a document.
    """

    return collection.get(
        where={
            "document_id": document_id
        }
    )


# ======================================================
# Delete Document
# ======================================================

def delete_document(document_id: str):
    """
    Remove all chunks of a document.
    """

    collection.delete(
        where={
            "document_id": document_id
        }
    )


# ======================================================
# List Documents
# ======================================================

def list_documents():
    """
    Return unique uploaded documents.
    """

    data = collection.get()

    documents = {}

    for metadata in data["metadatas"]:

        document_id = metadata["document_id"]

        if document_id not in documents:

            documents[document_id] = {
                "id": document_id,
                "filename": metadata["filename"]
            }

    return list(documents.values())


# ======================================================
# Collection Count
# ======================================================

def count():
    """
    Total chunks stored.
    """

    return collection.count()


# ======================================================
# Reset Collection
# ======================================================

def reset():
    """
    Delete every vector.
    """

    global collection

    client.delete_collection("documents")

    collection = client.get_or_create_collection(
        name="documents"
    )


# ======================================================
# Health Check
# ======================================================

def health():
    """
    ChromaDB health.
    """

    return {
        "status": "healthy",
        "collection": "documents",
        "chunks": count()
    }