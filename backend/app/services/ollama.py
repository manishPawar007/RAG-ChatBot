"""
DocuMind AI
-----------
Ollama Service
Handles communication with the local Ollama server.
"""

from typing import List

import requests

from app.config import OLLAMA_URL, OLLAMA_MODEL


# ======================================================
# Prompt Template
# ======================================================

SYSTEM_PROMPT = """
You are DocuMind AI, a friendly and helpful assistant that can also read the
user's uploaded documents.

Rules:
1. If the user's message is a greeting, small talk, or a general question that
   is not about the uploaded documents (e.g. "how are you", "what is
   photosynthesis", "why is the sky blue"), answer it normally and helpfully,
   like any capable assistant would — do NOT say you can only discuss
   documents.
2. If the user is asking something that depends on the uploaded documents,
   answer ONLY using the provided context below.
   - If the context does not contain the answer, say:
     "I couldn't find that information in the uploaded documents."
   - Do not make up information about the documents.
3. Keep answers concise. Use bullet points when helpful.
"""


# ======================================================
# Build Prompt
# ======================================================

def build_prompt(question: str, context: str) -> str:
    """
    Build the final prompt sent to Ollama.
    """

    return f"""
{SYSTEM_PROMPT}

==========================
Context from uploaded documents
==========================

{context if context.strip() else "(No document context available for this message.)"}

==========================
Question
==========================

{question}

==========================
Answer
==========================
"""


# ======================================================
# Generate Response
# ======================================================

def generate_response(
    question: str,
    context: str
) -> str:
    """
    Generate answer using Ollama.
    """

    prompt = build_prompt(question, context)

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json=payload,
        timeout=300
    )

    response.raise_for_status()

    data = response.json()

    return data.get("response", "").strip()


# ======================================================
# Summarize Document
# ======================================================

def summarize_document(text: str) -> str:
    """
    Generate a short summary.
    """

    prompt = f"""
Summarize the following document.

Document:

{text[:12000]}

Summary:
"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json=payload,
        timeout=300
    )

    response.raise_for_status()

    return response.json()["response"].strip()


# ======================================================
# Generate Key Points
# ======================================================

def generate_key_points(text: str) -> List[str]:
    """
    Extract important bullet points.
    """

    prompt = f"""
Read the document below.

Return only bullet points.

{text[:12000]}
"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json=payload,
        timeout=300
    )

    response.raise_for_status()

    answer = response.json()["response"]

    points = [
        line.strip("-• ").strip()
        for line in answer.splitlines()
        if line.strip()
    ]

    return points


# ======================================================
# Ollama Health Check
# ======================================================

def health():
    """
    Check whether Ollama is running.
    """

    try:

        response = requests.get(
            f"{OLLAMA_URL}/api/tags",
            timeout=10
        )

        response.raise_for_status()

        models = response.json().get("models", [])

        return {
            "status": "healthy",
            "model": OLLAMA_MODEL,
            "available_models": len(models)
        }

    except Exception as exc:

        return {
            "status": "offline",
            "error": str(exc)
        }