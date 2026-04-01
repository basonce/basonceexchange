import { loadSnapshot, saveSnapshot } from './price-persist';

const STORAGE_KEY = 'BNC_v5';

function isSameUtcDay(tsA: number, tsB: number): boolean {
  const a = new Date(tsA);
  const b = new Date(tsB);
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth()    === b.getUTCMonth()    &&
         a.getUTCDate()     === b.getUTCDate();
}

class BNCPriceManager {
  private static instance: BNCPriceManager;
  private price: number;
  private change: number = 0;
  private high24h: number;
  private low24h: number;
  private marketCap: number = 180_000_000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private readonly MIN_PRICE = 0.85;
  private readonly MAX_PRICE = 12.00;
  private direction: number = 1;

  private constructor() {
    const snap = loadSnapshot(STORAGE_KEY);
    const todaySnap = snap && isSameUtcDay(snap.savedAt, Date.now());

    if (todaySnap) {
      this.price   = snap!.price;
      this.change  = snap!.change;
      this.high24h = snap!.high24h;
      this.low24h  = snap!.low24h;
    } else {
      // New UTC day (or first load) — start from floor price
      this.price   = this.MIN_PRICE;
      this.high24h = this.MIN_PRICE;
      this.low24h  = this.MIN_PRICE;
      this.change  = 0;
    }
    this.fetchAndInit();
  }

  static getInstance(): BNCPriceManager {
    if (!BNCPriceManager.instance) {
      BNCPriceManager.instance = new BNCPriceManager();
    }
    return BNCPriceManager.instance;
  }

  private async fetchAndInit() {
    const hasLocal = !!loadSnapshot(STORAGE_KEY);
    if (!hasLocal) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        const { data } = await supabase.from('bnc_price').select('*').eq('id', 1).maybeSingle();
        if (data && parseFloat(data.current_price) > 0) {
          const sbPrice = parseFloat(data.current_price);
          if (sbPrice >= this.MIN_PRICE && sbPrice <= this.MAX_PRICE) {
            this.price = sbPrice;
          }
          this.marketCap = parseFloat(data.market_cap);
        }
      } catch { }
    }
    this.startLocalWalk();
  }

  private tick() {
    // Midnight UTC reset — if we've crossed into a new day, restart from floor
    const now = Date.now();
    const savedAt = loadSnapshot(STORAGE_KEY)?.savedAt ?? now;
    if (!isSameUtcDay(savedAt, now)) {
      this.price   = this.MIN_PRICE;
      this.high24h = this.MIN_PRICE;
      this.low24h  = this.MIN_PRICE;
      this.change  = 0;
      this.direction = 1;
    }

    const volatility = 0.005 + Math.random() * 0.012;
    const upBias = this.price < this.MAX_PRICE * 0.7 ? 0.60 : 0.52;
    if (Math.random() < upBias) this.direction = 1;
    else if (Math.random() < 0.35) this.direction = -1;

    const step = this.price * volatility * this.direction;
    let newPrice = this.price + step;

    if (newPrice >= this.MAX_PRICE) {
      newPrice = this.MAX_PRICE - Math.random() * 0.20;
      this.direction = -1;
    } else if (newPrice <= this.MIN_PRICE) {
      newPrice = this.MIN_PRICE + Math.random() * 0.05;
      this.direction = 1;
    }

    this.price   = Math.round(newPrice * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h  = this.MIN_PRICE;

    // change24h = % gain from MIN_PRICE (today's open floor) — consistent with 24h Low
    this.change = Math.round(((this.price - this.MIN_PRICE) / this.MIN_PRICE) * 10000) / 100;

    saveSnapshot(STORAGE_KEY, { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
    this.notifySubscribers();
  }

  private startLocalWalk() {
    this.updateInterval = window.setInterval(() => this.tick(), 3000);
  }

  getPrice(): number   { return this.price; }
  getChange(): number  { return this.change; }
  getHigh24h(): number { return this.high24h; }
  getLow24h(): number  { return this.low24h; }
  getMarketCap(): number { return this.marketCap; }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => { this.subscribers = this.subscribers.filter(cb => cb !== callback); };
  }

  private notifySubscribers() { this.subscribers.forEach(cb => cb()); }
  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { BNCPriceManager };
