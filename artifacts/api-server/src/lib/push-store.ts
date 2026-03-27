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
    const p256 = Buffer.from(s.keys.p256dh, 'base64');
    const auth = Buffer.from(s.keys.auth, 'base64');
    return p256.length === 65 && auth.length >= 16 && s.endpoint.startsWith('https://');
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
    fs.writeFileSync(DATA_FILE, JSON.stringify([...subs.values()], null, 2));
  } catch {}
}

export function addSub(sub: PushSub) {
  // Validate key lengths before storing
  try {
    const p256 = Buffer.from(sub.keys.p256dh, 'base64');
    const auth = Buffer.from(sub.keys.auth, 'base64');
    if (p256.length !== 65 || auth.length < 16) return; // skip invalid
  } catch { return; }
  subs.set(sub.endpoint, sub);
  save();
}

export function removeSub(endpoint: string) {
  subs.delete(endpoint);
  save();
}

export function getAllSubs(): PushSub[] {
  return [...subs.values()];
}

export function subCount() { return subs.size; }
