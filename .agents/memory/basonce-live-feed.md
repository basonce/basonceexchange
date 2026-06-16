---
name: basoncescan live feed freshness
description: Why the BasonceScan home "Latest Blocks/Transactions" feeds can look frozen, and the two things that must stay aligned.
---

The mock chain in `artifacts/basoncescan/src/lib/chain/mock-data.ts` grows two in-memory
arrays via a module-level `setInterval` (3s) and broadcasts `new_block`/`new_transaction`
events. The home feeds read these via React Query.

Two independent things must hold for the feeds to look live:

1. **Query freshness.** `useLatestBlocks`/`useLatestTransactions` need `refetchInterval`
   (3s) AND/OR the live optimistic updater must touch the *same* query keys the UI uses.
   The home uses count=6; an older optimistic updater hard-coded count=10, so the count=6
   query never updated and the feed froze. Use `setQueriesData({ queryKey: ['latestBlocks'] })`
   (prefix match, count-agnostic) rather than a count-specific `setQueryData`.

2. **Seed recency.** Seed blocks are timestamped from `START_TIME`. If `START_TIME` is far
   in the past (e.g. now-24h), the *first paint* shows "24 hours ago" for every row until the
   first live tick. Anchor `START_TIME` so the newest seed block lands ~now
   (`Date.now() - 50 * 3000` for 50 blocks at 3s spacing).

**Why:** an "extreme perfectionist" rebrand task; a live block explorer that shows stale
"24 hours ago" on load reads as broken even though data is technically correct.
