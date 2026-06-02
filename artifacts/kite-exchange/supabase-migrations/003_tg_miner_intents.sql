-- 003_tg_miner_intents.sql
-- Purchase-intent binding for TON box upgrades. Closes the payment front-run hole:
-- each intent reserves a UNIQUE on-chain amount (base price + a small unique delta)
-- bound to one telegram_user_id. Only the intent owner can claim the matching tx,
-- so an attacker watching the public chain cannot hijack someone else's payment.

CREATE TABLE IF NOT EXISTS tg_miner_intents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  box_tier         text   NOT NULL,
  expected_nano    bigint NOT NULL,           -- exact amount the user must send (nanotons)
  status           text   NOT NULL DEFAULT 'pending',  -- pending | consumed | expired
  consumed_tx      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL
);

-- Guarantees no two ACTIVE intents share an amount, so each on-chain payment maps
-- to exactly one intent (and one owner). Expired/consumed amounts free up for reuse.
CREATE UNIQUE INDEX IF NOT EXISTS ux_miner_intents_active_amount
  ON tg_miner_intents (expected_nano) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_miner_intents_user
  ON tg_miner_intents (telegram_user_id, status);

ALTER TABLE tg_miner_intents ENABLE ROW LEVEL SECURITY;

-- Atomically reserve a free amount slot for a purchase. Expires stale pending
-- intents first (frees their amounts), then retries random deltas until it finds
-- an unused amount. Returns the intent id + exact amount to pay.
CREATE OR REPLACE FUNCTION miner_create_intent(
  p_tg bigint, p_tier text, p_base_nano bigint, p_grid bigint, p_kmax int, p_ttl int
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE k int; amt bigint; tries int := 0; new_id uuid; exp timestamptz;
BEGIN
  UPDATE tg_miner_intents SET status = 'expired'
   WHERE status = 'pending' AND expires_at < now();
  exp := now() + make_interval(secs => p_ttl);
  LOOP
    tries := tries + 1;
    IF tries > 60 THEN RETURN jsonb_build_object('error', 'no_slot'); END IF;
    k := 1 + floor(random() * p_kmax)::int;
    amt := p_base_nano + k * p_grid;
    BEGIN
      INSERT INTO tg_miner_intents (telegram_user_id, box_tier, expected_nano, status, expires_at)
      VALUES (p_tg, p_tier, amt, 'pending', exp)
      RETURNING id INTO new_id;
      RETURN jsonb_build_object('ok', true, 'intent_id', new_id, 'expected_nano', amt, 'expires_at', exp);
    EXCEPTION WHEN unique_violation THEN
      -- amount already reserved by another active intent; try a different delta
    END;
  END LOOP;
END $$;
