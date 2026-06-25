---
name: Futures client-side trigger engine
description: How stop orders & TP/SL are executed on the simulated exchange (no server engine) and the money-safety rules that execution MUST follow.
---

# Futures stop / TP-SL execution (kite-exchange)

The exchange is SIMULATED and has NO server-side matching/execution engine
(cron only scans deposits). Stop-limit / stop-market orders and TP/SL therefore
execute **client-side**: a loop polls mark prices (~4s) while the trade page is
open and, when a trigger is crossed, opens/closes the position through the same
audited paths used for manual orders (placeOrder / closePosition).

This exists independently for desktop (`src/desktop/...`) and mobile
(`src/pages/FuturesPage.tsx` + `TPSLModal.tsx`). Desktop must mirror mobile, not
import it.

Trigger math (canonical):
- Stop entry: buy fires `mark >= trigger`, sell fires `mark <= trigger`
- TP: long `mark >= trigger`, short `mark <= trigger`
- SL: long `mark <= trigger`, short `mark >= trigger`

## Money-safety rules (a client engine WILL double-fire without these)
**Why:** the loop re-evaluates every few seconds, the user may have multiple
tabs/devices, and `futures_orders` / `futures_tpsl_orders` are allow-all RLS, so
any client can mutate any matching row. Without guards a single trigger opens
duplicate positions / double-charges margin, or removes SL protection while the
position is still open.

**How to apply:**
1. **Atomic DB claim before executing a stop order.** Conditionally update
   `pending -> processing` scoped by `id` AND `user_id` AND `status='pending'`,
   `.select()` the row, and only proceed if exactly 1 row came back. On fill
   success set `filled`; on failure revert to `pending` (engine retries). This
   closes the open-then-record gap and blocks cross-tab double fills.
2. **Only retire TP/SL on confirmed close.** Mark rows `triggered` ONLY when
   `closePosition` returns `success === true`; otherwise leave them `active`.
3. **Scope every status mutation by `user_id`** (not just row id / position_id).
4. Keep a local `inFlight` ref guard too, but treat it as best-effort — the DB
   claim is the real cross-client guard.

Known limitation (out of scope, intentional): true safety needs RLS hardening or
a trusted server/RPC executor. The whole app runs on the allow-all client model;
changing it is cross-cutting and would touch mobile flows on the same tables.
