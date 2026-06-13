---
name: More pages bespoke architecture
description: How the 16 Basonce "More" (Daha Fazla) menu landing pages are structured and routed.
---

Each of the 16 "More" menu slugs (vip, affiliate, referral, junior, launchpool, megadrop, miningpool, aipro, pay, nft, fantoken, wallet, chain, academy, charity, travelrule) has its OWN bespoke, visually-distinct page component under `desktop/pages/more/<Name>Page.tsx`. They are intentionally NOT one shared template — the user (perfectionist) explicitly rejected the old single generic template (`DesktopMorePage.tsx`) because every page looked identical.

**Routing:** `DesktopApp` resolves `MORE_PAGE_COMPONENTS[tab]` (from `more/index.ts`) first, then falls back to the legacy `DesktopMorePage` template only if a slug is missing. Each page default-exports `({ onNavigate }: MorePageProps)` from `more/types.ts`; primary CTAs call `openAuthRegister()`, secondary CTAs call `onNavigate(secondaryTab)`.

**Why:** Factual copy still lives centrally in `morePagesData.tsx` (`MORE_PAGES[slug]`) and each bespoke page reads its own slug from there — keep content edits in that one file, presentation in the per-slug component.

**How to apply:** When adding/editing a More page, edit only its own `more/<Name>Page.tsx` (+ copy in `morePagesData.tsx`). Hard brand rules enforced on every page: English-only UI, NO emojis, lucide `Sparkles` BANNED, no horizontal overflow (name cols `min-w-0 truncate`, numeric `whitespace-nowrap tabular-nums`). Each page must stay structurally different from the others.
