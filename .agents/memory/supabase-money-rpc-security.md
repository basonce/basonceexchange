---
name: Supabase money RPC security
description: Why every balance-mutating Supabase RPC must be locked to service_role and self-validate.
---
Any `SECURITY DEFINER` Postgres function in Supabase is, by default, granted `EXECUTE` to
`PUBLIC` — meaning any logged-in user can call it directly via PostgREST
(`/rest/v1/rpc/<fn>`) with arbitrary arguments, bypassing your worker entirely.

**Rule:** for any RPC that moves real balances, do BOTH:
1. `REVOKE ALL ON FUNCTION <fn>(<exact-arg-types>) FROM PUBLIC, anon, authenticated;`
   then `GRANT EXECUTE ... TO service_role;` (the worker calls with the service role key).
2. Make the function self-validate and DERIVE money itself — never trust caller-supplied
   payout/amount. Recompute payout from bet*multiplier inside the function, clamp bet &
   multiplier to bounds, and enforce the symbol. So even a forged service-role caller
   can't mint balance.

**Why:** a casino RPC (`casino_play`) shipped accepting client-supplied `p_payout` and
`p_user_id` with the default PUBLIC grant — an authenticated user could have credited
themselves unlimited USDT. Fixed in migration 005_games_security.sql.

**How to apply:** verify grants after deploy:
`SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name='<fn>';`
Should list only postgres + service_role.
