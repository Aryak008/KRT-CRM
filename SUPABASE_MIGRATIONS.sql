-- KRT CRM — Supabase Schema Migrations
-- Run these in order in the Supabase SQL Editor

-- 1. Add email and OTP columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;

-- 2. Create roles table for RBAC
CREATE TABLE IF NOT EXISTS roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  permissions JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  TEXT
);

-- 3. Optional: seed a default "Admin" role (full access)
INSERT INTO roles (name, permissions, created_by)
VALUES (
  'Admin',
  '{"dashboard":{"read":true},"occupiers":{"read":true,"write":true},"contacts":{"read":true,"write":true},"meetings":{"read":true,"write":true},"tasks":{"read":true,"write":true},"calendar":{"read":true,"write":true},"analytics":{"read":true},"users":{"read":true,"write":true},"roles":{"read":true,"write":true}}'::jsonb,
  'system'
)
ON CONFLICT (name) DO NOTHING;

-- 4. Optional: seed a "Read Only" role
INSERT INTO roles (name, permissions, created_by)
VALUES (
  'Read Only',
  '{"dashboard":{"read":true},"occupiers":{"read":true},"contacts":{"read":true},"meetings":{"read":true},"tasks":{"read":true},"calendar":{"read":true},"analytics":{"read":true}}'::jsonb,
  'system'
)
ON CONFLICT (name) DO NOTHING;
