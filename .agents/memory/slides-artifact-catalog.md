---
name: Slides artifact catalog dependency
description: pnpm catalog gap that breaks fresh slides-artifact installs
---
A freshly scaffolded slides artifact's `package.json` lists `wouter: "catalog:"` (used by the App.tsx/main.tsx viewer contract), but `wouter` may be absent from the `catalog:` block in `pnpm-workspace.yaml`.

**Why:** `pnpm install` aborts with `ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC` when a `catalog:` reference has no catalog entry, blocking validate-slides / dev / build.

**How to apply:** If install fails on a slides deck, add the missing dep (e.g. `wouter: ^3.3.5`) to the catalog in `pnpm-workspace.yaml` rather than editing the scaffold's package.json or App.tsx (those are part of the slides contract).
