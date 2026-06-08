-- ============================================================
-- KRT CRM — Full Schema
-- Run this once in Supabase SQL Editor (new project)
-- ============================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'Leasing',
  is_admin      BOOLEAN     NOT NULL DEFAULT false,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  password_hash TEXT        NOT NULL DEFAULT '',
  email         TEXT,
  otp_code      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT
);

-- 2. ROLES (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  permissions   JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT
);

-- 3. OCCUPIERS
CREATE TABLE IF NOT EXISTS occupiers (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  tier                  TEXT,
  depth                 TEXT,
  sector                TEXT,
  city                  TEXT,
  sqft                  INTEGER,
  lease_expiry          DATE,
  risk                  TEXT,
  owner                 TEXT,
  notes                 TEXT,
  gcc_classification    TEXT,
  asset                 TEXT,
  building              TEXT,
  unit_floor            TEXT,
  renewal_status        TEXT,
  relationship_tenure   INTEGER,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            TEXT,
  updated_at            TIMESTAMPTZ
);

-- 4. MEETINGS
CREATE TABLE IF NOT EXISTS meetings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  occupier_id         UUID        REFERENCES occupiers(id) ON DELETE CASCADE,
  meeting_date        DATE,
  meeting_type        TEXT,
  attendees           TEXT,
  notes               TEXT,
  actions             TEXT,
  outcome             TEXT,
  department          TEXT,
  follow_up_date      DATE,
  relationship_owner  TEXT,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. KEY CONTACTS
CREATE TABLE IF NOT EXISTS key_contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  occupier_id   UUID        REFERENCES occupiers(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  designation   TEXT,
  email         TEXT,
  phone         TEXT,
  is_primary    BOOLEAN     NOT NULL DEFAULT false,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ACTION ITEMS
CREATE TABLE IF NOT EXISTS action_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    UUID        REFERENCES meetings(id) ON DELETE CASCADE,
  description   TEXT        NOT NULL,
  owner         TEXT,
  due_date      DATE,
  status        TEXT        NOT NULL DEFAULT 'Pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- 7. ENGAGEMENT EVENTS
CREATE TABLE IF NOT EXISTS engagement_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  occupier_id   UUID        REFERENCES occupiers(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  event_date    DATE,
  event_type    TEXT,
  recurrence    TEXT,
  reminder_days INTEGER,
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name     TEXT,
  action        TEXT,
  target        TEXT,
  at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed: default roles
-- ============================================================
INSERT INTO roles (name, permissions, created_by) VALUES
  ('Admin',      '{"dashboard":{"read":true},"occupiers":{"read":true,"write":true},"contacts":{"read":true,"write":true},"meetings":{"read":true,"write":true},"tasks":{"read":true,"write":true},"calendar":{"read":true,"write":true},"analytics":{"read":true},"users":{"read":true,"write":true},"rbac":{"read":true,"write":true}}'::jsonb, 'system'),
  ('Read Only',  '{"dashboard":{"read":true},"occupiers":{"read":true},"contacts":{"read":true},"meetings":{"read":true},"tasks":{"read":true},"calendar":{"read":true},"analytics":{"read":true}}'::jsonb, 'system'),
  ('Leasing',    '{"dashboard":{"read":true},"occupiers":{"read":true,"write":true},"contacts":{"read":true,"write":true},"meetings":{"read":true,"write":true},"tasks":{"read":true,"write":true},"calendar":{"read":true,"write":true},"analytics":{"read":true}}'::jsonb, 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Enable Row Level Security (open read/write for anon key)
-- Required because Supabase blocks all by default
-- ============================================================
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupiers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated full access (app handles auth itself)
CREATE POLICY "allow_all_users"             ON users             FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_roles"             ON roles             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_occupiers"         ON occupiers         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_meetings"          ON meetings          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_key_contacts"      ON key_contacts      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_action_items"      ON action_items      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_engagement_events" ON engagement_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_audit_log"         ON audit_log         FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Migration: rename tier values Platinum/Gold/Silver → A/B/C
-- Run once after deploying the new frontend build
-- ============================================================
UPDATE occupiers SET tier = 'A' WHERE tier = 'Platinum';
UPDATE occupiers SET tier = 'B' WHERE tier = 'Gold';
UPDATE occupiers SET tier = 'C' WHERE tier = 'Silver';

-- ============================================================
-- Migration: rename relationship_depth values → High/Medium/Low
-- Average → Low, Good → Medium, Very Good → High, Excellent → High
-- ============================================================
UPDATE occupiers SET depth = 'Low'    WHERE depth = 'Average';
UPDATE occupiers SET depth = 'Medium' WHERE depth = 'Good';
UPDATE occupiers SET depth = 'High'   WHERE depth = 'Very Good';
UPDATE occupiers SET depth = 'High'   WHERE depth = 'Excellent';

-- ============================================================
-- Migration: add email and otp_code to existing users table
-- Run in Supabase SQL Editor if the table already exists
-- without these columns (pre-0.0.21 deployments)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;
