-- ============================================================
-- 010_admin_audit_access.sql — read access for admin-monitor
--  Admins (authenticated + user_profiles.is_admin) can READ the
--  ledger and run reconciliation. Writes stay impossible
--  (immutability triggers + no write policies).
-- ============================================================

GRANT SELECT ON ledger_accounts, ledger_journal, ledger_postings TO authenticated;

DROP POLICY IF EXISTS ledger_accounts_admin_read ON ledger_accounts;
CREATE POLICY ledger_accounts_admin_read ON ledger_accounts FOR SELECT TO authenticated
  USING (is_caller_admin());
DROP POLICY IF EXISTS ledger_journal_admin_read ON ledger_journal;
CREATE POLICY ledger_journal_admin_read ON ledger_journal FOR SELECT TO authenticated
  USING (is_caller_admin());
DROP POLICY IF EXISTS ledger_postings_admin_read ON ledger_postings;
CREATE POLICY ledger_postings_admin_read ON ledger_postings FOR SELECT TO authenticated
  USING (is_caller_admin());

-- One-call audit summary for the admin panel
CREATE OR REPLACE FUNCTION admin_audit_summary()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mismatches   int;
  v_journals     bigint;
  v_postings     bigint;
  v_last_entry   timestamptz;
  v_liabilities  jsonb;
  v_risk_24h     jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND NOT is_caller_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  SELECT count(*) INTO v_mismatches FROM ledger_reconcile();
  SELECT count(*) INTO v_journals FROM ledger_journal;
  SELECT count(*) INTO v_postings FROM ledger_postings;
  SELECT max(created_at) INTO v_last_entry FROM ledger_journal;

  -- Treasury view: total user liabilities per symbol (what the platform owes users)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('symbol', s.symbol, 'total', s.total) ORDER BY s.total DESC), '[]'::jsonb)
  INTO v_liabilities
  FROM (
    SELECT a.symbol, sum(p.amount) AS total
    FROM ledger_postings p JOIN ledger_accounts a ON a.id = p.account_id
    WHERE a.kind = 'user'
    GROUP BY a.symbol
    HAVING abs(sum(p.amount)) > 0.000001
  ) s;

  SELECT jsonb_build_object(
    'total',   count(*),
    'holds',   count(*) FILTER (WHERE decision = 'hold'),
    'allows',  count(*) FILTER (WHERE decision = 'allow')
  ) INTO v_risk_24h
  FROM risk_events WHERE created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'success', true,
    'reconcile_mismatches', v_mismatches,
    'journal_count', v_journals,
    'posting_count', v_postings,
    'last_entry_at', v_last_entry,
    'user_liabilities', v_liabilities,
    'risk_24h', v_risk_24h
  );
END $$;

REVOKE ALL ON FUNCTION admin_audit_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_audit_summary() TO authenticated, service_role;
