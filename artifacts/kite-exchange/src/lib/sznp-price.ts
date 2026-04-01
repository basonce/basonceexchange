import { loadSnapshot, saveSnapshot } from './price-persist';

class SZNPPriceManager {
  private static instance: SZNPPriceManager;
  private price: number = 4.90;
  private change: number = 11.65;
  private high24h: number = 6.80;
  private low24h: number = 3.00;
  private marketCap: number = 6_700_000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private readonly MIN_PRICE = 3.00;
  private readonly MAX_PRICE = 6.80;
  private readonly MIN_CHANGE = 7;
  private readonly MAX_CHANGE = 18;
  private direction: number = 1;

  private constructor() {
    const snap = loadSnapshot('SZNP');
    if (snap) {
      this.price = snap.price;
      this.change = snap.change;
      this.high24h = snap.high24h;
      this.low24h = snap.low24h;
    }
    this.startPriceUpdates();
  }

  static getInstance(): SZNPPriceManager {
    if (!SZNPPriceManager.instance) {
      SZNPPriceManager.instance = new SZNPPriceManager();
    }
    return SZNPPriceManager.instance;
  }

  private tick() {
    const volatility = 0.004 + Math.random() * 0.008;
    const step = this.price * volatility * this.direction;
    let newPrice = this.price + step;

    if (newPrice >= this.MAX_PRICE) {
      newPrice = this.MAX_PRICE - Math.random() * 0.10;
      this.direction = -1;
    } else if (newPrice <= this.MIN_PRICE) {
      newPrice = this.MIN_PRICE + Math.random() * 0.10;
      this.direction = 1;
    }
    if (Math.random() < 0.08) this.direction *= -1;

    this.price = Math.round(newPrice * 10000) / 10000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h = Math.min(this.low24h, this.price);

    this.change += (Math.random() - 0.46) * 0.15;
    this.change = Math.max(this.MIN_CHANGE, Math.min(this.MAX_CHANGE, this.change));
    this.change = Math.round(this.change * 100) / 100;

    saveSnapshot('SZNP', { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
    this.notifySubscribers();
  }

  private startPriceUpdates() {
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

export { SZNPPriceManager };
