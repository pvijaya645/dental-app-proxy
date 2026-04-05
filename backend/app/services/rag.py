"""
RAG (Retrieval-Augmented Generation) service.

Given a patient's question and a business_id, finds the most relevant
KB entries using pgvector cosine similarity search.
"""

from app.db.client import get_supabase
from app.services.embeddings import embed_text as get_embedding


def search_kb(question: str, business_id: str, top_k: int = 5) -> list[dict]:
    """
    Embed the question and find the top-K most relevant KB entries
    for this business using pgvector similarity search.

    Returns list of {id, title, content, category, similarity} dicts.
    """
    embedding = get_embedding(question)
    db = get_supabase()

    result = db.rpc("match_knowledge_base", {
        "query_embedding": embedding,
        "match_business_id": business_id,
        "match_count": top_k,
        "match_threshold": 0.4,   # 0.0–1.0; lower = more results but less relevant
    }).execute()

    return result.data or []


def format_context(kb_entries: list[dict]) -> str:
    """
    Format KB entries into a readable context block for Claude's system prompt.
    """
    if not kb_entries:
        return "No specific information found in the knowledge base."

    lines = []
    for entry in kb_entries:
        lines.append(f"[{entry['category'].upper()}] {entry['title']}\n{entry['content']}")

    return "\n\n".join(lines)
