-- ─────────────────────────────────────────────────────────────────────────────
-- BASONCE Welcome Chest — one-time 100 EQ reward, 10-min countdown,
-- 30-day campaign window, per-user uniqueness, atomic claim.
--
-- Safety guarantees:
--   • PRIMARY KEY on user_id makes double-claim physically impossible
--   • claim function locks row + checks status atomically (no race condition)
--   • 30-day campaign cap (no new chests after CAMPAIGN_END_AT)
--   • Reward is credited to a separate "bonus" balance (locked from withdrawal
--     until user deposits 100 USDT OR generates 10,000 USDT trading volume)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS welcome_chest_claims (
  user_id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id       text        NOT NULL DEFAULT 'launch_2026_04',
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','claimed','expired')),
  claimed_at        timestamptz,
  reward_symbol     text        NOT NULL DEFAULT 'EQ',
  reward_amount     numeric(20,8) NOT NULL DEFAULT 100,
  locked            boolean     NOT NULL DEFAULT true,
  required_deposit_usdt numeric NOT NULL DEFAULT 100,
  required_volume_usdt  numeric NOT NULL DEFAULT 10000,
  unlocked_at       timestamptz,
  unlock_reason     text,
  ip_first_seen     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welcome_chest_status ON welcome_chest_claims(status);
CREATE INDEX IF NOT EXISTS idx_welcome_chest_campaign ON welcome_chest_claims(campaign_id);

ALTER TABLE welcome_chest_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_can_read_own_chest" ON welcome_chest_claims;
CREATE POLICY "user_can_read_own_chest" ON welcome_chest_claims
  FOR SELECT USING (auth.uid() = user_id);

-- No direct insert/update from clients — only via RPC functions below
DROP POLICY IF EXISTS "no_direct_writes" ON welcome_chest_claims;
CREATE POLICY "no_direct_writes" ON welcome_chest_claims
  FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 1: welcome_chest_status()
--   Returns the user's chest state. Creates a row on first call (if eligible)
--   and starts the 10-minute countdown. Auto-expires past-due pending chests.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION welcome_chest_status()
RETURNS TABLE (
  status            text,
  expires_at        timestamptz,
  seconds_left      integer,
  reward_amount     numeric,
  reward_symbol     text,
  claimed_at        timestamptz,
  locked            boolean,
  campaign_open     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user        uuid := auth.uid();
  v_campaign_id text := 'launch_2026_04';
  v_campaign_end timestamptz := timestamptz '2026-05-19 23:59:59+00';
  v_window      interval := interval '10 minutes';
  v_row         welcome_chest_claims%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Fetch existing row if any
  SELECT * INTO v_row FROM welcome_chest_claims WHERE user_id = v_user;

  -- Auto-expire if past deadline and still pending
  IF v_row.user_id IS NOT NULL
     AND v_row.status = 'pending'
     AND v_row.expires_at < now() THEN
    UPDATE welcome_chest_claims
       SET status = 'expired'
     WHERE user_id = v_user
     RETURNING * INTO v_row;
  END IF;

  -- Create new row if eligible (no row yet AND campaign still open)
  IF v_row.user_id IS NULL THEN
    IF now() > v_campaign_end THEN
      -- Campaign closed: return non-eligible synthetic row
      RETURN QUERY SELECT
        'expired'::text, NULL::timestamptz, 0, 0::numeric, 'EQ'::text,
        NULL::timestamptz, false, false;
      RETURN;
    END IF;

    INSERT INTO welcome_chest_claims (user_id, campaign_id, first_seen_at, expires_at)
    VALUES (v_user, v_campaign_id, now(), now() + v_window)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO v_row;

    -- If insert was skipped due to race, re-fetch
    IF v_row.user_id IS NULL THEN
      SELECT * INTO v_row FROM welcome_chest_claims WHERE user_id = v_user;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_row.status,
    v_row.expires_at,
    GREATEST(0, EXTRACT(EPOCH FROM (v_row.expires_at - now()))::integer),
    v_row.reward_amount,
    v_row.reward_symbol,
    v_row.claimed_at,
    v_row.locked,
    (now() <= v_campaign_end)::boolean;
END;
$$;

REVOKE ALL ON FUNCTION welcome_chest_status() FROM public;
GRANT EXECUTE ON FUNCTION welcome_chest_status() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 2: claim_welcome_chest()
--   Atomically: validates state, marks claimed, credits 100 EQ as locked bonus.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_welcome_chest()
RETURNS TABLE (
  success         boolean,
  message         text,
  reward_amount   numeric,
  reward_symbol   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_row    welcome_chest_claims%ROWTYPE;
  v_amount numeric;
  v_symbol text;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, 'not authenticated'::text, 0::numeric, ''::text;
    RETURN;
  END IF;

  -- Lock row to prevent concurrent claims
  SELECT * INTO v_row
    FROM welcome_chest_claims
   WHERE user_id = v_user
   FOR UPDATE;

  IF v_row.user_id IS NULL THEN
    RETURN QUERY SELECT false, 'No chest available'::text, 0::numeric, ''::text;
    RETURN;
  END IF;

  IF v_row.status = 'claimed' THEN
    RETURN QUERY SELECT false, 'Already claimed'::text, 0::numeric, ''::text;
    RETURN;
  END IF;

  IF v_row.status = 'expired' OR v_row.expires_at < now() THEN
    -- Mark expired if it isn't yet
    IF v_row.status <> 'expired' THEN
      UPDATE welcome_chest_claims SET status = 'expired' WHERE user_id = v_user;
    END IF;
    RETURN QUERY SELECT false, 'Chest expired'::text, 0::numeric, ''::text;
    RETURN;
  END IF;

  v_amount := v_row.reward_amount;
  v_symbol := v_row.reward_symbol;

  -- Credit reward to user_balances as LOCKED bonus
  -- (locked_balance is non-spendable until unlocked by deposit/volume)
  IF EXISTS (SELECT 1 FROM user_balances WHERE user_id = v_user AND symbol = v_symbol) THEN
    UPDATE user_balances
       SET locked_balance = COALESCE(locked_balance, 0) + v_amount,
           updated_at = now()
     WHERE user_id = v_user AND symbol = v_symbol;
  ELSE
    INSERT INTO user_balances (user_id, symbol, balance, locked_balance, updated_at)
    VALUES (v_user, v_symbol, 0, v_amount, now());
  END IF;

  -- Mark claimed
  UPDATE welcome_chest_claims
     SET status = 'claimed',
         claimed_at = now()
   WHERE user_id = v_user;

  RETURN QUERY SELECT true, 'Reward credited'::text, v_amount, v_symbol;
END;
$$;

REVOKE ALL ON FUNCTION claim_welcome_chest() FROM public;
GRANT EXECUTE ON FUNCTION claim_welcome_chest() TO authenticated;
