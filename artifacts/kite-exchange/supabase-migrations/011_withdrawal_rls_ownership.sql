-- 011_withdrawal_rls_ownership.sql — fix authorization gaps found in audit review
--
-- Problems in 009:
--   * wt_select USING (true)  → every authenticated user could read ALL
--     withdrawal rows (addresses, amounts, statuses of other users).
--   * wt_insert did not check user_id = auth.uid() → any authenticated
--     user could forge a withdrawal request on behalf of another user_id,
--     which an admin might then approve (treasury outflow).
--
-- Fixes:
--   * SELECT: own rows only, or admin (is_caller_admin()).
--   * INSERT: ownership enforced (user_id = auth.uid()) + positive amount,
--     in addition to the existing status/privileged-column checks.
--   * Belt-and-braces BEFORE INSERT trigger enforcing the same ownership
--     rule independently of RLS (service_role bypasses RLS but the worker
--     always sets user_id explicitly from the verified JWT, so the trigger
--     exempts service_role).

DROP POLICY IF EXISTS wt_select ON withdrawal_transactions;
CREATE POLICY wt_select ON withdrawal_transactions FOR SELECT
  USING (user_id = auth.uid() OR is_caller_admin());

DROP POLICY IF EXISTS wt_insert ON withdrawal_transactions;
CREATE POLICY wt_insert ON withdrawal_transactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND amount > 0
    AND status IN ('pending','hold')
    AND txid IS NULL
    AND approved_by IS NULL
    AND reviewed_by IS NULL
    AND completed_at IS NULL
  );

-- DB-level guardrail independent of RLS: reject inserts where an
-- authenticated (non-service-role) caller supplies someone else's user_id.
CREATE OR REPLACE FUNCTION enforce_withdrawal_ownership() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'withdrawal user_id must match authenticated user';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'withdrawal amount must be positive';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_withdrawal_ownership ON withdrawal_transactions;
CREATE TRIGGER trg_withdrawal_ownership
  BEFORE INSERT ON withdrawal_transactions
  FOR EACH ROW EXECUTE FUNCTION enforce_withdrawal_ownership();
