// BNC price manager — single global source of truth, backed by the deterministic
// computeBncMarket() engine so every surface shows the same price at the same moment.

import { computeBncMarket } from './bncMarket';

class BNCPriceManager {
  private static instance: BNCPriceManager;

  private price = 1;
  private change = 0;
  private high24h = 1;
  private low24h = 1;
  private volume = 160_000_000;

  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private constructor() {
    this.refresh();
    this.updateInterval = window.setInterval(() => this.refresh(), 700);
  }

  static getInstance(): BNCPriceManager {
    if (!BNCPriceManager.instance) BNCPriceManager.instance = new BNCPriceManager();
    return BNCPriceManager.instance;
  }

  private refresh() {
    const m = computeBncMarket();
    this.price = Math.round(m.price * 10000) / 10000;
    this.change = Math.round(m.change24h * 100) / 100;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h = this.low24h > 0 ? Math.min(this.low24h, this.price) : this.price;
    this.volume = Math.round(m.volumeMillions * 1_000_000);
    this.notifySubscribers();
  }

  getPrice() { return this.price; }
  getChange() { return this.change; }
  getHigh24h() { return this.high24h; }
  getLow24h() { return this.low24h; }
  getVolume() { return this.volume; }

  subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(x => x !== cb); };
  }
  private notifySubscribers() { this.subscribers.forEach(cb => { try { cb(); } catch {} }); }
  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { BNCPriceManager };
