// Live markets feed for the wallet's Markets screen. ALL displayed values are
// real: price, 24h change and 24h volume come from the shared api-server
// (/api/crypto-prices, a KuCoin proxy), sparklines from /api/crypto-sparklines
// (KuCoin hourly candles). BNC uses the platform's own deterministic price
// engine (the same source of truth the whole basonce ecosystem uses for BNC).

import { computeBncMarket, bncSparkline } from './bncMarket';

export interface MarketToken {
  symbol: string;
  name: string;
  iconUrl: string;
  color: string;
  price: number;
  change24h: number;
  volumeUsd: number;
  sparkline: number[];
  isBnc?: boolean;
}

interface TokenDef { symbol: string; name: string; color: string; }

const TOKENS: TokenDef[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'BNB', name: 'BNB', color: '#F3BA2F' },
  { symbol: 'SOL', name: 'Solana', color: '#14F195' },
  { symbol: 'XRP', name: 'XRP', color: '#23292F' },
  { symbol: 'TRX', name: 'TRON', color: '#EF0027' },
  { symbol: 'TON', name: 'Toncoin', color: '#0098EA' },
  { symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633' },
  { symbol: 'ADA', name: 'Cardano', color: '#0033AD' },
  { symbol: 'AVAX', name: 'Avalanche', color: '#E84142' },
  { symbol: 'LINK', name: 'Chainlink', color: '#2A5ADA' },
  { symbol: 'DOT', name: 'Polkadot', color: '#E6007A' },
  { symbol: 'MATIC', name: 'Polygon', color: '#8247E5' },
  { symbol: 'LTC', name: 'Litecoin', color: '#345D9D' },
  { symbol: 'SHIB', name: 'Shiba Inu', color: '#FFA409' },
  { symbol: 'UNI', name: 'Uniswap', color: '#FF007A' },
  { symbol: 'ATOM', name: 'Cosmos', color: '#2E3148' },
  { symbol: 'NEAR', name: 'NEAR Protocol', color: '#00C08B' },
  { symbol: 'APT', name: 'Aptos', color: '#06F7F7' },
  { symbol: 'ARB', name: 'Arbitrum', color: '#28A0F0' },
  { symbol: 'OP', name: 'Optimism', color: '#FF0420' },
  { symbol: 'FIL', name: 'Filecoin', color: '#0090FF' },
  { symbol: 'ETC', name: 'Ethereum Classic', color: '#328332' },
  { symbol: 'XLM', name: 'Stellar', color: '#7D00FF' },
  { symbol: 'BCH', name: 'Bitcoin Cash', color: '#0AC18E' },
];

export const MARKET_SYMBOLS = TOKENS.map((t) => t.symbol);

// Reliable symbol-keyed coin icons with a graceful fallback handled by the UI.
export function coinIconUrl(symbol: string): string {
  return `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;
}

interface CryptoPricesResponse {
  success: boolean;
  data: Record<string, { price: number; change: number; volume?: number }>;
}

interface SparklinesResponse {
  success: boolean;
  data: Record<string, number[]>;
}

export async function fetchMarkets(): Promise<MarketToken[]> {
  let priceMap: Record<string, { price: number; change: number; volume?: number }> = {};
  let sparkMap: Record<string, number[]> = {};
  const symbolsParam = MARKET_SYMBOLS.join(',');
  try {
    const [priceRes, sparkRes] = await Promise.all([
      fetch(`/api/crypto-prices?symbols=${symbolsParam}`),
      fetch(`/api/crypto-sparklines?symbols=${symbolsParam}`),
    ]);
    if (priceRes.ok) {
      const json = (await priceRes.json()) as CryptoPricesResponse;
      if (json?.success && json.data) priceMap = json.data;
    }
    if (sparkRes.ok) {
      const json = (await sparkRes.json()) as SparklinesResponse;
      if (json?.success && json.data) sparkMap = json.data;
    }
  } catch {
    /* fall through — BNC + any cached coins still render */
  }

  const bnc = computeBncMarket();
  const bncToken: MarketToken = {
    symbol: 'BNC',
    name: 'Basonce',
    iconUrl: '',
    color: '#F0B90B',
    price: bnc.price,
    change24h: bnc.change24h,
    volumeUsd: bnc.volumeMillions * 1_000_000,
    sparkline: bncSparkline(40),
    isBnc: true,
  };

  const coins: MarketToken[] = [];
  for (const def of TOKENS) {
    const live = priceMap[def.symbol];
    if (!live || !(live.price > 0)) continue;
    coins.push({
      symbol: def.symbol,
      name: def.name,
      iconUrl: coinIconUrl(def.symbol),
      color: def.color,
      price: live.price,
      change24h: live.change,
      volumeUsd: live.volume ?? 0,
      sparkline: sparkMap[def.symbol] ?? [],
    });
  }

  coins.sort((a, b) => b.volumeUsd - a.volumeUsd);
  return [bncToken, ...coins];
}

// Client-side estimate for the swap screen. Execution is authoritative on the
// server; this only powers the live "you receive" preview as the user types.
const SWAP_FEE = 0.005;
export function estimateSwap(
  fromAmount: number,
  fromPrice: number,
  toPrice: number,
): number {
  if (!(fromAmount > 0) || !(fromPrice > 0) || !(toPrice > 0)) return 0;
  return (fromAmount * fromPrice * (1 - SWAP_FEE)) / toPrice;
}
