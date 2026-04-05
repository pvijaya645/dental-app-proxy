"""
AI Chat Engine — Sprint 3 core.

Flow:
  1. Receive patient message + session_id + business context
  2. Search KB for relevant entries (RAG)
  3. Build Claude prompt with context + history
  4. Get Claude's response
  5. Save both messages to Supabase
  6. Return response + intent
"""

import uuid
from anthropic import Anthropic
from app.core.config import settings
from app.db.client import get_supabase
from app.services.rag import search_kb, format_context
from app.services.booking import handle_booking
from app.services.escalation import handle_escalation

_anthropic: Anthropic | None = None

SYSTEM_PROMPT = """You are Ravira, a friendly and professional AI receptionist for {business_name}.

Your job is to help patients by answering their questions accurately using the information provided.

KNOWLEDGE BASE (use this to answer questions):
{context}

GUIDELINES:
- Be warm, friendly, and professional — like a real receptionist
- Answer ONLY using the knowledge base above. If something isn't covered, say you'll have the office follow up
- For appointment requests, collect: patient name, preferred date/time, and type of service
- For emergencies or urgent pain, always give the office phone number and say to call immediately
- Keep responses concise — 2-4 sentences max unless more detail is clearly needed
- Never make up prices, hours, or policies not in the knowledge base
- Always end with a helpful offer: "Is there anything else I can help you with?"

BUSINESS: {business_name}
"""


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic


def get_or_create_conversation(db, business_id: str, session_id: str, channel: str = "chat") -> dict:
    """Get existing conversation or create a new one."""
    existing = (
        db.table("conversations")
        .select("*")
        .eq("business_id", business_id)
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    new_conv = (
        db.table("conversations")
        .insert({
            "business_id": business_id,
            "session_id": session_id,
            "channel": channel,
            "status": "active",
        })
        .execute()
    )
    return new_conv.data[0]


def get_conversation_history(db, conversation_id: str, limit: int = 10) -> list[dict]:
    """Fetch recent messages for context window."""
    result = (
        db.table("messages")
        .select("role, content, intent")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    # Reverse so oldest first
    return list(reversed(result.data or []))


def save_message(db, conversation_id: str, role: str, content: str, intent: str = None) -> dict:
    """Save a message to Supabase."""
    row = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
    }
    if intent:
        row["intent"] = intent

    result = db.table("messages").insert(row).execute()
    return result.data[0] if result.data else {}


def detect_intent(message: str) -> str:
    """Simple keyword-based intent detection."""
    msg = message.lower()
    if any(w in msg for w in ["appointment", "book", "schedule", "reserve", "visit"]):
        return "appointment"
    if any(w in msg for w in ["emergency", "pain", "urgent", "hurts", "bleeding", "broken"]):
        return "emergency"
    if any(w in msg for w in ["price", "cost", "how much", "fee", "insurance", "cover"]):
        return "pricing"
    if any(w in msg for w in ["hour", "open", "close", "available", "when"]):
        return "hours"
    return "general"


def chat(
    business_id: str,
    business_name: str,
    session_id: str,
    patient_message: str,
    channel: str = "chat",
) -> dict:
    """
    Main chat function. Returns:
    {
        "response": str,
        "intent": str,
        "conversation_id": str,
        "session_id": str,
    }
    """
    db = get_supabase()

    # 1. Get or create conversation
    conversation = get_or_create_conversation(db, business_id, session_id, channel)
    conversation_id = conversation["id"]

    # 2. RAG — find relevant KB entries
    kb_entries = search_kb(patient_message, business_id, top_k=5)
    context = format_context(kb_entries)

    # 3. Get conversation history
    history = get_conversation_history(db, conversation_id, limit=10)

    # 4. Detect intent
    intent = detect_intent(patient_message)

    # 5. Save patient message first
    save_message(db, conversation_id, "user", patient_message, intent)

    # 6. Check for escalation BEFORE booking/RAG
    escalation = handle_escalation(
        business_id=business_id,
        business_name=business_name,
        conversation_id=conversation_id,
        patient_message=patient_message,
        conversation_history=history,
    )
    if escalation:
        save_message(db, conversation_id, "assistant", escalation["response"])
        return {
            "response":        escalation["response"],
            "intent":          "escalation",
            "conversation_id": conversation_id,
            "session_id":      session_id,
            "escalated":       True,
            "urgency":         escalation["urgency"],
            "sms_sent":        escalation["sms_sent"],
            "booking_complete": False,
            "appointment":     None,
        }

    # 7. Check if we're already in a booking flow (sticky booking mode)
    #    If any previous message had appointment intent, stay in booking mode
    #    until an appointment is actually saved
    in_booking_mode = intent == "appointment" or any(
        m.get("intent") == "appointment" for m in history
    )

    # Also check if appointment already saved for this conversation
    if in_booking_mode:
        existing_appt = (
            db.table("appointments")
            .select("id")
            .eq("conversation_id", conversation_id)
            .limit(1)
            .execute()
        )
        if existing_appt.data:
            in_booking_mode = False  # Already booked, go back to normal

    # 8. Route appointment intent to booking flow
    if in_booking_mode:
        # Reload history including the message we just saved
        full_history = get_conversation_history(db, conversation_id, limit=20)
        booking_result = handle_booking(
            business_id=business_id,
            business_name=business_name,
            conversation_id=conversation_id,
            conversation_history=full_history,
        )
        ai_response = booking_result["response"]
        save_message(db, conversation_id, "assistant", ai_response)

        return {
            "response": ai_response,
            "intent": intent,
            "conversation_id": conversation_id,
            "session_id": session_id,
            "booking_complete": booking_result["booking_complete"],
            "appointment": booking_result.get("appointment"),
        }

    # 9. Normal RAG flow for non-booking intents
    system = SYSTEM_PROMPT.format(
        business_name=business_name,
        context=context,
    )

    messages = []
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": patient_message})

    client = get_anthropic()
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=512,
        system=system,
        messages=messages,
    )
    ai_response = response.content[0].text.strip()

    save_message(db, conversation_id, "assistant", ai_response)

    return {
        "response": ai_response,
        "intent": intent,
        "conversation_id": conversation_id,
        "session_id": session_id,
        "booking_complete": False,
        "appointment": None,
    }
