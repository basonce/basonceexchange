export interface CryptoPriceData {
  price: number;
  change: number;
}

type Listener = () => void;

const livePrice = new Map<string, number>();
const liveChange = new Map<string, number>();
const globalListeners = new Set<Listener>();

let fetchIntervalId: ReturnType<typeof setInterval> | null = null;
const FETCH_INTERVAL_MS = 15_000;

async function fetchAllPrices(): Promise<void> {
  try {
    const res = await fetch('/api/crypto-prices');
    if (!res.ok) return;
    const json = await res.json() as {
      success: boolean;
      data?: Record<string, { price: number; change: number } | null>;
    };
    if (!json.success || !json.data) return;

    let anyChanged = false;
    Object.entries(json.data).forEach(([sym, val]) => {
      if (!val || val.price <= 0) return;
      livePrice.set(sym, val.price);
      liveChange.set(sym, val.change);
      anyChanged = true;
    });

    if (anyChanged) globalListeners.forEach(fn => fn());
  } catch {
    // silently ignore — keep last known prices
  }
}

function ensureRunning(): void {
  if (fetchIntervalId) return;
  fetchAllPrices();
  fetchIntervalId = setInterval(fetchAllPrices, FETCH_INTERVAL_MS);
}

export function getCachedCryptoPrice(symbol: string): CryptoPriceData | null {
  const price = livePrice.get(symbol);
  if (!price || price <= 0) return null;
  return { price, change: liveChange.get(symbol) ?? 0 };
}

export function startCryptoPriceUpdater(): () => void {
  ensureRunning();
  return () => {
    if (fetchIntervalId) {
      clearInterval(fetchIntervalId);
      fetchIntervalId = null;
    }
  };
}

export function subscribeCryptoPrices(cb: Listener): () => void {
  globalListeners.add(cb);
  ensureRunning();
  return () => globalListeners.delete(cb);
}

export function getAllCryptoPrices(): Map<string, CryptoPriceData> {
  const result = new Map<string, CryptoPriceData>();
  livePrice.forEach((price, sym) => {
    result.set(sym, { price, change: liveChange.get(sym) ?? 0 });
  });
  return result;
}
