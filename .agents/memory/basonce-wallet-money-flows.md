---
name: Basonce Wallet money flows
description: How the standalone custodial Basonce Wallet moves money and the duplicate-balance-row hazard shared with kite-exchange.
---

# Basonce Wallet money flows

Standalone custodial wallet artifact (`artifacts/basonce-wallet`) sharing the kite-exchange Supabase backend.

## user_balances has NO unique (user_id, symbol) constraint
A user can have multiple rows for the same symbol. Any balance read MUST aggregate
all live (`is_deleted != true`) rows, and any balance WRITE must target a specific
row `id` — never `.update().eq('user_id').eq('symbol')`, which writes the same value
into every duplicate row and inflates/corrupts the total.

**Why:** A withdraw bug shipped that aggregated correctly for the check but then wrote
`newBalance` to all duplicate rows by symbol (50+50, withdraw 10 → both set to 90 = 180 total).

**How to apply:** On debit, put the post-debit total on the primary row and zero the
duplicates; on rollback, restore the full pre-debit total onto the primary row. The
service_role transfer RPC already consolidates duplicates server-side — mirror that.

## Send vs Withdraw trust boundaries
- **Send (user-to-user):** client → api-server `POST /api/wallet/transfer` (validates JWT
  via admin.auth.getUser, resolves recipient server-side) → SECURITY DEFINER RPC
  `wallet_user_transfer` locked to service_role. The client can never move funds directly.
- **Withdraw:** intentionally mirrors kite's client-side flow (deduct balance + insert
  `withdrawal_transactions`, status `hold` if usdValue >= 500 else `pending`, best-effort
  admin notify). Not atomic server-side — accepted tradeoff to match the proven kite flow.

## Pre-existing hardcoded service-role key
`artifacts/api-server/src/lib/supabase-config.ts` hardcodes anon + service keys. This
predates the wallet and is the established ecosystem pattern; do not "fix" it as part of
wallet work unless explicitly asked.
