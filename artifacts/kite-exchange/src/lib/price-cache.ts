import { supabase } from './supabase';

export interface CachedPrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  prevPrice: number;
  direction: 'up' | 'down' | 'neutral';
  updatedAt: number;
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const POLL_INTERVAL = 15000;
const BATCH_SIZE = 25;
const REQUEST_TIMEOUT = 15000;

class PriceCache {
  private static instance: PriceCache;
  private cache = new Map<string, CachedPrice>();
  private frozenCache = new Map<string, CachedPrice>();
  private subscribers = new Set<() => void>();
  private pollTimer: number | null = null;
  private allBinanceSymbols: string[] = [];
  private symbolToBinance = new Map<string, string>();
  private binanceToSymbol = new Map<string, string>();
  private ready = false;
  private initializing = false;
  private frozen = false;

  static getInstance(): PriceCache {
    if (!PriceCache.instance) {
      PriceCache.instance = new PriceCache();
    }
    return PriceCache.instance;
  }

  isReady(): boolean {
    return this.ready;
  }

  async init(): Promise<void> {
    if (this.ready || this.initializing) return;
    this.initializing = true;

    try {
      const { data: coins } = await supabase
        .from('supported_coins')
        .select('symbol, binance_symbol')
        .eq('is_active', true);

      if (!coins) return;

      this.allBinanceSymbols = [];
      this.symbolToBinance.clear();

      for (const coin of coins) {
        if (coin.binance_symbol) {
          this.allBinanceSymbols.push(coin.binance_symbol);
          this.symbolToBinance.set(coin.symbol, coin.binance_symbol);
          this.binanceToSymbol.set(coin.binance_symbol, coin.symbol);
        }
      }

      await this.fetchAllPrices();
      this.ready = true;
      this.startPolling();
    } catch (error) {
      console.error('PriceCache init failed:', error);
      this.ready = true;
    } finally {
      this.initializing = false;
    }
  }

  private async fetchAllPrices(): Promise<void> {
    if (this.allBinanceSymbols.length === 0) return;

    const success = await this.fetchBulkAll();
    if (!success) {
      await this.fetchInBatches();
    }
  }

  private async fetchBulkAll(): Promise<boolean> {
    try {
      const resp = await fetch(`${EDGE_URL}?endpoint=ticker24hr`, {
        headers: { 'Authorization': `Bearer ${ANON_KEY}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) return false;

      const symbolSet = new Set(this.allBinanceSymbols);
      let count = 0;

      for (const ticker of data) {
        if (ticker?.symbol && symbolSet.has(ticker.symbol)) {
          this.processTicker(ticker);
          count++;
        }
      }

      if (count > 0) {
        this.notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async fetchInBatches(): Promise<void> {
    const batches: string[][] = [];
    for (let i = 0; i < this.allBinanceSymbols.length; i += BATCH_SIZE) {
      batches.push(this.allBinanceSymbols.slice(i, i + BATCH_SIZE));
    }

    let anySuccess = false;

    const results = await Promise.allSettled(
      batches.map(batch => this.fetchBatch(batch))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        for (const ticker of result.value) {
          if (ticker?.symbol) {
            this.processTicker(ticker);
            anySuccess = true;
          }
        }
      }
    }

    if (anySuccess) {
      this.notify();
    }
  }

  private async fetchBatch(symbols: string[]): Promise<any[]> {
    try {
      const resp = await fetch(
        `${EDGE_URL}?endpoint=ticker24hr&symbols=${symbols.join(',')}`,
        {
          headers: { 'Authorization': `Bearer ${ANON_KEY}` },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        }
      );
      if (!resp.ok) return [];
      const data = await resp.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private processTicker(ticker: any): void {
    const symbol = ticker.symbol;
    const newPrice = parseFloat(ticker.lastPrice || '0');
    if (newPrice <= 0) return;

    const existing = this.cache.get(symbol);
    const prevPrice = existing?.price ?? newPrice;

    this.cache.set(symbol, {
      symbol,
      price: newPrice,
      change24h: parseFloat(ticker.priceChangePercent || '0'),
      high24h: parseFloat(ticker.highPrice || '0'),
      low24h: parseFloat(ticker.lowPrice || '0'),
      volume: parseFloat(ticker.quoteVolume || '0'),
      prevPrice,
      direction: newPrice > prevPrice ? 'up' : newPrice < prevPrice ? 'down' : 'neutral',
      updatedAt: Date.now(),
    });
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = window.setInterval(() => {
      if (!this.frozen) this.fetchAllPrices();
    }, POLL_INTERVAL);
  }

  freeze(frozenPrices: Record<string, any>): void {
    this.frozen = true;
    this.frozenCache.clear();

    for (const [sym, val] of Object.entries(frozenPrices)) {
      const binanceSym = this.symbolToBinance.get(sym) ?? sym;
      const cached: CachedPrice = {
        symbol: binanceSym,
        price: val.price ?? 0,
        change24h: val.change24h ?? 0,
        high24h: val.high24h ?? 0,
        low24h: val.low24h ?? 0,
        volume: val.volume ?? 0,
        prevPrice: val.price ?? 0,
        direction: 'neutral',
        updatedAt: Date.now(),
      };
      this.frozenCache.set(binanceSym, cached);
      this.frozenCache.set(sym, cached);
    }

    this.notify();
  }

  unfreeze(): void {
    this.frozen = false;
    this.frozenCache.clear();
    this.fetchAllPrices().then(() => this.notify());
  }

  isFrozen(): boolean {
    return this.frozen;
  }

  snapshotCurrentPrices(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    for (const [binanceSym, cached] of this.cache.entries()) {
      const coinSym = this.binanceToSymbol.get(binanceSym) ?? binanceSym.replace('USDT', '');
      snapshot[coinSym] = {
        price: cached.price,
        change24h: cached.change24h,
        high24h: cached.high24h,
        low24h: cached.low24h,
        volume: cached.volume,
      };
    }
    return snapshot;
  }

  get(binanceSymbol: string): CachedPrice | null {
    if (this.frozen) {
      return this.frozenCache.get(binanceSymbol) || this.cache.get(binanceSymbol) || null;
    }
    return this.cache.get(binanceSymbol) || null;
  }

  getBySymbol(coinSymbol: string): CachedPrice | null {
    if (this.frozen) {
      const direct = this.frozenCache.get(coinSymbol);
      if (direct) return direct;
      const binanceSymbol = this.symbolToBinance.get(coinSymbol);
      if (binanceSymbol) return this.frozenCache.get(binanceSymbol) || null;
      return null;
    }
    const binanceSymbol = this.symbolToBinance.get(coinSymbol);
    if (!binanceSymbol) return null;
    return this.cache.get(binanceSymbol) || null;
  }

  getBinanceSymbol(coinSymbol: string): string | undefined {
    return this.symbolToBinance.get(coinSymbol);
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify(): void {
    this.subscribers.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  destroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.subscribers.clear();
    this.cache.clear();
    this.frozenCache.clear();
    this.ready = false;
    this.frozen = false;
  }
}

export { PriceCache };
