---
name: TON upgrade front-run prevention
description: Why/how on-chain box-upgrade payments are bound to a single user to stop payment hijack.
---

# On-chain payment must be bound to a user via a server-reserved unique amount

**Rule:** never credit an on-chain (TON) payment to whoever claims it. Before payment, issue a server-side "purchase intent" that reserves a UNIQUE expected amount for one `telegram_user_id`; verification matches that exact amount.

**Why:** the original design let the client send a `sender_address` and the server credited the first matching incoming tx. An attacker watching the mempool/chain could call the claim endpoint with a victim's payment and steal the upgrade — a money-safety critical flagged in review.

**How to apply (the pattern that passed review):**
- Reserve amount on a fixed grid: `expected = base_price + k*GRID` (GRID = 0.0001 TON, k in 1..200, cap surcharge ~0.02 TON). Box base prices are integer TON and tier ranges don't overlap, so an amount maps to exactly one tier+intent.
- Enforce uniqueness of ACTIVE reservations with a partial unique index on `expected_nano WHERE status='pending'`. Expire stale pending intents first to free amounts.
- The claim/verify endpoint takes an `intent_id` (NOT a sender address): enforce owner match (403), pending status (409), not expired (410), then match the EXACT reserved amount within a time window (tolerance < GRID/2, e.g. ±0.00004 TON).
- Double-spend of the same tx is independently prevented by a UNIQUE constraint on the recorded `tx_hash` in an atomic upgrade RPC.

**Residual (accepted, non-critical):** intent consumption (marking `status='consumed'`) is best-effort/non-atomic with the upgrade RPC. Worst case is a reserved amount stays pending until expiry; it does NOT enable third-party hijack or double-credit (tx_hash uniqueness). Harden later by moving consume+validate into one RPC if revisited.
