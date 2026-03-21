const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const EDGE_HEADERS = {
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

export interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface BinanceDepth {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

export async function fetchBinanceTickers(): Promise<BinanceTicker[]> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}?endpoint=ticker24hr`, { headers: EDGE_HEADERS });
    if (!response.ok) throw new Error('Failed to fetch tickers');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return [];
  }
}

export async function fetchBinanceTicker(symbol: string): Promise<BinanceTicker | null> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}?endpoint=ticker24hr&symbol=${symbol}`, { headers: EDGE_HEADERS });
    if (!response.ok) throw new Error('Failed to fetch ticker');
    return await response.json();
  } catch (error) {
    console.error('Error fetching ticker:', error);
    return null;
  }
}

export async function fetchBinanceDepth(symbol: string, limit: number = 20): Promise<BinanceDepth | null> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}?endpoint=depth&symbol=${symbol}&limit=${limit}`, { headers: EDGE_HEADERS });
    if (!response.ok) throw new Error('Failed to fetch depth');
    return await response.json();
  } catch (error) {
    console.error('Error fetching depth:', error);
    return null;
  }
}

export async function fetchBinanceKlines(
  symbol: string,
  interval: string = '1m',
  limit: number = 100
): Promise<any[]> {
  try {
    const response = await fetch(
      `${EDGE_FUNCTION_URL}?endpoint=klines&symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { headers: EDGE_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) throw new Error('Failed to fetch klines');
    const data = await response.json();
    return data.map((k: any) => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch {
    return [];
  }
}

export function connectBinanceWebSocket(
  symbol: string,
  onMessage: (data: any) => void
): WebSocket {
  let running = true;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const poll = async () => {
    if (!running) return;
    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?endpoint=ticker24hr&symbol=${symbol}`, { headers: EDGE_HEADERS });
      if (response.ok) {
        const ticker = await response.json();
        if (ticker && ticker.lastPrice) {
          onMessage({
            c: ticker.lastPrice,
            P: ticker.priceChangePercent,
            h: ticker.highPrice,
            l: ticker.lowPrice,
            v: ticker.volume,
            q: ticker.quoteVolume,
            o: ticker.openPrice,
          });
        }
      }
    } catch {}
  };

  poll();
  pollInterval = setInterval(poll, 5000);

  const fakeWs = {
    readyState: 1,
    close: () => {
      running = false;
      if (pollInterval) clearInterval(pollInterval);
      fakeWs.readyState = 3;
    },
    send: () => {},
    onmessage: null,
    onerror: null,
    onclose: null,
    onopen: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    binaryType: 'blob' as BinaryType,
    bufferedAmount: 0,
    extensions: '',
    protocol: '',
    url: '',
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  return fakeWs as unknown as WebSocket;
}

const CRYPTO_LOGO_MAP: Record<string, string> = {
  'BTC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  'ETH': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  'BNB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
  'SOL': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  'XRP': 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
  'ADA': 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png',
  'DOGE': 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
  'AVAX': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
  'DOT': 'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png',
  'MATIC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
  'LINK': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
  'UNI': 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png',
  'LTC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/2.png',
  'ATOM': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3794.png',
  'ETC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1321.png',
  'XLM': 'https://s2.coinmarketcap.com/static/img/coins/64x64/512.png',
  'NEAR': 'https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png',
  'ALGO': 'https://s2.coinmarketcap.com/static/img/coins/64x64/4030.png',
  'VET': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3077.png',
  'ICP': 'https://s2.coinmarketcap.com/static/img/coins/64x64/8916.png',
  'FIL': 'https://s2.coinmarketcap.com/static/img/coins/64x64/2280.png',
  'APT': 'https://s2.coinmarketcap.com/static/img/coins/64x64/21794.png',
  'ARB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png',
  'OP': 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png',
  'INJ': 'https://s2.coinmarketcap.com/static/img/coins/64x64/7226.png',
  'SUI': 'https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png',
  'SEI': 'https://s2.coinmarketcap.com/static/img/coins/64x64/23149.png',
  'TIA': 'https://s2.coinmarketcap.com/static/img/coins/64x64/22861.png',
  'RENDER': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5690.png',
  'FTM': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3513.png',
  'PEPE': 'https://s2.coinmarketcap.com/static/img/coins/64x64/24478.png',
  'SHIB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5994.png',
  'WIF': 'https://s2.coinmarketcap.com/static/img/coins/64x64/28752.png',
  'BONK': 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  'FLOKI': 'https://s2.coinmarketcap.com/static/img/coins/64x64/10804.png',
  'TRX': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
};

export function getCryptoLogoUrl(symbol: string): string {
  const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '').replace('BTC', '').replace('ETH', '').toUpperCase();
  return CRYPTO_LOGO_MAP[baseSymbol] || `https://ui-avatars.com/api/?name=${baseSymbol}&background=f0b90b&color=000&size=128&bold=true`;
}

export const TOP_TRADING_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'ETCUSDT',
  'XLMUSDT', 'NEARUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT',
  'FILUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT',
  'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'RENDERUSDT', 'FTMUSDT',
  'PEPEUSDT', 'SHIBUSDT', 'WIFUSDT', 'BONKUSDT', 'FLOKIUSDT'
];
