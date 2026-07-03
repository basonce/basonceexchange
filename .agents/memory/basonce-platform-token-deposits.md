---
name: basonce platform token deposits
description: How BNC/EQ/EQL deposits work (wallet_pool real addresses, not NOWPayments) and the RPC auth guards protecting the pool
---

# Platform token (BNC/EQ/EQL) deposits

- NOWPayments does NOT list the platform's own BEP-20 tokens (EQ/EARN contract 0x9ad4ae969208729379abae00c71f4e678e9cf1d0, BNC, EQL). Their deposit addresses come from the Supabase `wallet_pool` table (25k BEP20 + 25k TRC20 admin-seeded addresses, all with private keys — verified real by deriving keys with ethers).
- Assignment flow: client calls `assign_wallet_to_user(p_user_id)` then `get_user_deposit_addresses(user_id_param)` (both SECURITY DEFINER). Used by kite BuyCryptoModal/RealDepositModal and wallet Receive/wallet.ts.
- **Guard rule:** both RPCs must reject unless `auth.role() = 'service_role'` OR `auth.uid() = p_user_id`; EXECUTE revoked from PUBLIC/anon (kept for authenticated + service_role). **Why:** they were open to anon with arbitrary UUIDs → IDOR + pool exhaustion (anyone could drain 25k addresses). **How to apply:** any new RPC touching wallet_pool must self-validate the caller the same way.
- Both kite and wallet apps use real Supabase auth (`supabase.auth.getSession`), so `auth.uid() = user.id` holds — the guard does not break legit users.
- EQL is NOT in kite's `supported_coins` (only EQ + BNC active) — it's only receivable in the wallet app. Adding EQL to kite requires a product decision (metadata/pricing), not just code.
- Crediting deposits to pool addresses is manual/scanner-based: `auto-wallet-scanner` edge function exists but its cron is disabled — deposits are NOT auto-credited.
