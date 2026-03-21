import { Zap, TrendingUp, TrendingDown, Shield, Globe, BarChart2, Cpu, AlertTriangle, Clock, ExternalLink } from 'lucide-react';

export type BasonceCategory = 'BREAKING' | 'ANALYSIS' | 'MARKET' | 'REGULATION' | 'ALERT' | 'ONCHAIN' | 'TECHNOLOGY' | 'DeFi' | 'WHALE';

export interface BasonceNewsItem {
  id: string;
  category: BasonceCategory;
  title: string;
  summary: string;
  coin?: string;
  change?: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  age: string;
  likes: number;
  comments: number;
  shares: number;
  url?: string;
  source?: string;
}

const CATEGORY_META: Record<string, { color: string; icon: any; label: string }> = {
  BREAKING:   { color: '#F6465D', icon: Zap,           label: 'BREAKING'   },
  ANALYSIS:   { color: '#F0B90B', icon: BarChart2,     label: 'ANALYSIS'   },
  MARKET:     { color: '#F0B90B', icon: TrendingUp,    label: 'MARKET'     },
  REGULATION: { color: '#3B82F6', icon: Shield,        label: 'REGULATION' },
  ALERT:      { color: '#F59E0B', icon: AlertTriangle, label: 'ALERT'      },
  ONCHAIN:    { color: '#06B6D4', icon: Globe,         label: 'ON-CHAIN'   },
  TECHNOLOGY: { color: '#0ECB81', icon: Cpu,           label: 'TECH'       },
  DeFi:       { color: '#06B6D4', icon: BarChart2,     label: 'DeFi'       },
  WHALE:      { color: '#06B6D4', icon: Globe,         label: 'WHALE'      },
};

export const BASONCE_NEWS_POOL: Omit<BasonceNewsItem, 'id' | 'age' | 'likes' | 'comments' | 'shares'>[] = [
  { category: 'BREAKING',   title: 'Bitcoin ETF inflows hit $2.1B in a single day — new all-time record',       summary: "BlackRock's IBIT alone absorbed $980M. Institutional demand accelerating as BTC consolidates near $95K.",                                                           coin: 'BTC', change: 3.2,  sentiment: 'bullish' },
  { category: 'ANALYSIS',   title: 'BTC weekly close above $92K — bull market structure intact',                summary: 'Higher highs confirmed on weekly timeframe. RSI cooling from overbought. Key support at $88,500 must hold.',                                                   coin: 'BTC', change: 1.8,  sentiment: 'bullish' },
  { category: 'MARKET',     title: 'Ethereum gas fees drop to 3-year low as Dencun upgrade takes effect',       summary: 'Average transaction cost now under $0.50 on mainnet. L2 activity surging — Arbitrum and Base hit combined 45M daily txs.',                                   coin: 'ETH', change: 2.4,  sentiment: 'bullish' },
  { category: 'BREAKING',   title: 'Solana ecosystem raises $750M in Q1 — largest quarter ever',                summary: 'VCs doubling down on Solana DeFi, gaming, and payments. SOL validator count reaches 3,800.',                                                                    coin: 'SOL', change: 5.7,  sentiment: 'bullish' },
  { category: 'ALERT',      title: 'Whale alert: 85,000 ETH moved from Binance to cold wallet',                 summary: '$238M worth of ETH withdrawn from exchange. Decreasing exchange supply historically precedes price appreciation.',                                            coin: 'ETH', change: 1.1,  sentiment: 'bullish' },
  { category: 'REGULATION', title: 'US Senate passes crypto market structure bill 67-31',                        summary: 'Landmark legislation provides regulatory clarity for digital assets. BTC and ETH explicitly excluded from securities classification.',                         coin: 'BTC', change: 4.9,  sentiment: 'bullish' },
  { category: 'ANALYSIS',   title: 'Altcoin season index reaches 78 — rotation from BTC accelerating',          summary: 'SOL, AVAX, INJ leading gains. ETH dominance recovering. Historical patterns suggest 60-90 day altcoin outperformance window.',                                               sentiment: 'bullish' },
  { category: 'ONCHAIN',    title: 'Bitcoin long-term holder supply hits new ATH — 14.8M BTC dormant',          summary: '70.5% of circulating supply unmoved for 6+ months. Diamond hands signal strong conviction despite recent volatility.',                                       coin: 'BTC', change: 2.3,  sentiment: 'bullish' },
  { category: 'MARKET',     title: 'XRP volume surpasses ETH on DEXs for first time — $4.2B in 24h',           summary: 'Post-SEC settlement euphoria driving XRP to multi-year highs. On-chain activity up 340% month-over-month.',                                                  coin: 'XRP', change: 12.4, sentiment: 'bullish' },
  { category: 'ALERT',      title: 'BTC funding rates turn negative on major exchanges — long squeeze risk',    summary: 'Negative funding signals short-term correction possible. Historically a reset opportunity before next leg up. Watch $89K support.',                        coin: 'BTC', change: -3.1, sentiment: 'bearish' },
  { category: 'BREAKING',   title: 'MicroStrategy adds 21,000 BTC — total treasury hits 226,000 BTC',          summary: "Michael Saylor announces latest purchase at average $91,200. Company's BTC position now worth over $20 billion.",                                           coin: 'BTC', change: 2.7,  sentiment: 'bullish' },
  { category: 'ANALYSIS',   title: 'AVAX cup-and-handle pattern breaks out on daily chart',                     summary: 'Technical target at $58. Volume confirmation strong. DeFi TVL on Avalanche crossed $12B — fundamental backdrop supports move.',                             coin: 'AVAX', change: 8.3, sentiment: 'bullish' },
  { category: 'ONCHAIN',    title: 'Tether mints $2B USDT — largest single issuance in 8 months',              summary: 'Fresh liquidity entering the market. Historically, large USDT mints precede significant upward price action within 7-14 days.',                                          sentiment: 'bullish' },
  { category: 'MARKET',     title: 'Crypto total market cap crosses $3.5T for first time in history',          summary: 'New ATH for total market cap. BTC dominance at 52.3%. Analyst consensus: next target $4T before any meaningful correction.',                                            sentiment: 'bullish' },
  { category: 'REGULATION', title: 'EU MiCA framework fully in force — crypto exchanges scramble to comply',   summary: 'New licensing requirements affect 350+ exchanges operating in EU. Binance, Coinbase and Kraken already fully licensed.',                                                 sentiment: 'neutral'  },
  { category: 'BREAKING',   title: 'BlackRock files for spot SOL ETF — approval expected in 2025',             summary: 'Third spot crypto ETF from BlackRock after BTC and ETH. Filing signals institutional demand for Solana exposure growing rapidly.',                          coin: 'SOL', change: 15.8, sentiment: 'bullish' },
  { category: 'ALERT',      title: 'Mt. Gox trustee moves 10,000 BTC — distribution timeline updated',        summary: 'Remaining creditor distributions accelerating. Market absorbed previous tranches well. Long-term impact expected to be minimal.',                            coin: 'BTC', change: -1.8, sentiment: 'neutral'  },
  { category: 'ANALYSIS',   title: 'INJ, TIA, SEI showing relative strength — Cosmos ecosystem waking up',    summary: 'Interchain protocols outperforming BTC by 3x this week. IBC volume hits $8B monthly record. Watch for continued rotation.',                                               sentiment: 'bullish' },
];

export default function BasonceNewsCard({ item }: { item: BasonceNewsItem }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.MARKET;
  const Icon = meta.icon;

  return (
    <div
      className="rounded-xl mb-3 overflow-hidden bg-[#1E2026] border border-[#2B3139]"
      style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded"
              style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
            <div className="flex items-center gap-1.5 bg-[#2B3139] pl-1 pr-2 py-0.5 rounded">
              <div className="relative w-5 h-5 flex-shrink-0">
                <div
                  className="absolute inset-[-3px] rounded-full animate-spin"
                  style={{
                    background: 'conic-gradient(from 0deg, #F0B90B, #F8D12F, transparent, #F0B90B)',
                    opacity: 0.85,
                  }}
                />
                <div
                  className="absolute inset-[-2px] rounded-full animate-pulse"
                  style={{ boxShadow: '0 0 8px 3px #F0B90B88' }}
                />
                <div className="absolute inset-0 rounded-full overflow-hidden border border-[#F0B90B]">
                  <img src="/BASONCE_LOGO_SON_BITEN copy.png" alt="B" className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-300">Basonce News</span>
            </div>
            {item.coin && (
              <span className="text-[10px] font-bold text-gray-400 bg-[#2B3139] px-2 py-0.5 rounded">
                {item.coin}
              </span>
            )}
          </div>
          {item.change !== undefined && (
            <span
              className="text-xs font-bold flex items-center gap-0.5"
              style={{ color: item.change >= 0 ? '#0ECB81' : '#F6465D' }}
            >
              {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change >= 0 ? '+' : ''}{item.change}%
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-white leading-snug mb-2">{item.title}</h3>

        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{item.summary}</p>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.source || 'CryptoNews'}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>{item.age}</span>
            {item.sentiment !== 'neutral' && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span style={{ color: item.sentiment === 'bullish' ? '#0ECB81' : '#F6465D' }}>
                  {item.sentiment === 'bullish' ? 'Bullish' : 'Bearish'}
                </span>
              </>
            )}
          </div>
          {item.url && (
            <button
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              onClick={() => window.open(item.url, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
              Read more
            </button>
          )}
        </div>

        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-[#2B3139]">
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-[#F6465D] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">{item.likes.toLocaleString()}</span>
          </button>
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">{item.comments}</span>
          </button>
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-xs">{item.shares}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
