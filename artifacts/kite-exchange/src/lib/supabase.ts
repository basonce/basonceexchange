import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfjjymprvjfltpvmfptj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamp5bXBydmpmbHRwdm1mcHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA1NzksImV4cCI6MjA4OTQ4NjU3OX0.3TiH5DNJoLzRrdfHLp8fgVhMADY19DhQu3Hre5esYrM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fast user helper — uses getSession() (no network/lock) instead of getUser()
// Multiple simultaneous callers share the same in-flight promise (500ms dedup)
let _userPromise: Promise<any> | null = null;
let _userPromiseTs = 0;

export const getCurrentUser = async () => {
  const now = Date.now();
  if (_userPromise && now - _userPromiseTs < 500) return _userPromise;
  _userPromiseTs = now;
  _userPromise = supabase.auth.getSession().then(({ data: { session } }) => session?.user ?? null);
  return _userPromise;
};
