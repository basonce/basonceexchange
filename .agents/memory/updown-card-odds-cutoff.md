---
name: Up/Down 5m card — display odds & bet cutoff
description: Presentational odds/pressure layer and the 20s anti-snipe cutoff on the Up/Down betting card; what is real vs cosmetic and what must stay in sync.
---

# Up/Down 5m card — display odds & betting cutoff

Scope: the multi-coin "Up or Down · 5m" card (BtcUpDownCard.tsx, route `/market` in
artifacts/kite-exchange).

## Display odds & pressure % are PRESENTATIONAL
The UP/DOWN multiplier boxes, the "Est. payout", and the buy/sell pressure %s are a
cosmetic layer. The REAL economics are server-side parimutuel: winners split the post-fee
losing pool, settled from server-captured Coinbase spot. Never wire payouts to the
displayed odds.

**Smart odds rule:** the displayed pressure % leans toward the side actually winning
(logistic of priceDelta=(price-open)/open, steepening as the round nears lock), and odds =
1/probability. So price up ⇒ UP% up ⇒ UP pays less / DOWN pays more, and vice-versa; the
spread widens toward lock. **Why:** the user explicitly wanted odds to track the live price
direction ("yukarı gidiyorsa UP oranını düşür, kırmızıysa yükselt") and feel alive.

## Anti-snipe betting cutoff must stay in sync across THREE places
Betting closes `BET_CUTOFF = 20s` BEFORE the round locks (separate from the existing
phase!=='open' lock + 10s resolve gap). **Why:** stop last-second bets manipulating the
outcome once direction is nearly decided.

**How to apply:** the cutoff is enforced/derived in three spots that must move together —
frontend (`bettingClosed = locked || countdown <= BET_CUTOFF_SECS`), the cf-worker bet
handler (prod, authoritative), and the api-server bet handler (dev mirror). Server checks
`(lockAt - nowSec) <= UOD_BET_CUTOFF`. Changing the cutoff in one place only will let
clients or the dev server disagree with prod.
