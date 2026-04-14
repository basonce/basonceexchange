interface BDexTokenInfo {
  poolAddress: string;
  baseAddress: string;
  price: number;
  change24h: number;
  logoUrl: string;
  name: string;
  volume24h: number;
  high24h: number;
  low24h: number;
}

class BDexPriceService {
  private tokens: Map<string, BDexTokenInfo> = new Map();

  register(symbol: string, info: BDexTokenInfo) {
    this.tokens.set(symbol, { ...info });
  }

  getInfo(symbol: string): BDexTokenInfo | undefined {
    return this.tokens.get(symbol);
  }

  getPrice(symbol: string): number {
    return this.tokens.get(symbol)?.price ?? 0;
  }

  getChange(symbol: string): number {
    return this.tokens.get(symbol)?.change24h ?? 0;
  }

  getPoolAddress(symbol: string): string {
    return this.tokens.get(symbol)?.poolAddress ?? '';
  }

  getLogo(symbol: string): string {
    const info = this.tokens.get(symbol);
    if (!info) return '';
    if (info.logoUrl) return info.logoUrl;
    if (info.baseAddress) {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${info.baseAddress}/logo.png`;
    }
    return '';
  }

  getBaseAddress(symbol: string): string {
    return this.tokens.get(symbol)?.baseAddress ?? '';
  }

  getVolume(symbol: string): number {
    return this.tokens.get(symbol)?.volume24h ?? 0;
  }

  getHigh(symbol: string): number {
    return this.tokens.get(symbol)?.high24h ?? 0;
  }

  getLow(symbol: string): number {
    return this.tokens.get(symbol)?.low24h ?? 0;
  }

  async fetchLatestPrice(symbol: string): Promise<number> {
    const poolAddress = this.getPoolAddress(symbol);
    if (!poolAddress) return this.getPrice(symbol);
    try {
      const res = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/bsc/pools/${poolAddress}?include=base_token`,
        { headers: { Accept: 'application/json;version=20230302' } }
      );
      if (!res.ok) return this.getPrice(symbol);
      const json = await res.json();
      const attrs = json?.data?.attributes;
      const price = parseFloat(attrs?.base_token_price_usd ?? '0');
      if (price > 0) {
        const info = this.tokens.get(symbol);
        if (info) {
          const oldPrice = info.price;
          info.price = price;
          const change = parseFloat(attrs?.price_change_percentage?.h24 ?? String(info.change24h));
          if (!isNaN(change)) info.change24h = change;
          const vol = parseFloat(attrs?.volume_usd?.h24 ?? '0');
          if (vol > 0) info.volume24h = vol;
          if (oldPrice > 0) {
            if (info.high24h <= 0) info.high24h = price * (1 + Math.abs(info.change24h / 100) + 0.02);
            if (info.low24h <= 0) info.low24h = price * (1 - Math.abs(info.change24h / 100) - 0.02);
            info.high24h = Math.max(info.high24h, price);
            info.low24h = Math.min(info.low24h, price > 0 ? price : info.low24h);
          }
        }
        return price;
      }
    } catch {}
    return this.getPrice(symbol);
  }

  async fetchOhlcv(
    symbol: string,
    timeframe: string,
    limit = 200
  ): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
    const poolAddress = this.getPoolAddress(symbol);
    if (!poolAddress) return [];

    let path = 'day';
    let aggregate = 1;
    if (timeframe === '15m') { path = 'minute'; aggregate = 15; }
    else if (timeframe === '1h' || timeframe === '60m') { path = 'hour'; aggregate = 1; }
    else if (timeframe === '4h') { path = 'hour'; aggregate = 4; }
    else if (timeframe === '1d' || timeframe === 'D') { path = 'day'; aggregate = 1; }

    try {
      const res = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/bsc/pools/${poolAddress}/ohlcv/${path}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base`,
        { headers: { Accept: 'application/json;version=20230302' } }
      );
      if (!res.ok) return [];
      const json = await res.json();
      const raw: number[][] = json?.data?.attributes?.ohlcv_list ?? [];
      return raw
        .map(([t, o, h, l, c, v]) => ({
          time: Math.floor(t),
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v,
        }))
        .sort((a, b) => a.time - b.time);
    } catch {
      return [];
    }
  }

  isBDex(symbol: string): boolean {
    return symbol.startsWith('BDEX_');
  }

  displaySymbol(symbol: string): string {
    if (!this.isBDex(symbol)) return symbol;
    return symbol.replace('BDEX_', '');
  }
}

export const bdexPriceService = new BDexPriceService();
