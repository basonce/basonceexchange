const VISITOR_KEY = 'basonce_visitor_id';
const SESSION_KEY = 'basonce_session_id';
const INTERVAL_MS = 30_000;
const API_BASE = '/api';

function getOrCreate(key: string, storage: Storage): string {
  let val = storage.getItem(key);
  if (!val) {
    val = crypto.randomUUID();
    storage.setItem(key, val);
  }
  return val;
}

function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  return 'Unknown';
}

function getPageLabel(hash: string): string {
  const tab = hash.replace('#', '').trim() || 'exchange';
  const labels: Record<string, string> = {
    exchange: 'Exchange',
    portfolio: 'Portfolio',
    assets: 'Assets',
    mining: 'Mining',
    profile: 'Profile',
    sports: 'Sports',
    leaderboard: 'Leaderboard',
    wallet: 'Wallet',
  };
  return labels[tab] ?? tab;
}

let _visitorId = '';
let _sessionId = '';
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _currentPage = 'Exchange';
let _hashListener: (() => void) | null = null;

async function upsertSession(page: string) {
  if (!_visitorId || !_sessionId) {
    console.log('[AnonTracker] skip — no visitorId/sessionId');
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    console.log('[AnonTracker] POST →', API_BASE + '/anon-sessions', 'page:', page);
    const res = await fetch(`${API_BASE}/anon-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: _visitorId,
        session_id: _sessionId,
        current_page: page,
        device_type: detectDevice(),
        browser: detectBrowser(),
        os: detectOS(),
      }),
      signal: ctrl.signal,
    });
    console.log('[AnonTracker] POST status:', res.status);
  } catch (err) {
    console.warn('[AnonTracker] POST failed:', err);
  } finally {
    clearTimeout(timer);
  }
}

async function deleteSession() {
  if (!_visitorId) return;
  try {
    await fetch(`${API_BASE}/anon-sessions/${_visitorId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
  }
}

// ── Telegram canlı yayını (ziyaretçi tıkları) ─────────────────────────
let _tgQueue: Array<{label:string, page:string, ts:number}> = [];
let _tgFlushTimer: ReturnType<typeof setTimeout> | null = null;
let _tgGeo: any = null;

function _tgGetLabel(el: Element | null): string {
  if (!el) return '';
  const node = (el as HTMLElement).closest('button, a, [role="button"], [role="tab"], input[type="submit"], label, select') as HTMLElement | null;
  const t = node || (el as HTMLElement);
  const v = t.getAttribute('aria-label') || t.getAttribute('title') || (t as HTMLInputElement).value || (t.innerText || t.textContent || '').trim();
  return String(v || '').replace(/\s+/g,' ').slice(0, 50);
}

function _tgScheduleFlush() {
  if (_tgFlushTimer) return;
  _tgFlushTimer = setTimeout(async () => {
    _tgFlushTimer = null;
    if (_tgQueue.length === 0) return;
    const batch = _tgQueue.splice(0, 30);
    if (!_tgGeo) { try { _tgGeo = await fetch('https://ipapi.co/json/').then(r=>r.json()); } catch { _tgGeo = {}; } }
    const flag = _tgGeo.country_code ? String.fromCodePoint(...[..._tgGeo.country_code.toUpperCase()].map(c=>0x1F1E6+c.charCodeAt(0)-65)) : '🌍';
    const lines: string[] = [];
    let lastPage = '';
    for (const e of batch) {
      if (e.page && e.page !== lastPage) { lines.push(`📄 <b>${e.page}</b>`); lastPage = e.page; }
      if (e.label) lines.push(`  👆 ${e.label}`);
    }
    const head = `👀 <code>${_visitorId.slice(0,8)}</code> ${flag} ${_tgGeo.city || _tgGeo.country_name || ''} · ${detectDevice()}`;
    const text = head + '\n' + lines.slice(0, 25).join('\n');
    fetch('/api/notify-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, silent: true, channel: 'feed' }),
    }).catch(() => {});
  }, 4000);
}

function _tgInstallListeners() {
  if ((window as any).__tgVisitorListenersInstalled) return;
  (window as any).__tgVisitorListenersInstalled = true;
  document.addEventListener('click', (ev) => {
    if (!_visitorId) return;
    const label = _tgGetLabel(ev.target as Element);
    if (!label || label.length < 2) return;
    _tgQueue.push({ label, page: _currentPage, ts: Date.now() });
    _tgScheduleFlush();
  }, { capture: true, passive: true });
  window.addEventListener('hashchange', () => {
    if (!_visitorId) return;
    _tgQueue.push({ label: '', page: _currentPage, ts: Date.now() });
    _tgScheduleFlush();
  });
}

export function initAnonTracker(isLoggedIn: boolean): void {
  console.log('[AnonTracker] initAnonTracker — isLoggedIn:', isLoggedIn);
  if (isLoggedIn) {
    stopAnonTracker();
    return;
  }

  try {
    _visitorId = getOrCreate(VISITOR_KEY, localStorage);
    _sessionId = getOrCreate(SESSION_KEY, sessionStorage);
    _currentPage = getPageLabel(window.location.hash);
    console.log('[AnonTracker] visitor:', _visitorId.slice(0, 8), 'page:', _currentPage);

    upsertSession(_currentPage);
    _tgInstallListeners();

    // Telegram: ilk ziyaretçi bildirimi (oturum başına 1 kez, sessiz)
    try {
      const NOTIFIED_KEY = 'basonce_visitor_notified';
      if (!sessionStorage.getItem(NOTIFIED_KEY)) {
        sessionStorage.setItem(NOTIFIED_KEY, '1');
        (async () => {
          let geo: any = {};
          try { geo = await fetch('https://ipapi.co/json/').then(r=>r.json()); } catch {}
          const text = `👀 <b>ZİYARETÇİ</b>\n\n🌍 ${geo.country_name || '?'} / ${geo.city || '?'}\n📡 ${geo.ip || '?'}\n📱 ${detectDevice()} · ${detectBrowser()} · ${detectOS()}\n📄 ${_currentPage}\n🆔 <code>${_visitorId.slice(0,8)}</code>`;
          fetch('/api/notify-event', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ text, silent: false })
          }).catch(()=>{});
        })();
      }
    } catch {}

    if (!_intervalId) {
      _intervalId = setInterval(() => {
        upsertSession(_currentPage);
      }, INTERVAL_MS);
    }

    if (!_hashListener) {
      _hashListener = () => {
        _currentPage = getPageLabel(window.location.hash);
        upsertSession(_currentPage);
      };
      window.addEventListener('hashchange', _hashListener);
    }
  } catch {
  }
}

export function updateAnonPage(page: string): void {
  if (!_visitorId) return;
  _currentPage = page;
  upsertSession(page);
}

export function stopAnonTracker(): void {
  console.log('[AnonTracker] stopAnonTracker — had visitorId:', !!_visitorId);
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_hashListener) {
    window.removeEventListener('hashchange', _hashListener);
    _hashListener = null;
  }
  if (_visitorId) {
    deleteSession();
    _visitorId = '';
    _sessionId = '';
  }
}
