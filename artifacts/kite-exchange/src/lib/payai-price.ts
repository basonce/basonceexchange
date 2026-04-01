import { loadSnapshot, saveSnapshot } from './price-persist';

class PayAIPriceManager {
  private static instance: PayAIPriceManager;
  private price: number = 1.89;
  private change: number = 12.42;
  private high24h: number = 2.78;
  private low24h: number = 1.00;
  private marketCap: number = 3_500_000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private readonly MIN_PRICE = 1.00;
  private readonly MAX_PRICE = 2.78;
  private readonly MIN_CHANGE = 7;
  private readonly MAX_CHANGE = 20;
  private direction: number = 1;

  private constructor() {
    const snap = loadSnapshot('PAYAI');
    if (snap) {
      this.price = snap.price;
      this.change = snap.change;
      this.high24h = snap.high24h;
      this.low24h = snap.low24h;
    }
    this.startPriceUpdates();
  }

  static getInstance(): PayAIPriceManager {
    if (!PayAIPriceManager.instance) {
      PayAIPriceManager.instance = new PayAIPriceManager();
    }
    return PayAIPriceManager.instance;
  }

  private tick() {
    const volatility = 0.005 + Math.random() * 0.009;
    const step = this.price * volatility * this.direction;
    let newPrice = this.price + step;

    if (newPrice >= this.MAX_PRICE) {
      newPrice = this.MAX_PRICE - Math.random() * 0.05;
      this.direction = -1;
    } else if (newPrice <= this.MIN_PRICE) {
      newPrice = this.MIN_PRICE + Math.random() * 0.05;
      this.direction = 1;
    }
    if (Math.random() < 0.08) this.direction *= -1;

    this.price = Math.round(newPrice * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h = Math.min(this.low24h, this.price);

    this.change += (Math.random() - 0.46) * 0.12;
    this.change = Math.max(this.MIN_CHANGE, Math.min(this.MAX_CHANGE, this.change));
    this.change = Math.round(this.change * 100) / 100;

    saveSnapshot('PAYAI', { price: this.price, change: this.change, high24h: this.high24h, low24h: this.low24h, savedAt: Date.now() });
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

export { PayAIPriceManager };
