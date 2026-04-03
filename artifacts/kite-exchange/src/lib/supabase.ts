import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfjjymprvjfltpvmfptj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamp5bXBydmpmbHRwdm1mcHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA1NzksImV4cCI6MjA4OTQ4NjU3OX0.3TiH5DNJoLzRrdfHLp8fgVhMADY19DhQu3Hre5esYrM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── CENTRALIZED AUTH CACHE ──────────────────────────────────────────────────
//
// Problem: 60+ components all called getSession() / getUser() on mount.
// Each call acquires a browser lock. Concurrent lock contention → 5-15 second
// delays → login timeouts, blank pages, "0 pairs".
//
// Solution: ONE getSession() call at module load, result cached in memory.
// All subsequent getCurrentUser() calls are instant (no network, no lock).
// onAuthStateChange keeps the cache fresh after login / logout / token refresh.

let _user: any = null;
let _ready = false;
const _callbacks: Array<() => void> = [];

// Single getSession call at startup — safe because the module is loaded once
supabase.auth.getSession().then(({ data: { session } }) => {
  _user = session?.user ?? null;
  if (!_ready) {
    _ready = true;
    _callbacks.forEach(cb => cb());
    _callbacks.length = 0;
  }
});

// Stays in sync after login / logout / token refresh (no lock)
supabase.auth.onAuthStateChange((_event, session) => {
  _user = session?.user ?? null;
  if (!_ready) {
    _ready = true;
    _callbacks.forEach(cb => cb());
    _callbacks.length = 0;
  }
});

/**
 * getCurrentUser() — instant after first auth event, never acquires the lock.
 * All 60+ callers share the same cached user object.
 */
export const getCurrentUser = (): Promise<any> => {
  if (_ready) return Promise.resolve(_user);
  // First load: wait for the initial getSession to complete (usually < 50ms)
  return new Promise((resolve) => {
    _callbacks.push(() => resolve(_user));
    // Safety fallback: resolve after 4s even if something went wrong
    setTimeout(() => resolve(_user), 4000);
  });
};
