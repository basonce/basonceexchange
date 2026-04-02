import { supabase } from './supabase';

export const PAGE_LABELS: Record<string, string> = {
  home:              '🏠 Ana Sayfa',
  markets:           '📊 Piyasalar',
  trade:             '🔵 Trade',
  futures:           '📈 Futures',
  mining:            '⛏️ Mining',
  assets:            '💰 Varlıklar',
  profile:           '👤 Profil',
  aibot:             '🤖 AI Bot',
  'social-profile':  '🌐 Sosyal',
};

export const ACTION_LABELS: Record<string, string> = {
  page_view:          '📄 Sayfa Açtı',
  deposit_open:       '💳 Yatırım Penceresi',
  withdraw_open:      '💸 Çekim Penceresi',
  withdraw_submit:    '🔴 Çekim Talebi Gönderdi',
  trade_buy:          '🟢 Alış Emri Verdi',
  trade_sell:         '🔴 Satış Emri Verdi',
  futures_open:       '📈 Futures Pozisyon Açtı',
  futures_close:      '📉 Futures Pozisyon Kapattı',
  support_open:       '💬 Destek Penceresi',
  support_send:       '📨 Destek Mesajı Gönderdi',
  referral_open:      '👥 Referral Baktı',
  earn_open:          '🎁 Kazan Baktı',
  vip_pay_open:       '👑 VIP Ödeme Baktı',
  p2p_open:           '🔄 P2P Açtı',
  qr_open:            '📷 QR Kodu Gördü',
  profile_edit:       '✏️ Profil Düzenledi',
  mining_start:       '⛏️ Mining Başlattı',
  session_start:      '🔑 Oturum Başlattı',
  session_end:        '🔒 Oturumu Kapattı',
};

export interface GeoInfo {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  flag: string;
}

let currentUserId: string | null = null;
let cleanupDone = false;
let geoInfo: GeoInfo | null = null;
let geoFetchPromise: Promise<GeoInfo | null> | null = null;

export function getGeoInfo(): GeoInfo | null { return geoInfo; }

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const offset = 0x1F1E6;
  const A = 0x41;
  const f = code.toUpperCase();
  return String.fromCodePoint(offset + f.charCodeAt(0) - A) +
         String.fromCodePoint(offset + f.charCodeAt(1) - A);
}

async function fetchGeoData(): Promise<GeoInfo | null> {
  if (geoInfo) return geoInfo;
  if (geoFetchPromise) return geoFetchPromise;
  geoFetchPromise = (async () => {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      geoInfo = {
        ip: json.ip || 'N/A',
        country: json.country_name || 'Unknown',
        country_code: json.country_code || '',
        city: json.city || '',
        flag: countryFlag(json.country_code || ''),
      };
      return geoInfo;
    } catch {
      // fallback
      geoInfo = { ip: 'N/A', country: 'Unknown', country_code: '', city: '', flag: '🌍' };
      return geoInfo;
    }
  })();
  return geoFetchPromise;
}

export function setActivityUserId(uid: string | null) {
  currentUserId = uid;
  if (uid) {
    // Fetch geo immediately and cache
    fetchGeoData().then(geo => {
      if (!cleanupDone) {
        cleanupDone = true;
        // Delete records older than 7 days
        supabase
          .from('activity_log')
          .delete()
          .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .then(() => {}).catch(() => {});
      }
      // Log session start
      trackActivity('session_start', undefined, { device: getDeviceInfo() });
    });
  }
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const device = /mobile/i.test(ua) ? 'Mobil' : /tablet|ipad/i.test(ua) ? 'Tablet' : 'PC';
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Diğer';
  const os = ua.includes('Android') ? 'Android' : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : 'Linux';
  return `${device} / ${browser} / ${os}`;
}

export async function trackActivity(
  action: string,
  page?: string,
  metadata?: Record<string, unknown>
) {
  if (!currentUserId) return;
  const geo = geoInfo || await fetchGeoData();
  try {
    await supabase.from('activity_log').insert({
      user_id: currentUserId,
      action,
      page: page || null,
      metadata: {
        label: ACTION_LABELS[action] || action,
        ip: geo?.ip,
        country: geo?.country,
        country_code: geo?.country_code,
        city: geo?.city,
        flag: geo?.flag,
        device: getDeviceInfo(),
        ...(metadata || {}),
      },
    });
  } catch {
    // silent — table may not exist yet
  }
}

export async function trackPageView(page: string) {
  if (!currentUserId) return;
  await trackActivity('page_view', page, {
    label: PAGE_LABELS[page] || `📄 ${page}`,
    page_label: PAGE_LABELS[page] || page,
  });
}
