"""
Chat API — Sprint 3

Public endpoints (widget uses widget_api_key, no login needed):
  POST /api/chat/message          — send a patient message, get AI response
  GET  /api/chat/conversations    — list conversations (dashboard, requires auth)
  GET  /api/chat/conversations/{id}/messages — get messages (dashboard, requires auth)
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.db.client import get_supabase
from app.routers.auth import get_current_business
from app.services.chat import chat

router = APIRouter(tags=["chat"])


# ── Request / Response models ─────────────────────────────────

class ChatRequest(BaseModel):
    widget_api_key: str          # identifies the business (public)
    session_id: Optional[str] = None   # omit to start a new conversation
    message: str
    channel: str = "chat"


class ChatResponse(BaseModel):
    response: str
    intent: str
    conversation_id: str
    session_id: str


# ── POST /api/chat/message ────────────────────────────────────

@router.post("/message", response_model=ChatResponse)
def send_message(payload: ChatRequest):
    """
    Public endpoint — the embeddable widget calls this.
    Identifies the business via widget_api_key.
    """
    db = get_supabase()

    # Look up business by widget_api_key
    result = (
        db.table("businesses")
        .select("id, name, is_active")
        .eq("widget_api_key", payload.widget_api_key)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Invalid widget API key")

    business = result.data[0]

    if not business["is_active"]:
        raise HTTPException(status_code=403, detail="This account is inactive")

    # Generate session_id if not provided
    session_id = payload.session_id or str(uuid.uuid4())

    try:
        result = chat(
            business_id=business["id"],
            business_name=business["name"],
            session_id=session_id,
            patient_message=payload.message,
            channel=payload.channel,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

    return ChatResponse(**result)


# ── GET /api/chat/conversations ───────────────────────────────

@router.get("/conversations")
def list_conversations(
    current_business: dict = Depends(get_current_business),
    limit: int = 50,
):
    """Dashboard: list all conversations for this business."""
    db = get_supabase()
    result = (
        db.table("conversations")
        .select("*")
        .eq("business_id", current_business["id"])
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ── GET /api/chat/conversations/{id}/messages ─────────────────

@router.get("/conversations/{conversation_id}/messages")
def get_messages(
    conversation_id: str,
    current_business: dict = Depends(get_current_business),
):
    """Dashboard: get all messages in a conversation."""
    db = get_supabase()

    # Verify ownership
    conv = (
        db.table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("business_id", current_business["id"])
        .limit(1)
        .execute()
    )
    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return messages.data or []
