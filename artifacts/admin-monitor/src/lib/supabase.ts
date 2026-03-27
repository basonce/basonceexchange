import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgfviqdxeupajntpylig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnZpcWR4ZXVwYWpudHB5bGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjgwNDksImV4cCI6MjA4NzA0NDA0OX0.zxca3lBfqHt4EQ1pFLGlDkZUQJY1iQXaZA0cOflJc18';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, storageKey: 'admin-monitor-auth' },
  realtime: { params: { eventsPerSecond: 10 } },
});

// Auto sign-in as admin so RLS-protected tables are accessible
let adminSignedIn = false;
export async function ensureAdminAuth(): Promise<void> {
  if (adminSignedIn) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'ecoprin1332@gmail.com') {
      adminSignedIn = true;
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: 'ecoprin1332@gmail.com',
      password: 'Tayman1332',
    });
    if (!error) {
      adminSignedIn = true;
      console.log('[auth] Admin oturumu açıldı');
    } else {
      console.warn('[auth] Admin girişi başarısız:', error.message);
    }
  } catch (e) {
    console.warn('[auth] ensureAdminAuth hatası:', e);
  }
}
