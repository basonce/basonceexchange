import { loadSnapshot, saveSnapshot, saveCycleStart, loadCycleStart } from './price-persist';

const STORAGE_KEY = 'SZNP_v2';
const CYCLE_MS    = 10 * 60 * 60 * 1000;
const MIN_PRICE   = 3.00;
const MAX_PRICE   = 6.80;
const INIT_VOL    = 2_000_000;
const MAX_VOL     = 42_000_000;

function cycleProgress(cs: number) { return Math.min(1, (Date.now() - cs) / CYCLE_MS); }
function targetPrice(t: number)    { return MIN_PRICE + (MAX_PRICE - MIN_PRICE) * t; }
function cycleVolume(t: number)    { return Math.round(INIT_VOL + (MAX_VOL - INIT_VOL) * (1 - Math.pow(1 - t, 1.4))); }

class SZNPPriceManager {
  private static instance: SZNPPriceManager;
  private price: number   = MIN_PRICE;
  private high24h: number = MIN_PRICE;
  private low24h: number  = MIN_PRICE;
  private change: number  = 0;
  private volume: number  = INIT_VOL;
  private cycleStart: number;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null  = null;

  private constructor() {
    const stored = loadCycleStart(STORAGE_KEY);
    if (stored) {
      const t = cycleProgress(stored);
      if (t >= 1) { this.cycleStart = Date.now(); saveCycleStart(STORAGE_KEY, this.cycleStart); }
      else {
        this.cycleStart = stored;
        const snap = loadSnapshot(STORAGE_KEY);
        this.price   = (snap && snap.price >= MIN_PRICE && snap.price <= MAX_PRICE) ? snap.price : targetPrice(t) * (0.92 + Math.random() * 0.08);
        this.high24h = snap?.high24h ?? this.price;
        this.volume  = cycleVolume(t);
        this.change  = Math.round(((this.price - MIN_PRICE) / MIN_PRICE) * 10000) / 100;
      }
    } else { this.cycleStart = Date.now(); saveCycleStart(STORAGE_KEY, this.cycleStart); }
    this.startWalk();
  }

  static getInstance(): SZNPPriceManager {
    if (!SZNPPriceManager.instance) SZNPPriceManager.instance = new SZNPPriceManager();
    return SZNPPriceManager.instance;
  }

  private resetCycle() {
    this.price = MIN_PRICE; this.high24h = MIN_PRICE; this.low24h = MIN_PRICE;
    this.change = 0; this.volume = INIT_VOL; this.cycleStart = Date.now();
    saveCycleStart(STORAGE_KEY, this.cycleStart);
    saveSnapshot(STORAGE_KEY, { price: MIN_PRICE, change: 0, high24h: MIN_PRICE, low24h: MIN_PRICE, savedAt: Date.now() });
  }

  private tick() {
    const t = cycleProgress(this.cycleStart);
    if (t >= 1) { this.resetCycle(); this.notifySubscribers(); return; }
    const pull  = (targetPrice(t) - this.price) * 0.07;
    const noise = this.price * (0.002 + Math.random() * 0.006) * (Math.random() > 0.42 ? 1 : -1);
    this.price   = Math.max(MIN_PRICE, Math.min(MAX_PRICE, Math.round((this.price + pull + noise) * 100000) / 100000));
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h  = MIN_PRICE;
    this.change  = Math.round(((this.price - MIN_PRICE) / MIN_PRICE) * 10000) / 100;
    this.volume  = cycleVolume(t);
    saveSnapshot(STORAGE_KEY, { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
    this.notifySubscribers();
  }

  private startWalk() { this.updateInterval = window.setInterval(() => this.tick(), 3000); }
  getPrice(): number     { return this.price; }
  getChange(): number    { return this.change; }
  getHigh24h(): number   { return this.high24h; }
  getLow24h(): number    { return this.low24h; }
  getVolume(): number    { return this.volume; }
  getMarketCap(): number { return this.volume; }
  subscribe(cb: () => void): () => void { this.subscribers.push(cb); return () => { this.subscribers = this.subscribers.filter(x => x !== cb); }; }
  private notifySubscribers() { this.subscribers.forEach(cb => cb()); }
  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { SZNPPriceManager };
