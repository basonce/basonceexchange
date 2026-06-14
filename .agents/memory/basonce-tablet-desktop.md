---
name: basonce tablet shows web layout
description: How tablets are forced to the desktop ("web") layout instead of the mobile layout.
---

# Tablets must render the desktop/web layout, never mobile

**Requirement (owner is emphatic):** opening basonce.com on a tablet must show the full
desktop "web" layout, never the mobile layout — in any orientation.

**Mechanism:** the mobile-vs-desktop switch keys off `window.innerWidth >= 1024`
(`useIsDesktop` hook + `isDesktopViewport()` in App.tsx). Tablets in portrait are
narrower than 1024 so they used to get mobile.

**Fix (no React change needed):** an inline script in `index.html` (runs before the bundle)
detects tablets by UA (iPad incl. iPadOS-as-Mac+touch, Android non-"Mobile", Tablet/Silk/Kindle)
and, when the hardware short side < 1024, sets the viewport meta to `width=1024`. The browser
then renders the full web layout scaled to fit → `innerWidth` reports 1024 → existing breakpoint
logic returns desktop, and there is NO horizontal overflow (browser scales the 1024 layout down).

**Why hardware screen size, not innerWidth:** basing the decision on the meta-affected
`innerWidth` causes a resize feedback loop (set 1024 → innerWidth=1024 → revert → flicker).
Use `screen.width/height` + orientation media query (stable, hardware values).

**How to apply:** phones are intentionally left on `width=device-width` (mobile layout).
Only tablets get the viewport override. Re-applied on `orientationchange`.

**Deploy note:** this change is HTML-only, so the built JS chunk hash does NOT change. The
deploy.sh chunk-hash oracle will pass trivially — to confirm an HTML-only change is actually
live, `curl https://basonce.com/?_cb=$RANDOM | grep width=1024`, not just the chunk hash.
