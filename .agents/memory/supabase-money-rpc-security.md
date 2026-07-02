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

**RLS on money tables — ownership is mandatory:** a `SELECT USING (true)` policy on
withdrawal_transactions leaked every user's addresses/amounts, and an INSERT policy that
only checked column shape (status/txid null) let any logged-in user forge a withdrawal
row for another user_id — which an admin could then approve (treasury outflow). Rule:
every user-writable money table needs `user_id = auth.uid()` in both SELECT (or admin via
is_caller_admin()) and INSERT WITH CHECK, plus a belt-and-braces BEFORE INSERT trigger
enforcing ownership independently of RLS (fixed in 011_withdrawal_rls_ownership.sql).
Always E2E-test with simulated JWT: `set_config('request.jwt.claims','{"sub":"<uuid>",...}',true)`
under `SET LOCAL role TO authenticated`.

**Dual-approval design that passed audit:** approve RPC locks row FOR UPDATE, unique
(withdrawal_id, admin_id) blocks same-admin replay, ≥$1000 requires two distinct admins;
reject RPC refunds inside the same transaction with status gate → no double refund.
