import { Router, type IRouter } from 'express';
import { addSub, removeSub, subCount } from '../lib/push-store.js';
import { sendPushToAll } from '../lib/push-sender.js';

const router: IRouter = Router();

router.get('/push/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push devre dışı' });
  res.json({ publicKey: key });
});

router.post('/push/subscribe', (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Geçersiz abonelik' });
  }
  addSub({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  res.json({ ok: true, total: subCount() });
});

router.delete('/push/subscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) removeSub(endpoint);
  res.json({ ok: true });
});

router.post('/push/send', async (req, res) => {
  const { title, body, severity, tag } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title ve body gerekli' });
  const sent = await sendPushToAll({ title, body, severity: severity || 'high', tag });
  res.json({ ok: true, sent });
});

router.get('/push/status', (_req, res) => {
  res.json({ subscriptions: subCount(), vapid: !!process.env.VAPID_PUBLIC_KEY });
});

export default router;
