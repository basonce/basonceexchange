import { supabase } from './supabase';

const PAGE_LABELS: Record<string, string> = {
  home: '🏠 Ana Sayfa',
  markets: '📊 Piyasalar',
  trade: '🔵 Trade',
  futures: '📈 Futures',
  mining: '⛏️ Mining',
  assets: '💰 Varlıklar',
  profile: '👤 Profil',
  aibot: '🤖 AI Bot',
  'social-profile': '🌐 Sosyal',
};

export const PAGE_LABEL = (page: string) => PAGE_LABELS[page] || `📄 ${page}`;

let currentUserId: string | null = null;

export function setActivityUserId(uid: string | null) {
  currentUserId = uid;
}

export async function trackActivity(
  action: string,
  page?: string,
  metadata?: Record<string, unknown>
) {
  if (!currentUserId) return;
  try {
    await supabase.from('activity_log').insert({
      user_id: currentUserId,
      action,
      page: page || null,
      metadata: metadata || {},
    });
  } catch {
    // silent fail — activity log is optional
  }
}

export async function trackPageView(page: string) {
  if (!currentUserId) return;
  await trackActivity('page_view', page, { label: PAGE_LABEL(page) });
}
