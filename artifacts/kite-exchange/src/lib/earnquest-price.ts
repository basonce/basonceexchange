import { loadSnapshot, saveSnapshot } from './price-persist';

class EarnQuestPriceManager {
  private static instance: EarnQuestPriceManager;
  private price: number = 0.41;
  private change: number = 3856.34;
  private high24h: number = 0.55;
  private low24h: number = 0.30;
  private marketCap: number = 296_000_000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private readonly MIN_PRICE = 0.30;
  private readonly MAX_PRICE = 0.55;
  private readonly MIN_CHANGE = 2800;
  private readonly MAX_CHANGE = 5800;
  private direction: number = 1;

  private constructor() {
    const snap = loadSnapshot('EQ');
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
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase.from('earnquest_price').select('*').eq('id', 1).maybeSingle();
      if (data && parseFloat(data.current_price) > 0) {
        const sbPrice = parseFloat(data.current_price);
        if (Math.abs(sbPrice - this.price) / this.price > 0.15) {
          this.price = sbPrice;
        }
        this.marketCap = parseFloat(data.market_cap);
        if (!loadSnapshot('EQ')) {
          this.change = parseFloat(data.change_percentage);
          this.high24h = Math.max(this.MAX_PRICE, parseFloat(data.high_24h));
          this.low24h = Math.min(this.MIN_PRICE, parseFloat(data.low_24h));
        }
      }
    } catch { }
    this.startLocalWalk();
  }

  private tick() {
    const volatility = 0.004 + Math.random() * 0.008;
    const step = this.price * volatility * this.direction;
    let newPrice = this.price + step;

    if (newPrice >= this.MAX_PRICE) {
      newPrice = this.MAX_PRICE - Math.random() * 0.01;
      this.direction = -1;
    } else if (newPrice <= this.MIN_PRICE) {
      newPrice = this.MIN_PRICE + Math.random() * 0.01;
      this.direction = 1;
    }
    if (Math.random() < 0.07) this.direction *= -1;

    this.price = Math.round(newPrice * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h = Math.min(this.low24h, this.price);

    this.change += (Math.random() - 0.46) * 8;
    this.change = Math.max(this.MIN_CHANGE, Math.min(this.MAX_CHANGE, this.change));
    this.change = Math.round(this.change * 100) / 100;

    saveSnapshot('EQ', { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
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
