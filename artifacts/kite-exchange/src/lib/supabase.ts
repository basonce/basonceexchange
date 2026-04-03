import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfjjymprvjfltpvmfptj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamp5bXBydmpmbHRwdm1mcHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA1NzksImV4cCI6MjA4OTQ4NjU3OX0.3TiH5DNJoLzRrdfHLp8fgVhMADY19DhQu3Hre5esYrM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── LOCK-FREE AUTH CACHE ────────────────────────────────────────────────────
//
// Root cause of login timeouts & "0 pairs":
//   supabase.auth.getSession() acquires a browser lock when the access token
//   is expired. While the lock is held (up to 5 s), ALL Supabase queries
//   (including supported_coins) and signInWithPassword() are blocked → timeout.
//
// Fix: read the session DIRECTLY from localStorage (zero lock, zero network).
//      onAuthStateChange keeps the in-memory cache up-to-date after every
//      login / logout / token refresh WITHOUT us ever touching the lock.

const LS_KEY = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;

function readFromStorage(): any {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Supabase stores either { user, expires_at } or { session: { user, expires_at } }
    const user = data?.user ?? data?.session?.user ?? null;
    if (!user) return null;
    // If the token is clearly expired (> 5 min grace) skip — the listener will refresh
    const exp = (data?.expires_at ?? data?.session?.expires_at ?? 0) * 1000;
    if (exp && exp < Date.now() - 5 * 60_000) return null;
    return user;
  } catch {
    return null;
  }
}

// Seed the cache instantly — zero network, zero lock
let _user: any = readFromStorage();

// Keep in sync after every auth event (login / logout / silent token refresh)
supabase.auth.onAuthStateChange((_event, session) => {
  _user = session?.user ?? null;
});

/**
 * getCurrentUser() — always instant, never acquires the lock.
 *
 * Returns the cached user object (or null if logged out).
 * All 60+ callers share the same reference; no concurrent I/O.
 */
export const getCurrentUser = (): Promise<any> => Promise.resolve(_user);
