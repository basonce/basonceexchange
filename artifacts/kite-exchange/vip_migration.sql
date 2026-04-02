-- ============================================================
-- VIP MEMBERSHIP SYSTEM - Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vip_level int NOT NULL CHECK (vip_level BETWEEN 1 AND 10),
  price_usdt numeric(12,2) DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  duration_months int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','expired','cancelled')),
  freeze_reason text,
  admin_note text,
  payment_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_user ON vip_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_status ON vip_memberships(status);

ALTER TABLE vip_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vip_allow_all ON vip_memberships;
CREATE POLICY vip_allow_all ON vip_memberships FOR ALL USING (true) WITH CHECK (true);
