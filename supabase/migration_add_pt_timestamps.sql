-- ============================================================
-- Migration: Add created_at_pt column to all tables
-- Pacific Time (handles both PST and PDT automatically)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Shared trigger function ───────────────────────────────────
-- One function used by all tables
CREATE OR REPLACE FUNCTION set_created_at_pt()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at_pt = NOW() AT TIME ZONE 'America/Los_Angeles';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Add columns ───────────────────────────────────────────────

ALTER TABLE businesses       ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;
ALTER TABLE staff            ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;
ALTER TABLE knowledge_base   ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;
ALTER TABLE conversations    ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;
ALTER TABLE messages         ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;
ALTER TABLE appointments     ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;
ALTER TABLE staff_escalations ADD COLUMN IF NOT EXISTS created_at_pt TIMESTAMP;

-- ── Backfill existing rows ────────────────────────────────────

UPDATE businesses        SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';
UPDATE staff             SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';
UPDATE knowledge_base    SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';
UPDATE conversations     SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';
UPDATE messages          SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';
UPDATE appointments      SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';
UPDATE staff_escalations SET created_at_pt = created_at AT TIME ZONE 'America/Los_Angeles';

-- ── Triggers: auto-set on every new row ──────────────────────

CREATE TRIGGER businesses_created_at_pt
    BEFORE INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();

CREATE TRIGGER staff_created_at_pt
    BEFORE INSERT ON staff
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();

CREATE TRIGGER knowledge_base_created_at_pt
    BEFORE INSERT ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();

CREATE TRIGGER conversations_created_at_pt
    BEFORE INSERT ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();

CREATE TRIGGER messages_created_at_pt
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();

CREATE TRIGGER appointments_created_at_pt
    BEFORE INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();

CREATE TRIGGER staff_escalations_created_at_pt
    BEFORE INSERT ON staff_escalations
    FOR EACH ROW EXECUTE FUNCTION set_created_at_pt();
