-- 013: ledger_check_journal_balanced must run as SECURITY DEFINER.
--
-- Root cause: the deferred constraint trigger trg_ledger_balanced fires at COMMIT
-- with the *caller's* role (e.g. authenticated). RLS on ledger_postings only lets a
-- user see postings for their own accounts, so the system counter-posting is
-- invisible to the check -> sum(amount) appears non-zero -> "unbalanced journal"
-- error on perfectly balanced journals. This broke mining_collect (and any other
-- balance mutation performed directly by an authenticated-role RPC).
--
-- Fix: run the integrity check with definer privileges so it sees ALL postings.

ALTER FUNCTION ledger_check_journal_balanced()
  SECURITY DEFINER
  SET search_path = public;

REVOKE EXECUTE ON FUNCTION ledger_check_journal_balanced() FROM PUBLIC, anon, authenticated;

-- Also: user_profiles.current_mining_level was referenced by the frontend
-- (ShopTab / DesktopMiningPage) and by mining_buy_equipment, but the column
-- never existed in the live schema -> mining_buy_equipment failed with 42703.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_mining_level integer DEFAULT 0;
