"""
Appointments API — HIPAA-compliant update.

PHI fields (patient_name, patient_phone, patient_email) have been removed.
The dental office manages patient identity in their own system and supplies
an opaque patient_ref (e.g. their internal patient ID) if they need to
correlate the appointment back to a patient record.

GET    /api/appointments         — list all appointments (dashboard)
GET    /api/appointments/{id}    — get single appointment
PATCH  /api/appointments/{id}    — update status (confirm/cancel)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_supabase
from app.routers.auth import get_current_business

router = APIRouter(tags=["appointments"])


class AppointmentStatusUpdate(BaseModel):
    status: str  # pending | confirmed | cancelled


@router.get("")
def list_appointments(
    current_business: dict = Depends(get_current_business),
    status: Optional[str] = None,
):
    db = get_supabase()
    query = (
        db.table("appointments")
        .select("*")
        .eq("business_id", current_business["id"])
        .order("appointment_date", desc=False)
    )
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data or []


@router.get("/{appointment_id}")
def get_appointment(
    appointment_id: str,
    current_business: dict = Depends(get_current_business),
):
    db = get_supabase()
    result = (
        db.table("appointments")
        .select("*")
        .eq("id", appointment_id)
        .eq("business_id", current_business["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return result.data


@router.patch("/{appointment_id}")
def update_appointment_status(
    appointment_id: str,
    payload: AppointmentStatusUpdate,
    current_business: dict = Depends(get_current_business),
):
    valid = {"pending", "confirmed", "cancelled"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")

    db = get_supabase()
    existing = (
        db.table("appointments")
        .select("id")
        .eq("id", appointment_id)
        .eq("business_id", current_business["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Appointment not found")

    result = (
        db.table("appointments")
        .update({"status": payload.status})
        .eq("id", appointment_id)
        .execute()
    )
    return result.data[0]
