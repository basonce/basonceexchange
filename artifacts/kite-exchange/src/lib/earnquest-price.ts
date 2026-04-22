import { loadSnapshot, saveSnapshot, saveCycleStart, loadCycleStart } from './price-persist';

const STORAGE_KEY = 'EQ_v9';
const WAVE_KEY    = 'EQ_wave_v1';

const MIN_PRICE   = 0.01;
const MAX_PRICE   = 1.63;
const PRICE_FLOOR = 0.20;   // ≈ +1,900% — never let it dip below this
const PRICE_CEIL  = 1.40;   // ≈ +13,900% — pullback when exceeded

const WAVE_MIN_MS = 18 * 60 * 1000;   // 18 min
const WAVE_MAX_MS = 70 * 60 * 1000;   // 70 min
const PULLBACK_PROB = 0.38;

const INIT_VOL = 7_000_000;
const MAX_VOL  = 392_000_000;

interface Wave {
  startTs: number;
  endTs: number;
  startPrice: number;
  endPrice: number;
  isPullback: boolean;
}

function loadWave(): Wave | null {
  try {
    const raw = localStorage.getItem(WAVE_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as Wave;
    if (typeof w.endTs !== 'number' || w.endTs <= Date.now()) return null;
    return w;
  } catch { return null; }
}

function saveWave(w: Wave) {
  try { localStorage.setItem(WAVE_KEY, JSON.stringify(w)); } catch {}
}

function makeWave(currentPrice: number, now: number, forceUp = false): Wave {
  const dur = WAVE_MIN_MS + Math.random() * (WAVE_MAX_MS - WAVE_MIN_MS);
  const isPullback = !forceUp && (currentPrice > PRICE_CEIL * 0.85
    ? Math.random() < 0.65                   // near ceiling → likely pullback
    : Math.random() < PULLBACK_PROB);

  let endPrice: number;
  if (isPullback) {
    endPrice = currentPrice * (0.55 + Math.random() * 0.22); // -23% to -45%
    if (endPrice < PRICE_FLOOR) {
      endPrice = PRICE_FLOOR + (PRICE_CEIL - PRICE_FLOOR) * (0.10 + Math.random() * 0.15);
    }
  } else {
    endPrice = currentPrice * (1.12 + Math.random() * 0.36); // +12% to +48%
    if (endPrice > PRICE_CEIL) {
      endPrice = PRICE_CEIL * (0.86 + Math.random() * 0.12);
    }
  }
  endPrice = Math.max(MIN_PRICE, Math.min(MAX_PRICE, endPrice));
  return { startTs: now, endTs: now + dur, startPrice: currentPrice, endPrice, isPullback };
}

// Smooth S-curve ease-in-out
function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

class EarnQuestPriceManager {
  private static instance: EarnQuestPriceManager;

  private price: number   = PRICE_FLOOR;
  private high24h: number = PRICE_FLOOR;
  private low24h: number  = PRICE_FLOOR;
  private change: number  = 0;
  private volume: number  = INIT_VOL;
  private wave: Wave;

  private subscribers: Array<() => void> = [];
  private updateInterval: number | null  = null;

  private constructor() {
    const now = Date.now();
    const stored = loadCycleStart(STORAGE_KEY);
    const snap = loadSnapshot(STORAGE_KEY);
    const restoredWave = loadWave();

    if (snap && snap.price >= PRICE_FLOOR * 0.6 && snap.price <= MAX_PRICE && restoredWave) {
      // Continue exactly where we left off
      this.price   = snap.price;
      this.high24h = Math.max(snap.high24h || snap.price, snap.price);
      this.wave    = restoredWave;
    } else {
      // Fresh visitor or expired wave → seed at an exciting random point
      const seedPrice = PRICE_FLOOR + Math.random() * (PRICE_CEIL - PRICE_FLOOR) * 0.85;
      this.price   = seedPrice;
      this.high24h = seedPrice;
      this.wave    = makeWave(seedPrice, now, true); // first wave always upward
      saveWave(this.wave);
    }
    if (!stored) saveCycleStart(STORAGE_KEY, now);

    this.recomputeDerived();
    this.startWalk();
  }

  static getInstance(): EarnQuestPriceManager {
    if (!EarnQuestPriceManager.instance)
      EarnQuestPriceManager.instance = new EarnQuestPriceManager();
    return EarnQuestPriceManager.instance;
  }

  private recomputeDerived() {
    this.change = Math.round(((this.price - MIN_PRICE) / MIN_PRICE) * 10000) / 100;
    this.low24h = MIN_PRICE;
    // Volume scales with how exciting the price is (higher price = more interest)
    const excitement = Math.min(1, (this.price - PRICE_FLOOR) / (PRICE_CEIL - PRICE_FLOOR));
    this.volume = Math.round(INIT_VOL + (MAX_VOL - INIT_VOL) * (0.3 + 0.7 * excitement));
  }

  private tick() {
    const now = Date.now();

    // Wave finished → roll a new one
    if (now >= this.wave.endTs) {
      this.wave = makeWave(this.price, now);
      saveWave(this.wave);
    }

    // Interpolate price along current wave with easing
    const w = this.wave;
    const span = Math.max(1, w.endTs - w.startTs);
    const tRaw = (now - w.startTs) / span;
    const t = easeInOut(Math.max(0, Math.min(1, tRaw)));
    const target = w.startPrice + (w.endPrice - w.startPrice) * t;

    // Per-tick noise: ±0.4% normally, occasional ±1.5% pop
    const noiseMag = Math.random() < 0.08 ? 0.015 : 0.004;
    const noise = target * noiseMag * (Math.random() * 2 - 1);
    let next = target + noise;

    // Hard band guards
    if (next < PRICE_FLOOR * 0.95) next = PRICE_FLOOR * (0.95 + Math.random() * 0.05);
    if (next > MAX_PRICE) next = MAX_PRICE;

    this.price   = Math.round(next * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.recomputeDerived();

    saveSnapshot(STORAGE_KEY, {
      price: this.price, change: this.change,
      high24h: this.high24h, low24h: this.low24h,
      savedAt: now,
    });
    this.notifySubscribers();
  }

  private startWalk() {
    this.updateInterval = window.setInterval(() => this.tick(), 3000);
  }

  getPrice(): number     { return this.price; }
  getChange(): number    { return this.change; }
  getHigh24h(): number   { return this.high24h; }
  getLow24h(): number    { return this.low24h; }
  getVolume(): number    { return this.volume; }
  getMarketCap(): number { return this.volume; }

  subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(x => x !== cb); };
  }
  private notifySubscribers() { this.subscribers.forEach(cb => cb()); }
  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { EarnQuestPriceManager };
