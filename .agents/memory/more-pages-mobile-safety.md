---
name: Desktop "More" pages mobile-safety constraint
description: Why desktop-only More landing-page slugs must stay out of mobile VALID_TABS in kite-exchange.
---

The kite-exchange "More" mega-menu landing pages (vip, affiliate, referral,
junior, launchpool, megadrop, miningpool, aipro, pay, nft, fantoken, wallet,
chain, academy, charity, travelrule) are DESKTOP-ONLY. They render via
`DesktopApp` (`if (MORE_PAGES[tab]) return <DesktopMorePage>`), driven by the
`tab` prop which equals the shared `mobileTab` state in `App.tsx`.

**Rule:** Do NOT add these slugs to `VALID_TABS` in `App.tsx`.

**Why:** `getTabFromHash()` only resolves a hash/path to a tab if it is in
`VALID_TABS`. The mobile render branch in `App.tsx` has no `case` for these
slugs, so if one resolves on mobile (direct hash load), the user gets a blank
screen. Keeping them out of `VALID_TABS` makes mobile fall back to `home`.
In-app desktop navigation still works because the More menu calls
`onNavigate -> setMobileTab(slug)` directly, bypassing `VALID_TABS`.

**Tradeoff:** desktop direct deep-link/reload of e.g. `#vip` resolves to
`home`. If desktop deep-linking is ever required, add desktop-aware hash
parsing (a desktop-only allowlist) rather than putting slugs in the shared
`VALID_TABS`.
