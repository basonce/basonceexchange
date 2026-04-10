const VISITOR_KEY = 'basonce_visitor_id';
const SESSION_KEY = 'basonce_session_id';
const INTERVAL_MS = 30_000;
const API_BASE = '/api-server/api';

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
  if (!_visitorId || !_sessionId) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    await fetch(`${API_BASE}/anon-sessions`, {
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
  } catch {
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

export function initAnonTracker(isLoggedIn: boolean): void {
  if (isLoggedIn) {
    stopAnonTracker();
    return;
  }

  try {
    _visitorId = getOrCreate(VISITOR_KEY, localStorage);
    _sessionId = getOrCreate(SESSION_KEY, sessionStorage);
    _currentPage = getPageLabel(window.location.hash);

    upsertSession(_currentPage);

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
