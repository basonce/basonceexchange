-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  CASINO SECURITY HARDENING                                        ║
-- ║  1) casino_play recomputes payout itself (ignores supplied value) ║
-- ║     and enforces USDT + bet/multiplier bounds.                    ║
-- ║  2) EXECUTE locked to service_role only — no anon/authenticated    ║
-- ║     can call the RPC directly via PostgREST.                       ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.casino_play(
  p_user_id    uuid,
  p_game       text,
  p_symbol     text,
  p_bet        numeric,
  p_multiplier numeric,
  p_payout     numeric,   -- accepted for signature compatibility; IGNORED below
  p_won        boolean,
  p_outcome    jsonb,
  p_seed       text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance numeric;
  v_new     numeric;
  v_bet     numeric;
  v_mult    numeric;
  v_payout  numeric;
BEGIN
  IF p_symbol IS DISTINCT FROM 'USDT' THEN
    RAISE EXCEPTION 'only USDT is supported';
  END IF;

  v_bet := round(p_bet, 8);
  IF v_bet IS NULL OR v_bet < 0.1 OR v_bet > 1000 THEN
    RAISE EXCEPTION 'bet out of range: %', v_bet;
  END IF;

  v_mult := COALESCE(p_multiplier, 0);
  IF v_mult < 0 OR v_mult > 1000 THEN
    RAISE EXCEPTION 'multiplier out of range: %', v_mult;
  END IF;

  -- Payout is ALWAYS derived here. Any supplied p_payout is ignored so a
  -- compromised/forged caller cannot mint balance.
  v_payout := round(v_bet * v_mult, 8);

  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.user_balances
   WHERE user_id = p_user_id AND symbol = 'USDT'
   FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_bet THEN
    RAISE EXCEPTION 'insufficient balance: have %, need %', COALESCE(v_balance, 0), v_bet;
  END IF;

  v_new := v_balance - v_bet + v_payout;

  UPDATE public.user_balances
     SET balance = v_new
   WHERE user_id = p_user_id AND symbol = 'USDT';

  INSERT INTO public.casino_bets
    (user_id, game, symbol, bet_amount, multiplier, payout, won, outcome, server_seed)
  VALUES
    (p_user_id, p_game, 'USDT', v_bet, v_mult, v_payout, p_won, p_outcome, p_seed);

  RETURN v_new;
END $$;

-- Lock down execution: only the worker (service role) may call this.
REVOKE ALL ON FUNCTION public.casino_play(uuid, text, text, numeric, numeric, numeric, boolean, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.casino_play(uuid, text, text, numeric, numeric, numeric, boolean, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.casino_play(uuid, text, text, numeric, numeric, numeric, boolean, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.casino_play(uuid, text, text, numeric, numeric, numeric, boolean, jsonb, text) TO service_role;
