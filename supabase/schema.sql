-- ============================================================
-- Ravira Dental AI — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable pgvector extension for semantic KB search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. BUSINESSES
-- One row per dental office (the paying customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    plan            TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
    widget_api_key  UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    business_hours  JSONB DEFAULT '{}',   -- e.g. {"mon": "9am-5pm", "tue": "9am-5pm"}
    services        JSONB DEFAULT '[]',   -- e.g. ["cleanings", "whitening", "implants"]
    phone           TEXT,
    address         TEXT,
    timezone        TEXT DEFAULT 'America/New_York',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. STAFF
-- Staff members who receive escalation alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    role            TEXT DEFAULT 'receptionist',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. KNOWLEDGE BASE
-- FAQ / policy entries for each dental office.
-- The embedding column is used by pgvector for semantic search.
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    embedding       VECTOR(1536),          -- OpenAI text-embedding-3-small dimension
    category        TEXT DEFAULT 'general', -- e.g. 'hours', 'pricing', 'services', 'policies'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast vector similarity search per business
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
    ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- 4. CONVERSATIONS
-- One per chat session (anonymous widget visitor)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    session_id      TEXT NOT NULL,              -- browser-generated anonymous ID
    customer_name   TEXT,
    customer_phone  TEXT,
    customer_email  TEXT,
    channel         TEXT NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat', 'sms', 'voice')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_business_idx ON conversations(business_id);
CREATE INDEX IF NOT EXISTS conversations_session_idx ON conversations(session_id);

-- ============================================================
-- 5. MESSAGES
-- Every message in a conversation (user + assistant turns)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    intent          TEXT,           -- triage output: faq / booking / escalation / out_of_scope
    confidence      FLOAT,          -- 0.0–1.0
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);

-- ============================================================
-- 6. APPOINTMENTS
-- Bookings created by the booking agent
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    conversation_id     UUID REFERENCES conversations(id) ON DELETE SET NULL,
    patient_name        TEXT NOT NULL,
    patient_phone       TEXT NOT NULL,
    patient_email       TEXT,
    appointment_date    DATE NOT NULL,
    appointment_time    TIME NOT NULL,
    service_type        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_business_idx ON appointments(business_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date);

-- ============================================================
-- 7. STAFF ESCALATIONS
-- Logged whenever the escalation agent fires
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_escalations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    reason          TEXT NOT NULL,
    urgency         TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    alerted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PGVECTOR: semantic search function
-- Used by LangChain SupabaseVectorStore in Sprint 3
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count     INT DEFAULT 5,
    filter          JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id          UUID,
    content     TEXT,
    metadata    JSONB,
    similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        jsonb_build_object(
            'title',       kb.title,
            'category',    kb.category,
            'business_id', kb.business_id
        ) AS metadata,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.is_active = TRUE
      AND (filter = '{}' OR kb.business_id::TEXT = filter->>'business_id')
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at   BEFORE UPDATE ON businesses        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER kb_updated_at           BEFORE UPDATE ON knowledge_base    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated   BEFORE UPDATE ON conversations      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated    BEFORE UPDATE ON appointments       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
