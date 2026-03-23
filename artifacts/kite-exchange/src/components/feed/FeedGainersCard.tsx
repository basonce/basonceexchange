import { TrendingUp, TrendingDown } from 'lucide-react';
import { PriceCache } from '../../lib/price-cache';

interface GainerRow {
  symbol: string;
  pairLabel: string;
  price: number;
  change: number;
  contractType: 'Perp' | 'Spot';
}

interface FeedGainersCardProps {
  mode: 'gainers' | 'losers';
  rows: GainerRow[];
  title: string;
  subtitle?: string;
}

export default function FeedGainersCard({ mode, rows, title, subtitle }: FeedGainersCardProps) {
  const isGainers = mode === 'gainers';

  return (
    <div className="rounded-xl overflow-hidden border border-[#2B3139] mb-3" style={{ background: '#0d0f14' }}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-[#1E2329]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500">Hot</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] font-bold text-gray-500">Alpha</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] font-bold text-gray-500">New</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className={`text-[10px] font-bold ${isGainers ? 'text-white' : 'text-gray-500'}`}>Gainers</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className={`text-[10px] font-bold ${!isGainers ? 'text-white' : 'text-gray-500'}`}>Losers</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] font-bold text-gray-500">24h Vol</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span className="text-[10px] text-gray-500">Crypto</span>
        <span className="text-[10px] text-gray-600">·</span>
        <span className="text-[10px] text-gray-500">Spot</span>
        <span className="text-[10px] font-bold text-white border-b-2 border-[#F0B90B] pb-0.5">Futures</span>
      </div>

      <div className="px-3 pb-1">
        <div className="flex items-center justify-between text-[9px] text-gray-600 pb-1 border-b border-[#1E2329]">
          <span>USD-M &bull;</span>
          <span>Last Price</span>
          <span>24h chg%</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center py-1.5 border-b border-[#1E2329]/50 last:border-0">
            <div className="flex-1">
              <span className="text-[11px] font-bold text-white">{row.pairLabel}</span>
              <span className="ml-1 text-[9px] text-gray-500 bg-[#1E2329] px-1 py-0.5 rounded">{row.contractType}</span>
            </div>
            <div className="text-right mr-6">
              <div className="text-[11px] font-semibold text-white">{formatPrice(row.price)}</div>
              <div className="text-[9px] text-gray-500">${formatPrice(row.price)}</div>
            </div>
            <div
              className="text-[11px] font-bold px-2 py-1 rounded text-right min-w-[64px]"
              style={{
                background: row.change >= 0 ? '#0ECB8120' : '#F6465D20',
                color: row.change >= 0 ? '#0ECB81' : '#F6465D',
              }}
            >
              {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
            </div>
          </div>
        ))}
        <div className="flex items-center justify-end py-1.5">
          <span className="text-[10px] text-[#F0B90B] font-semibold">View More</span>
        </div>
      </div>

      <div className="px-3 pb-2 flex items-center justify-end gap-1">
        <span className="text-[9px] text-gray-600">&copy; Basonce</span>
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(5);
  return price.toFixed(8);
}

const GAINER_COINS = [
  { symbol: 'BTC', label: 'BTCUSDT', min: 85000, max: 105000 },
  { symbol: 'ETH', label: 'ETHUSDT', min: 2800, max: 4200 },
  { symbol: 'SOL', label: 'SOLUSDT', min: 90, max: 200 },
  { symbol: 'BNB', label: 'BNBUSDT', min: 450, max: 750 },
  { symbol: 'XRP', label: 'XRPUSDT', min: 0.4, max: 3.5 },
  { symbol: 'AVAX', label: 'AVAXUSDT', min: 15, max: 55 },
  { symbol: 'DOGE', label: 'DOGEUSDT', min: 0.05, max: 0.45 },
  { symbol: 'LINK', label: 'LINKUSDT', min: 8, max: 30 },
  { symbol: 'DOT', label: 'DOTUSDT', min: 4, max: 18 },
  { symbol: 'ADA', label: 'ADAUSDT', min: 0.2, max: 1.8 },
  { symbol: 'MATIC', label: 'MATICUSDT', min: 0.3, max: 2.5 },
  { symbol: 'OP', label: 'OPUSDT', min: 0.8, max: 5 },
  { symbol: 'ARB', label: 'ARBUSDT', min: 0.4, max: 3 },
  { symbol: 'INJ', label: 'INJUSDT', min: 8, max: 55 },
  { symbol: 'TIA', label: 'TIAUSDT', min: 3, max: 22 },
  { symbol: 'WIF', label: 'WIFUSDT', min: 0.5, max: 5 },
  { symbol: 'FLOKI', label: 'FLOKIUSDT', min: 0.00005, max: 0.0008 },
  { symbol: 'BONK', label: 'BONKUSDT', min: 0.000005, max: 0.00008 },
  { symbol: 'SEI', label: 'SEIUSDT', min: 0.1, max: 2 },
  { symbol: 'SUI', label: 'SUIUSDT', min: 0.5, max: 6 },
  { symbol: 'TRUMP', label: 'TRUMPUSDT', min: 1, max: 60 },
  { symbol: 'PEPE', label: 'PEPEUSDT', min: 0.000005, max: 0.00003 },
  { symbol: 'DOGS', label: 'DOGSUSDT', min: 0.0002, max: 0.003 },
  { symbol: 'PIXEL', label: 'PIXELUSDT', min: 0.005, max: 0.08 },
  { symbol: 'NAORIS', label: 'NAORIUSDT', min: 0.03, max: 0.5 },
  { symbol: 'TAG', label: 'TAGUSDT', min: 0.0001, max: 0.002 },
  { symbol: 'BANANA31', label: 'BANANASUSDT', min: 1, max: 25 },
  { symbol: 'RIVER', label: 'RIVERUSDT', min: 0.5, max: 8 },
];

export function generateGainersRows(mode: 'gainers' | 'losers', priceCache: PriceCache, count = 5): GainerRow[] {
  const shuffled = [...GAINER_COINS].sort(() => Math.random() - 0.5);
  const rows: GainerRow[] = [];

  for (const coin of shuffled) {
    if (rows.length >= count) break;
    const cached = priceCache.getBySymbol(coin.symbol);
    const price = cached && cached.price > 0 ? cached.price : coin.min + Math.random() * (coin.max - coin.min);
    const change = mode === 'gainers'
      ? 8 + Math.random() * 45
      : -(5 + Math.random() * 30);

    rows.push({
      symbol: coin.symbol,
      pairLabel: coin.label,
      price,
      change: Number(change.toFixed(2)),
      contractType: 'Perp',
    });
  }

  return rows.sort((a, b) =>
    mode === 'gainers' ? b.change - a.change : a.change - b.change
  );
}
