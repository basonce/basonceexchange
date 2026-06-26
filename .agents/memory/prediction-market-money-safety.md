---
name: Basonce prediction-market money safety
description: Parimutuel settlement invariants for the Basonce Market (Polymarket-style) tab and its auto-resolver.
---

# Basonce Market parimutuel money safety

Pool betting with real USDT, auto-settled from Polymarket resolution. Basonce must
bear ZERO counterparty risk: total credited to winners must never exceed
`win_pool + lose_pool*(1 - fee)`.

## Settlement payout conservation (pm_settle_market)
Per-bet rounding of `(stake/win_pool)*dist` and summing can over-credit dust (up to
~0.5e-8 per winning bet), violating the zero-risk invariant. Fix: compute the post-fee
distributable pool `v_dist` ONCE, iterate winning bets `ORDER BY id`, and have the LAST
winner absorb the residual (`v_dist - shares_already_paid`) instead of its own rounded
formula. Clamp residual `< 0` to 0. This guarantees `SUM(shares) <= v_dist` exactly.

**Why:** EXTREME-perfectionist user + real money; "tiny dust" still breaks the stated
"Basonce zero risk" promise. **How to apply:** any future change to the per-bet payout
math must preserve the residual-absorbing last-winner step, or re-derive a conservation
guard. Edge cases already handled: no winners → refund all; no losers (`v_dist=0`) →
winners just get stakes back.

## Resolver coverage (pmSettleResolved in cf-worker/_worker.js)
A bare `?status=eq.open&limit=N` (no order/cursor) rescans the same first N markets
every cron run, so other open markets can NEVER settle → user funds stuck forever.
Fix: page through ALL open markets with an ascending **id cursor** (`order=id.asc` +
`id=gt.<lastId>`), advancing the cursor by the page's max id regardless of how many
rows settled mid-run (settled rows leave the open set; a cursor can't skip/loop where
limit/offset would). **How to apply:** keep cursor pagination for any "scan all open
markets" loop; never reintroduce fixed limit without a cursor.
