from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.routers import auth, kb, chat, widget, appointments, escalations
# from app.routers import billing  # Sprint 8 — activate when Stripe is configured

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Ravira — AI Customer Support for Dental Offices",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=True,
)

# ── CORS ──────────────────────────────────────────────────────
# Allow the React dashboard and embeddable widget to call the API.
# In production, lock this down to your actual domains.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",    # Vercel preview deployments
        "https://*.netlify.app",   # Netlify deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
# Sprint 1: Auth only
app.include_router(auth.router,   prefix="/api/auth")
app.include_router(kb.router,     prefix="/api/kb")
app.include_router(chat.router,   prefix="/api/chat")
app.include_router(widget.router,       prefix="")
app.include_router(appointments.router,  prefix="/api/appointments")
app.include_router(escalations.router,   prefix="/api/escalations")
# app.include_router(billing.router,     prefix="/api/billing")  # Sprint 8 — activate when Stripe is configured

# Coming in later sprints — uncomment as you build them:
# from app.routers import widget, dashboard, billing, sms, voice
# app.include_router(widget.router,    prefix="/api/widget")
# app.include_router(dashboard.router, prefix="/api/dashboard")
# app.include_router(billing.router,   prefix="/api/billing")
# app.include_router(sms.router,       prefix="/api/sms")
# app.include_router(voice.router,     prefix="/api/voice")


# ── Health check ──────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "version": "1.0.0"}
