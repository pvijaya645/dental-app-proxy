"""
Knowledge Base routes:
  GET    /api/kb                  — list all KB entries for the business
  POST   /api/kb                  — add a single entry manually
  PUT    /api/kb/{id}             — update an entry (re-embeds automatically)
  DELETE /api/kb/{id}             — delete an entry
  POST   /api/kb/import-from-url  — scrape website + auto-generate entries via Claude
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.client import get_supabase
from app.db.models import KBEntryCreate, KBEntryRow, KBEntryUpdate
from app.routers.auth import get_current_business
from app.services.embeddings import embed_kb_entry
from app.services.firecrawl import import_from_url

router = APIRouter(tags=["knowledge-base"])


# ── GET /api/kb ───────────────────────────────────────────────

@router.get("", response_model=list[KBEntryRow])
def list_kb_entries(current_business: dict = Depends(get_current_business)):
    db = get_supabase()
    result = (
        db.table("knowledge_base")
        .select("id, business_id, title, content, category, is_active, created_at, updated_at")
        .eq("business_id", current_business["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return [KBEntryRow(**row) for row in result.data]


# ── POST /api/kb ──────────────────────────────────────────────

@router.post("", response_model=KBEntryRow, status_code=status.HTTP_201_CREATED)
def create_kb_entry(
    payload: KBEntryCreate,
    current_business: dict = Depends(get_current_business),
):
    embedding = embed_kb_entry(payload.title, payload.content)

    db = get_supabase()
    result = (
        db.table("knowledge_base")
        .insert({
            "business_id": str(current_business["id"]),
            "title":       payload.title,
            "content":     payload.content,
            "category":    payload.category,
            "embedding":   embedding,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save KB entry")

    return KBEntryRow(**result.data[0])


# ── PUT /api/kb/{id} ──────────────────────────────────────────

@router.put("/{entry_id}", response_model=KBEntryRow)
def update_kb_entry(
    entry_id: UUID,
    payload: KBEntryUpdate,
    current_business: dict = Depends(get_current_business),
):
    db = get_supabase()

    # Verify ownership
    existing = (
        db.table("knowledge_base")
        .select("*")
        .eq("id", str(entry_id))
        .eq("business_id", current_business["id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="KB entry not found")

    updates = payload.model_dump(exclude_none=True)

    # Re-embed if title or content changed
    if "title" in updates or "content" in updates:
        new_title   = updates.get("title",   existing.data["title"])
        new_content = updates.get("content", existing.data["content"])
        updates["embedding"] = embed_kb_entry(new_title, new_content)

    result = (
        db.table("knowledge_base")
        .update(updates)
        .eq("id", str(entry_id))
        .execute()
    )

    return KBEntryRow(**result.data[0])


# ── DELETE /api/kb/{id} ───────────────────────────────────────

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kb_entry(
    entry_id: UUID,
    current_business: dict = Depends(get_current_business),
):
    db = get_supabase()

    existing = (
        db.table("knowledge_base")
        .select("id")
        .eq("id", str(entry_id))
        .eq("business_id", current_business["id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="KB entry not found")

    db.table("knowledge_base").delete().eq("id", str(entry_id)).execute()


# ── POST /api/kb/import-from-url ─────────────────────────────

class ImportURLRequest:
    def __init__(self, url: str):
        self.url = url

from pydantic import BaseModel, HttpUrl

class ImportRequest(BaseModel):
    url: HttpUrl


@router.post("/import-from-url", status_code=status.HTTP_201_CREATED)
def import_kb_from_url(
    payload: ImportRequest,
    current_business: dict = Depends(get_current_business),
):
    """
    Scrape a dental office website with Firecrawl, extract KB entries
    using Claude, embed each one, and save to Supabase.

    Returns the list of entries that were created.
    """
    try:
        entries = import_from_url(str(payload.url))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

    db = get_supabase()
    saved = []

    for entry in entries:
        try:
            embedding = embed_kb_entry(entry["title"], entry["content"])
            result = (
                db.table("knowledge_base")
                .insert({
                    "business_id": str(current_business["id"]),
                    "title":       entry["title"],
                    "content":     entry["content"],
                    "category":    entry["category"],
                    "embedding":   embedding,
                })
                .execute()
            )
            if result.data:
                saved.append(KBEntryRow(**result.data[0]))
        except Exception:
            # Skip entries that fail to embed — don't abort the whole import
            continue

    return {
        "imported": len(saved),
        "entries":  [e.model_dump() for e in saved],
    }
