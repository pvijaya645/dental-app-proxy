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
    business_id: UUID
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

class ConversationCreate(BaseModel):
    business_id: UUID
    session_id: str
    channel: str = "chat"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None


class ConversationRow(BaseModel):
    id: UUID
    business_id: UUID
    session_id: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    customer_email: Optional[str]
    channel: str
    status: str
    created_at: datetime
    updated_at: datetime


# ── MESSAGE ───────────────────────────────────────────────────

class MessageCreate(BaseModel):
    conversation_id: UUID
    role: str   # user | assistant | system
    content: str
    intent: Optional[str] = None
    confidence: Optional[float] = None


class MessageRow(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    intent: Optional[str]
    confidence: Optional[float]
    created_at: datetime


# ── APPOINTMENT ───────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    business_id: UUID
    conversation_id: Optional[UUID] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[EmailStr] = None
    appointment_date: date
    appointment_time: time
    service_type: str
    notes: Optional[str] = None


class AppointmentRow(BaseModel):
    id: UUID
    business_id: UUID
    conversation_id: Optional[UUID]
    patient_name: str
    patient_phone: str
    patient_email: Optional[str]
    appointment_date: date
    appointment_time: time
    service_type: str
    status: str
    notes: Optional[str]
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
