---
name: basonce Supabase admin access
description: How to run DB admin / get the real service-role key for the basonce Supabase project.
---

# Supabase admin for project `jfjjymprvjfltpvmfptj`

- The Replit env secrets `SUPABASE_*` (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`) can be **stale or point at the wrong project**. Do not assume the Replit `SUPABASE_SERVICE_ROLE_KEY` matches the live project.
- Run arbitrary SQL (DDL/DML) via the **Management API**:
  `POST https://api.supabase.com/v1/projects/jfjjymprvjfltpvmfptj/database/query`
  header `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`, body `{"query":"..."}`.
- Get the REAL service-role JWT for the project:
  `GET https://api.supabase.com/v1/projects/jfjjymprvjfltpvmfptj/api-keys?reveal=true` (Bearer `$SUPABASE_ACCESS_TOKEN`), then pick the key whose `name === "service_role"`.

**Why:** the dev environment's injected SUPABASE creds drifted from the live project; using them silently hits the wrong DB. The Management API + `?reveal=true` is the source of truth.

## Environment quirks

- The JS code-execution sandbox lacks `process.env` and `crypto.subtle`. For env access or HMAC/crypto (e.g. signing Telegram initData for tests), shell out via bash `node -e` / `node --input-type=module`. Never print secret values.
- App identity for basonce users is `user_profiles.id`, NOT `auth.users` — ~209/346 users (and their `user_balances`) are not in `auth.users`. Do not add FKs to `auth.users` for user references.
