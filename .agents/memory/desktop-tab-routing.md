---
name: kite-exchange desktop tab routing
description: How desktop pages are routed and the whitelist any new tab must join.
---

# Desktop tab routing (kite-exchange / basonce)

Desktop pages render by a single `tab` value resolved from the URL hash in
`artifacts/kite-exchange/src/App.tsx`. A `VALID_TABS` Set gates which hashes map
to a tab.

**Rule:** any NEW desktop tab (added in `DesktopNav.tsx` DeskTab + a render
branch in `DesktopApp.tsx`) MUST also be added to `VALID_TABS` in `App.tsx`.

**Why:** if a tab is missing from `VALID_TABS`, clicking the nav item sets the
hash but the resolver returns `home`, so the page flashes then resets to home
(navigation silently fails, deep-links 404 to home).

**How to apply:** when wiring a desktop page, edit three places in lockstep —
`DesktopNav` (DeskTab + menu item), `DesktopApp` (lazy import + render branch +
PAGE_LABELS), and `App.tsx` `VALID_TABS`.
