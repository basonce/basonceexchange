import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamp5bXBydmpmbHRwdm1mcHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA1NzksImV4cCI6MjA4OTQ4NjU3OX0.3TiH5DNJoLzRrdfHLp8fgVhMADY19DhQu3Hre5esYrM';

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
