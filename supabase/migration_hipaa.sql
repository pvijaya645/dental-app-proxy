-- ============================================================
-- HIPAA COMPLIANCE MIGRATION
-- Remove PHI columns, add audit logging
-- ============================================================

-- 1. Audit logs table (stores WHO did WHAT, never stores PHI content)
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,  -- e.g. 'chat.message', 'kb.create', 'auth.login'
    endpoint        TEXT,
    ip_address      TEXT,
    status_code     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_business_idx ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- 2. Remove PHI from conversations table
ALTER TABLE conversations
    DROP COLUMN IF EXISTS customer_name,
    DROP COLUMN IF EXISTS customer_email,
    DROP COLUMN IF EXISTS customer_phone;

-- 3. Remove message content from messages table (keep metadata only)
ALTER TABLE messages
    DROP COLUMN IF EXISTS content;

-- Add non-PHI metadata columns to messages
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS intent TEXT,
    ADD COLUMN IF NOT EXISTS char_count INT;  -- length only, not content

-- 4. Remove PHI from appointments table
ALTER TABLE appointments
    DROP COLUMN IF EXISTS patient_name,
    DROP COLUMN IF EXISTS patient_phone,
    DROP COLUMN IF EXISTS patient_email;

-- Add reference ID instead (dental office looks up patient in their own system)
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS patient_ref TEXT,  -- anonymized reference only
    ADD COLUMN IF NOT EXISTS staff_notified BOOLEAN DEFAULT FALSE;

-- 5. Conversations: add session metadata without PHI
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS message_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_intent TEXT;
