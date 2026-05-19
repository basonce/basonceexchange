// BNC price manager — single global source of truth.
// Backed by the deterministic computeBncMarket() module so every place in the
// app (home banner, market list, trade page, futures, mini app, order book)
// shows the SAME price and change at the SAME moment for every user on Earth.

import { computeBncMarket } from './bncMarket';

class BNCPriceManager {
  private static instance: BNCPriceManager;

  private price: number = 1;
  private change: number = 0;
  private high24h: number = 1;
  private low24h: number = 1;
  private volume: number = 160_000_000;

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
  private notifySubscribers() { this.subscribers.forEach(cb => { try { cb(); } catch {} }); }
  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { BNCPriceManager };
