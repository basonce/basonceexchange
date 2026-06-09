---
name: basonce desktop Sports view
description: How the kite-exchange desktop Sports page is composed and where goal sound comes from.
---

Desktop Sports (basonce) renders the EXACT mobile `GamesSection` component
(no `variant` prop) inside a widened centered frame in `DesktopApp.tsx`'s
`DesktopSports` wrapper. There is intentionally NO separate desktop sportsbook
layout — an earlier wide "Binance-style" desktop redesign was scrapped because
the user preferred the mobile look; just widen the mobile UI for web.

**Why:** user explicitly cancelled the custom desktop sportsbook and asked for
the mobile design 1:1 but wider/more usable on web.

Goal sound is DESKTOP-ONLY and lives in `DesktopSportsFx.tsx`, a hidden
(`return null`) engine that polls `/api/sport/snapshot` and plays only the goal
sfx on a real score increase. It exists separately because the mobile
`GamesSection` has NO audio of its own — do not add audio into GamesSection or
it will play on real mobile too. User wants ONLY the goal sound (no whistle, no
card alerts, no ticker).
