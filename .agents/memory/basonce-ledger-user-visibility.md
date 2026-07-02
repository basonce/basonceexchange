---
name: basonce ledger user visibility & 2026-07-02 reset
description: Per-user ledger read access (RLS + UI) and the one-time fake-data ledger reset.
---

# Ledger is user-visible

- Users see their own ledger via the "Ledger" filter tab in `AssetsHistoryModal` (shared by mobile AssetsPage and DesktopAssets — one integration covers web+mobile). Component: `UserLedger.tsx`.
- RLS self-read policies exist on all three ledger tables: `*_self_read` (accounts by `user_id = auth.uid()`, postings via own account, journal via own postings). Admin-read policies remain separate.
- PostgREST query shape that works: `ledger_postings?select=...,ledger_accounts!inner(subtype,user_id),ledger_journal!inner(entry_type,description)` + `.eq('ledger_accounts.user_id', uid)`.
- Realtime subscription must be scoped with `filter: account_id=in.(<own account ids>)` — a broad table-wide channel was flagged in review as churn/exposure risk.

# 2026-07-02 ledger reset (one-time remediation)

- `user_balances` contained 209 ghost user_ids (815 rows, ~3.8M fake USDT) not present in `auth.users` — old demo/seed data. Deleted with `trg_ledger_capture` disabled.
- Ledger tables were truncated with immutability triggers temporarily disabled, then rebuilt as a single `opening_balance` journal from clean balances (real users only). Verified: per-symbol zero-sum, `ledger_reconcile()` empty.
- **Why:** owner demanded zero fake data before opening the ledger to users; reset predates any user-visible history so no real history was lost.
- **How to apply:** never repeat this on a live ledger — future corrections must be reversal entries. If auditors ask about the discontinuity, this is the documented go-live reset.
- Gotcha: `user_profiles.user_id` is bigint, not uuid — join real users via `auth.users.id`.
