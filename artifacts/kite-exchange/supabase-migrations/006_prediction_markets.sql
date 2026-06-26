-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  BASONCE MARKET — Polymarket-style prediction markets             ║
-- ║  Parimutuel (pool) model: bettors stake real USDT into Yes/No     ║
-- ║  pools; on resolution the winning side gets their stake back plus  ║
-- ║  a proportional share of the losing pool minus a platform fee.     ║
-- ║  Basonce bears zero counterparty risk (payouts come from the       ║
-- ║  losing pool only). Markets + odds mirror real Polymarket data;    ║
-- ║  settlement mirrors Polymarket's real resolution.                  ║
-- ║                                                                    ║
-- ║  SECURITY: every balance-mutating RPC is SECURITY DEFINER, locked  ║
-- ║  to service_role only, and derives all money itself.               ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── Tables ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pm_markets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL DEFAULT 'polymarket',
  source_id       text UNIQUE NOT NULL,
  condition_id    text,
  slug            text,
  question        text NOT NULL,
  category        text,
  image           text,
  end_date        timestamptz,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','cancelled')),
  winning_outcome text CHECK (winning_outcome IN ('Yes','No')),
  resolved_at     timestamptz,
  live_yes        numeric,
  live_no         numeric,
  volume          numeric DEFAULT 0,
  yes_pool        numeric NOT NULL DEFAULT 0,
  no_pool         numeric NOT NULL DEFAULT 0,
  bet_count       integer NOT NULL DEFAULT 0,
  featured        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_bets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   uuid NOT NULL REFERENCES public.pm_markets(id),
  user_id     uuid NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('Yes','No')),
  amount      numeric NOT NULL CHECK (amount > 0),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','refunded')),
  payout      numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  settled_at  timestamptz
);

CREATE INDEX IF NOT EXISTS pm_markets_status_idx   ON public.pm_markets(status);
CREATE INDEX IF NOT EXISTS pm_markets_category_idx ON public.pm_markets(category);
CREATE INDEX IF NOT EXISTS pm_markets_volume_idx   ON public.pm_markets(volume DESC);
CREATE INDEX IF NOT EXISTS pm_bets_market_idx      ON public.pm_bets(market_id);
CREATE INDEX IF NOT EXISTS pm_bets_user_idx        ON public.pm_bets(user_id, created_at DESC);

-- ── RLS: markets are public read; bets are service-role only ─────────
ALTER TABLE public.pm_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_bets    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_markets_public_read ON public.pm_markets;
CREATE POLICY pm_markets_public_read ON public.pm_markets FOR SELECT USING (true);
-- (no client policies on pm_bets — all access goes through the service-role worker)

-- ── RPC: place a bet (debits USDT, inserts bet, bumps pool) ──────────
CREATE OR REPLACE FUNCTION public.pm_place_bet(
  p_user_id   uuid,
  p_market_id uuid,
  p_outcome   text,
  p_amount    numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome     text := initcap(trim(p_outcome));
  v_amount      numeric := round(p_amount, 8);
  v_available   numeric := 0;
  v_primary     uuid;
  v_status      text;
  v_end         timestamptz;
  v_bet_id      uuid;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'INVALID_USER'; END IF;
  IF v_outcome NOT IN ('Yes','No') THEN RAISE EXCEPTION 'INVALID_OUTCOME'; END IF;
  IF v_amount IS NULL OR v_amount < 1 OR v_amount > 100000 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  -- lock market row
  SELECT status, end_date INTO v_status, v_end
    FROM public.pm_markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MARKET_NOT_FOUND'; END IF;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'MARKET_CLOSED'; END IF;
  IF v_end IS NOT NULL AND v_end <= now() THEN RAISE EXCEPTION 'MARKET_ENDED'; END IF;

  -- lock + sum live USDT rows (dupe-row safe, mirrors wallet_user_swap)
  PERFORM 1 FROM public.user_balances
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false
    FOR UPDATE;
  SELECT COALESCE(SUM(COALESCE(balance,0)),0) INTO v_available
    FROM public.user_balances
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false;
  IF v_available < v_amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  -- debit: zero all dupes, put remainder on the primary row
  SELECT id INTO v_primary FROM public.user_balances
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false
    ORDER BY id LIMIT 1;
  UPDATE public.user_balances SET balance = 0, updated_at = now()
    WHERE user_id = p_user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false;
  UPDATE public.user_balances SET balance = (v_available - v_amount), updated_at = now()
    WHERE id = v_primary;

  INSERT INTO public.pm_bets(market_id, user_id, outcome, amount, status)
    VALUES (p_market_id, p_user_id, v_outcome, v_amount, 'open')
    RETURNING id INTO v_bet_id;

  IF v_outcome = 'Yes' THEN
    UPDATE public.pm_markets
       SET yes_pool = COALESCE(yes_pool,0) + v_amount, bet_count = COALESCE(bet_count,0) + 1, updated_at = now()
     WHERE id = p_market_id;
  ELSE
    UPDATE public.pm_markets
       SET no_pool = COALESCE(no_pool,0) + v_amount, bet_count = COALESCE(bet_count,0) + 1, updated_at = now()
     WHERE id = p_market_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'bet_id', v_bet_id, 'outcome', v_outcome,
    'amount', v_amount, 'balance', (v_available - v_amount)
  );
END;
$$;

-- ── RPC: settle a market (parimutuel payout) ────────────────────────
CREATE OR REPLACE FUNCTION public.pm_settle_market(
  p_market_id       uuid,
  p_winning_outcome text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_winner    text := initcap(trim(p_winning_outcome));
  v_status    text;
  v_win_pool  numeric := 0;
  v_lose_pool numeric := 0;
  v_fee       numeric := 0.02;   -- 2% platform fee on the distributed losing pool
  v_dist      numeric := 0;      -- total post-fee losing pool to share among winners
  v_refund    boolean := false;
  v_bet       record;
  v_payout    numeric;
  v_share     numeric;
  v_primary   uuid;
  v_paid      numeric := 0;
  v_count     integer := 0;
  v_win_count integer := 0;      -- number of winning bets
  v_win_seen  integer := 0;      -- winning bets processed so far
  v_share_acc numeric := 0;      -- shares already distributed (conservation guard)
BEGIN
  IF v_winner NOT IN ('Yes','No') THEN RAISE EXCEPTION 'INVALID_OUTCOME'; END IF;

  SELECT status INTO v_status FROM public.pm_markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MARKET_NOT_FOUND'; END IF;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'ALREADY_SETTLED'; END IF;

  -- authoritative pools from the OPEN bets themselves
  SELECT COALESCE(SUM(amount) FILTER (WHERE outcome = v_winner), 0),
         COALESCE(SUM(amount) FILTER (WHERE outcome <> v_winner), 0),
         COALESCE(COUNT(*)    FILTER (WHERE outcome = v_winner), 0)
    INTO v_win_pool, v_lose_pool, v_win_count
    FROM public.pm_bets WHERE market_id = p_market_id AND status = 'open';

  -- nobody backed the winning side → refund everyone (no valid counterparty)
  IF v_win_pool = 0 THEN v_refund := true; END IF;
  -- total post-fee losing pool that gets shared among winners (computed ONCE)
  v_dist := round(v_lose_pool * (1 - v_fee), 8);

  -- ORDER BY id makes the "last winner" deterministic so it can absorb the
  -- rounding residual; this guarantees SUM(shares) <= v_dist exactly, so the
  -- platform can never credit more than win_pool + post-fee lose_pool.
  FOR v_bet IN
    SELECT * FROM public.pm_bets WHERE market_id = p_market_id AND status = 'open' ORDER BY id FOR UPDATE
  LOOP
    IF v_refund THEN
      v_payout := v_bet.amount;
      UPDATE public.pm_bets SET status = 'refunded', payout = v_payout, settled_at = now() WHERE id = v_bet.id;
    ELSIF v_bet.outcome = v_winner THEN
      v_win_seen := v_win_seen + 1;
      IF v_win_seen >= v_win_count THEN
        -- last winning bet takes whatever post-fee share is left over
        v_share := v_dist - v_share_acc;
      ELSE
        v_share := round((v_bet.amount / v_win_pool) * v_dist, 8);
      END IF;
      IF v_share < 0 THEN v_share := 0; END IF;
      v_share_acc := v_share_acc + v_share;
      v_payout := round(v_bet.amount + v_share, 8);
      UPDATE public.pm_bets SET status = 'won', payout = v_payout, settled_at = now() WHERE id = v_bet.id;
    ELSE
      v_payout := 0;
      UPDATE public.pm_bets SET status = 'lost', payout = 0, settled_at = now() WHERE id = v_bet.id;
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
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.pm_markets
     SET status = 'resolved', winning_outcome = v_winner, resolved_at = now(), updated_at = now()
   WHERE id = p_market_id;

  RETURN jsonb_build_object('ok', true, 'market', p_market_id, 'winner', v_winner,
    'win_pool', v_win_pool, 'lose_pool', v_lose_pool, 'bets', v_count,
    'paid', v_paid, 'refunded', v_refund);
END;
$$;

-- ── RPC: cancel a market (refund every open bet) ────────────────────
CREATE OR REPLACE FUNCTION public.pm_cancel_market(p_market_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status  text;
  v_bet     record;
  v_primary uuid;
  v_count   integer := 0;
  v_paid    numeric := 0;
BEGIN
  SELECT status INTO v_status FROM public.pm_markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MARKET_NOT_FOUND'; END IF;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'ALREADY_SETTLED'; END IF;

  FOR v_bet IN
    SELECT * FROM public.pm_bets WHERE market_id = p_market_id AND status = 'open' FOR UPDATE
  LOOP
    UPDATE public.pm_bets SET status = 'refunded', payout = v_bet.amount, settled_at = now() WHERE id = v_bet.id;
    SELECT id INTO v_primary FROM public.user_balances
      WHERE user_id = v_bet.user_id AND upper(symbol) = 'USDT' AND COALESCE(is_deleted,false) = false
      ORDER BY id LIMIT 1;
    IF v_primary IS NULL THEN
      INSERT INTO public.user_balances(user_id, symbol, balance, locked_balance)
        VALUES (v_bet.user_id, 'USDT', v_bet.amount, 0);
    ELSE
      UPDATE public.user_balances SET balance = COALESCE(balance,0) + v_bet.amount, updated_at = now()
        WHERE id = v_primary;
    END IF;
    v_paid := v_paid + v_bet.amount;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.pm_markets SET status = 'cancelled', resolved_at = now(), updated_at = now()
   WHERE id = p_market_id;

  RETURN jsonb_build_object('ok', true, 'market', p_market_id, 'refunded_bets', v_count, 'refunded', v_paid);
END;
$$;

-- ── RPC: upsert market metadata from Polymarket sync (no money) ──────
-- Never touches pools/bets; will not resurrect a resolved/cancelled market.
CREATE OR REPLACE FUNCTION public.pm_sync_market(
  p_source_id    text,
  p_condition_id text,
  p_slug         text,
  p_question     text,
  p_category     text,
  p_image        text,
  p_end_date     timestamptz,
  p_live_yes     numeric,
  p_live_no      numeric,
  p_volume       numeric,
  p_featured     boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.pm_markets
    (source_id, condition_id, slug, question, category, image, end_date, live_yes, live_no, volume, featured)
  VALUES
    (p_source_id, p_condition_id, p_slug, p_question, p_category, p_image, p_end_date, p_live_yes, p_live_no, COALESCE(p_volume,0), COALESCE(p_featured,false))
  ON CONFLICT (source_id) DO UPDATE SET
    condition_id = EXCLUDED.condition_id,
    slug         = EXCLUDED.slug,
    question     = EXCLUDED.question,
    category     = EXCLUDED.category,
    image        = EXCLUDED.image,
    end_date     = EXCLUDED.end_date,
    live_yes     = EXCLUDED.live_yes,
    live_no      = EXCLUDED.live_no,
    volume       = EXCLUDED.volume,
    featured     = EXCLUDED.featured,
    updated_at   = now()
  WHERE public.pm_markets.status = 'open'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.pm_markets WHERE source_id = p_source_id;
  END IF;
  RETURN v_id;
END;
$$;

-- ── Lock down EXECUTE: service_role only ────────────────────────────
REVOKE ALL ON FUNCTION public.pm_place_bet(uuid, uuid, text, numeric)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pm_settle_market(uuid, text)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pm_cancel_market(uuid)                       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pm_sync_market(text,text,text,text,text,text,timestamptz,numeric,numeric,numeric,boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pm_place_bet(uuid, uuid, text, numeric)      TO service_role;
GRANT EXECUTE ON FUNCTION public.pm_settle_market(uuid, text)                 TO service_role;
GRANT EXECUTE ON FUNCTION public.pm_cancel_market(uuid)                       TO service_role;
GRANT EXECUTE ON FUNCTION public.pm_sync_market(text,text,text,text,text,text,timestamptz,numeric,numeric,numeric,boolean) TO service_role;
