import fs from 'fs';
import path from 'path';

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const DATA_FILE = path.join(import.meta.dirname, '../../data/push_subs.json');

const subs = new Map<string, PushSub>();

function isValidSub(s: PushSub): boolean {
  try {
    if (!s.endpoint?.startsWith('https://')) return false;
    if (!s.keys?.p256dh || !s.keys?.auth) return false;
    const p256 = Buffer.from(s.keys.p256dh, 'base64');
    const auth = Buffer.from(s.keys.auth, 'base64');
    // Accept compressed (33 bytes) or uncompressed (65 bytes) EC keys
    // Accept any auth >= 8 bytes
    return (p256.length === 65 || p256.length === 33 || p256.length >= 32) && auth.length >= 8;
  } catch { return false; }
}

export function loadSubs() {
  try {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const list: PushSub[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const valid = list.filter(isValidSub);
      valid.forEach(s => subs.set(s.endpoint, s));
      console.log(`[push] ${valid.length}/${list.length} geçerli abonelik yüklendi`);
    }
  } catch {}
}

function save() {
  try {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify([...subs.values()], null, 2));
  } catch {}
}

export function addSub(sub: PushSub) {
  if (!isValidSub(sub)) {
    console.warn('[push] Geçersiz abonelik reddedildi:', sub.endpoint, 
      'p256dh bytes:', sub.keys?.p256dh ? Buffer.from(sub.keys.p256dh, 'base64').length : 'yok',
      'auth bytes:', sub.keys?.auth ? Buffer.from(sub.keys.auth, 'base64').length : 'yok'
    );
    return;
  }
  subs.set(sub.endpoint, sub);
  save();
  console.log(`[push] Yeni abonelik eklendi. Toplam: ${subs.size}`);
}

export function clearAllSubs() {
  subs.clear();
  save();
  console.log('[push] Tüm abonelikler silindi');
}

export function removeSub(endpoint: string) {
  subs.delete(endpoint);
  save();
}

export function getAllSubs(): PushSub[] {
  return [...subs.values()];
}

export function subCount() { return subs.size; }
