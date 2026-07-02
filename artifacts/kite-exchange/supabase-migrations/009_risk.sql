-- ============================================================
-- 009_risk.sql — Risk engine + withdrawal approval hardening
--  * risk_rules: configurable limits
--  * risk_events: append-only decision log
--  * risk_blacklist_addresses
--  * risk_check_withdrawal(): rule chain for withdrawals (worker-called)
--  * admin_approve_withdrawal()/admin_reject_withdrawal(): secure RPCs
--    with dual-approval above threshold
--  * RLS fix: clients can no longer UPDATE/DELETE withdrawal rows
-- ============================================================

-- ---------- 1. Rules ----------

CREATE TABLE IF NOT EXISTS risk_rules (
  rule_key    text PRIMARY KEY,
  rule_value  numeric NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO risk_rules (rule_key, rule_value, description) VALUES
  ('withdrawal_auto_hold_usd',        500,   'Withdrawals at/above this USD value are auto-held for review'),
  ('withdrawal_daily_limit_usd',      2000,  'Max total withdrawal USD per user per 24h; excess is held'),
  ('withdrawal_weekly_limit_usd',     10000, 'Max total withdrawal USD per user per 7 days; excess is held'),
  ('withdrawal_min_account_age_hours',24,    'Accounts younger than this (hours) get withdrawals held'),
  ('withdrawal_velocity_max_per_hour',3,     'Max withdrawal requests per user per hour; excess is held'),
  ('withdrawal_dual_approval_usd',    1000,  'Withdrawals at/above this USD value require two distinct admin approvals')
ON CONFLICT (rule_key) DO NOTHING;

CREATE OR REPLACE FUNCTION risk_rule(p_key text) RETURNS numeric
LANGUAGE sql STABLE AS $$
  SELECT rule_value FROM risk_rules WHERE rule_key = p_key AND enabled
$$;

-- ---------- 2. Blacklist ----------

CREATE TABLE IF NOT EXISTS risk_blacklist_addresses (
  address    text PRIMARY KEY,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 3. Decision log (append-only) ----------

CREATE TABLE IF NOT EXISTS risk_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  action     text NOT NULL,
  decision   text NOT NULL,
  reasons    jsonb NOT NULL DEFAULT '[]'::jsonb,
  usd_value  numeric,
  ref_type   text,
  ref_id     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_user    ON risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_created ON risk_events(created_at);

CREATE OR REPLACE FUNCTION risk_events_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'risk_events is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_risk_events_immutable ON risk_events;
CREATE TRIGGER trg_risk_events_immutable
  BEFORE UPDATE OR DELETE ON risk_events
  FOR EACH ROW EXECUTE FUNCTION risk_events_block_mutation();

-- ---------- 4. Withdrawal table additions ----------

ALTER TABLE withdrawal_transactions ADD COLUMN IF NOT EXISTS usd_value numeric;

CREATE TABLE IF NOT EXISTS withdrawal_approvals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES withdrawal_transactions(id),
  admin_id      uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (withdrawal_id, admin_id)
);

-- ---------- 5. Risk check (called by CF worker with service role) ----------

CREATE OR REPLACE FUNCTION risk_check_withdrawal(p_withdrawal_id uuid, p_usd_value numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w          record;
  v_reasons  text[] := '{}';
  v_decision text;
  v_age_h    numeric;
  v_daily    numeric;
  v_weekly   numeric;
  v_velocity int;
  v_dual     boolean := false;
BEGIN
  SELECT * INTO w FROM withdrawal_transactions WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;

  UPDATE withdrawal_transactions SET usd_value = p_usd_value WHERE id = p_withdrawal_id;

  -- blacklisted destination
  IF EXISTS (SELECT 1 FROM risk_blacklist_addresses b
             WHERE lower(b.address) = lower(COALESCE(w.destination_address,''))) THEN
    v_reasons := v_reasons || ARRAY['blacklisted_address'];
  END IF;

  -- account age
  SELECT EXTRACT(EPOCH FROM (now() - up.created_at)) / 3600 INTO v_age_h
  FROM user_profiles up WHERE up.id = w.user_id;
  IF v_age_h IS NOT NULL AND risk_rule('withdrawal_min_account_age_hours') IS NOT NULL
     AND v_age_h < risk_rule('withdrawal_min_account_age_hours') THEN
    v_reasons := v_reasons || ARRAY['account_too_new'];
  END IF;

  -- velocity (requests in last hour, any status)
  SELECT count(*) INTO v_velocity FROM withdrawal_transactions
  WHERE user_id = w.user_id AND created_at > now() - interval '1 hour';
  IF risk_rule('withdrawal_velocity_max_per_hour') IS NOT NULL
     AND v_velocity > risk_rule('withdrawal_velocity_max_per_hour') THEN
    v_reasons := v_reasons || ARRAY['velocity_exceeded'];
  END IF;

  -- daily / weekly USD totals (non-rejected)
  SELECT COALESCE(sum(COALESCE(usd_value, CASE WHEN coin_symbol = 'USDT' THEN amount END, 0)), 0)
  INTO v_daily FROM withdrawal_transactions
  WHERE user_id = w.user_id AND created_at > now() - interval '24 hours'
    AND status NOT IN ('rejected','cancelled');
  IF risk_rule('withdrawal_daily_limit_usd') IS NOT NULL
     AND v_daily > risk_rule('withdrawal_daily_limit_usd') THEN
    v_reasons := v_reasons || ARRAY['daily_limit_exceeded'];
  END IF;

  SELECT COALESCE(sum(COALESCE(usd_value, CASE WHEN coin_symbol = 'USDT' THEN amount END, 0)), 0)
  INTO v_weekly FROM withdrawal_transactions
  WHERE user_id = w.user_id AND created_at > now() - interval '7 days'
    AND status NOT IN ('rejected','cancelled');
  IF risk_rule('withdrawal_weekly_limit_usd') IS NOT NULL
     AND v_weekly > risk_rule('withdrawal_weekly_limit_usd') THEN
    v_reasons := v_reasons || ARRAY['weekly_limit_exceeded'];
  END IF;

  -- large amount
  IF risk_rule('withdrawal_auto_hold_usd') IS NOT NULL
     AND p_usd_value >= risk_rule('withdrawal_auto_hold_usd') THEN
    v_reasons := v_reasons || ARRAY['large_amount'];
  END IF;

  IF risk_rule('withdrawal_dual_approval_usd') IS NOT NULL
     AND p_usd_value >= risk_rule('withdrawal_dual_approval_usd') THEN
    v_dual := true;
  END IF;

  IF array_length(v_reasons, 1) IS NOT NULL THEN
    v_decision := 'hold';
    UPDATE withdrawal_transactions
    SET status = 'hold',
        processing_note = 'RISK: ' || array_to_string(v_reasons, ', ')
    WHERE id = p_withdrawal_id AND status IN ('pending','hold');
  ELSE
    v_decision := 'allow';
  END IF;

  INSERT INTO risk_events (user_id, action, decision, reasons, usd_value, ref_type, ref_id)
  VALUES (w.user_id, 'withdrawal', v_decision, to_jsonb(v_reasons), p_usd_value,
          'withdrawal_transactions', p_withdrawal_id::text);

  RETURN jsonb_build_object(
    'success', true,
    'decision', v_decision,
    'reasons', to_jsonb(v_reasons),
    'dual_approval_required', v_dual,
    'daily_total_usd', v_daily,
    'weekly_total_usd', v_weekly
  );
END $$;

-- ---------- 6. Admin approve / reject RPCs (dual approval) ----------

CREATE OR REPLACE FUNCTION is_caller_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM user_profiles WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION admin_approve_withdrawal(p_withdrawal_id uuid, p_txid text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w           record;
  v_admin     uuid := auth.uid();
  v_usd       numeric;
  v_dual_thr  numeric := risk_rule('withdrawal_dual_approval_usd');
  v_approvals int;
BEGIN
  IF auth.role() <> 'service_role' AND NOT is_caller_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_admin_identity');
  END IF;

  SELECT * INTO w FROM withdrawal_transactions WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;
  IF w.status NOT IN ('pending','hold','processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', w.status);
  END IF;

  v_usd := COALESCE(w.usd_value, CASE WHEN w.coin_symbol = 'USDT' THEN w.amount END, 0);

  BEGIN
    INSERT INTO withdrawal_approvals (withdrawal_id, admin_id) VALUES (p_withdrawal_id, v_admin);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'second_approver_must_differ');
  END;

  SELECT count(*) INTO v_approvals FROM withdrawal_approvals WHERE withdrawal_id = p_withdrawal_id;

  IF v_dual_thr IS NOT NULL AND v_usd >= v_dual_thr AND v_approvals < 2 THEN
    UPDATE withdrawal_transactions
    SET status = 'processing',
        approved_by = v_admin,
        approved_at = now(),
        processing_note = 'Awaiting second admin approval (dual approval required)'
    WHERE id = p_withdrawal_id;
    RETURN jsonb_build_object('success', true, 'needs_second_approval', true);
  END IF;

  PERFORM set_config('app.ledger_ctx', 'withdrawal_complete:' || p_withdrawal_id, true);

  UPDATE withdrawal_transactions
  SET status = 'completed',
      txid = COALESCE(p_txid, txid),
      completed_at = now(),
      reviewed_at = now(),
      reviewed_by = v_admin,
      approved_by = COALESCE(approved_by, v_admin),
      approved_at = COALESCE(approved_at, now())
  WHERE id = p_withdrawal_id;

  INSERT INTO risk_events (user_id, action, decision, reasons, usd_value, ref_type, ref_id)
  VALUES (w.user_id, 'withdrawal_approve', 'completed',
          jsonb_build_array('approvals:' || v_approvals), v_usd,
          'withdrawal_transactions', p_withdrawal_id::text);

  RETURN jsonb_build_object('success', true, 'needs_second_approval', false);
END $$;

CREATE OR REPLACE FUNCTION admin_reject_withdrawal(p_withdrawal_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w       record;
  v_admin uuid := auth.uid();
BEGIN
  IF auth.role() <> 'service_role' AND NOT is_caller_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  SELECT * INTO w FROM withdrawal_transactions WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;
  IF w.status NOT IN ('pending','hold','processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', w.status);
  END IF;

  UPDATE withdrawal_transactions
  SET status = 'rejected',
      admin_notes = COALESCE(p_notes, 'Rejected by admin'),
      reviewed_at = now(),
      reviewed_by = v_admin
  WHERE id = p_withdrawal_id;

  -- refund the deducted amount atomically (request flow deducts at insert time)
  PERFORM set_config('app.ledger_ctx', 'withdrawal_reject_refund:' || p_withdrawal_id, true);
  UPDATE user_balances
  SET balance = COALESCE(balance, 0) + w.amount, updated_at = now()
  WHERE id = (
    SELECT id FROM user_balances
    WHERE user_id = w.user_id AND symbol = w.coin_symbol
    ORDER BY COALESCE(balance,0) DESC
    LIMIT 1
  );
  IF NOT FOUND THEN
    INSERT INTO user_balances (user_id, symbol, balance)
    VALUES (w.user_id, w.coin_symbol, w.amount);
  END IF;

  INSERT INTO risk_events (user_id, action, decision, reasons, usd_value, ref_type, ref_id)
  VALUES (w.user_id, 'withdrawal_reject', 'rejected',
          jsonb_build_array(COALESCE(p_notes,'')), w.usd_value,
          'withdrawal_transactions', p_withdrawal_id::text);

  RETURN jsonb_build_object('success', true);
END $$;

-- ---------- 7. Rule management RPCs (admin only) ----------

CREATE OR REPLACE FUNCTION admin_set_risk_rule(p_key text, p_value numeric, p_enabled boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT is_caller_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  UPDATE risk_rules SET rule_value = p_value, enabled = p_enabled, updated_at = now()
  WHERE rule_key = p_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_rule');
  END IF;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION admin_blacklist_address(p_address text, p_reason text DEFAULT NULL, p_remove boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT is_caller_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  IF p_remove THEN
    DELETE FROM risk_blacklist_addresses WHERE lower(address) = lower(p_address);
  ELSE
    INSERT INTO risk_blacklist_addresses (address, reason)
    VALUES (lower(p_address), p_reason)
    ON CONFLICT (address) DO UPDATE SET reason = EXCLUDED.reason;
  END IF;
  RETURN jsonb_build_object('success', true);
END $$;

-- ---------- 8. RLS: lock down ----------

ALTER TABLE risk_rules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_blacklist_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_approvals     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON risk_rules, risk_blacklist_addresses, risk_events, withdrawal_approvals
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON risk_rules, risk_blacklist_addresses, risk_events, withdrawal_approvals TO authenticated;

DROP POLICY IF EXISTS risk_rules_admin_read ON risk_rules;
CREATE POLICY risk_rules_admin_read ON risk_rules FOR SELECT TO authenticated
  USING (is_caller_admin());
DROP POLICY IF EXISTS risk_blacklist_admin_read ON risk_blacklist_addresses;
CREATE POLICY risk_blacklist_admin_read ON risk_blacklist_addresses FOR SELECT TO authenticated
  USING (is_caller_admin());
DROP POLICY IF EXISTS risk_events_admin_read ON risk_events;
CREATE POLICY risk_events_admin_read ON risk_events FOR SELECT TO authenticated
  USING (is_caller_admin());
DROP POLICY IF EXISTS withdrawal_approvals_admin_read ON withdrawal_approvals;
CREATE POLICY withdrawal_approvals_admin_read ON withdrawal_approvals FOR SELECT TO authenticated
  USING (is_caller_admin());

-- withdrawal_transactions: replace allow-all with granular policies.
-- Clients may still read (site history views) and insert requests
-- (only in pending/hold state), but can no longer UPDATE or DELETE —
-- status changes go through the admin RPCs / worker (service role).
DROP POLICY IF EXISTS allow_all_withdrawal_transactions ON withdrawal_transactions;
DROP POLICY IF EXISTS wt_select ON withdrawal_transactions;
CREATE POLICY wt_select ON withdrawal_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS wt_insert ON withdrawal_transactions;
CREATE POLICY wt_insert ON withdrawal_transactions FOR INSERT
  WITH CHECK (
    status IN ('pending','hold')
    AND txid IS NULL
    AND approved_by IS NULL
    AND reviewed_by IS NULL
    AND completed_at IS NULL
  );

-- ---------- 9. Function grants ----------

REVOKE ALL ON FUNCTION risk_check_withdrawal(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION risk_check_withdrawal(uuid, numeric) TO service_role;

REVOKE ALL ON FUNCTION admin_approve_withdrawal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_approve_withdrawal(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION admin_reject_withdrawal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_reject_withdrawal(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION admin_set_risk_rule(text, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_set_risk_rule(text, numeric, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION admin_blacklist_address(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_blacklist_address(text, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION is_caller_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_caller_admin() TO authenticated, service_role;
