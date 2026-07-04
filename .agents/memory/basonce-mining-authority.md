---
name: basonce mining server authority
description: Mining is fully server-authoritative via RPCs; user_balances direct-write hole remains app-wide.
---

# Mining economy is server-authoritative (migrations 012 + 013)

- All mining money flows go through SECURITY DEFINER RPCs (`mining_start/stop/
  collect/buy_equipment/claim_free_equipment`); clients can only SELECT their
  own equipment rows; catalog is read-only; anon has no EXECUTE; `p_as_user`
  spoofing is ignored (uid always derived from JWT). Earnings math uses the
  server clock only — client timers are display-only.
- Free device: one-time claim, earns at $5/day rate with a 5h usage cap, then
  deactivates permanently (by design — pushes upgrade purchase).
- E2E test pattern that caught real bugs: log in as a real user via GoTrue
  password grant and call the RPCs through PostgREST (NOT via management API
  as postgres) — role-dependent failures (RLS, deferred triggers) only
  reproduce under the `authenticated` role.

## KNOWN REMAINING HOLE (app-wide, not mining)
`user_balances` RLS is still allow_all for authenticated: ~20 frontend files
(trading, futures, games, admin, deposits) legitimately write balances directly
from the client, so the table cannot be locked without migrating ALL those
flows to server RPCs first. A cheating user can still UPDATE their own balance
via PostgREST. Every such write IS captured in the ledger as 'unattributed',
so tampering is detectable after the fact. Closing this = separate project:
make trading/games/futures server-authoritative, then revoke client writes.
