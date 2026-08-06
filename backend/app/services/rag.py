"""
DocuMind AI
-----------
RAG Pipeline Service
"""

import re
from typing import Dict, List

from app.services.embeddings import generate_query_embedding
from app.services.ollama import generate_response
from app.services.vector_store import search


# ======================================================
# Small Talk Detection
# ======================================================
#
# Greetings, thanks, and other chit-chat shouldn't trigger a
# document search or a canned "no info found" reply — the model
# should just respond conversationally.

_SMALL_TALK_PATTERNS = [
    r"(hi|hello|hey|yo|howdy|hiya)[\s!.,]*$",
    r"good\s+(morning|afternoon|evening|night)[\s!.,]*$",
    r"how('?s| is| are) it going[\s?!.,]*$",
    r"how are you( doing)?[\s?!.,]*$",
    r"what'?s up[\s?!.,]*$",
    r"(thanks|thank you|thx|ty|cheers)[\s!.,]*$",
    r"(bye|goodbye|see ya|see you|later|take care)[\s!.,]*$",
    r"who are you[\s?!.,]*$",
    r"what can you do[\s?!.,]*$",
    r"^(ok|okay|cool|nice|great|awesome|got it|sounds good)[\s!.,]*$",
]

_SMALL_TALK_RE = re.compile("^(" + "|".join(_SMALL_TALK_PATTERNS) + ")", re.IGNORECASE)


def is_small_talk(question: str) -> bool:
    """
    Heuristic check for greetings / chit-chat that don't warrant
    a vector search over the uploaded documents.
    """

    return bool(_SMALL_TALK_RE.match(question.strip()))


# ======================================================
# Build Context
# ======================================================

def build_context(results: Dict) -> str:
    """
    Build context string from ChromaDB search results.
    """

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    context_parts = []

    for document, metadata in zip(documents, metadatas):

        page = metadata.get("page", "?")
        filename = metadata.get("filename", "Unknown")

        context_parts.append(
            f"[File: {filename} | Page: {page}]\n{document}"
        )

    return "\n\n".join(context_parts)


# ======================================================
# Extract Sources
# ======================================================

def extract_sources(results: Dict) -> List[Dict]:
    """
    Extract unique source references.
    """

    sources = []

    seen = set()

    metadatas = results.get("metadatas", [[]])[0]

    for metadata in metadatas:

        key = (
            metadata.get("filename"),
            metadata.get("page")
        )

        if key in seen:
            continue

        seen.add(key)

        sources.append(
            {
                "filename": metadata.get("filename"),
                "page": metadata.get("page")
            }
        )

    return sources


# ======================================================
# Ask Question
# ======================================================

def ask_question(
    question: str,
    top_k: int = 5,
    document_id: str = None
) -> Dict:
    """
    Complete RAG pipeline.
    """

    stripped_question = question.strip()

    # Greetings / small talk: skip the vector store entirely and let
    # the model respond conversationally.
    if is_small_talk(stripped_question):

        answer = generate_response(
            question=stripped_question,
            context=(
                "The user is making small talk, not asking about a "
                "document. Reply naturally and briefly. If it fits, "
                "invite them to ask a question about their uploaded "
                "document(s)."
            )
        )

        return {
            "answer": answer,
            "sources": []
        }

    query_embedding = generate_query_embedding(stripped_question)

    results = search(
        query_embedding=query_embedding,
        top_k=top_k,
        document_id=document_id
    )

    documents = results.get("documents", [[]])[0]

    if not documents:

        # No matching chunks — let the model phrase this naturally
        # instead of always returning the same hardcoded sentence,
        # and let it fall back on general knowledge if that's more
        # helpful than a flat "not found".
        answer = generate_response(
            question=stripped_question,
            context=(
                "No relevant excerpts were found in the uploaded "
                "document(s) for this question. Let the user know "
                "nothing relevant was found in their document(s). If "
                "the question is general knowledge unrelated to a "
                "document, you may still answer it, but make clear "
                "the answer isn't sourced from their uploads."
            )
        )

        return {
            "answer": answer,
            "sources": []
        }

    context = build_context(results)

    answer = generate_response(
        question=stripped_question,
        context=context
    )

    return {
        "answer": answer,
        "sources": extract_sources(results)
    }


# ======================================================
# Retrieve Context Only
# ======================================================

def retrieve_context(
    question: str,
    top_k: int = 5
) -> Dict:
    """
    Return retrieved chunks without generating an answer.
    Useful for debugging.
    """

    embedding = generate_query_embedding(question)

    results = search(
        query_embedding=embedding,
        top_k=top_k
    )

    return {
        "context": build_context(results),
        "sources": extract_sources(results)
    }


# ======================================================
# RAG Health
# ======================================================

def health() -> Dict:
    """
    RAG service health.
    """

    return {
        "status": "healthy",
        "pipeline": [
            "Embeddings",
            "Vector Search",
            "Context Builder",
            "Ollama"
        ]
    }