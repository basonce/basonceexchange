-- Atomic, money-safe RPCs for the Telegram miner.
-- Each function is a single transaction; row locks (FOR UPDATE) and unique
-- constraints prevent double-spend / balance-resurrection races.
-- Called by the Cloudflare Worker via PostgREST /rest/v1/rpc/<name> with the
-- service role key (bypasses RLS).

-- claim: advance last_claim_at and credit accrued BNC atomically.
CREATE OR REPLACE FUNCTION miner_claim(p_tg bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE r tg_miner_state; earned numeric;
BEGIN
  SELECT hash_rate * GREATEST(0, EXTRACT(EPOCH FROM (now() - last_claim_at)))::numeric
    INTO earned
    FROM tg_miner_state WHERE telegram_user_id = p_tg FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','no_state'); END IF;
  UPDATE tg_miner_state
     SET bsc_balance   = bsc_balance + earned,
         total_claimed = total_claimed + earned,
         last_claim_at = now()
   WHERE telegram_user_id = p_tg
   RETURNING * INTO r;
  RETURN jsonb_build_object('earned', earned, 'state', to_jsonb(r));
END;
$$;

-- task: claim a one-time task reward; unique(telegram_user_id, task_key) dedupes.
CREATE OR REPLACE FUNCTION miner_task(p_tg bigint, p_key text, p_reward numeric)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE r tg_miner_state;
BEGIN
  INSERT INTO tg_miner_tasks(telegram_user_id, task_key, reward_bsc)
  VALUES (p_tg, p_key, p_reward)
  ON CONFLICT (telegram_user_id, task_key) DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','already'); END IF;
  UPDATE tg_miner_state SET bsc_balance = bsc_balance + p_reward
   WHERE telegram_user_id = p_tg RETURNING * INTO r;
  RETURN jsonb_build_object('reward', p_reward, 'state', to_jsonb(r));
END;
$$;

-- upgrade: consume a verified TON tx_hash (unique) and bump hash_rate atomically.
CREATE OR REPLACE FUNCTION miner_upgrade(p_tg bigint, p_tier text, p_price numeric, p_yield numeric, p_tx text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE r tg_miner_state;
BEGIN
  INSERT INTO tg_miner_boxes(telegram_user_id, box_tier, ton_paid, hash_rate_added, tx_hash)
  VALUES (p_tg, p_tier, p_price, p_yield, p_tx)
  ON CONFLICT (tx_hash) DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','tx_used'); END IF;
  UPDATE tg_miner_state SET hash_rate = hash_rate + p_yield / 86400.0
   WHERE telegram_user_id = p_tg RETURNING * INTO r;
  RETURN jsonb_build_object('state', to_jsonb(r));
END;
$$;

-- withdraw: atomically convert all BNC (incl. pending accrual) to USDT and credit
-- the linked basonce.com account. Locks the state row so a concurrent claim cannot
-- resurrect the zeroed balance.
CREATE OR REPLACE FUNCTION miner_withdraw(p_tg bigint, p_min numeric, p_rate numeric, p_linked uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE r tg_miner_state; earned numeric; total numeric; uid uuid; usdt numeric; affected int;
BEGIN
  SELECT * INTO r FROM tg_miner_state WHERE telegram_user_id = p_tg FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','no_state'); END IF;
  earned := r.hash_rate * GREATEST(0, EXTRACT(EPOCH FROM (now() - r.last_claim_at)))::numeric;
  total := r.bsc_balance + earned;
  IF total < p_min THEN RETURN jsonb_build_object('error','below_min','total',total); END IF;
  uid := COALESCE(r.linked_user_id, p_linked);
  IF uid IS NULL THEN RETURN jsonb_build_object('error','link_required'); END IF;
  usdt := total * p_rate;

  WITH one AS (
    SELECT id FROM user_balances
     WHERE user_id = uid AND symbol = 'USDT' AND COALESCE(is_deleted,false) = false
     ORDER BY balance DESC NULLS LAST LIMIT 1
  )
  UPDATE user_balances ub
     SET balance = COALESCE(ub.balance,0) + usdt, updated_at = now()
    FROM one WHERE ub.id = one.id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    INSERT INTO user_balances(user_id, symbol, balance, locked_balance, eq_amount)
    VALUES (uid, 'USDT', usdt, 0, 0);
  END IF;

  INSERT INTO tg_miner_withdrawals(telegram_user_id, linked_user_id, bsc_amount, usdt_credited)
  VALUES (p_tg, uid, total, usdt);

  UPDATE tg_miner_state
     SET bsc_balance = 0, last_claim_at = now(), linked_user_id = uid
   WHERE telegram_user_id = p_tg RETURNING * INTO r;

  RETURN jsonb_build_object('ok',true,'usdt_credited',usdt,'bsc_withdrawn',total,'state',to_jsonb(r));
END;
$$;

GRANT EXECUTE ON FUNCTION miner_claim(bigint)                          TO service_role;
GRANT EXECUTE ON FUNCTION miner_task(bigint, text, numeric)            TO service_role;
GRANT EXECUTE ON FUNCTION miner_upgrade(bigint, text, numeric, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION miner_withdraw(bigint, numeric, numeric, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
