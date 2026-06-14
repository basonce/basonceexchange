---
name: basonce runtime DOM i18n translator
description: Design constraints for the AutoTranslate runtime DOM translator that auto-localizes the whole exchange UI.
---

# Runtime DOM auto-translator (AutoTranslate.tsx)

The exchange is localized at runtime by walking the live DOM and replacing text
nodes/attributes whose text exactly matches a curated English-label dictionary
(generated per language into `locales-auto/<code>.json`). Site always opens in
English; the translator only runs when the active lang !== 'en'.

**Why exact-match is safe:** keys are harvested English UI labels only. Dynamic
content (prices, tickers, balances, coin names, user input) never matches a key,
so it is left untouched automatically — no per-field opt-out needed.

## Non-obvious constraints (each caused a real bug/perf issue)

- **Lookup key MUST mirror the extractor's normalization.** The extractor
  collapses internal whitespace (`\s+ -> ' '`); the runtime must collapse the
  same way before dictionary lookup, or multi-space / multi-line JSX strings
  silently fail to match and stay untranslated.
- **Cache the source AND the value we last wrote, per node.** React reuses DOM
  nodes and rewrites their text; a cache that stores only the original source
  goes stale and produces wrong translations / wrong restore-to-English. Trust
  the cached source only when the node still shows exactly what we wrote
  (`rec.out === currentValue`); otherwise treat the current value as a fresh
  source.
- **Translate mutation-targeted, not full-body.** Rescanning `document.body` on
  every mutation janks a live trading UI (prices tick constantly). Collect only
  changed/added nodes from the MutationObserver, batch via `requestAnimationFrame`,
  and walk just those subtrees. Disconnect the observer while writing, reconnect
  after, to avoid self-retrigger.
- **Always do one full pass on mount and on language change** (including switch
  back to English, which restores originals) before falling back to incremental.

**How to apply:** any change to `i18n-extract.mjs` normalization must be mirrored
in `AutoTranslate.tsx` `keyOf()`, and vice versa, or coverage silently drops.
