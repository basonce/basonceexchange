import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type PriceSubscriber = (prices: Record<string, number>) => void;

class AlphaPriceManager {
  private static instance: AlphaPriceManager;
  private prices: Record<string, number> = {};
  private subscribers: PriceSubscriber[] = [];
  private updateInterval: number | null = null;
  private isUpdating = false;

  private constructor() {
    this.startUpdates();
  }

  static getInstance(): AlphaPriceManager {
    if (!AlphaPriceManager.instance) {
      AlphaPriceManager.instance = new AlphaPriceManager();
    }
    return AlphaPriceManager.instance;
  }

  private async triggerPriceUpdate(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/alpha-price-updater`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) return;

      const { data } = await supabase
        .from('alpha_tokens')
        .select('id, current_price')
        .eq('status', 'active');

      if (data) {
        data.forEach(t => { this.prices[t.id] = t.current_price; });
        this.notifySubscribers();
      }
    } catch {
    } finally {
      this.isUpdating = false;
    }
  }

  private startUpdates(): void {
    this.triggerPriceUpdate();
    this.updateInterval = window.setInterval(() => {
      this.triggerPriceUpdate();
    }, 30000);
  }

  subscribe(callback: PriceSubscriber): () => void {
    this.subscribers.push(callback);
    if (Object.keys(this.prices).length > 0) {
      callback(this.prices);
    }
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(s => s({ ...this.prices }));
  }

  getPrice(tokenId: string): number {
    return this.prices[tokenId] || 0;
  }

  getAllPrices(): Record<string, number> {
    return { ...this.prices };
  }

  forceUpdate(): void {
    this.triggerPriceUpdate();
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.subscribers = [];
  }
}

export default AlphaPriceManager;
