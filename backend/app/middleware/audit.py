"""
Audit logging middleware — records API actions without storing PHI.
Logs: who accessed what endpoint, when, status code.
Does NOT log request/response bodies (which may contain PHI).
"""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.client import get_supabase
from app.core.security import decode_access_token

# Endpoints to skip logging (health checks, static files)
SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/widget.js"}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        path = request.url.path
        if path in SKIP_PATHS or path.startswith("/docs"):
            return response

        # Extract business_id from JWT token (no PHI)
        business_id = None
        try:
            auth = request.headers.get("authorization", "")
            if auth.startswith("Bearer "):
                token = auth[7:]
                business_id = decode_access_token(token)
        except Exception:
            pass

        # Log the action — NO request/response body, NO PHI
        action = _path_to_action(path, request.method)
        try:
            db = get_supabase()
            db.table("audit_logs").insert({
                "business_id": business_id,
                "action": action,
                "endpoint": f"{request.method} {path}",
                "ip_address": _get_ip(request),
                "status_code": response.status_code,
            }).execute()
        except Exception:
            pass  # Never let audit logging break the main request

        return response


def _path_to_action(path: str, method: str) -> str:
    """Convert endpoint path to readable action name."""
    mapping = {
        "/api/auth/login":    "auth.login",
        "/api/auth/register": "auth.register",
        "/api/auth/logout":   "auth.logout",
        "/api/kb":            "kb.write" if method in ("POST", "PUT", "DELETE") else "kb.read",
        "/api/chat/message":  "chat.message",
        "/api/appointments":  "appointments.access",
    }
    for prefix, action in mapping.items():
        if path.startswith(prefix):
            return action
    return f"{method.lower()}.{path.replace('/', '.').strip('.')}"


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
