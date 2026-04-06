"""
Escalations API — Sprint 7

GET   /api/escalations          — list all escalations (dashboard)
PATCH /api/escalations/{id}     — update status (acknowledge/resolve)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_supabase
from app.routers.auth import get_current_business

router = APIRouter(tags=["escalations"])


class EscalationStatusUpdate(BaseModel):
    status: str  # pending | acknowledged | resolved


@router.get("")
def list_escalations(
    current_business: dict = Depends(get_current_business),
    status: Optional[str] = None,
):
    db = get_supabase()
    query = (
        db.table("staff_escalations")
        .select("*, conversations(session_id, channel)")
        .eq("business_id", current_business["id"])
        .order("created_at", desc=True)
    )
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data or []


@router.patch("/{escalation_id}")
def update_escalation_status(
    escalation_id: str,
    payload: EscalationStatusUpdate,
    current_business: dict = Depends(get_current_business),
):
    valid = {"pending", "acknowledged", "resolved"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")

    db = get_supabase()
    existing = (
        db.table("staff_escalations")
        .select("id")
        .eq("id", escalation_id)
        .eq("business_id", current_business["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Escalation not found")

    updates = {"status": payload.status}
    if payload.status == "resolved":
        from datetime import datetime, timezone
        updates["resolved_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        db.table("staff_escalations")
        .update(updates)
        .eq("id", escalation_id)
        .execute()
    )
    return result.data[0]
