"""
Billing API — Sprint 8

GET  /api/billing/plans           — list all plans + current plan
POST /api/billing/checkout        — create Stripe checkout session
POST /api/billing/portal          — create Stripe customer portal session
POST /api/billing/webhook         — handle Stripe webhooks (public)
GET  /api/billing/status          — current subscription status
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.db.client import get_supabase
from app.routers.auth import get_current_business
from app.services.billing import (
    PLANS,
    create_checkout_session,
    create_portal_session,
    handle_webhook,
)

router = APIRouter(tags=["billing"])

import os
DASHBOARD_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ── GET /api/billing/plans ────────────────────────────────────

@router.get("/plans")
def get_plans(current_business: dict = Depends(get_current_business)):
    """Return all plans with current plan marked."""
    result = []
    for key, plan in PLANS.items():
        result.append({
            "id":          key,
            "name":        plan["name"],
            "price":       plan["price"],
            "description": plan["description"],
            "features":    plan["features"],
            "color":       plan["color"],
            "is_current":  current_business.get("plan") == key,
        })
    return result


# ── GET /api/billing/status ───────────────────────────────────

@router.get("/status")
def billing_status(current_business: dict = Depends(get_current_business)):
    """Return current billing status for the business."""
    db = get_supabase()
    result = db.table("businesses").select(
        "plan, subscription_status, stripe_customer_id, stripe_subscription_id"
    ).eq("id", current_business["id"]).single().execute()

    data = result.data or {}
    plan_key = data.get("plan", "starter")
    plan_info = PLANS.get(plan_key, PLANS["starter"])

    return {
        "plan":                 plan_key,
        "plan_name":            plan_info["name"],
        "plan_price":           plan_info["price"],
        "features":             plan_info["features"],
        "subscription_status":  data.get("subscription_status", "trialing"),
        "has_stripe":           bool(data.get("stripe_customer_id")),
    }


# ── POST /api/billing/checkout ────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # starter | growth | pro


@router.post("/checkout")
def create_checkout(
    payload: CheckoutRequest,
    current_business: dict = Depends(get_current_business),
):
    """Create a Stripe Checkout session and return the URL."""
    if not PLANS.get(payload.plan):
        raise HTTPException(status_code=400, detail=f"Invalid plan: {payload.plan}")

    try:
        url = create_checkout_session(
            business=current_business,
            plan=payload.plan,
            success_url=f"{DASHBOARD_URL}/billing?success=1",
            cancel_url=f"{DASHBOARD_URL}/billing?cancelled=1",
        )
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


# ── POST /api/billing/portal ──────────────────────────────────

@router.post("/portal")
def create_portal(current_business: dict = Depends(get_current_business)):
    """Create a Stripe Customer Portal session."""
    try:
        url = create_portal_session(
            business=current_business,
            return_url=f"{DASHBOARD_URL}/billing",
        )
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


# ── POST /api/billing/webhook ─────────────────────────────────
# Public endpoint — called by Stripe, not by the frontend

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Receive and process Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = handle_webhook(payload, sig_header)
        return JSONResponse(content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
