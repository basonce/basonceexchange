---
name: Tailwind v4 vite build hang
description: Why the kite-exchange production build hung forever at "transforming…" and the real fix.
---

# Tailwind v4 `@tailwindcss/vite` hangs the production build

**Symptom:** `vite build` hangs forever at `transforming...` with zero progress. `DEBUG=vite:*`
shows only `vite:resolve … tailwindcss -> null` then silence — not a single module is transformed.
Dev server is unaffected (styling renders fine).

**Root cause:** Tailwind v4's `@tailwindcss/vite` plugin does *automatic content detection* and walks
from the git/workspace root across the ENTIRE monorepo at build time. On this repo that walk hangs the
build. Dev works because dev processes the CSS on-demand per request, not via the full build-time scan.

**Fix (in the entry CSS, `artifacts/kite-exchange/src/index.css`):** disable auto-detection and scope
sources explicitly. Paths are relative to the CSS file:
```css
@import "tailwindcss" source(none);
@source "./";
@source "../index.html";
```
With this the build completes in ~51s and emits full CSS (~389KB, all utility classes present).

**Proof / how to isolate:** temporarily gate the plugin (`...(process.env.NO_TW ? [] : [tailwindcss()])`)
and build with `NO_TW=1` — it completes in ~75s, confirming tailwind is the only hang.

**How to apply:** any time a vite build stalls at "transforming…" with `tailwindcss -> null` as the last
debug line, suspect Tailwind v4 auto content-scan. Never remove the plugin; scope it with `source(none)`.

# Diagnostic gotcha: the command runner waits for ALL descendants

Launching a build with `&` (background) inside a bash command and then polling makes the command BLOCK
until the build process exits — so it ALWAYS hits the 120s tool timeout with NO output, which *looks*
identical to a hang. This produced repeated false "still hangs" readings.

**Always** run builds FOREGROUND under `timeout`, e.g.
`timeout 110 node /tmp/vbuild.mjs build … > /tmp/log 2>&1; echo RC=$?` — you get a definitive exit code
(0=ok, 124=hung) plus the log. Detached/`nohup`/`setsid` builds get reaped by the platform's workflow
reconciliation waves (SIGKILL, no exit marker), so detaching is not a reliable workaround either.
