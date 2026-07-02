-- ============================================================
-- 008_ledger.sql — Double-entry ledger (audit-grade)
-- Every money movement on user_balances is captured as a
-- balanced journal (sum of postings per journal+symbol = 0).
-- Journals/postings are immutable (append-only).
-- ============================================================

-- ---------- 1. Tables ----------

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  kind       text NOT NULL CHECK (kind IN ('user','system')),
  user_id    uuid,
  symbol     text NOT NULL,
  subtype    text NOT NULL CHECK (subtype IN ('avail','locked','fut','platform','opening')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_journal (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type  text NOT NULL,
  ref_type    text,
  ref_id      text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_postings (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id uuid NOT NULL REFERENCES ledger_journal(id),
  account_id uuid NOT NULL REFERENCES ledger_accounts(id),
  symbol     text NOT NULL,
  amount     numeric NOT NULL CHECK (amount <> 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_postings_journal ON ledger_postings(journal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_postings_account ON ledger_postings(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_journal_created  ON ledger_journal(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_user    ON ledger_accounts(user_id) WHERE user_id IS NOT NULL;

-- ---------- 2. Immutability (append-only) ----------

CREATE OR REPLACE FUNCTION ledger_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger records are immutable (append-only); use a reversing journal entry';
END $$;

DROP TRIGGER IF EXISTS trg_ledger_journal_immutable ON ledger_journal;
CREATE TRIGGER trg_ledger_journal_immutable
  BEFORE UPDATE OR DELETE ON ledger_journal
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();

DROP TRIGGER IF EXISTS trg_ledger_postings_immutable ON ledger_postings;
CREATE TRIGGER trg_ledger_postings_immutable
  BEFORE UPDATE OR DELETE ON ledger_postings
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();

CREATE OR REPLACE FUNCTION ledger_block_account_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger accounts cannot be deleted';
END $$;

DROP TRIGGER IF EXISTS trg_ledger_accounts_nodelete ON ledger_accounts;
CREATE TRIGGER trg_ledger_accounts_nodelete
  BEFORE DELETE ON ledger_accounts
  FOR EACH ROW EXECUTE FUNCTION ledger_block_account_delete();

-- ---------- 3. Balance invariant (sum per journal+symbol = 0 at commit) ----------

CREATE OR REPLACE FUNCTION ledger_check_journal_balanced() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE bad record;
BEGIN
  SELECT symbol, sum(amount) AS s INTO bad
  FROM ledger_postings
  WHERE journal_id = NEW.journal_id
  GROUP BY symbol
  HAVING sum(amount) <> 0
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'unbalanced journal % for symbol % (off by %)', NEW.journal_id, bad.symbol, bad.s;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_ledger_balanced ON ledger_postings;
CREATE CONSTRAINT TRIGGER trg_ledger_balanced
  AFTER INSERT ON ledger_postings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION ledger_check_journal_balanced();

-- ---------- 4. Account helper ----------

CREATE OR REPLACE FUNCTION ledger_account_id(
  p_kind text, p_user uuid, p_symbol text, p_subtype text
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_code text;
  v_id   uuid;
BEGIN
  IF p_kind = 'user' THEN
    v_code := 'u:' || p_user || ':' || p_symbol || ':' || p_subtype;
  ELSE
    v_code := 'sys:' || p_subtype || ':' || p_symbol;
  END IF;

  SELECT id INTO v_id FROM ledger_accounts WHERE code = v_code;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO ledger_accounts (code, kind, user_id, symbol, subtype)
  VALUES (v_code, p_kind, p_user, p_symbol, p_subtype)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_id FROM ledger_accounts WHERE code = v_code;
  RETURN v_id;
END $$;

-- ---------- 5. Auto-capture: every user_balances change → balanced journal ----------
-- Non-monetary sentinel symbols are excluded.
-- Callers may tag entries: SELECT set_config('app.ledger_ctx', 'deposit:xyz', true);

CREATE OR REPLACE FUNCTION ledger_is_monetary(p_symbol text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_symbol NOT LIKE 'NOWPAY\_%' AND p_symbol NOT LIKE 'WELCOME_CHEST%'
$$;

CREATE OR REPLACE FUNCTION ledger_capture_balance_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_sym    text;
  v_user   uuid;
  v_ref    text;
  d_avail  numeric;
  d_locked numeric;
  d_fut    numeric;
  v_ctx    text;
  v_jid    uuid;
  v_sys    uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_sym  := OLD.symbol; v_user := OLD.user_id; v_ref := OLD.id::text;
    d_avail  := -COALESCE(OLD.balance, 0);
    d_locked := -COALESCE(OLD.locked_balance, 0);
    d_fut    := -COALESCE(OLD.futures_balance, 0);
  ELSIF TG_OP = 'INSERT' THEN
    v_sym  := NEW.symbol; v_user := NEW.user_id; v_ref := NEW.id::text;
    d_avail  := COALESCE(NEW.balance, 0);
    d_locked := COALESCE(NEW.locked_balance, 0);
    d_fut    := COALESCE(NEW.futures_balance, 0);
  ELSE
    v_sym  := NEW.symbol; v_user := NEW.user_id; v_ref := NEW.id::text;
    d_avail  := COALESCE(NEW.balance, 0)         - COALESCE(OLD.balance, 0);
    d_locked := COALESCE(NEW.locked_balance, 0)  - COALESCE(OLD.locked_balance, 0);
    d_fut    := COALESCE(NEW.futures_balance, 0) - COALESCE(OLD.futures_balance, 0);
  END IF;

  IF NOT ledger_is_monetary(v_sym) THEN
    RETURN NULL;
  END IF;
  IF d_avail = 0 AND d_locked = 0 AND d_fut = 0 THEN
    RETURN NULL;
  END IF;

  v_ctx := COALESCE(NULLIF(current_setting('app.ledger_ctx', true), ''), 'unattributed');

  INSERT INTO ledger_journal (entry_type, ref_type, ref_id, description)
  VALUES ('balance_change:' || lower(TG_OP), 'user_balances', v_ref, v_ctx)
  RETURNING id INTO v_jid;

  v_sys := ledger_account_id('system', NULL, v_sym, 'platform');

  IF d_avail <> 0 THEN
    INSERT INTO ledger_postings (journal_id, account_id, symbol, amount) VALUES
      (v_jid, ledger_account_id('user', v_user, v_sym, 'avail'), v_sym, d_avail),
      (v_jid, v_sys, v_sym, -d_avail);
  END IF;
  IF d_locked <> 0 THEN
    INSERT INTO ledger_postings (journal_id, account_id, symbol, amount) VALUES
      (v_jid, ledger_account_id('user', v_user, v_sym, 'locked'), v_sym, d_locked),
      (v_jid, v_sys, v_sym, -d_locked);
  END IF;
  IF d_fut <> 0 THEN
    INSERT INTO ledger_postings (journal_id, account_id, symbol, amount) VALUES
      (v_jid, ledger_account_id('user', v_user, v_sym, 'fut'), v_sym, d_fut),
      (v_jid, v_sys, v_sym, -d_fut);
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_ledger_capture ON user_balances;
CREATE TRIGGER trg_ledger_capture
  AFTER INSERT OR UPDATE OR DELETE ON user_balances
  FOR EACH ROW EXECUTE FUNCTION ledger_capture_balance_change();

-- ---------- 7. Reconciliation ----------
-- Compares ledger-derived balances against live user_balances.
-- Any row returned = discrepancy that must be investigated.

CREATE OR REPLACE FUNCTION ledger_reconcile()
RETURNS TABLE (user_id uuid, symbol text, subtype text, ledger_sum numeric, live_value numeric, diff numeric)
LANGUAGE sql STABLE AS $$
  WITH ledger_side AS (
    SELECT a.user_id, a.symbol, a.subtype, sum(p.amount) AS ledger_sum
    FROM ledger_postings p
    JOIN ledger_accounts a ON a.id = p.account_id
    WHERE a.kind = 'user'
    GROUP BY a.user_id, a.symbol, a.subtype
  ),
  live_side AS (
    SELECT ub.user_id, ub.symbol, x.subtype, sum(x.val) AS live_value
    FROM user_balances ub
    CROSS JOIN LATERAL (VALUES
      ('avail',  COALESCE(ub.balance, 0)),
      ('locked', COALESCE(ub.locked_balance, 0)),
      ('fut',    COALESCE(ub.futures_balance, 0))
    ) AS x(subtype, val)
    WHERE ledger_is_monetary(ub.symbol)
    GROUP BY ub.user_id, ub.symbol, x.subtype
  )
  SELECT
    COALESCE(l.user_id, v.user_id),
    COALESCE(l.symbol,  v.symbol),
    COALESCE(l.subtype, v.subtype),
    COALESCE(l.ledger_sum, 0),
    COALESCE(v.live_value, 0),
    COALESCE(l.ledger_sum, 0) - COALESCE(v.live_value, 0)
  FROM ledger_side l
  FULL OUTER JOIN live_side v
    ON v.user_id = l.user_id AND v.symbol = l.symbol AND v.subtype = l.subtype
  WHERE COALESCE(l.ledger_sum, 0) <> COALESCE(v.live_value, 0)
$$;

-- ---------- 8. Lock down (service_role only) ----------

ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_journal  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_postings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ledger_accounts, ledger_journal, ledger_postings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ledger_reconcile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ledger_account_id(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ledger_accounts, ledger_journal, ledger_postings TO service_role;
GRANT EXECUTE ON FUNCTION ledger_reconcile() TO service_role;

-- ---------- 6. Backfill opening balances ----------

DO $$
DECLARE
  v_jid uuid;
  r record;
  v_sys uuid;
  v_total numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_journal WHERE entry_type = 'opening_balance') THEN
    RAISE NOTICE 'opening balances already backfilled, skipping';
    RETURN;
  END IF;

  INSERT INTO ledger_journal (entry_type, ref_type, description)
  VALUES ('opening_balance', 'backfill', 'Opening balances captured at ledger go-live')
  RETURNING id INTO v_jid;

  FOR r IN
    SELECT user_id, symbol,
           COALESCE(balance,0) AS b, COALESCE(locked_balance,0) AS l, COALESCE(futures_balance,0) AS f
    FROM user_balances
    WHERE ledger_is_monetary(symbol)
      AND (COALESCE(balance,0) <> 0 OR COALESCE(locked_balance,0) <> 0 OR COALESCE(futures_balance,0) <> 0)
  LOOP
    v_sys := ledger_account_id('system', NULL, r.symbol, 'opening');
    IF r.b <> 0 THEN
      INSERT INTO ledger_postings (journal_id, account_id, symbol, amount) VALUES
        (v_jid, ledger_account_id('user', r.user_id, r.symbol, 'avail'), r.symbol, r.b),
        (v_jid, v_sys, r.symbol, -r.b);
    END IF;
    IF r.l <> 0 THEN
      INSERT INTO ledger_postings (journal_id, account_id, symbol, amount) VALUES
        (v_jid, ledger_account_id('user', r.user_id, r.symbol, 'locked'), r.symbol, r.l),
        (v_jid, v_sys, r.symbol, -r.l);
    END IF;
    IF r.f <> 0 THEN
      INSERT INTO ledger_postings (journal_id, account_id, symbol, amount) VALUES
        (v_jid, ledger_account_id('user', r.user_id, r.symbol, 'fut'), r.symbol, r.f),
        (v_jid, v_sys, r.symbol, -r.f);
    END IF;
  END LOOP;
END $$;

