import { supabase } from './supabase';

export const PAGE_LABELS: Record<string, string> = {
  home:            '🏠 Ana Sayfa',
  markets:         '📊 Piyasalar',
  trade:           '🔵 Trade',
  futures:         '📈 Futures',
  mining:          '⛏️ Mining',
  assets:          '💰 Varlıklar',
  profile:         '👤 Profil',
  aibot:           '🤖 AI Bot',
  'social-profile':'🌐 Sosyal',
};

export const ACTION_LABELS: Record<string, string> = {
  page_view:          '📄 Sayfa Görüntüledi',
  deposit_open:       '💳 Yatırım Penceresini Açtı',
  withdraw_open:      '💸 Çekim Penceresini Açtı',
  trade_open:         '🔵 Trade Açtı',
  futures_open:       '📈 Futures Açtı',
  support_open:       '💬 Destek Yazdı',
  referral_open:      '👥 Referral Baktı',
  earn_open:          '🎁 Kazan Baktı',
  vip_pay_open:       '👑 VIP Ödeme Baktı',
  p2p_open:           '🔄 P2P Açtı',
  qr_open:            '📷 QR Kodu Gördü',
  profile_edit:       '✏️ Profil Düzenledi',
  mining_start:       '⛏️ Mining Başlattı',
  futures_trade:      '📊 Futures İşlem Yaptı',
  spot_trade:         '💹 Spot İşlem Yaptı',
};

let currentUserId: string | null = null;
let cleanupDone = false;

export function setActivityUserId(uid: string | null) {
  currentUserId = uid;
  if (uid && !cleanupDone) {
    cleanupDone = true;
    // Delete records older than 7 days
    supabase
      .from('activity_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(() => {})
      .catch(() => {});
  }
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
      metadata: {
        label: ACTION_LABELS[action] || action,
        ...(metadata || {}),
      },
    });
  } catch {
    // silent fail
  }
}

export async function trackPageView(page: string) {
  if (!currentUserId) return;
  await trackActivity('page_view', page, { label: PAGE_LABELS[page] || `📄 ${page}` });
}
