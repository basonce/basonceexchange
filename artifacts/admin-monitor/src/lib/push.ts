const PUSH_API = `${window.location.origin}/api-server/api`;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

let swReg: ServiceWorkerRegistration | null = null;

export type PushStatus = 'idle' | 'subscribed' | 'denied' | 'unsupported' | 'error';
let pushStatus: PushStatus = 'idle';
const statusListeners: Array<(s: PushStatus) => void> = [];

function setPushStatus(s: PushStatus) {
  pushStatus = s;
  statusListeners.forEach(fn => fn(s));
}

export function getPushStatus(): PushStatus { return pushStatus; }
export function onPushStatusChange(fn: (s: PushStatus) => void) {
  statusListeners.push(fn);
  return () => { const i = statusListeners.indexOf(fn); if (i >= 0) statusListeners.splice(i, 1); };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[push] Service Worker desteklenmiyor');
    return null;
  }
  try {
    const base = import.meta.env.BASE_URL || '/admin-monitor/';
    const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    swReg = reg;
    console.log('[push] Service Worker kayıtlı:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[push] SW kayıt hatası:', err);
    return null;
  }
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    setPushStatus('unsupported');
    return false;
  }
  if (Notification.permission === 'denied') {
    setPushStatus('denied');
    return false;
  }
  try {
    if (!swReg) {
      swReg = await navigator.serviceWorker.ready;
    }

    const existing = await swReg.pushManager.getSubscription();
    if (existing) {
      await sendSubToServer(existing);
      console.log('[push] Mevcut abonelik sunucuya gönderildi');
      setPushStatus('subscribed');
      return true;
    }

    const keyRes = await fetch(`${PUSH_API}/push/vapid-key`);
    if (!keyRes.ok) { console.warn('[push] VAPID key alınamadı'); setPushStatus('error'); return false; }
    const { publicKey } = await keyRes.json();

    const sub = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await sendSubToServer(sub);
    console.log('[push] ✅ Push aboneliği oluşturuldu');
    setPushStatus('subscribed');
    return true;
  } catch (err: any) {
    const name = err?.name || '';
    console.warn('[push] Abonelik hatası:', name, err?.message || '');
    if (name === 'NotAllowedError') setPushStatus('denied');
    else setPushStatus('error');
    return false;
  }
}

async function sendSubToServer(sub: PushSubscription) {
  const json = sub.toJSON();
  await fetch(`${PUSH_API}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = swReg || await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${PUSH_API}/push/subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      console.log('[push] Abonelik iptal edildi');
    }
  } catch {}
}

export async function checkPushSupport(): Promise<{ supported: boolean; permission: NotificationPermission }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, permission: 'denied' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function sendTestPush(): Promise<{ ok: boolean; sent: number }> {
  try {
    const res = await fetch(`${PUSH_API}/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🧪 Test Bildirimi',
        body: 'Admin Monitor çalışıyor — Web Push aktif!',
        severity: 'high',
        tag: 'test',
      }),
    });
    return await res.json();
  } catch {
    return { ok: false, sent: 0 };
  }
}

export async function getPushServerStatus(): Promise<{ subscriptions: number; vapid: boolean } | null> {
  try {
    const res = await fetch(`${PUSH_API}/push/status`);
    return await res.json();
  } catch {
    return null;
  }
}
