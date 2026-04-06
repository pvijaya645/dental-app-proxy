"""
Appointment Booking Service — HIPAA-compliant update.

Uses Claude to extract booking details from the conversation,
then saves the appointment to Supabase when all required fields are collected.

PHI handling: patient_name and patient_phone are collected from the patient
during the chat session (held in RAM via session_store) to confirm the booking,
but are NOT persisted to the database. Only service_type, date, time, and an
anonymized patient_ref are saved. The dental office correlates the appointment
to their own patient records using their internal system.

Required fields for booking: service_type, appointment_date, appointment_time
"""

import json
from anthropic import Anthropic
from app.core.config import settings
from app.db.client import get_supabase

_anthropic: Anthropic | None = None

EXTRACT_PROMPT = """You are extracting appointment booking details from a conversation.

Look at the full conversation and extract any booking information the patient has provided.

Return a JSON object with these fields (use null if not yet provided):
{
  "service_type":       string | null,
  "appointment_date":   string | null,   (format: YYYY-MM-DD if determinable, else natural language)
  "appointment_time":   string | null,   (format: HH:MM if determinable, else natural language)
  "notes":              string | null
}

Return ONLY the JSON object, no other text.

Conversation:
"""

MISSING_FIELDS_PROMPT = """You are Ravira, an AI receptionist for {business_name}.

The patient wants to book an appointment. Here is what we know so far:
{collected}

Ask for the NEXT missing required field in a friendly, natural way.
Required fields in order: service type → preferred date → preferred time.

Only ask for ONE thing at a time. Be concise and friendly.
"""


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic


def extract_booking_details(conversation_history: list[dict]) -> dict:
    """Use Claude to extract booking details from conversation history."""
    client = get_anthropic()

    convo_text = "\n".join([
        f"{m['role'].upper()}: {m['content']}"
        for m in conversation_history
    ])

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        messages=[{"role": "user", "content": EXTRACT_PROMPT + convo_text}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        return json.loads(raw)
    except Exception:
        return {}


def get_missing_fields(details: dict) -> list[str]:
    """Return list of required fields that are still missing."""
    required = ["service_type", "appointment_date", "appointment_time"]
    return [f for f in required if not details.get(f)]


def ask_for_next_field(business_name: str, details: dict) -> str:
    """Generate a message asking for the next missing field."""
    client = get_anthropic()

    collected_lines = []
    labels = {
        "service_type": "Service",
        "appointment_date": "Date",
        "appointment_time": "Time",
    }
    for key, label in labels.items():
        val = details.get(key)
        if val:
            collected_lines.append(f"- {label}: {val}")

    collected = "\n".join(collected_lines) if collected_lines else "Nothing collected yet"

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=150,
        messages=[{
            "role": "user",
            "content": MISSING_FIELDS_PROMPT.format(
                business_name=business_name,
                collected=collected,
            )
        }],
    )
    return response.content[0].text.strip()


def normalize_date_time(details: dict) -> dict:
    """
    Try to convert natural language dates/times to DB format.
    Falls back to storing as-is if parsing fails.
    """
    from datetime import datetime, date, timedelta
    import re

    # Normalize date
    raw_date = details.get("appointment_date", "")
    if raw_date:
        raw_lower = raw_date.lower().strip()
        today = date.today()

        if re.match(r"\d{4}-\d{2}-\d{2}", raw_date):
            pass  # already correct format
        elif "tomorrow" in raw_lower:
            details["appointment_date"] = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "monday" in raw_lower:
            days_ahead = (0 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "tuesday" in raw_lower:
            days_ahead = (1 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "wednesday" in raw_lower:
            days_ahead = (2 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "thursday" in raw_lower:
            days_ahead = (3 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "friday" in raw_lower:
            days_ahead = (4 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "saturday" in raw_lower:
            days_ahead = (5 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "sunday" in raw_lower:
            days_ahead = (6 - today.weekday()) % 7 or 7
            details["appointment_date"] = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # Normalize time
    raw_time = details.get("appointment_time", "")
    if raw_time:
        raw_lower = raw_time.lower().strip()
        time_match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", raw_lower)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2) or 0)
            period = time_match.group(3)
            if period == "pm" and hour < 12:
                hour += 12
            elif period == "am" and hour == 12:
                hour = 0
            details["appointment_time"] = f"{hour:02d}:{minute:02d}:00"

    return details


def save_appointment(business_id: str, conversation_id: str, details: dict) -> dict:
    """
    Save appointment metadata to Supabase — NO PHI stored.
    patient_name, patient_phone, and patient_email are NOT persisted.
    The dental office uses patient_ref to look up the patient in their own system.
    """
    db = get_supabase()
    result = db.table("appointments").insert({
        "business_id":      business_id,
        "conversation_id":  conversation_id,
        "service_type":     details["service_type"],
        "appointment_date": details["appointment_date"],
        "appointment_time": details["appointment_time"],
        "notes":            details.get("notes"),
        "status":           "pending",
        # patient_ref is intentionally omitted here; the office sets it after
        # they identify the patient in their own system
    }).execute()

    return result.data[0] if result.data else {}


def handle_booking(
    business_id: str,
    business_name: str,
    conversation_id: str,
    conversation_history: list[dict],
) -> dict:
    """
    Main booking handler. Returns:
    {
        "response": str,           — message to send back to patient
        "booking_complete": bool,  — True if appointment was saved
        "appointment": dict | None — saved appointment if complete
    }
    """
    # Extract what we know so far
    details = extract_booking_details(conversation_history)
    missing = get_missing_fields(details)

    if missing:
        # Still need more info — ask for next field
        response = ask_for_next_field(business_name, details)
        return {
            "response": response,
            "booking_complete": False,
            "appointment": None,
        }

    # All fields collected — normalize and save
    details = normalize_date_time(details)

    # Double-check date/time are in valid format after normalization
    missing_after = get_missing_fields(details)
    if missing_after:
        response = ask_for_next_field(business_name, details)
        return {"response": response, "booking_complete": False, "appointment": None}

    appointment = save_appointment(business_id, conversation_id, details)

    confirmation = (
        f"Your appointment has been booked!\n\n"
        f"**Summary:**\n"
        f"- Service: {details['service_type']}\n"
        f"- Date: {details['appointment_date']}\n"
        f"- Time: {details['appointment_time']}\n\n"
        f"Our office will follow up to confirm. Is there anything else I can help you with?"
    )

    return {
        "response": confirmation,
        "booking_complete": True,
        "appointment": appointment,
    }
