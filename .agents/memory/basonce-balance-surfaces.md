---
name: basonce balance display surfaces
description: keeping every "Est. Total Value" surface consistent with the Assets page
---

The user cross-checks balance numbers between surfaces and will treat any mismatch as a bug. Any new place that shows an "Est. Total Value" (e.g. the desktop header Wallet dropdown) must compute it the SAME way the Assets page headline does:

- Spot total = sum over user_balances rows of `balance * price`, with USDT priced at 1, EQ/EQL priced via `EarnQuestPriceManager.getInstance().getPrice()`, all other symbols via `PriceCache` (`getBySymbol(sym)` then `get(`${sym}USDT`)`). Skip sentinel rows (WELCOME_CHEST*).
- The Assets-page "Est. Total Value" is SPOT-ONLY (it does not add the futures wallet). Mirror that — do not silently add futures into the same headline.

**Why:** A header dropdown first shipped adding futures into the headline and summing `futures_balance` across rows, producing a total that diverged from the Assets page.

**How to apply:** `futures_balance` is a single account value stored ONLY on the USDT row — never sum it across rows; read it from the USDT row. Show futures as a separate sub-account line, not folded into the spot headline.
