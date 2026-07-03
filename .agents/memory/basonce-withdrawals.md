---
name: basonce withdrawal flow
description: How user withdrawals are recorded atomically and the RLS-silent-failure lesson behind it.
---

# basonce withdrawals

- All user withdrawal submissions go through the Postgres RPC `public.request_withdrawal(...)` (SECURITY INVOKER, locked to `authenticated`+`service_role`, PUBLIC/anon execute revoked). It debits `user_balances` with an atomic conditional `balance >= amount` update, handles the optional USDT service fee, and inserts the `withdrawal_transactions` row in ONE transaction. Never reintroduce client-side insert + absolute balance writes.
- **Why:** the old flow inserted with a client `txid`, which the `wt_insert` RLS policy rejects (`txid IS NULL` required). The insert error was unchecked, so the balance was deducted, a fake success screen shown, and no withdrawal row ever appeared — withdrawals silently vanished for months and the admin audit panel looked "broken" (it was just empty).
- **How to apply:** any new money-moving client flow must (1) check every Supabase error, (2) use a single atomic RPC with a conditional-debit guard instead of read-then-write absolute balance updates, (3) never include admin-only columns (txid, approved_by, reviewed_by, completed_at) in user inserts.
- `wt_insert` RLS with_check: `user_id=auth.uid() AND amount>0 AND status IN (pending,hold) AND txid/approved_by/reviewed_by/completed_at NULL`.
- `user_balances` and `transactions` have allow-all RLS policies (pre-existing hole; the RPC's guards are the real protection). Worth tightening someday.
- NOWPayments deposit map: worker `NOWPAY_CUR` (98 pairs) must stay in sync with the shared frontend module `src/lib/nowpay-supported.ts` (single source of truth imported by RealDepositModal + NetworkSelector). Pairs were GENERATED from NOWPayments `/v1/full-currencies` (enable + available_for_payment, extra_id coins excluded). Both sides uppercase network codes so DB 'Polygon' → 'POLYGON'.
- Deposit UI: every coin goes through NetworkSelector, which shows ONLY address-capable networks (filtered by the shared set, deduped) and falls back to the full DB list when none are supported. Never reintroduce the "altcoin → mock BEP20" shortcut — it made all new mappings unreachable and showed users a dead-end error.
- `supported_networks` DB rows for the address-capable native networks were inserted with sort_order=0 so supported networks list first.
