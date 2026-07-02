---
name: NOWPayments deposits & payouts (basonce)
description: Gotchas for NOWPayments address-deposits and real payouts, plus PostgREST atomic-claim/CAS patterns used to make them money-safe.
---

## Payout auth
- Payouts (`/v1/payout`) require an ACCOUNT JWT from `/v1/auth` (NOWPAYMENTS_EMAIL/PASSWORD) — the API key alone is not accepted for outbound money.
- If the NOWPayments account has IP whitelisting enabled, `/v1/auth` returns 403 `ACCESS_DENIED` from Cloudflare Workers (egress IPs vary). User must disable IP whitelist (Settings → Payments/API) and possibly 2FA-on-payout for API payouts to work.

## Address deposits
- Per-user deposit addresses are created as regular payments with a tiny reference price; real user deposits therefore arrive mostly as `partially_paid` (or `finished`) IPNs — MUST credit on `partially_paid` for address deposits, keyed by an order_id prefix (`bscd:`).
- Same payment can progress `partially_paid` → `finished` with a higher `actually_paid`; credit only the delta.

## Money-safety patterns (PostgREST, no RPC needed)
- **Atomic claim before external money call:** conditional `PATCH ...?id=eq.X&status=eq.completed&payout_batch_id=is.null&payout_status=is.null` with `Prefer: return=representation`, setting `payout_status='initiating'`. Zero rows returned = another caller won; return 409. Release the claim (set back to null, guarded by `payout_batch_id=is.null`) on any downstream failure so retry is possible.
- **CAS for delta-credit idempotency:** sentinel row `NOWPAY_<paymentId>` in user_balances stores total credited; delta update uses `PATCH ...&balance=eq.<raw value read>` with return=representation — zero rows = lost race = dedup. Use the raw string value from the read in the eq filter to avoid float-format mismatches.
- **Why:** Cloudflare worker + Supabase REST has no transactions; check-then-act on money paths double-sends/double-credits under concurrent IPN retries or double-clicks.
- Admin money endpoints must verify a real Supabase JWT (`/auth/v1/user`) AND that the authed uid is in the admin set — `x-requester-id` header alone is spoofable.

## Known remaining exposure
- admin-monitor `src/lib/admin-api.ts` contains a hardcoded Supabase service-role key in frontend code (pre-existing; admin-monitor is dev-preview only, never deployed publicly — but never deploy it as-is).
