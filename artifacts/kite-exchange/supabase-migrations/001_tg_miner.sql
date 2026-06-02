-- MSOL-clone mining tables for Telegram Mini App (telegram-id keyed)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/jfjjymprvjfltpvmfptj/sql
-- All access is via the Cloudflare Worker using the service role key, which
-- bypasses RLS. RLS is enabled with NO anon policies so the public anon key
-- cannot read/write these tables directly.

CREATE TABLE IF NOT EXISTS tg_miner_state (
  telegram_user_id bigint PRIMARY KEY,
  telegram_username text,
  hash_rate      numeric NOT NULL DEFAULT 0.000000163,  -- BNC per second
  bsc_balance    numeric NOT NULL DEFAULT 0,
  total_claimed  numeric NOT NULL DEFAULT 0,
  invited_count  integer NOT NULL DEFAULT 0,
  last_claim_at  timestamptz NOT NULL DEFAULT now(),
  ref_code       text UNIQUE,
  ref_by         bigint,
  linked_user_id uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tg_miner_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  box_tier text NOT NULL,
  ton_paid numeric NOT NULL,
  hash_rate_added numeric NOT NULL,   -- daily BNC yield added by this box
  tx_hash text NOT NULL UNIQUE,
  purchased_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tg_miner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  task_key text NOT NULL,
  reward_bsc numeric NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(telegram_user_id, task_key)
);

CREATE TABLE IF NOT EXISTS tg_miner_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  linked_user_id uuid,
  bsc_amount numeric NOT NULL,
  usdt_credited numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_miner_state_ref_code ON tg_miner_state(ref_code);
CREATE INDEX IF NOT EXISTS idx_tg_miner_state_ref_by  ON tg_miner_state(ref_by);
CREATE INDEX IF NOT EXISTS idx_tg_miner_boxes_user    ON tg_miner_boxes(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tg_miner_tasks_user    ON tg_miner_tasks(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tg_miner_wd_user       ON tg_miner_withdrawals(telegram_user_id);

ALTER TABLE tg_miner_state       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_miner_boxes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_miner_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_miner_withdrawals ENABLE ROW LEVEL SECURITY;
-- No anon policies on purpose: only the service-role worker may touch these.
