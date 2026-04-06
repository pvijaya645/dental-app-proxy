"""
Pydantic models for all Ravira database tables.

Naming convention:
  - <Table>Row      — shape returned from Supabase (includes id, timestamps)
  - <Table>Create   — shape accepted to create a new row
  - <Table>Update   — shape accepted to update an existing row (all fields Optional)
"""

from datetime import datetime, date, time
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


# ── BUSINESS ──────────────────────────────────────────────────

class BusinessCreate(BaseModel):
    name: str
    email: EmailStr
    password: str          # plain text — hashed before saving
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: str = "America/New_York"


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    business_hours: Optional[dict[str, Any]] = None
    services: Optional[list[str]] = None


class BusinessRow(BaseModel):
    id: UUID
    name: str
    email: str
    plan: str
    widget_api_key: UUID
    business_hours: dict[str, Any]
    services: list[Any]
    phone: Optional[str]
    address: Optional[str]
    timezone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Never expose password_hash to API consumers
    model_config = {"from_attributes": True}


# ── STAFF ─────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    business_id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    role: str = "receptionist"


class StaffRow(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    phone: Optional[str]
    email: Optional[str]
    role: str
    is_active: bool
    created_at: datetime


# ── KNOWLEDGE BASE ────────────────────────────────────────────

class KBEntryCreate(BaseModel):
    title: str
    content: str
    category: str = "general"


class KBEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class KBEntryRow(BaseModel):
    id: UUID
    business_id: UUID
    title: str
    content: str
    category: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # embedding is excluded — it's large and internal


# ── CONVERSATION ──────────────────────────────────────────────
# PHI NOTICE: customer_name, customer_phone, customer_email have been removed.
# Message content is never stored; session history lives in RAM only.

class ConversationCreate(BaseModel):
    business_id: UUID
    session_id: str
    channel: str = "chat"
    # No PHI fields — patient identity is never stored


class ConversationRow(BaseModel):
    id: UUID
    business_id: UUID
    session_id: str
    channel: str
    status: str
    message_count: Optional[int] = 0
    last_intent: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── MESSAGE ───────────────────────────────────────────────────
# PHI NOTICE: content field has been removed.
# Only non-PHI metadata is stored: role, intent, char_count.
# Message content lives in the in-memory session store only.

class MessageCreate(BaseModel):
    conversation_id: UUID
    role: str           # user | assistant | system
    intent: Optional[str] = None
    char_count: Optional[int] = None   # character length only, never content


class MessageRow(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    intent: Optional[str]
    char_count: Optional[int]
    created_at: datetime


# ── APPOINTMENT ───────────────────────────────────────────────
# PHI NOTICE: patient_name, patient_phone, patient_email have been removed.
# Use patient_ref to correlate with the dental office's own patient management system.

class AppointmentCreate(BaseModel):
    business_id: UUID
    conversation_id: Optional[UUID] = None
    patient_ref: Optional[str] = None   # anonymized reference set by dental office
    appointment_date: date
    appointment_time: time
    service_type: str
    notes: Optional[str] = None
    # No patient_name / patient_phone / patient_email


class AppointmentRow(BaseModel):
    id: UUID
    business_id: UUID
    conversation_id: Optional[UUID]
    patient_ref: Optional[str]          # anonymized reference only
    appointment_date: date
    appointment_time: time
    service_type: str
    status: str
    notes: Optional[str]
    staff_notified: Optional[bool] = False
    created_at: datetime
    updated_at: datetime


# ── STAFF ESCALATION ──────────────────────────────────────────

class EscalationCreate(BaseModel):
    business_id: UUID
    conversation_id: UUID
    reason: str
    urgency: str = "medium"


class EscalationRow(BaseModel):
    id: UUID
    business_id: UUID
    conversation_id: UUID
    reason: str
    urgency: str
    status: str
    alerted_at: datetime
    resolved_at: Optional[datetime]
    created_at: datetime


# ── AUTH RESPONSES ────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    business: BusinessRow


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
