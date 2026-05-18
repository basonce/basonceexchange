-- MSOL-clone mining tables for Telegram Mini App
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jfjjymprvjfltpvmfptj/sql

CREATE TABLE IF NOT EXISTS tg_miner_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hash_rate numeric NOT NULL DEFAULT 0.000000163,
  bsc_balance numeric NOT NULL DEFAULT 0,
  total_claimed numeric NOT NULL DEFAULT 0,
  last_claim_at timestamptz NOT NULL DEFAULT now(),
  ref_code text UNIQUE,
  ref_by uuid REFERENCES auth.users(id),
  telegram_user_id bigint,
  telegram_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tg_miner_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box_tier text NOT NULL,
  ton_paid numeric NOT NULL,
  hash_rate_added numeric NOT NULL,
  tx_hash text NOT NULL UNIQUE,
  purchased_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tg_miner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  reward_bsc numeric NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_key)
);

CREATE TABLE IF NOT EXISTS tg_miner_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bsc_amount numeric NOT NULL,
  usdt_credited numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_miner_state_ref_code ON tg_miner_state(ref_code);
CREATE INDEX IF NOT EXISTS idx_tg_miner_state_ref_by ON tg_miner_state(ref_by);
CREATE INDEX IF NOT EXISTS idx_tg_miner_state_telegram ON tg_miner_state(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tg_miner_boxes_user ON tg_miner_boxes(user_id);

ALTER TABLE tg_miner_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_miner_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_miner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_miner_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tg_miner_state_select_own ON tg_miner_state;
CREATE POLICY tg_miner_state_select_own ON tg_miner_state FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS tg_miner_boxes_select_own ON tg_miner_boxes;
CREATE POLICY tg_miner_boxes_select_own ON tg_miner_boxes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS tg_miner_tasks_select_own ON tg_miner_tasks;
CREATE POLICY tg_miner_tasks_select_own ON tg_miner_tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS tg_miner_withdrawals_select_own ON tg_miner_withdrawals;
CREATE POLICY tg_miner_withdrawals_select_own ON tg_miner_withdrawals FOR SELECT USING (auth.uid() = user_id);
