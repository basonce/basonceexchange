import { loadSnapshot, saveSnapshot } from './price-persist';

const STORAGE_KEY = 'EQ_v3';

class EarnQuestPriceManager {
  private static instance: EarnQuestPriceManager;
  private price: number = 0.41;
  private change: number = 3856.34;
  private high24h: number = 1.20;
  private low24h: number = 0.10;
  private marketCap: number = 296_000_000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private readonly MIN_PRICE = 0.10;
  private readonly MAX_PRICE = 1.60;
  private readonly MIN_CHANGE = 2800;
  private readonly MAX_CHANGE = 16000;
  private direction: number = 1;

  private constructor() {
    const snap = loadSnapshot(STORAGE_KEY);
    if (snap) {
      this.price = snap.price;
      this.change = snap.change;
      this.high24h = snap.high24h;
      this.low24h = snap.low24h;
    }
    this.fetchAndInit();
  }

  static getInstance(): EarnQuestPriceManager {
    if (!EarnQuestPriceManager.instance) {
      EarnQuestPriceManager.instance = new EarnQuestPriceManager();
    }
    return EarnQuestPriceManager.instance;
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
        const { data } = await supabase.from('earnquest_price').select('*').eq('id', 1).maybeSingle();
        if (data && parseFloat(data.current_price) > 0) {
          const sbPrice = parseFloat(data.current_price);
          if (sbPrice >= this.MIN_PRICE && sbPrice <= this.MAX_PRICE) {
            this.price = sbPrice;
          }
          this.marketCap = parseFloat(data.market_cap);
          const sbChange = parseFloat(data.change_percentage);
          if (sbChange > 0) this.change = Math.min(sbChange, this.MAX_CHANGE);
        }
      } catch { }
    }
    this.startLocalWalk();
  }

  private tick() {
    const volatility = 0.005 + Math.random() * 0.012;
    const upBias = this.price < this.MAX_PRICE * 0.7 ? 0.62 : 0.52;
    if (Math.random() < upBias) this.direction = 1;
    else if (Math.random() < 0.35) this.direction = -1;

    const step = this.price * volatility * this.direction;
    let newPrice = this.price + step;

    if (newPrice >= this.MAX_PRICE) {
      newPrice = this.MAX_PRICE - Math.random() * 0.05;
      this.direction = -1;
    } else if (newPrice <= this.MIN_PRICE) {
      newPrice = this.MIN_PRICE + Math.random() * 0.02;
      this.direction = 1;
    }

    this.price = Math.round(newPrice * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h = Math.min(this.low24h, this.price);

    const driftAmt = (Math.random() - 0.44) * 18;
    this.change = Math.max(this.MIN_CHANGE, Math.min(this.MAX_CHANGE, this.change + driftAmt));
    this.change = Math.round(this.change * 100) / 100;

    saveSnapshot(STORAGE_KEY, { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
    this.notifySubscribers();
  }

  private startLocalWalk() {
    this.updateInterval = window.setInterval(() => this.tick(), 3000);
  }

  getPrice(): number { return this.price; }
  getChange(): number { return this.change; }
  getHigh24h(): number { return this.high24h; }
  getLow24h(): number { return this.low24h; }
  getMarketCap(): number { return this.marketCap; }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => { this.subscribers = this.subscribers.filter(cb => cb !== callback); };
  }

  private notifySubscribers() { this.subscribers.forEach(cb => cb()); }

  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { EarnQuestPriceManager };
