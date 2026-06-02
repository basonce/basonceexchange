---
name: Sweet Candy (bonanza) hit-rate vs RTP tuning
description: Why raising win frequency in the tumble slot explodes RTP, and how to retune safely
---

# Bonanza (Sweet Candy) hit-rate ↔ RTP coupling

The 6x5 pay-anywhere **tumble** slot in `artifacts/kite-exchange/cf-worker/_worker.js`
(constants `BONANZA_*`, engine `bonanzaSpin`/`bonanzaPlay`) has hit-frequency and RTP
**very steeply coupled** — they cannot be tuned independently.

**Why:** a win removes ALL copies of a symbol and refills from the *same* weighted
distribution, so concentrating weight on a symbol makes it re-win on the refill →
long cascades. Free spins multiply every winning free spin by the multiplier-bomb sum,
amplifying frequent wins further. Net effect: pushing hit-rate up by concentrating
weights makes average payout balloon (e.g. ~67% hit ≈ 95% RTP, but ~80% hit ≈ 240% RTP,
~86% ≈ 320%+). The 1000x per-round cap does NOT save you — average payout still hits
tens of x. Concentrating onto one dominant symbol = runaway (96x+ avg) and slow CPU.

**How to tune safely (validated approach):**
1. Build a standalone Monte-Carlo harness that copies the exact engine (use `Math.random`),
   add a `MAX_TUMBLES` guard to detect runaway, run 200k–600k rounds. Report
   `hit% (payout>0)` and `RTP% (avg payout)`.
2. **Pin the weight vector** to land the target hit-rate, then **scale ALL pay values
   by a single factor** to bring RTP into the safe band (target ~90–95%, house edge intact).
   Pays move RTP without moving hit-rate; weights move both.
3. Also reduce scatter-pay and tame multiplier-bomb weights (`BONANZA_MW`) — free spins
   are the biggest RTP amplifier at high hit-rate.

**Current promotional profile (operator wants players winning often):** weights
concentrated on low-pay candies → ~73.5% hit, ~94% RTP, max ~16 tumbles, zero 1000x caps
over 600k sim rounds. Client `PAYTABLE` in `BonanzaGame.tsx` must be kept in sync with the
worker's 12+ pay tier whenever pays change.

**Money-safety for auto-spin:** any continuous auto-spin loop on a real-money game MUST
stop on unmount — guard with a `mountedRef` (set false in the init-effect cleanup, also set
`autoRef.current=false`), check it in the loop AND inside the spin fn before/after the
network call, or the loop keeps placing bets after the user navigates away.
