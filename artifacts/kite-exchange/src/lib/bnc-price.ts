class BNCPriceManager {
  private static instance: BNCPriceManager;
  private price: number = 1.18;
  private change: number = 132.59;
  private high24h: number = 1.40;
  private low24h: number = 0.85;
  private marketCap: number = 180_000_000;
  private subscribers: Array<() => void> = [];
  private updateInterval: number | null = null;

  private basePrice: number = 1.18;
  private readonly MIN_PRICE = 0.85;
  private readonly MAX_PRICE = 1.40;
  private direction: number = 1;

  private constructor() {
    this.fetchAndInit();
  }

  static getInstance(): BNCPriceManager {
    if (!BNCPriceManager.instance) {
      BNCPriceManager.instance = new BNCPriceManager();
    }
    return BNCPriceManager.instance;
  }

  private async fetchAndInit() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase.from('bnc_price').select('*').eq('id', 1).maybeSingle();
      if (data && parseFloat(data.current_price) > 0) {
        this.price = parseFloat(data.current_price);
        this.basePrice = this.price;
        this.change = parseFloat(data.change_percentage);
        this.high24h = Math.max(this.MAX_PRICE, parseFloat(data.high_24h));
        this.low24h = Math.min(this.MIN_PRICE, parseFloat(data.low_24h));
        this.marketCap = parseFloat(data.market_cap);
      }
    } catch { }
    this.startLocalWalk();
  }

  private tick() {
    const volatility = 0.004 + Math.random() * 0.008;
    const step = this.price * volatility * this.direction;
    let newPrice = this.price + step;

    if (newPrice >= this.MAX_PRICE) {
      newPrice = this.MAX_PRICE - Math.random() * 0.02;
      this.direction = -1;
    } else if (newPrice <= this.MIN_PRICE) {
      newPrice = this.MIN_PRICE + Math.random() * 0.02;
      this.direction = 1;
    }

    if (Math.random() < 0.07) this.direction *= -1;

    this.price = Math.round(newPrice * 100000) / 100000;
    this.high24h = Math.max(this.high24h, this.price);
    this.low24h = Math.min(this.low24h, this.price);

    const ref = this.basePrice * 0.70;
    this.change = Math.round(((this.price - ref) / ref) * 10000) / 100;

    this.notifySubscribers();
  }

  private startLocalWalk() {
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

export { BNCPriceManager };
