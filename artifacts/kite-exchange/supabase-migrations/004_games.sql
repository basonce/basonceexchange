-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  BASONCE / KITE EXCHANGE — 3D CASINO GAMES (USDT)                ║
-- ║  Server-authoritative betting. All outcomes are computed in the   ║
-- ║  Cloudflare Worker; this RPC only applies the result atomically   ║
-- ║  against user_balances (symbol = 'USDT') and records the bet.     ║
-- ║  Access is ONLY via the worker using the service role key.        ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── 1) casino_bets : every round is recorded for audit ──────────────
CREATE TABLE IF NOT EXISTS public.casino_bets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  game        text NOT NULL,                       -- 'dice' | 'coinflip' | 'crash'
  symbol      text NOT NULL DEFAULT 'USDT',
  bet_amount  numeric(20,8) NOT NULL CHECK (bet_amount > 0),
  multiplier  numeric(20,4) NOT NULL DEFAULT 0,    -- payout multiplier (0 when lost)
  payout      numeric(20,8) NOT NULL DEFAULT 0,    -- amount credited back (0 when lost)
  won         boolean NOT NULL,
  outcome     jsonb,                               -- {roll,target,dir} | {result,side} | {crash,cashout}
  server_seed text,                                -- random seed the outcome was derived from
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS casino_bets_user_idx ON public.casino_bets(user_id, created_at DESC);

ALTER TABLE public.casino_bets ENABLE ROW LEVEL SECURITY;
-- No anon/auth policies on purpose: only the worker (service role) may read/write.

-- ── 2) casino_play : atomic debit-bet + credit-payout + record ──────
-- Returns the user's new USDT balance. Raises on insufficient funds so
-- the worker can surface a clean error and nothing is mutated.
CREATE OR REPLACE FUNCTION public.casino_play(
  p_user_id    uuid,
  p_game       text,
  p_symbol     text,
  p_bet        numeric,
  p_multiplier numeric,
  p_payout     numeric,
  p_won        boolean,
  p_outcome    jsonb,
  p_seed       text
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance numeric;
  v_new     numeric;
BEGIN
  IF p_bet IS NULL OR p_bet <= 0 THEN RAISE EXCEPTION 'bet must be positive'; END IF;
  IF COALESCE(p_payout,0) < 0 THEN RAISE EXCEPTION 'payout must be >= 0'; END IF;

  -- Lock this user's USDT row for the duration of the transaction.
  SELECT COALESCE(balance,0) INTO v_balance
    FROM public.user_balances
   WHERE user_id = p_user_id AND symbol = p_symbol
   FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_bet THEN
    RAISE EXCEPTION 'insufficient balance: have %, need %', COALESCE(v_balance,0), p_bet;
  END IF;

  v_new := v_balance - p_bet + COALESCE(p_payout,0);

  UPDATE public.user_balances
     SET balance = v_new
   WHERE user_id = p_user_id AND symbol = p_symbol;

  INSERT INTO public.casino_bets
    (user_id, game, symbol, bet_amount, multiplier, payout, won, outcome, server_seed)
  VALUES
    (p_user_id, p_game, p_symbol, p_bet, p_multiplier, COALESCE(p_payout,0), p_won, p_outcome, p_seed);

  RETURN v_new;
END $$;
