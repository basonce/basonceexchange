---
name: Ledger deferred trigger vs RLS
description: Why deferred constraint triggers that read RLS-protected tables must be SECURITY DEFINER.
---

# Deferred constraint triggers run with the CALLER's role at COMMIT

The basonce ledger has a deferred constraint trigger on `ledger_postings` that
verifies each journal sums to zero. It worked for service-role/postgres callers
but failed with a false "unbalanced journal (off by <user amount>)" whenever an
`authenticated`-role session mutated `user_balances` (e.g. a SECURITY DEFINER
RPC called directly via PostgREST).

**Why:** the deferred trigger fires at COMMIT, *outside* the SECURITY DEFINER
function, so it executes with the session's role. RLS on `ledger_postings`
(self-read only) hid the system counter-posting from the check — it saw only
the user's posting and concluded the journal was unbalanced. With
`SET CONSTRAINTS ALL IMMEDIATE` the same check passed (it then ran inside the
definer context), which is the diagnostic tell.

**How to apply:** any trigger function (especially deferred ones) that reads
RLS-protected tables for integrity checks must be `SECURITY DEFINER` with a
pinned `search_path`. Fixed in kite-exchange migration 013. When a deferred
check fails only for non-privileged roles, suspect RLS row-hiding, not data
corruption.
