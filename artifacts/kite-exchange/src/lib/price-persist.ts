interface PriceSnapshot {
  price: number;
  change: number;
  high24h: number;
  low24h: number;
  savedAt: number;
}

const MAX_AGE_MS = 60 * 60 * 1000;

export function loadSnapshot(key: string): PriceSnapshot | null {
  try {
    const raw = localStorage.getItem(`kite_price_${key}`);
    if (!raw) return null;
    const snap: PriceSnapshot = JSON.parse(raw);
    if (Date.now() - snap.savedAt > MAX_AGE_MS) return null;
    if (!snap.price || snap.price <= 0) return null;
    return snap;
  } catch {
    return null;
  }
}

export function saveSnapshot(key: string, snap: PriceSnapshot) {
  try {
    localStorage.setItem(`kite_price_${key}`, JSON.stringify({ ...snap, savedAt: Date.now() }));
  } catch { }
}
