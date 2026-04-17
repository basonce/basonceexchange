import { supabase } from './supabase';
import type { AlphaToken } from '../types/alpha';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type PriceSubscriber = (prices: Record<string, number>) => void;

class AlphaPriceManager {
  private static instance: AlphaPriceManager;
  private prices: Record<string, number> = {};
  private priceChanges: Record<string, number> = {};
  private subscribers: PriceSubscriber[] = [];
  private simulationInterval: number | null = null;
  private dbSyncInterval: number | null = null;
  private initializedTokenIds: Set<string> = new Set();

  private constructor() {}

  static getInstance(): AlphaPriceManager {
    if (!AlphaPriceManager.instance) {
      AlphaPriceManager.instance = new AlphaPriceManager();
    }
    return AlphaPriceManager.instance;
  }

  initTokens(tokens: AlphaToken[]): void {
    tokens.forEach(t => {
      if (!this.initializedTokenIds.has(t.id) && t.current_price > 0) {
        this.prices[t.id] = t.current_price;
        this.priceChanges[t.id] = t.price_change_24h || 0;
        this.initializedTokenIds.add(t.id);
      }
    });
    this.ensureSimulationRunning();
  }

  private ensureSimulationRunning(): void {
    if (this.dbSyncInterval) return;
    // CLIENT-SIDE SIMULATION REMOVED — every device must show the SAME price.
    // We only read from the DB now. The server-side `alpha-price-updater`
    // edge function is the single source of truth for price movement.
    this.syncFromDB();
    this.dbSyncInterval = window.setInterval(() => {
      this.syncFromDB();
    }, 5000);
  }

  private async syncFromDB(): Promise<void> {
    try {
      const { data } = await supabase
        .from('alpha_tokens')
        .select('id, current_price, price_change_24h')
        .eq('status', 'active');

      if (data && data.length > 0) {
        data.forEach(t => {
          if (t.current_price > 0) {
            this.prices[t.id] = t.current_price;
            this.priceChanges[t.id] = t.price_change_24h || 0;
            this.initializedTokenIds.add(t.id);
          }
        });
        this.notifySubscribers();
      }

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/alpha-price-updater`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      } catch {}
    } catch {}
  }

  subscribe(callback: PriceSubscriber): () => void {
    this.subscribers.push(callback);
    if (Object.keys(this.prices).length > 0) {
      callback({ ...this.prices });
    }
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers(): void {
    const snapshot = { ...this.prices };
    this.subscribers.forEach(s => s(snapshot));
  }

  getPrice(tokenId: string): number {
    return this.prices[tokenId] || 0;
  }

  getAllPrices(): Record<string, number> {
    return { ...this.prices };
  }

  getPriceChange(tokenId: string): number {
    return this.priceChanges[tokenId] || 0;
  }

  destroy(): void {
    if (this.simulationInterval) { clearInterval(this.simulationInterval); this.simulationInterval = null; }
    if (this.dbSyncInterval) { clearInterval(this.dbSyncInterval); this.dbSyncInterval = null; }
    this.subscribers = [];
  }
}

export default AlphaPriceManager;
