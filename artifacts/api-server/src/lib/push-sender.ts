import webpush from 'web-push';
import { getAllSubs, removeSub } from './push-store.js';
import { logger } from './logger.js';

let configured = false;

export function configurePush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!pub || !priv) { logger.warn('VAPID keys eksik — push devre dışı'); return; }
  webpush.setVapidDetails(sub, pub, priv);
  configured = true;
  logger.info('Web Push yapılandırıldı');
}

export interface PushPayload {
  title: string;
  body: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  tag?: string;
}

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  if (!configured) return 0;
  const subs = getAllSubs();
  let sent = 0;
  await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys },
        JSON.stringify(payload),
        { TTL: 300 }
      );
      sent++;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (err?.statusCode === 410 || err?.statusCode === 404 || msg.includes('p256dh') || msg.includes('65 bytes')) {
        removeSub(s.endpoint);
        logger.info({ endpoint: s.endpoint.slice(-20) }, 'Geçersiz/süresi dolmuş sub silindi');
      } else {
        logger.warn({ err: msg }, 'Push gönderilemedi');
      }
    }
  }));
  logger.info({ sent, total: subs.length }, 'Push gönderildi');
  return sent;
}
