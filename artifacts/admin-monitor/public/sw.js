const CACHE_NAME = 'admin-monitor-v1';
const APP_URL = '/admin-monitor/';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (e) => {
  let data = { title: '🔔 Admin Monitor', body: 'Yeni alarm!', severity: 'high', tag: 'alert' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  const sevEmoji = {
    critical: '🚨', high: '⚠️', medium: '🔔', low: 'ℹ️', info: '📌'
  }[data.severity] || '🔔';

  const sevColor = {
    critical: '#FF4757', high: '#FF9800', medium: '#F0B90B', low: '#3D7FFF', info: '#888'
  }[data.severity] || '#F0B90B';

  const options = {
    body: data.body,
    icon: APP_URL + 'icon-192.png',
    badge: APP_URL + 'badge-72.png',
    tag: data.tag || 'alert',
    renotify: true,
    requireInteraction: data.severity === 'critical',
    vibrate: data.severity === 'critical' ? [200,100,200,100,200] : [200,100,200],
    data: { url: APP_URL, severity: data.severity },
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' }
    ],
  };

  e.waitUntil(
    self.registration.showNotification(sevEmoji + ' ' + data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const targetUrl = (e.notification.data && e.notification.data.url) || APP_URL;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/admin-monitor') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
