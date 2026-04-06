"""
In-memory session store for conversation context.
PHI (message content) lives here temporarily during a session — never written to DB.
Sessions expire after 2 hours of inactivity.
"""
import time
from typing import Optional

# { session_id: { "messages": [...], "last_active": float, "business_id": str } }
_sessions: dict = {}

SESSION_TTL = 7200  # 2 hours in seconds
MAX_MESSAGES = 20   # keep last 20 messages for context


def get_session(session_id: str) -> list[dict]:
    """Get conversation history for a session (ephemeral, in-memory only)."""
    _cleanup_expired()
    session = _sessions.get(session_id)
    if not session:
        return []
    session["last_active"] = time.time()
    return session["messages"]


def add_to_session(session_id: str, role: str, content: str, business_id: str):
    """Add a message to session memory. Content stays in RAM only, never saved to DB."""
    _cleanup_expired()
    if session_id not in _sessions:
        _sessions[session_id] = {
            "messages": [],
            "last_active": time.time(),
            "business_id": business_id,
        }
    session = _sessions[session_id]
    session["messages"].append({"role": role, "content": content})
    session["last_active"] = time.time()
    # Keep only last MAX_MESSAGES to limit memory usage
    if len(session["messages"]) > MAX_MESSAGES:
        session["messages"] = session["messages"][-MAX_MESSAGES:]


def clear_session(session_id: str):
    """Clear a session (e.g. when conversation ends)."""
    _sessions.pop(session_id, None)


def _cleanup_expired():
    """Remove sessions that haven't been active for SESSION_TTL seconds."""
    now = time.time()
    expired = [sid for sid, s in _sessions.items() if now - s["last_active"] > SESSION_TTL]
    for sid in expired:
        del _sessions[sid]


def session_count() -> int:
    return len(_sessions)
