---
name: basonce deposit credit signal
description: How a confirmed crypto deposit is observable client-side in the kite-exchange app
---

# Deposit credit signal (kite-exchange / basonce.com)

There is **no unified transactions row** the client can watch for a real deposit.
The primary deposit path (NOWPayments IPN, in `cf-worker/_worker.js`) credits a user by:
1. INSERTing an idempotency **sentinel row into `user_balances`** with `symbol = "NOWPAY_<paymentId>"` and `balance = <amount paid>`,
2. then bumping the user's `USDT` balance row.
It does **not** write to `transactions`, `wallet_transactions`, or `blockchain_transactions`.

**How to apply:** To detect a confirmed deposit on the client (e.g. fire analytics/ads
conversions), subscribe to Supabase realtime `postgres_changes` INSERT on `user_balances`
filtered `user_id=eq.{id}` and match `symbol.startsWith('NOWPAY_')`; the amount is `row.balance`.
Dedupe by `symbol` (per-payment unique). This only fires while the user is on-site — crypto
deposits confirm asynchronously, so offline depositors are missed. Full coverage would need a
server-side Google Ads offline-conversion upload (gclid capture + Ads API), deferred as future work.

**Why:** Balances also rise from wins/mining/bonuses, so raw USDT balance is not a deposit signal;
the `NOWPAY_` sentinel is the only clean, deposit-specific, amount-bearing event.

Balances are USDT, treated as ≈ USD (invoices created in USD), so ads value/currency uses USD, not TRY.
