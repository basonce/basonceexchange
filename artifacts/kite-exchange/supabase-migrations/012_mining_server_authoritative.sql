-- ============================================================================
-- 012: Server-authoritative mining
-- - Free CPU miner: $5/day (was 177.6)
-- - All mining money flows (start/stop/collect/purchase/claim) move to
--   SECURITY DEFINER RPCs. Earnings are computed ONLY from server timestamps.
-- - user_mining_equipment: clients can only SELECT their own rows.
-- ============================================================================

-- 1) Rate fix -----------------------------------------------------------------
UPDATE mining_equipment_types
SET daily_earning = 5,
    withdrawal_limit = 1.04
WHERE is_free = true;

-- 2) Track what has already been paid out (in seconds of mining) --------------
ALTER TABLE user_mining_equipment
  ADD COLUMN IF NOT EXISTS paid_mining_seconds numeric NOT NULL DEFAULT 0;

-- Reset all client-computed pending earnings (they were computed at the old
-- inflated rate, on the client, and are not trustworthy). Everyone restarts
-- clean at the new server-computed rate.
UPDATE user_mining_equipment
SET paid_mining_seconds = COALESCE(used_mining_seconds, 0),
    session_earned_usdt = 0;

-- 3) Helper: resolve the acting user ------------------------------------------
CREATE OR REPLACE FUNCTION mining_resolve_uid(p_as_user uuid)
RETURNS uuid
LANGUAGE plpgsql STABLE
AS $$
DECLARE v uuid;
BEGIN
  v := auth.uid();
  IF v IS NOT NULL THEN
    RETURN v;
  END IF;
  -- server-side contexts only (admin/testing); never reachable by anon clients
  IF current_user IN ('postgres', 'supabase_admin') OR COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN p_as_user;
  END IF;
  RETURN NULL;
END;
$$;

-- 4) START mining --------------------------------------------------------------
CREATE OR REPLACE FUNCTION mining_start(p_equipment_id uuid, p_as_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  e RECORD;
  t RECORD;
  v_max numeric;
  v_used numeric;
  v_out jsonb;
BEGIN
  v_uid := mining_resolve_uid(p_as_user);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT * INTO e FROM user_mining_equipment
   WHERE id = p_equipment_id AND user_id = v_uid AND is_active = true
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'equipment_not_found'; END IF;

  SELECT * INTO t FROM mining_equipment_types WHERE id = e.equipment_type_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'equipment_type_not_found'; END IF;

  v_max  := COALESCE(t.mining_duration_hours, 5) * 3600;
  v_used := COALESCE(e.used_mining_seconds, 0);

  -- fold a stale running session into used seconds (server clock only)
  IF e.status = 'active' AND e.started_at IS NOT NULL THEN
    v_used := LEAST(v_max, v_used + EXTRACT(EPOCH FROM (now() - e.started_at)));
  END IF;

  IF v_used >= v_max THEN
    UPDATE user_mining_equipment
       SET used_mining_seconds = v_max,
           status = 'stopped', started_at = NULL, ends_at = NULL,
           session_earned_usdt = ROUND(GREATEST(0, v_max - COALESCE(paid_mining_seconds,0)) * t.daily_earning / 86400.0, 4)
     WHERE id = e.id;
    RAISE EXCEPTION 'time_exhausted';
  END IF;

  UPDATE user_mining_equipment
     SET status = 'active',
         started_at = now(),
         ends_at = now() + make_interval(secs => (v_max - v_used)),
         used_mining_seconds = v_used
   WHERE id = e.id;

  SELECT to_jsonb(u) INTO v_out FROM user_mining_equipment u WHERE u.id = e.id;
  RETURN v_out;
END;
$$;

-- 5) STOP mining ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION mining_stop(p_equipment_id uuid, p_as_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  e RECORD;
  t RECORD;
  v_max numeric;
  v_used numeric;
  v_out jsonb;
BEGIN
  v_uid := mining_resolve_uid(p_as_user);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT * INTO e FROM user_mining_equipment
   WHERE id = p_equipment_id AND user_id = v_uid
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'equipment_not_found'; END IF;

  SELECT * INTO t FROM mining_equipment_types WHERE id = e.equipment_type_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'equipment_type_not_found'; END IF;

  v_max  := COALESCE(t.mining_duration_hours, 5) * 3600;
  v_used := COALESCE(e.used_mining_seconds, 0);

  IF e.status = 'active' AND e.started_at IS NOT NULL THEN
    v_used := LEAST(v_max, v_used + EXTRACT(EPOCH FROM (now() - e.started_at)));
  END IF;

  UPDATE user_mining_equipment
     SET status = 'stopped',
         started_at = NULL,
         ends_at = NULL,
         used_mining_seconds = v_used,
         session_earned_usdt = ROUND(GREATEST(0, v_used - COALESCE(paid_mining_seconds,0)) * t.daily_earning / 86400.0, 4)
   WHERE id = e.id;

  SELECT to_jsonb(u) INTO v_out FROM user_mining_equipment u WHERE u.id = e.id;
  RETURN v_out;
END;
$$;

-- 6) COLLECT earnings (the only way mining can credit a balance) -----------------
CREATE OR REPLACE FUNCTION mining_collect(p_as_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  r RECORD;
  v_max numeric;
  v_used numeric;
  v_pending numeric;
  v_total numeric := 0;
  v_expired boolean := false;
  v_bal numeric;
BEGIN
  v_uid := mining_resolve_uid(p_as_user);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;

  FOR r IN
    SELECT e.*, t.daily_earning AS rate, COALESCE(t.mining_duration_hours,5)*3600 AS max_secs
      FROM user_mining_equipment e
      JOIN mining_equipment_types t ON t.id = e.equipment_type_id
     WHERE e.user_id = v_uid AND e.is_active = true
     FOR UPDATE OF e
  LOOP
    v_max  := r.max_secs;
    v_used := COALESCE(r.used_mining_seconds, 0);
    IF r.status = 'active' AND r.started_at IS NOT NULL THEN
      v_used := LEAST(v_max, v_used + EXTRACT(EPOCH FROM (now() - r.started_at)));
    END IF;
    v_used := LEAST(v_used, v_max);

    v_pending := ROUND(GREATEST(0, v_used - COALESCE(r.paid_mining_seconds,0)) * r.rate / 86400.0, 4);

    IF v_pending > 0 THEN
      v_total := v_total + v_pending;

      UPDATE user_mining_equipment
         SET used_mining_seconds = v_used,
             paid_mining_seconds = v_used,
             session_earned_usdt = 0,
             status = 'stopped',
             started_at = NULL,
             ends_at = NULL,
             is_active = (v_used < v_max - 0.5),
             total_earned_from_equipment = COALESCE(total_earned_from_equipment,0) + v_pending,
             total_earned_usdt = COALESCE(total_earned_usdt,0) + v_pending,
             times_used = COALESCE(times_used,0) + 1,
             last_claim_at = now()
       WHERE id = r.id;

      IF v_used >= v_max - 0.5 THEN
        v_expired := true;
      END IF;
    END IF;
  END LOOP;

  IF v_total > 0 THEN
    UPDATE user_balances
       SET balance = ROUND(COALESCE(balance,0) + v_total, 4)
     WHERE user_id = v_uid AND symbol = 'USDT'
     RETURNING balance INTO v_bal;
    IF NOT FOUND THEN
      INSERT INTO user_balances (user_id, symbol, balance)
      VALUES (v_uid, 'USDT', ROUND(v_total, 4))
      RETURNING balance INTO v_bal;
    END IF;
  ELSE
    SELECT balance INTO v_bal FROM user_balances WHERE user_id = v_uid AND symbol = 'USDT';
  END IF;

  RETURN jsonb_build_object(
    'collected', ROUND(v_total, 4),
    'new_balance', COALESCE(v_bal, 0),
    'expired', v_expired
  );
END;
$$;

-- 7) BUY equipment (atomic: balance check + deduct + insert) ---------------------
CREATE OR REPLACE FUNCTION mining_buy_equipment(p_equipment_type_id uuid, p_as_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  t RECORD;
  v_bal numeric;
  v_eq uuid;
  v_lvl integer;
  v_levelup boolean := false;
BEGIN
  v_uid := mining_resolve_uid(p_as_user);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT * INTO t FROM mining_equipment_types
   WHERE id = p_equipment_type_id AND COALESCE(is_free, false) = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'equipment_type_not_found'; END IF;
  IF COALESCE(t.price, 0) <= 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;

  UPDATE user_balances
     SET balance = ROUND(balance - t.price, 4)
   WHERE user_id = v_uid AND symbol = 'USDT' AND balance >= t.price
   RETURNING balance INTO v_bal;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  INSERT INTO user_mining_equipment
    (user_id, equipment_type_id, level, is_active, status,
     session_earned_usdt, total_earned_usdt, used_mining_seconds,
     paid_mining_seconds, started_at, ends_at, total_earned_from_equipment)
  VALUES
    (v_uid, t.id, t.level, true, 'stopped', 0, 0, 0, 0, NULL, NULL, 0)
  RETURNING id INTO v_eq;

  SELECT COALESCE(current_mining_level, 0) INTO v_lvl FROM user_profiles WHERE id = v_uid;
  IF t.level > COALESCE(v_lvl, 0) THEN
    UPDATE user_profiles SET current_mining_level = t.level WHERE id = v_uid;
    v_levelup := true;
  END IF;

  RETURN jsonb_build_object(
    'equipment_id', v_eq,
    'new_balance', v_bal,
    'leveled_up', v_levelup,
    'level', t.level
  );
END;
$$;

-- 8) CLAIM free starter equipment (once, only if user has none) ------------------
CREATE OR REPLACE FUNCTION mining_claim_free_equipment(p_as_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_type uuid;
  v_eq uuid;
BEGIN
  v_uid := mining_resolve_uid(p_as_user);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- lock: one claim per user, and only if they have never had any equipment
  PERFORM pg_advisory_xact_lock(hashtext('mining_claim_' || v_uid::text));

  IF EXISTS (SELECT 1 FROM user_mining_equipment WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('claimed', false);
  END IF;

  SELECT id INTO v_type FROM mining_equipment_types
   WHERE is_free = true OR level = 0
   ORDER BY is_free DESC
   LIMIT 1;
  IF v_type IS NULL THEN RAISE EXCEPTION 'free_type_not_found'; END IF;

  INSERT INTO user_mining_equipment
    (user_id, equipment_type_id, level, is_active, status,
     session_earned_usdt, total_earned_usdt, used_mining_seconds, paid_mining_seconds)
  VALUES (v_uid, v_type, 0, true, 'stopped', 0, 0, 0, 0)
  RETURNING id INTO v_eq;

  RETURN jsonb_build_object('claimed', true, 'equipment_id', v_eq);
END;
$$;

-- 9) Permissions ------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION mining_resolve_uid(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION mining_start(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION mining_stop(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION mining_collect(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION mining_buy_equipment(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION mining_claim_free_equipment(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION mining_start(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mining_stop(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mining_collect(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mining_buy_equipment(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mining_claim_free_equipment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mining_resolve_uid(uuid) TO authenticated, service_role;

-- 10) RLS lockdown ------------------------------------------------------------------
-- Equipment rows: users can only READ their own rows. All writes go through RPCs.
DROP POLICY IF EXISTS allow_all_user_mining_equipment ON user_mining_equipment;
CREATE POLICY ume_select_own ON user_mining_equipment
  FOR SELECT USING (auth.uid() = user_id);

-- Equipment catalog: read-only for everyone, no client writes.
DROP POLICY IF EXISTS allow_all_mining_equipment_types ON mining_equipment_types;
CREATE POLICY met_select_all ON mining_equipment_types
  FOR SELECT USING (true);
