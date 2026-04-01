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
  private direction: number = 1;

  private constructor() {
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

    const basePrice = this.MIN_PRICE + (this.MAX_PRICE - this.MIN_PRICE) * 0.3;
    this.change = Math.round(((this.price - basePrice) / basePrice) * 10000) / 100;

    this.notifySubscribers();
  }

  private startPriceUpdates() {
    this.updateInterval = window.setInterval(() => {
      this.tick();
    }, 3000);
  }

  getPrice(): number { return this.price; }
  getChange(): number { return this.change; }
  getHigh24h(): number { return this.high24h; }
  getLow24h(): number { return this.low24h; }
  getMarketCap(): number { return this.marketCap; }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}

export { SZNPPriceManager };
