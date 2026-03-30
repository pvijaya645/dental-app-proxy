from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ────────────────────────────────────────────────────
    app_name: str = "Ravira API"
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"

    # ── JWT ────────────────────────────────────────────────────
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # ── Supabase ───────────────────────────────────────────────
    supabase_url: str
    supabase_service_key: str  # service role key (bypasses RLS — backend only)

    # ── AI ─────────────────────────────────────────────────────
    anthropic_api_key: str = ""
    openai_api_key: str = ""       # embeddings (text-embedding-3-small)
    firecrawl_api_key: str = ""    # website scraping for KB import

    # ── Twilio (Growth + Pro — not needed in Sprint 1) ─────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_messaging_service_sid: str = ""

    # ── Vapi (Pro only) ────────────────────────────────────────
    vapi_api_key: str = ""
    vapi_webhook_secret: str = ""

    # ── Stripe ─────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_starter: str = ""
    stripe_price_growth: str = ""
    stripe_price_pro: str = ""

    # ── Email ──────────────────────────────────────────────────
    resend_api_key: str = ""
    from_email: str = "hello@ravira.ai"

    # ── Redis ──────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379"


# Singleton — import this everywhere
settings = Settings()
