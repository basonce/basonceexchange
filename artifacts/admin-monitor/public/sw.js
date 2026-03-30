const CACHE_NAME = 'admin-monitor-v4';
const APP_URL = '/admin-monitor/';

// 30-saniye titreşim deseni — ekran kilitliyken "dokunsal alarm"
// Her döngü ~2.3s, ~13 döngü ≈ 30s
function buildVibration(severity) {
  if (severity === 'critical') {
    // Acil: kısa-kısa-uzun, 30 saniye
    const cycle = [400, 150, 400, 150, 600, 300];
    const result = [];
    for (let i = 0; i < 14; i++) result.push(...cycle);
    return result; // ~30s
  }
  if (severity === 'high') {
    // Önemli: orta titreşim, 20 saniye
    const cycle = [300, 200, 300, 800];
    const result = [];
    for (let i = 0; i < 12; i++) result.push(...cycle);
    return result; // ~19s
  }
  // medium/low/info: kısa titreşim
  return [200, 100, 200, 100, 200];
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let data = {
    title: '🔔 Admin Monitor',
    body: 'Yeni alarm!',
    severity: 'high',
    tag: 'alert',
    alarm: true,
  };
  try { data = { ...data, ...e.data.json() }; } catch {}

  const sevEmoji = {
    critical: '🚨', high: '⚠️', medium: '🔔', low: 'ℹ️', info: '📌',
  }[data.severity] || '🔔';

  const isCritical = data.severity === 'critical';
  const isHigh     = data.severity === 'high';
  const needAlarm  = data.alarm !== false && (isCritical || isHigh);

  const options = {
    body: data.body,
    icon: APP_URL + 'icon-192.png',
    badge: APP_URL + 'badge-72.png',
    tag: data.tag || 'alert',
    renotify: true,
    // Her önemli olay için ekranda kalır (kullanıcı kapatana kadar)
    requireInteraction: isCritical || isHigh,
    vibrate: buildVibration(data.severity),
    silent: false,
    data: {
      url: APP_URL,
      severity: data.severity,
      tag: data.tag,
      alarm: needAlarm,
      title: data.title,
      body: data.body,
    },
    actions: [
      { action: 'open',    title: '📲 Aç'    },
      { action: 'dismiss', title: '✕ Kapat'  },
    ],
  };

  e.waitUntil(
    (async () => {
      await self.registration.showNotification(sevEmoji + ' ' + data.title, options);

      // Eğer uygulama arka planda açıksa, hemen alarm mesajı gönder
      if (needAlarm) {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          if (client.url.includes('/admin-monitor')) {
            client.postMessage({
              type: 'PUSH_ALARM',
              severity: data.severity,
              tag: data.tag,
              title: data.title,
              body: data.body,
            });
          }
        }
      }
    })()
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const notifData = e.notification.data || {};
  const targetUrl = notifData.url || APP_URL;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      let target = null;
      for (const client of clients) {
        if (client.url.includes('/admin-monitor')) {
          target = client;
          break;
        }
      }

      const alarm = () => {
        if (target) {
          target.postMessage({
            type: 'PUSH_ALARM',
            severity: notifData.severity,
            tag: notifData.tag,
            title: notifData.title,
            body: notifData.body,
            fromClick: true,
          });
        }
      };

      if (target) {
        return target.focus().then(() => { alarm(); return target; });
      }

      return self.clients.openWindow(targetUrl).then((win) => {
        // openWindow — alarm oynatmak için kısa bekleme
        target = win;
        setTimeout(alarm, 800);
      });
    })
  );
});
