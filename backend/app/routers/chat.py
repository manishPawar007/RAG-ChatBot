"""
DocuMind AI
-----------
Chat Router
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.rag import ask_question


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


# =====================================================
# Request Model
# =====================================================

class ChatRequest(BaseModel):
    question: str
    document_id: str | int | None = None


# =====================================================
# Response Model
# =====================================================

class ChatResponse(BaseModel):
    answer: str
    sources: list


# =====================================================
# Chat Endpoint
# =====================================================

@router.post(
    "/",
    response_model=ChatResponse
)
def chat(request: ChatRequest):
    """
    Ask a question about uploaded documents.
    """

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:

        result = ask_question(
            question,
            document_id=str(request.document_id) if request.document_id is not None else None
        )

        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"]
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )


# =====================================================
# Chat Health
# =====================================================

@router.get("/health")
async def chat_health():
    """
    Chat service health.
    """

    return {
        "status": "healthy",
        "service": "RAG Chat"
    }