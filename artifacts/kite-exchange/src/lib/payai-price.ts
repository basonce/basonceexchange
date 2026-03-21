class PayAIPriceManager {
  private static instance: PayAIPriceManager;
  private price: number = 0.003;
  private change: number = 0;
  private high24h: number = 0.00318;
  private low24h: number = 0.00284;
  private marketCap: number = 3200000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private constructor() {
    this.startPriceUpdates();
  }

  static getInstance(): PayAIPriceManager {
    if (!PayAIPriceManager.instance) {
      PayAIPriceManager.instance = new PayAIPriceManager();
    }
    return PayAIPriceManager.instance;
  }

  private async fetchPriceFromServer() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payai-price-updater`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      try {
        await fetch(apiUrl, { method: 'POST', headers });
      } catch {
        // silent
      }

      const { data, error } = await supabase
        .from('payai_price')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) return;

      if (data) {
        this.price = parseFloat(data.current_price);
        this.change = parseFloat(data.change_percentage);
        this.high24h = parseFloat(data.high_24h);
        this.low24h = parseFloat(data.low_24h);
        this.marketCap = parseFloat(data.market_cap);
        this.notifySubscribers();
      }
    } catch {
      // silent
    }
  }

  private async startPriceUpdates() {
    await this.fetchPriceFromServer();
    this.updateInterval = window.setInterval(() => {
      this.fetchPriceFromServer();
    }, 30000);
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

export { PayAIPriceManager };
