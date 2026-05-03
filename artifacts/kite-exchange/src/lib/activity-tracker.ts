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
  session_id: string;
  ip_address?: string;
  country?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  element_text?: string;
  element_type?: string;
  element_id?: string;
  screen_width?: number;
  screen_height?: number;
}

// ── ADMIN STEALTH RULE ──
// Admin (ecoprin1332@gmail.com) is invisible: no DB writes, no telegram alerts,
// no activity_log inserts, no session_start, NOTHING is recorded or broadcast.
const ADMIN_UUID = '88292f59-898a-4fef-a1c8-8813d7b60b61';
const ADMIN_EMAIL = 'ecoprin1332@gmail.com';
function isAdminUser(): boolean {
  if (currentUserId === ADMIN_UUID) return true;
  const email = String((window as any).__currentUserEmail || '').toLowerCase();
  return email === ADMIN_EMAIL;
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
let sessionId: string = crypto.randomUUID();

// ── Helpers ──────────────────────────────────────────────────────────────────
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const base = 0x1F1E6 - 0x41;
  return String.fromCodePoint(base + code.toUpperCase().charCodeAt(0)) +
         String.fromCodePoint(base + code.toUpperCase().charCodeAt(1));
}

interface DeviceInfo {
  device_type: string;
  browser: string;
  os: string;
  label: string;
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const device_type = /mobile/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';
  const browser = ua.includes('Chrome') && !ua.includes('Edge') ? 'Chrome' 
    : ua.includes('Firefox') ? 'Firefox' 
    : ua.includes('Safari') ? 'Safari' 
    : ua.includes('Edge') ? 'Edge' 
    : 'Other';
  const os = ua.includes('Android') ? 'Android' 
    : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' 
    : ua.includes('Windows') ? 'Windows' 
    : ua.includes('Mac') ? 'macOS' 
    : 'Linux';
  const icons: Record<string, string> = { mobile: '📱', tablet: '📟', desktop: '🖥️' };
  return { device_type, browser, os, label: `${icons[device_type]} ${device_type} / ${browser} / ${os}` };
}

export function getGeoInfo(): GeoInfo | null { return geoInfo; }

async function fetchGeo(): Promise<void> {
  if (geoInfo || geoFetching) return;
  geoFetching = true;
  // Try our own /api/whoami first — uses Cloudflare edge headers, real IP, no CORS, sub-50ms.
  try {
    const r = await fetch('/api/whoami', { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = await r.json();
      const ip = j.ip && j.ip !== 'N/A' ? j.ip : null;
      if (ip) {
        geoInfo = {
          ip,
          country: j.country || 'Unknown',
          country_code: j.country_code || '',
          city: j.city || '',
          flag: j.flag || countryFlag(j.country_code || ''),
        };
        geoFetching = false;
        return;
      }
    }
  } catch { /* fall through to ipapi.co */ }
  // Fallback to public IP API (works in dev / when worker missing endpoint)
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    geoInfo = {
      ip: j.ip || 'N/A',
      country: j.country_name || 'Unknown',
      country_code: j.country_code || '',
      city: j.city || '',
      flag: countryFlag(j.country_code || ''),
    };
  } catch {
    geoInfo = { ip: 'N/A', country: 'Unknown', country_code: '', city: '', flag: '🌍' };
  }
  geoFetching = false;
}

// ── Queue & Flush ─────────────────────────────────────────────────────────────
function enqueue(action: string, page: string | null, extra: Record<string, unknown> = {}) {
  if (!currentUserId) return;
  if (isAdminUser()) return; // admin stealth: no tracking, no DB, no telegram
  const device = getDeviceInfo();
  
  const event: QueuedEvent = {
    user_id: currentUserId,
    action,
    page,
    session_id: sessionId,
    // Dedicated geo columns
    ip_address: geoInfo?.ip,
    country: geoInfo ? `${geoInfo.flag} ${geoInfo.country}` : undefined,
    city: geoInfo?.city || undefined,
    // Dedicated device columns
    device_type: device.device_type,
    browser: device.browser,
    os: device.os,
    // Screen info
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    // Element info from extra
    element_text: extra.element_text as string | undefined,
    element_type: extra.element_type as string | undefined,
    element_id: extra.element_id as string | undefined,
    // Full metadata
    metadata: {
      geo: geoInfo ? `${geoInfo.flag} ${geoInfo.country}${geoInfo.city ? `, ${geoInfo.city}` : ''}` : null,
      device: device.label,
      ...extra,
    },
  };
  
  eventQueue.push(event);
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

  // Telegram canlı yayını (sessiz, gruplanmış kart) — Türkçe çeviri ile
  try {
    const userEmail = (window as any).__currentUserEmail || '';
    const lines: string[] = [];
    let lastPage = '';
    for (const ev of batch) {
      const meta: any = ev.metadata || {};
      const rawLabel = String(meta.element_text || ev.element_text || '').trim().slice(0, 60);
      const label = translateLabel(rawLabel);
      const page = String(ev.page || '').slice(0, 30);
      const pageLabel = PAGE_LABELS[page] || page;
      if (page && page !== lastPage) { lines.push(`📄 <b>${pageLabel}</b>`); lastPage = page; }
      if (ev.action === 'click' && label) lines.push(`  👆 ${label}`);
      else if (ev.action === 'page_view') {/* zaten yukarıda */}
      else if (ev.action === 'page_leave') lines.push(`  ⬅️ ${TR_ACTIONS.page_leave}`);
      else if (ev.action === 'page_focus') lines.push(`  🟢 ${TR_ACTIONS.page_focus}`);
      else if (ev.action === 'page_blur')  lines.push(`  ⚫ ${TR_ACTIONS.page_blur}`);
      else if (ev.action === 'dwell') {
        const secs = Number((meta as any).time_sec || 0);
        lines.push(`  ⏱️ <b>${formatDuration(secs)}</b> dır burada bekliyor — hareketsiz`);
      }
      else if (ev.action && ev.action !== 'click') lines.push(`  • ${TR_ACTIONS[ev.action] || ev.action}${label?': '+label:''}`);
    }
    if (lines.length === 0) return;
    const head = `🎬 <code>${userEmail || currentUserId.slice(0,8)}</code>`;
    const text = head + '\n' + lines.slice(0, 25).join('\n');
    fetch('/api/notify-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, silent: false }),
    }).catch(() => {});
  } catch {}
}

// ── Element Label Extractor ──────────────────────────────────────────────────
const IGNORE_TEXTS = new Set(['', '.', ',', '|', '/', '\\', '...']);

function getElementLabel(el: Element | null): string | null {
  if (!el) return null;
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

function classifyElement(el: HTMLElement): { type: string; icon: string } {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role') || '';
  if (tag === 'button' || role === 'button') return { type: 'button', icon: '🖱️' };
  if (tag === 'a') return { type: 'link', icon: '🔗' };
  if (tag === 'input') {
    const type = el.getAttribute('type') || 'text';
    if (type === 'submit') return { type: 'submit', icon: '📤' };
    return { type: `input_${type}`, icon: '✏️' };
  }
  if (tag === 'select') return { type: 'select', icon: '📋' };
  if (role === 'tab') return { type: 'tab', icon: '📑' };
  return { type: 'click', icon: '👆' };
}

// Action type translations (for telegram alerts)
const TR_ACTIONS: Record<string, string> = {
  page_leave: 'Sayfadan ayrıldı',
  page_focus: 'Sayfaya geri döndü',
  page_blur:  'Sekmeyi/uygulamayı küçülttü',
  page_view:  'Sayfayı açtı',
  click:      'Tıkladı',
  input:      'Yazı girdi',
  scroll:     'Aşağı kaydırdı',
  submit:     'Form gönderdi',
};

// English UI label → Türkçe (en sık görülen ifadeler)
const LABEL_TR: Record<string, string> = {
  // Mining FAQ
  'how do i convert eq to usdt?':         'EQ\'yu USDT\'ye nasıl çeviririm?',
  'how long does equipment last?':        'Ekipman ne kadar dayanır?',
  'is my mining income guaranteed?':      'Mining gelirim garanti mi?',
  'why is my equipment not earning?':     'Ekipmanım neden kazanmıyor?',
  // Top-level nav
  'home': 'Ana Sayfa', 'markets': 'Piyasalar', 'trade': 'Trade',
  'futures': 'Futures', 'mining': 'Mining', 'assets': 'Varlıklar', 'profile': 'Profil',
  'wallet': 'Cüzdan', 'deposit': 'Para Yatır', 'withdraw': 'Para Çek',
  'send': 'Gönder', 'receive': 'Al', 'transfer': 'Transfer',
  'add funds': 'Para Yatır', 'claim': 'Talep Et',
  'sign in': 'Giriş Yap', 'sign up': 'Kayıt Ol', 'log in': 'Giriş Yap', 'log out': 'Çıkış Yap',
  'open chest': 'Sandığı Aç', 'crypto': 'Kripto', 'positions': 'Pozisyonlar',
  'trades': 'İşlemler', 'blockchain': 'Blokzincir',
  'referral': 'Davet', 'earn': 'Kazan', 'edit': 'Düzenle',
  'shop': 'Mağaza', 'support': 'Destek', 'mine': 'Madencilik',
  'buy': 'Al', 'sell': 'Sat', 'long': 'Long', 'short': 'Short',
  'confirm': 'Onayla', 'cancel': 'İptal', 'continue': 'Devam',
  'submit': 'Gönder', 'next': 'İleri', 'back': 'Geri',
};

function translateLabel(s: string): string {
  if (!s) return '';
  const key = s.toLowerCase().trim();
  return LABEL_TR[key] || s;
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

  const interactive = target.closest(
    'button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="submit"], select'
  ) as HTMLElement | null;
  
  if (!interactive && target.tagName.toLowerCase() !== 'button') return;

  const el = interactive || target;
  const label = getElementLabel(el);
  if (!label) return;

  const { type, icon } = classifyElement(el);
  const priority = isHighPriority(label);

  enqueue('click', currentPage, {
    label: `${icon} ${label}`,
    element_text: label.slice(0, 100),
    element_type: type,
    element_id: el.id || undefined,
    priority: priority ? 'high' : 'normal',
    page_label: PAGE_LABELS[currentPage] || currentPage,
    x_pos: Math.round(e.clientX),
    y_pos: Math.round(e.clientY),
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
  if (type === 'password') return;

  if (inputDebounce) clearTimeout(inputDebounce);
  inputDebounce = setTimeout(() => {
    if (lastInputPage !== currentPage) {
      lastInputPage = currentPage;
      enqueue('form_input', currentPage, {
        label: `✏️ ${label.slice(0, 40)}`,
        element_text: label.slice(0, 40),
        element_type: `input_${type}`,
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
    flush();
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
  // Admin stealth: do not initialize tracker at all for admin user.
  if (uid === ADMIN_UUID) {
    console.log('[ActivityTracker] admin detected — tracking disabled');
    initialized = true; // mark initialized so we never try again
    return;
  }
  if (uid && !initialized) {
    initialized = true;
    sessionId = crypto.randomUUID();
    fetchGeo().then(() => {
      const device = getDeviceInfo();
      enqueue('session_start', currentPage, {
        label: '🔑 Oturum Başlattı',
        device: device.label,
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

let dwellTimer: ReturnType<typeof setInterval> | null = null;

function dwellHeartbeat() {
  if (!currentUserId) return;
  if (document.visibilityState !== 'visible') return; // only when tab is active
  if (!currentPage) return;
  const secs = Math.round((Date.now() - pageEnterTime) / 1000);
  if (secs < 60) return; // require at least 60s on page before reporting
  enqueue('dwell', currentPage, {
    label: `⏱️ ${formatDuration(secs)} dır ${PAGE_LABELS[currentPage] || currentPage} sayfasında bekliyor`,
    page_label: PAGE_LABELS[currentPage] || currentPage,
    time_sec: secs,
  });
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}sn`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return s ? `${m}dk ${s}sn` : `${m}dk`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}sa ${mm}dk` : `${h}sa`;
}

export function initGlobalTracking() {
  console.log('[ActivityTracker] initGlobalTracking called');
  document.addEventListener('click', handleGlobalClick, true);
  document.addEventListener('input', handleGlobalInput, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', flush);
  // Heartbeat — broadcast "still on page X for Ymin" every 60s
  if (dwellTimer) clearInterval(dwellTimer);
  dwellTimer = setInterval(dwellHeartbeat, 60_000);
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
