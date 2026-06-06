---
name: Desktop futures BDEX non-parity
description: Why the desktop futures terminal hardcodes BDEX exclusion instead of mirroring mobile's conditional isBDex branch.
---

The desktop futures `loadPositions()` always excludes `BDEX_%` symbols, unlike mobile
`FuturesPage.loadPositions()` which is conditional on `isBDex` (includes `BDEX_%` only when
viewing the BDEX market).

**Why:** The desktop terminal has NO BDEX market UI. Its market list comes from
`supported_coins`, which never yields `BDEX_*` symbols, so desktop can neither open nor need
to close BDEX positions. Always taking mobile's non-BDEX branch is therefore exact parity for
every symbol desktop can actually trade. BDEX positions remain fully managed on mobile.

**How to apply:** If a BDEX (or any "special market mode") desktop view is ever added, this
filter must become conditional like mobile, or those positions will be invisible/unmanageable
on desktop. Until then the hardcoded exclusion is correct and intentional — don't "fix" it.
