-- Sprint 8: Add Stripe billing columns to businesses table
-- Run this in Supabase SQL Editor

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused'));

CREATE INDEX IF NOT EXISTS businesses_stripe_customer_idx
  ON businesses(stripe_customer_id);
