"""
Stripe Billing Service — Sprint 8

Handles:
  - Creating/fetching Stripe customers
  - Creating checkout sessions (new subscriptions)
  - Creating billing portal sessions (manage/cancel)
  - Processing webhooks (subscription created/updated/cancelled)
"""

import stripe
from app.core.config import settings
from app.db.client import get_supabase

PLANS = {
    "starter": {
        "name":        "Starter",
        "price":       99,
        "price_id":    settings.stripe_price_starter,
        "description": "1 location · Chat widget · KB up to 100 entries",
        "features":    ["Chat widget", "AI receptionist", "Knowledge base", "Appointment booking", "Email support"],
        "color":       "#2563eb",
    },
    "growth": {
        "name":        "Growth",
        "price":       199,
        "price_id":    settings.stripe_price_growth,
        "description": "3 locations · Chat + SMS · Unlimited KB",
        "features":    ["Everything in Starter", "SMS alerts", "3 locations", "Staff escalation SMS", "Priority support"],
        "color":       "#7c3aed",
    },
    "pro": {
        "name":        "Pro",
        "price":       299,
        "price_id":    settings.stripe_price_pro,
        "description": "Unlimited locations · Chat + SMS + Voice",
        "features":    ["Everything in Growth", "Voice AI (Vapi)", "Unlimited locations", "Custom AI persona", "Dedicated support"],
        "color":       "#059669",
    },
}


def get_stripe_client():
    stripe.api_key = settings.stripe_secret_key
    return stripe


def get_or_create_customer(business: dict) -> str:
    """
    Get existing Stripe customer or create a new one.
    Returns the Stripe customer ID.
    """
    sc = get_stripe_client()
    db = get_supabase()

    # Already has a Stripe customer
    if business.get("stripe_customer_id"):
        return business["stripe_customer_id"]

    # Create new Stripe customer
    customer = sc.Customer.create(
        email=business["email"],
        name=business["name"],
        metadata={"business_id": str(business["id"])},
    )

    # Save to DB
    db.table("businesses").update(
        {"stripe_customer_id": customer.id}
    ).eq("id", business["id"]).execute()

    return customer.id


def create_checkout_session(
    business: dict,
    plan: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a Stripe Checkout session for a subscription.
    Returns the checkout session URL.
    """
    sc = get_stripe_client()
    plan_data = PLANS.get(plan)

    if not plan_data:
        raise ValueError(f"Unknown plan: {plan}")
    if not plan_data["price_id"]:
        raise ValueError(f"Stripe price ID not configured for plan: {plan}")

    customer_id = get_or_create_customer(business)

    session = sc.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{
            "price":    plan_data["price_id"],
            "quantity": 1,
        }],
        success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=cancel_url,
        subscription_data={
            "metadata": {
                "business_id": str(business["id"]),
                "plan":        plan,
            },
            "trial_period_days": 14,   # 14-day free trial
        },
        metadata={
            "business_id": str(business["id"]),
            "plan":        plan,
        },
    )
    return session.url


def create_portal_session(business: dict, return_url: str) -> str:
    """
    Create a Stripe Customer Portal session.
    Returns the portal URL — lets customers manage/cancel their subscription.
    """
    sc = get_stripe_client()
    customer_id = get_or_create_customer(business)

    session = sc.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


def handle_webhook(payload: bytes, sig_header: str) -> dict:
    """
    Verify and process a Stripe webhook event.
    Returns {"handled": bool, "event_type": str}.
    """
    sc = get_stripe_client()

    try:
        event = sc.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid webhook signature")

    event_type = event["type"]
    db = get_supabase()

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        business_id = session.get("metadata", {}).get("business_id")
        plan = session.get("metadata", {}).get("plan", "starter")
        sub_id = session.get("subscription")

        if business_id:
            db.table("businesses").update({
                "plan":                    plan,
                "stripe_subscription_id":  sub_id,
                "subscription_status":     "trialing",
            }).eq("id", business_id).execute()

    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        sub = event["data"]["object"]
        business_id = sub.get("metadata", {}).get("business_id")
        plan = sub.get("metadata", {}).get("plan", "starter")
        status = sub.get("status", "active")

        status_map = {
            "trialing":        "trialing",
            "active":          "active",
            "past_due":        "past_due",
            "canceled":        "cancelled",
            "unpaid":          "past_due",
            "paused":          "paused",
        }

        if business_id:
            db.table("businesses").update({
                "plan":                   plan,
                "stripe_subscription_id": sub["id"],
                "subscription_status":    status_map.get(status, "active"),
            }).eq("id", business_id).execute()

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        business_id = sub.get("metadata", {}).get("business_id")

        if business_id:
            db.table("businesses").update({
                "plan":                "starter",
                "subscription_status": "cancelled",
            }).eq("id", business_id).execute()

    elif event_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        if customer_id:
            result = db.table("businesses").select("id").eq(
                "stripe_customer_id", customer_id
            ).limit(1).execute()
            if result.data:
                db.table("businesses").update({
                    "subscription_status": "past_due"
                }).eq("id", result.data[0]["id"]).execute()

    return {"handled": True, "event_type": event_type}
