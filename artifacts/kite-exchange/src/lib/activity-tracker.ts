/**
 * COMPREHENSIVE ACTIVITY TRACKER
 * Captures EVERY interaction: clicks, page views, time on page,
 * modals, form submits, tab changes, visibility — everything.
 * Batches inserts every 4 seconds for performance.
 * Auto-deletes records older than 7 days on session init.
 */
import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────────────────
export interface GeoInfo {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  flag: string;
}

interface QueuedEvent {
  user_id: string;
  action: string;
  page: string | null;
  metadata: Record<string, unknown>;
}

// ── State ────────────────────────────────────────────────────────────────────
let currentUserId: string | null = null;
let currentPage: string = '';
let geoInfo: GeoInfo | null = null;
let geoFetching = false;
let initialized = false;
let pageEnterTime: number = Date.now();
const eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const base = 0x1F1E6 - 0x41;
  return String.fromCodePoint(base + code.toUpperCase().charCodeAt(0)) +
         String.fromCodePoint(base + code.toUpperCase().charCodeAt(1));
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const device = /mobile/i.test(ua) ? '📱 Mobil' : /tablet|ipad/i.test(ua) ? '📟 Tablet' : '🖥️ PC';
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Diğer';
  const os = ua.includes('Android') ? 'Android' : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : 'Linux';
  return `${device} / ${browser} / ${os}`;
}

export function getGeoInfo(): GeoInfo | null { return geoInfo; }

async function fetchGeo(): Promise<void> {
  if (geoInfo || geoFetching) return;
  geoFetching = true;
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    geoInfo = {
      ip: j.ip || 'N/A',
      country: j.country_name || 'Bilinmiyor',
      country_code: j.country_code || '',
      city: j.city || '',
      flag: countryFlag(j.country_code || ''),
    };
  } catch {
    geoInfo = { ip: 'N/A', country: 'Bilinmiyor', country_code: '', city: '', flag: '🌍' };
  }
  geoFetching = false;
}

// ── Queue & Flush ─────────────────────────────────────────────────────────────
function enqueue(action: string, page: string | null, extra: Record<string, unknown> = {}) {
  if (!currentUserId) {
    console.log('[ActivityTracker] ⚠️ enqueue skipped — no user ID');
    return;
  }
  eventQueue.push({
    user_id: currentUserId,
    action,
    page,
    metadata: {
      ip: geoInfo?.ip,
      country: geoInfo?.country,
      country_code: geoInfo?.country_code,
      city: geoInfo?.city,
      flag: geoInfo?.flag,
      device: getDeviceInfo(),
      ...extra,
    },
  });
  console.log(`[ActivityTracker] 📥 queued: ${action} (queue=${eventQueue.length})`);
  if (!flushTimer) {
    flushTimer = setTimeout(flush, 4000);
  }
}

async function flush() {
  flushTimer = null;
  if (eventQueue.length === 0 || !currentUserId) return;
  const batch = eventQueue.splice(0, 100);
  const { error } = await supabase.from('activity_log').insert(batch);
  if (error) {
    console.warn('[ActivityTracker] flush error:', error.code, error.message);
  } else {
    console.log(`[ActivityTracker] ✅ ${batch.length} event flushed`);
  }
}

// ── Element Label Extractor ──────────────────────────────────────────────────
const IGNORE_TEXTS = new Set(['', '.', ',', '|', '/', '\\', '...']);

function getElementLabel(el: Element | null): string | null {
  if (!el) return null;
  // Walk up to find the best interactive ancestor
  const interactive = (el as HTMLElement).closest('button, a, [role="button"], [role="tab"], [role="menuitem"], label, select') as HTMLElement | null;
  const target = interactive || (el as HTMLElement);
  
  const sources = [
    target.getAttribute('aria-label'),
    target.getAttribute('title'),
    target.getAttribute('data-label'),
    target.getAttribute('placeholder'),
    (target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
    target.getAttribute('alt'),
    target.id ? `#${target.id}` : null,
  ];

  for (const s of sources) {
    if (s && s.length > 1 && !IGNORE_TEXTS.has(s)) return s;
  }
  return null;
}

function classifyElement(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role') || '';
  if (tag === 'button' || role === 'button') return '🖱️ Butona Bastı';
  if (tag === 'a') return '🔗 Bağlantıya Tıkladı';
  if (tag === 'input') {
    const type = el.getAttribute('type') || 'text';
    if (type === 'submit') return '📤 Form Gönderdi';
    return `✏️ Alana Tıkladı (${type})`;
  }
  if (tag === 'select') return '📋 Seçim Yaptı';
  if (role === 'tab') return '📑 Sekme Değiştirdi';
  return '👆 Tıkladı';
}

// Page label mapping
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

// High-priority keyword detection
const HIGH_PRIORITY_KEYWORDS = [
  'çekim', 'withdraw', 'gönder', 'send', 'onayla', 'confirm', 'transfer',
  'al', 'sat', 'buy', 'sell', 'trade', 'order', 'yatır', 'deposit',
  'para', 'ödeme', 'payment', 'vip', 'kayıt', 'register', 'giriş', 'login',
  'futures', 'long', 'short', 'close position', 'pozisyon',
];

function isHighPriority(label: string): boolean {
  const lower = label.toLowerCase();
  return HIGH_PRIORITY_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Global Click Listener ─────────────────────────────────────────────────────
function handleGlobalClick(e: MouseEvent) {
  if (!currentUserId) return;
  const target = e.target as HTMLElement;
  if (!target) return;

  // Only track meaningful interactive elements
  const interactive = target.closest(
    'button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="submit"], select'
  ) as HTMLElement | null;
  
  if (!interactive && target.tagName.toLowerCase() !== 'button') return;

  const el = interactive || target;
  const label = getElementLabel(el);
  if (!label) return;

  const classify = classifyElement(el);
  const priority = isHighPriority(label);

  enqueue('click', currentPage, {
    label: `${classify}: "${label}"`,
    element_text: label,
    priority: priority ? 'high' : 'normal',
    page_label: PAGE_LABELS[currentPage] || currentPage,
  });
}

// ── Global Input Listener ─────────────────────────────────────────────────────
let lastInputPage = '';
let inputDebounce: ReturnType<typeof setTimeout> | null = null;

function handleGlobalInput(e: Event) {
  if (!currentUserId) return;
  const target = e.target as HTMLInputElement;
  if (!target) return;
  
  const label = target.getAttribute('placeholder') || target.getAttribute('aria-label') || target.name || target.id || 'Alan';
  const type = target.type || 'text';
  if (type === 'password') return; // Never track passwords

  if (inputDebounce) clearTimeout(inputDebounce);
  inputDebounce = setTimeout(() => {
    if (lastInputPage !== currentPage) {
      lastInputPage = currentPage;
      enqueue('form_input', currentPage, {
        label: `✏️ Form Doldurdu: "${label.slice(0, 40)}"`,
        field: label.slice(0, 40),
        field_type: type,
        page_label: PAGE_LABELS[currentPage] || currentPage,
      });
    }
  }, 1500);
}

// ── Page Visibility Tracking ───────────────────────────────────────────────────
let hiddenAt: number | null = null;

function handleVisibilityChange() {
  if (!currentUserId) return;
  if (document.hidden) {
    hiddenAt = Date.now();
    enqueue('page_blur', currentPage, {
      label: `👁️ Sekmeyi Kapattı / Geçti`,
      page_label: PAGE_LABELS[currentPage] || currentPage,
      time_on_page_sec: Math.round((Date.now() - pageEnterTime) / 1000),
    });
    flush(); // flush immediately on hide
  } else {
    const away = hiddenAt ? Math.round((Date.now() - hiddenAt) / 1000) : 0;
    hiddenAt = null;
    pageEnterTime = Date.now();
    enqueue('page_focus', currentPage, {
      label: `👀 Geri Döndü (${away}sn sonra)`,
      page_label: PAGE_LABELS[currentPage] || currentPage,
      away_sec: away,
    });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export function setActivityUserId(uid: string | null) {
  console.log('[ActivityTracker] setActivityUserId called:', uid ? uid.slice(0,8) + '...' : 'null');
  currentUserId = uid;
  if (uid && !initialized) {
    initialized = true;
    fetchGeo().then(() => {
      enqueue('session_start', currentPage, {
        label: '🔑 Oturum Başlattı',
        device: getDeviceInfo(),
      });
    });
    // 7-day cleanup
    supabase
      .from('activity_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(() => {}).catch(() => {});
  } else if (uid && initialized) {
    console.log('[ActivityTracker] already initialized, just updating userId');
  } else if (!uid) {
    initialized = false;
    flush();
  }
}

export function initGlobalTracking() {
  console.log('[ActivityTracker] initGlobalTracking called');
  document.addEventListener('click', handleGlobalClick, true);
  document.addEventListener('input', handleGlobalInput, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', flush);
}

export function destroyGlobalTracking() {
  document.removeEventListener('click', handleGlobalClick, true);
  document.removeEventListener('input', handleGlobalInput, true);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (flushTimer) clearTimeout(flushTimer);
  flush();
}

export async function trackPageView(page: string) {
  const prevPage = currentPage;
  const timeOnPrev = prevPage ? Math.round((Date.now() - pageEnterTime) / 1000) : 0;
  currentPage = page;
  pageEnterTime = Date.now();

  if (prevPage && timeOnPrev > 2) {
    enqueue('page_leave', prevPage, {
      label: `⬅️ Sayfadan Ayrıldı: ${PAGE_LABELS[prevPage] || prevPage} (${timeOnPrev}sn)`,
      page_label: PAGE_LABELS[prevPage] || prevPage,
      time_sec: timeOnPrev,
    });
  }

  if (!currentUserId) return;
  if (!geoInfo) await fetchGeo();

  enqueue('page_view', page, {
    label: `${PAGE_LABELS[page] || `📄 ${page}`}`,
    page_label: PAGE_LABELS[page] || page,
    from_page: prevPage ? (PAGE_LABELS[prevPage] || prevPage) : null,
  });
}

// Keep backward compat for explicit tracking calls
export async function trackActivity(
  action: string,
  page?: string,
  metadata?: Record<string, unknown>
) {
  if (!currentUserId) return;
  if (!geoInfo) await fetchGeo();
  enqueue(action, page || currentPage, {
    label: metadata?.label as string || action,
    ...metadata,
  });
}
