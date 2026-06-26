-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  BASONCE MARKET — Up/Down 5-minute parimutuel rounds              ║
-- ║                                                                    ║
-- ║  Every coin (BTC/ETH/SOL/XRP/DOGE) shares one clock: a 310s cycle  ║
-- ║  = 300s of OPEN betting + 10s RESOLVE gap. round_index =           ║
-- ║  floor(epoch/310). A round's open_price is the server spot price   ║
-- ║  captured when the round is created ("Price to Beat"); its         ║
-- ║  close_price is the server spot at settle time. UP wins if         ║
-- ║  close>open, DOWN if close<open, tie (==) or an empty winning side  ║
-- ║  refunds everyone. Winners get their stake back plus a              ║
-- ║  proportional share of the post-fee losing pool — Basonce bears    ║
-- ║  ZERO counterparty risk (payouts come only from the losing pool).  ║
-- ║                                                                    ║
-- ║  SECURITY: every balance-mutating RPC is SECURITY DEFINER, locked  ║
-- ║  to service_role only, and derives ALL money itself. Prices and    ║
-- ║  round timing are supplied by the service-role worker only.        ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── Tables ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uod_rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin          text NOT NULL,
  round_index   bigint NOT NULL,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled','cancelled')),
  open_at       timestamptz NOT NULL,
  lock_at       timestamptz NOT NULL,
  open_price    numeric,
  close_price   numeric,
  winning_side  text CHECK (winning_side IN ('up','down','tie')),
  up_pool       numeric NOT NULL DEFAULT 0,
  down_pool     numeric NOT NULL DEFAULT 0,
  bet_count     integer NOT NULL DEFAULT 0,
  settled_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coin, round_index)
);

CREATE TABLE IF NOT EXISTS public.uod_bets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES public.uod_rounds(id),
  user_id     uuid NOT NULL,
  coin        text NOT NULL,
  side        text NOT NULL CHECK (side IN ('up','down')),
  amount      numeric NOT NULL CHECK (amount > 0),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','refunded')),
  payout      numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  settled_at  timestamptz
);

-- single-row throttle for the lazy tick (one global tick at most every few seconds)
CREATE TABLE IF NOT EXISTS public.uod_meta (
  id           integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_tick_at timestamptz NOT NULL DEFAULT to_timestamp(0)
);
INSERT INTO public.uod_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS uod_rounds_index_idx  ON public.uod_rounds(round_index DESC);
CREATE INDEX IF NOT EXISTS uod_rounds_open_idx    ON public.uod_rounds(status, lock_at);
CREATE INDEX IF NOT EXISTS uod_rounds_coin_idx    ON public.uod_rounds(coin, round_index DESC);
CREATE INDEX IF NOT EXISTS uod_bets_round_idx      ON public.uod_bets(round_id);
CREATE INDEX IF NOT EXISTS uod_bets_user_idx       ON public.uod_bets(user_id, created_at DESC);

-- ── RLS: rounds are public read; bets + meta service-role only ───────
ALTER TABLE public.uod_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uod_bets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uod_meta   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uod_rounds_public_read ON public.uod_rounds;
CREATE POLICY uod_rounds_public_read ON public.uod_rounds FOR SELECT USING (true);
-- (no client policies on uod_bets / uod_meta — all access via the service-role worker)

-- ── Internal helper: settle one round (parimutuel payout) ───────────
-- close>open => UP wins; close<open => DOWN wins; tie / empty winner pool
-- => refund every open bet. Winners get stake + proportional share of the
-- post-fee (2%) losing pool. The last winner absorbs the rounding residual
-- so SUM(shares) <= post-fee losing pool exactly (platform never over-pays).
CREATE OR REPLACE FUNCTION public.uod_settle_round(
  p_round_id    uuid,
  p_close_price numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status     text;
  v_open       numeric;
  v_winner     text;
  v_refund     boolean := false;
  v_fee        numeric := 0.02;
  v_win_pool   numeric := 0;
  v_lose_pool  numeric := 0;
  v_win_count  integer := 0;
  v_win_seen   integer := 0;
  v_share_acc  numeric := 0;
  v_dist       numeric := 0;
  v_bet        record;
  v_share      numeric;
  v_payout     numeric;
  v_primary    uuid;
  v_paid       numeric := 0;
BEGIN
  SELECT status, open_price INTO v_status, v_open
    FROM public.uod_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROUND_NOT_FOUND'; END IF;
  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);  -- already settled (idempotent)
  END IF;

  -- determine the winning side from authoritative open vs close
  IF v_open IS NULL OR p_close_price IS NULL THEN
    v_winner := 'tie'; v_refund := true;             -- no price reference => refund
  ELSIF p_close_price > v_open THEN
    v_winner := 'up';
  ELSIF p_close_price < v_open THEN
    v_winner := 'down';
  ELSE
    v_winner := 'tie'; v_refund := true;             -- exact tie => refund
  END IF;

  IF NOT v_refund THEN
    SELECT COALESCE(SUM(amount) FILTER (WHERE side = v_winner), 0),
           COALESCE(SUM(amount) FILTER (WHERE side <> v_winner), 0),
           COALESCE(COUNT(*)    FILTER (WHERE side = v_winner), 0)
      INTO v_win_pool, v_lose_pool, v_win_count
      FROM public.uod_bets WHERE round_id = p_round_id AND status = 'open';
    -- nobody backed the winning side => no valid counterparty => refund all
    IF v_win_pool = 0 THEN v_refund := true; END IF;
  END IF;

  v_dist := round(v_lose_pool * (1 - v_fee), 8);

  FOR v_bet IN
    SELECT * FROM public.uod_bets WHERE round_id = p_round_id AND status = 'open' ORDER BY id FOR UPDATE
  LOOP
    IF v_refund THEN
      v_payout := v_bet.amount;
      UPDATE public.uod_bets SET status = 'refunded', payout = v_payout, settled_at = now() WHERE id = v_bet.id;
    ELSIF v_bet.side = v_winner THEN
      v_win_seen := v_win_seen + 1;
      IF v_win_seen >= v_win_count THEN
        v_share := v_dist - v_share_acc;             -- last winner absorbs residual
      ELSE
        v_share := round((v_bet.amount / v_win_pool) * v_dist, 8);
      END IF;
      IF v_share < 0 THEN v_share := 0; END IF;
      v_share_acc := v_share_acc + v_share;
      v_payout := round(v_bet.amount + v_share, 8);
      UPDATE public.uod_bets SET status = 'won', payout = v_payout, settled_at = now() WHERE id = v_bet.id;
    ELSE
      v_payout := 0;
      UPDATE public.uod_bets SET status = 'lost', payout = 0, settled_at = now() WHERE id = v_bet.id;
    END IF;

    IF v_payout > 0 THEN
      SELECT id INTO v_primary FROM public.user_balances
        WHERE user_id = v_bet.user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false
        ORDER BY id LIMIT 1;
      IF v_primary IS NULL THEN
        INSERT INTO public.user_balances(user_id, symbol, balance, locked_balance)
          VALUES (v_bet.user_id, 'USDT', v_payout, 0);
      ELSE
        UPDATE public.user_balances SET balance = COALESCE(balance,0) + v_payout, updated_at = now()
          WHERE id = v_primary;
      END IF;
      v_paid := v_paid + v_payout;
    END IF;
  END LOOP;

  UPDATE public.uod_rounds
     SET status = 'settled',
         close_price = p_close_price,
         winning_side = v_winner,
         settled_at = now()
   WHERE id = p_round_id;

  RETURN jsonb_build_object('ok', true, 'round', p_round_id, 'winner', v_winner,
    'win_pool', v_win_pool, 'lose_pool', v_lose_pool, 'paid', v_paid, 'refunded', v_refund);
END;
$$;

-- ── RPC: place an UP/DOWN bet (creates the round if first bet) ───────
-- The round is created lazily here (or by uod_sync) with the server-supplied
-- open_price. Bets only accepted while status='open' AND now() < lock_at.
CREATE OR REPLACE FUNCTION public.uod_place_bet(
  p_user_id     uuid,
  p_coin        text,
  p_round_index bigint,
  p_open_at     timestamptz,
  p_lock_at     timestamptz,
  p_open_price  numeric,
  p_side        text,
  p_amount      numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coin     text := upper(trim(p_coin));
  v_side     text := lower(trim(p_side));
  v_amount   numeric := round(p_amount, 8);
  v_round_id uuid;
  v_status   text;
  v_lock     timestamptz;
  v_avail    numeric := 0;
  v_primary  uuid;
  v_bet_id   uuid;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'INVALID_USER'; END IF;
  IF v_side NOT IN ('up','down') THEN RAISE EXCEPTION 'INVALID_SIDE'; END IF;
  IF v_coin NOT IN ('BTC','ETH','SOL','XRP','DOGE') THEN RAISE EXCEPTION 'INVALID_COIN'; END IF;
  IF v_amount IS NULL OR v_amount < 1 OR v_amount > 100000 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  -- create the round if it does not exist yet (first bet of the round)
  INSERT INTO public.uod_rounds (coin, round_index, status, open_at, lock_at, open_price)
    VALUES (v_coin, p_round_index, 'open', p_open_at, p_lock_at, p_open_price)
  ON CONFLICT (coin, round_index) DO NOTHING;

  SELECT id, status, lock_at INTO v_round_id, v_status, v_lock
    FROM public.uod_rounds WHERE coin = v_coin AND round_index = p_round_index FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROUND_NOT_FOUND'; END IF;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'ROUND_LOCKED'; END IF;
  IF v_lock IS NOT NULL AND v_lock <= now() THEN RAISE EXCEPTION 'ROUND_LOCKED'; END IF;

  -- lock + sum live USDT rows (dupe-row safe, mirrors pm_place_bet)
  PERFORM 1 FROM public.user_balances
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false
    FOR UPDATE;
  SELECT COALESCE(SUM(COALESCE(balance,0)),0) INTO v_avail
    FROM public.user_balances
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false;
  IF v_avail < v_amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  SELECT id INTO v_primary FROM public.user_balances
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false
    ORDER BY id LIMIT 1;
  UPDATE public.user_balances SET balance = 0, updated_at = now()
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false;
  UPDATE public.user_balances SET balance = (v_avail - v_amount), updated_at = now()
    WHERE id = v_primary;

  INSERT INTO public.uod_bets(round_id, user_id, coin, side, amount, status)
    VALUES (v_round_id, p_user_id, v_coin, v_side, v_amount, 'open')
    RETURNING id INTO v_bet_id;

  IF v_side = 'up' THEN
    UPDATE public.uod_rounds SET up_pool = COALESCE(up_pool,0) + v_amount,
           bet_count = COALESCE(bet_count,0) + 1 WHERE id = v_round_id;
  ELSE
    UPDATE public.uod_rounds SET down_pool = COALESCE(down_pool,0) + v_amount,
           bet_count = COALESCE(bet_count,0) + 1 WHERE id = v_round_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'bet_id', v_bet_id, 'round_id', v_round_id,
    'coin', v_coin, 'side', v_side, 'amount', v_amount, 'balance', (v_avail - v_amount));
END;
$$;

-- ── RPC: tick the world — ensure current rounds + settle due rounds ──
-- Throttled by the caller via uod_meta. p_prices is {COIN: spot_price}.
-- Ensures the current round_index exists for each priced coin (open_price =
-- spot), then settles EVERY open round whose lock_at has passed using that
-- coin's spot as the close price. Idempotent and concurrency-safe.
CREATE OR REPLACE FUNCTION public.uod_sync(
  p_idx     bigint,
  p_open_at timestamptz,
  p_lock_at timestamptz,
  p_prices  jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coin    text;
  v_price   numeric;
  v_due     record;
  v_close   numeric;
  v_opened  integer := 0;
  v_settled integer := 0;
BEGIN
  IF p_prices IS NOT NULL THEN
    FOR v_coin, v_price IN SELECT key, value::numeric FROM jsonb_each_text(p_prices)
    LOOP
      v_coin := upper(trim(v_coin));
      IF v_coin NOT IN ('BTC','ETH','SOL','XRP','DOGE') THEN CONTINUE; END IF;
      IF v_price IS NULL OR v_price <= 0 THEN CONTINUE; END IF;
      INSERT INTO public.uod_rounds (coin, round_index, status, open_at, lock_at, open_price)
        VALUES (v_coin, p_idx, 'open', p_open_at, p_lock_at, v_price)
      ON CONFLICT (coin, round_index) DO NOTHING;
      IF FOUND THEN v_opened := v_opened + 1; END IF;
    END LOOP;
  END IF;

  -- settle every open round whose lock time has passed, using current spot
  FOR v_due IN
    SELECT id, coin FROM public.uod_rounds
     WHERE status = 'open' AND lock_at <= now()
     ORDER BY lock_at ASC
  LOOP
    v_close := NULLIF((p_prices ->> v_due.coin), '')::numeric;
    IF v_close IS NULL THEN
      v_close := (SELECT close_price FROM public.uod_rounds WHERE id = v_due.id); -- usually null => refund
    END IF;
    PERFORM public.uod_settle_round(v_due.id, v_close);
    v_settled := v_settled + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'opened', v_opened, 'settled', v_settled);
END;
$$;

-- ── Lock down EXECUTE: service_role only ────────────────────────────
REVOKE ALL ON FUNCTION public.uod_settle_round(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.uod_place_bet(uuid, text, bigint, timestamptz, timestamptz, numeric, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.uod_sync(bigint, timestamptz, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.uod_settle_round(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.uod_place_bet(uuid, text, bigint, timestamptz, timestamptz, numeric, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.uod_sync(bigint, timestamptz, timestamptz, jsonb) TO service_role;
