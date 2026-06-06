---
name: StrictMode async data-effect flag bug
description: Why async useEffect data loaders in kite-exchange must not gate setState on a cleanup flag
---

# StrictMode async-effect "empty state" trap

In kite-exchange (React 18 + Vite dev = StrictMode on), an async `useEffect` that
loads data and then calls `setMarkets(...)` MUST NOT skip the initial `setState`
based on a `let active = true; return () => { active = false }` cleanup flag.

**Why:** StrictMode dev double-invokes effects: run #1 → cleanup #1 (sets
`active=false`) → run #2. If run #1 is mid-`await` when cleanup #1 fires, the
post-await `if (!active) return;` aborts and the very first `setState` never
happens. The singleton caches (PriceCache, coin managers) are already warm, so
run #2 may also bail, leaving permanently-empty UI (skeletons forever). Works in
prod (no StrictMode) but breaks the dev preview and is fragile.

**How to apply:** Let the initial data `setState` run unconditionally after the
await. Only use the cleanup flag to suppress *late/interval* updates
(setInterval callbacks, polling, CoinGecko refresh) and to clear timers in
cleanup. Setting state on an unmounted component is a no-op in React 18, so the
initial set is safe.
