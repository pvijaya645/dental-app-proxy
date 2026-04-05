"""
Escalation Service — Sprint 7

Detects when a patient needs human help and:
1. Saves an escalation record to Supabase
2. Sends an SMS alert to staff via Twilio
3. Updates conversation status to 'escalated'

Escalation triggers:
  HIGH   — dental emergency, severe pain, bleeding, swelling, accident
  MEDIUM — frustrated, multiple failed attempts, wants to speak to someone
  LOW    — general preference for human contact
"""

import re
from app.core.config import settings
from app.db.client import get_supabase

# ── Trigger patterns ──────────────────────────────────────────

HIGH_URGENCY = [
    r"emergency", r"severe pain", r"unbearable", r"can't breathe",
    r"bleeding", r"swelling", r"abscess", r"knocked out", r"broken tooth",
    r"accident", r"fell", r"trauma", r"infection", r"fever",
    r"can't (eat|sleep|open mouth)", r"worst pain",
]

MEDIUM_URGENCY = [
    r"speak to (a |the )?(human|person|someone|dentist|doctor|staff|receptionist)",
    r"talk to (a |the )?(human|person|someone|dentist|doctor|staff)",
    r"real person", r"not helpful", r"frustrated", r"this is (useless|ridiculous)",
    r"can you just", r"just (call|contact) me", r"need (to talk|help) now",
    r"you('re| are) not (helping|understanding)", r"stop repeating",
]

LOW_URGENCY = [
    r"prefer to (speak|talk|call)", r"call me", r"have someone (call|reach)",
    r"leave (a |my )?number", r"schedule a call",
]


def detect_escalation(message: str, conversation_history: list[dict]) -> dict | None:
    """
    Analyse the latest message + history to decide if escalation is needed.
    Returns {"urgency": str, "reason": str} or None.
    """
    msg_lower = message.lower()

    # Check HIGH urgency
    for pattern in HIGH_URGENCY:
        if re.search(pattern, msg_lower):
            return {
                "urgency": "high",
                "reason": f"Patient reported possible emergency: '{message[:100]}'",
            }

    # Check MEDIUM urgency
    for pattern in MEDIUM_URGENCY:
        if re.search(pattern, msg_lower):
            return {
                "urgency": "medium",
                "reason": f"Patient requested human assistance: '{message[:100]}'",
            }

    # Check LOW urgency
    for pattern in LOW_URGENCY:
        if re.search(pattern, msg_lower):
            return {
                "urgency": "low",
                "reason": f"Patient prefers human contact: '{message[:100]}'",
            }

    # Check for repeated frustration in history (3+ messages without resolution)
    if len(conversation_history) >= 6:
        recent = conversation_history[-6:]
        user_msgs = [m["content"].lower() for m in recent if m["role"] == "user"]
        frustration_words = ["not helpful", "wrong", "no", "that's not", "still don't", "again"]
        frustration_count = sum(
            1 for msg in user_msgs
            if any(w in msg for w in frustration_words)
        )
        if frustration_count >= 2:
            return {
                "urgency": "medium",
                "reason": "Patient appears frustrated after multiple exchanges",
            }

    return None


def send_sms_alert(
    business_name: str,
    patient_message: str,
    urgency: str,
    reason: str,
    conversation_id: str,
) -> bool:
    """
    Send SMS to staff via Twilio.
    Returns True if sent, False if Twilio not configured (graceful fallback).
    """
    if not all([
        settings.twilio_account_sid,
        settings.twilio_auth_token,
        settings.twilio_from_number,
        settings.staff_alert_phone,
    ]):
        # Twilio not configured — log and continue without SMS
        print(f"[ESCALATION] SMS not sent (Twilio not configured). Urgency: {urgency} | {reason}")
        return False

    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

        urgency_emoji = {"high": "🚨", "medium": "⚠️", "low": "ℹ️"}.get(urgency, "⚠️")

        body = (
            f"{urgency_emoji} RAVIRA ALERT — {business_name}\n"
            f"Urgency: {urgency.upper()}\n"
            f"Reason: {reason}\n"
            f"Patient said: \"{patient_message[:100]}\"\n"
            f"Conv ID: {conversation_id[:8]}..."
        )

        client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=settings.staff_alert_phone,
        )
        print(f"[ESCALATION] SMS sent to {settings.staff_alert_phone}")
        return True

    except Exception as e:
        print(f"[ESCALATION] SMS failed: {e}")
        return False


def create_escalation(
    business_id: str,
    conversation_id: str,
    reason: str,
    urgency: str,
) -> dict:
    """Save escalation record to Supabase and update conversation status."""
    db = get_supabase()

    # Save escalation record
    result = db.table("staff_escalations").insert({
        "business_id":      business_id,
        "conversation_id":  conversation_id,
        "reason":           reason,
        "urgency":          urgency,
        "status":           "pending",
    }).execute()

    # Update conversation status to escalated
    db.table("conversations").update(
        {"status": "escalated"}
    ).eq("id", conversation_id).execute()

    return result.data[0] if result.data else {}


def handle_escalation(
    business_id: str,
    business_name: str,
    conversation_id: str,
    patient_message: str,
    conversation_history: list[dict],
) -> dict | None:
    """
    Full escalation pipeline. Returns escalation response dict or None.

    {
        "triggered": bool,
        "urgency": str,
        "response": str,   — message to send back to patient
        "sms_sent": bool,
    }
    """
    escalation_signal = detect_escalation(patient_message, conversation_history)

    if not escalation_signal:
        return None

    urgency = escalation_signal["urgency"]
    reason = escalation_signal["reason"]

    # Save to DB
    create_escalation(business_id, conversation_id, reason, urgency)

    # Send SMS
    sms_sent = send_sms_alert(
        business_name=business_name,
        patient_message=patient_message,
        urgency=urgency,
        reason=reason,
        conversation_id=conversation_id,
    )

    # Build patient-facing response
    if urgency == "high":
        response = (
            f"I can see this is urgent and I want to make sure you get immediate help. "
            f"Please call our office directly right now — our team is ready to assist you. "
            f"I've also alerted our staff about your situation. "
            f"If this is a life-threatening emergency, please call 911 immediately."
        )
    elif urgency == "medium":
        response = (
            f"I completely understand — let me get a staff member to help you directly. "
            f"I've sent an alert to our team and someone will reach out to you shortly. "
            f"You can also call us directly if you need immediate assistance."
        )
    else:
        response = (
            f"Of course! I've notified our team that you'd like to speak with someone. "
            f"A staff member will be in touch with you shortly. "
            f"Is there anything else I can help you with in the meantime?"
        )

    return {
        "triggered": True,
        "urgency": urgency,
        "response": response,
        "sms_sent": sms_sent,
    }
