// BASONCE/KITE Exchange — Admin Push Service Worker
// Scope is set dynamically from registration — use self.registration.scope
const APP_URL = self.location.pathname.replace(/sw\.js$/, '');

function buildVibration(severity) {
  if (severity === 'critical') {
    const cycle = [400, 150, 400, 150, 600, 300];
    const result = [];
    for (let i = 0; i < 14; i++) result.push(...cycle);
    return result;
  }
  if (severity === 'high') {
    const cycle = [300, 200, 300, 800];
    const result = [];
    for (let i = 0; i < 12; i++) result.push(...cycle);
    return result;
  }
  return [200, 100, 200, 100, 200];
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // PURGE: tüm eski cache'leri sil → eski JS asla servis edilmez
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch {}
  // Tüm açık tab'ları yeni sw'ye bağla
  await self.clients.claim();
  // Tüm açık sayfaları zorla yenile → kullanıcının yapması gereken hiçbir şey yok
  try {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      try { await c.navigate(c.url); } catch {
        try { c.postMessage({ type: 'SW_UPDATED_RELOAD' }); } catch {}
      }
    }
  } catch {}
})()));

// Tüm fetch'lere müdahale et — eski cache'i bypass et, her zaman ağ
self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Sadece GET ve same-origin için karış
  if (req.method !== 'GET') return;
  try {
    const u = new URL(req.url);
    if (u.origin !== self.location.origin) return;
    // Hash'li immutable asset'lere dokunma (cache OK)
    if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?|png|jpg|jpeg|svg|webp)$/.test(u.pathname)) return;
    // Diğerleri (HTML, /api/*, public dosyalar) → her zaman ağdan, no-store
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => fetch(req)));
  } catch {}
});

self.addEventListener('push', (e) => {
  let data = {
    title: '🔔 BASONCE Admin',
    body: 'Yeni bildirim!',
    severity: 'high',
    tag: 'alert',
  };
  try { data = { ...data, ...e.data.json() }; } catch {}

  const sevEmoji = {
    critical: '🚨', high: '⚠️', medium: '🔔', low: 'ℹ️',
  }[data.severity] || '🔔';

  const isCritical = data.severity === 'critical';
  const isHigh     = data.severity === 'high';

  const options = {
    body: data.body,
    icon: '/basonce_logo_son_biten.png',
    badge: '/basonce_logo_son_biten.png',
    tag: data.tag || 'alert',
    renotify: true,
    requireInteraction: isCritical || isHigh,
    vibrate: buildVibration(data.severity),
    silent: false,
    data: {
      url: '/?admin=1',
      severity: data.severity,
      tag: data.tag,
    },
    actions: [
      { action: 'open',    title: '📲 Admin Paneli Aç' },
      { action: 'dismiss', title: '✕ Kapat' },
    ],
  };

  e.waitUntil(
    self.registration.showNotification(sevEmoji + ' ' + data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const targetUrl = (e.notification.data && e.notification.data.url) || '/?admin=1';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
