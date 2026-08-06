"""
Pydantic Schemas
----------------
Request and response models.
"""

from datetime import datetime

from pydantic import BaseModel


# --------------------------------------------------
# Document
# --------------------------------------------------

class DocumentResponse(BaseModel):

    id: int

    filename: str

    file_size: int

    total_pages: int

    total_chunks: int

    status: str

    uploaded_at: datetime

    class Config:
        from_attributes = True


# --------------------------------------------------
# Chat
# --------------------------------------------------

class ChatRequest(BaseModel):

    question: str


class ChatResponse(BaseModel):

    answer: str

    sources: list[str]


# --------------------------------------------------
# Chat History
# --------------------------------------------------

class ChatHistoryResponse(BaseModel):

    id: int

    question: str

    answer: str

    source_documents: str | None

    uploaded_at: datetime

    class Config:
        from_attributes = True


# --------------------------------------------------
# Upload Progress
# --------------------------------------------------

class UploadProgressResponse(BaseModel):

    filename: str

    progress: int

    current_step: str

    completed: bool

    class Config:
        from_attributes = True