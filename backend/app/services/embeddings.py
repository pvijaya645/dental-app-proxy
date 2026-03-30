"""
Embedding service using OpenAI text-embedding-3-small.
Converts text into 1536-dimension vectors for pgvector semantic search.
"""

from openai import OpenAI
from app.core.config import settings

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def embed_text(text: str) -> list[float]:
    """
    Convert a string into a 1536-dim vector.
    Called whenever a KB entry is created or updated.
    """
    client = get_openai_client()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text.strip(),
    )
    return response.data[0].embedding


def embed_kb_entry(title: str, content: str) -> list[float]:
    """
    Embed title + content together for richer semantic search.
    """
    combined = f"{title}\n\n{content}"
    return embed_text(combined)
