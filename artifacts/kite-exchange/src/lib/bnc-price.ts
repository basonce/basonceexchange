import { loadSnapshot, saveSnapshot, saveCycleStart, loadCycleStart } from './price-persist';

const STORAGE_KEY = 'BNC_v6';
const CYCLE_MS    = 9 * 60 * 60 * 1000; // 9 hours
const MIN_PRICE   = 0.85;
const MAX_PRICE   = 11.999;
const INIT_VOL    = 4_000_000;
const MAX_VOL     = 237_580_000;

function cycleProgress(cycleStart: number): number {
  return Math.min(1, (Date.now() - cycleStart) / CYCLE_MS);
}
function targetPrice(t: number): number {
  return MIN_PRICE + (MAX_PRICE - MIN_PRICE) * t;
}
function cycleVolume(t: number): number {
  const curved = 1 - Math.pow(1 - t, 1.4);
  return Math.round(INIT_VOL + (MAX_VOL - INIT_VOL) * curved);
}

class BNCPriceManager {
  private static instance: BNCPriceManager;

  private price: number    = MIN_PRICE;
  private high24h: number  = MIN_PRICE;
  private low24h: number   = MIN_PRICE;
  private change: number   = 0;
  private volume: number   = INIT_VOL;
  private cycleStart: number;

  private subscribers: Array<() => void> = [];
  private updateInterval: number | null  = null;

  private constructor() {
    const stored = loadCycleStart(STORAGE_KEY);
    if (stored) {
      const t = cycleProgress(stored);
      if (t >= 1) {
        this.cycleStart = Date.now();
        saveCycleStart(STORAGE_KEY, this.cycleStart);
      } else {
        this.cycleStart = stored;
        const snap = loadSnapshot(STORAGE_KEY);
        if (snap && snap.price >= MIN_PRICE && snap.price <= MAX_PRICE) {
          this.price   = snap.price;
          this.high24h = snap.high24h;
        } else {
          this.price   = targetPrice(t) * (0.92 + Math.random() * 0.08);
          this.high24h = this.price;
        }
        this.volume = cycleVolume(t);
        this.change = Math.round(((this.price - MIN_PRICE) / MIN_PRICE) * 10000) / 100;
      }
    } else {
      this.cycleStart = Date.now();
      saveCycleStart(STORAGE_KEY, this.cycleStart);
    }
    this.startWalk();
  }

  static getInstance(): BNCPriceManager {
    if (!BNCPriceManager.instance)
      BNCPriceManager.instance = new BNCPriceManager();
    return BNCPriceManager.instance;
  }

  private resetCycle() {
    this.price      = MIN_PRICE;
    this.high24h    = MIN_PRICE;
    this.low24h     = MIN_PRICE;
    this.change     = 0;
    this.volume     = INIT_VOL;
    this.cycleStart = Date.now();
    saveCycleStart(STORAGE_KEY, this.cycleStart);
    saveSnapshot(STORAGE_KEY, { price: this.price, change: 0, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
  }

  private tick() {
    const t = cycleProgress(this.cycleStart);
    if (t >= 1) { this.resetCycle(); this.notifySubscribers(); return; }

    const tgt   = targetPrice(t);
    const pull  = (tgt - this.price) * 0.07;
    const noise = this.price * (0.002 + Math.random() * 0.006) * (Math.random() > 0.42 ? 1 : -1);

    let newPrice = Math.max(MIN_PRICE, Math.min(MAX_PRICE, this.price + pull + noise));
    this.price   = Math.round(newPrice * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h  = MIN_PRICE;
    this.change  = Math.round(((this.price - MIN_PRICE) / MIN_PRICE) * 10000) / 100;
    this.volume  = cycleVolume(t);

    saveSnapshot(STORAGE_KEY, { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
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

export { BNCPriceManager };
