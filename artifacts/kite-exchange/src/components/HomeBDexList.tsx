import React, { useEffect, useState, useCallback } from 'react';

interface DexToken {
  symbol: string;
  name: string;
  poolAddress: string;
  baseAddress: string;
  icon: string | null;
  priceUsd: number;
  priceBnb: number;
  priceChange24h: number;
  volume24h: number;
  dexUrl: string;
}

const SKIP_SYMBOLS = new Set([
  'USDT','USDC','BUSD','DAI','FDUSD','TUSD','FRAX','USDD','USDP','GUSD',
  'WBNB','BNB','WETH','ETH','WBTC','BTC','BTCB',
]);

const formatVolume = (v: number): string => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const formatPrice = (n: number): string => {
  if (n === 0) return '0';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  if (n >= 0.0001) return n.toFixed(6);
  if (n >= 0.000001) return n.toFixed(8);
  return n.toExponential(2);
};

const formatBnb = (n: number): string => {
  if (n === 0) return '0';
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(5);
  if (n >= 0.000001) return n.toFixed(6);
  return n.toExponential(2);
};

const TokenLogo: React.FC<{ icon: string | null; symbol: string }> = ({ icon, symbol }) => {
  const [imgOk, setImgOk] = useState(!!icon);
  useEffect(() => { setImgOk(!!icon); }, [icon]);

  const colors = [
    '#F0B90B','#0ECB81','#F6465D','#3B82F6','#A855F7',
    '#EC4899','#EF4444','#22D3EE','#FB923C','#84CC16',
  ];
  const color = colors[symbol.charCodeAt(0) % colors.length];
  const letter = symbol.slice(0, 2).toUpperCase();

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#2B3139]"
      style={{ background: imgOk ? 'transparent' : color }}>
      {imgOk && icon ? (
        <img
          src={icon}
          alt={symbol}
          className="w-full h-full object-cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[11px] font-bold text-black">{letter}</span>
        </div>
      )}
    </div>
  );
};

const SkeletonRow = () => (
  <div className="flex items-center px-4 py-3 border-b border-[#1E2329]">
    <div className="w-10 h-10 rounded-full bg-[#1E2329] animate-pulse flex-shrink-0" />
    <div className="ml-3 flex-1">
      <div className="w-14 h-3.5 bg-[#1E2329] rounded animate-pulse mb-1.5" />
      <div className="w-16 h-3 bg-[#1E2329] rounded animate-pulse" />
    </div>
    <div className="ml-auto text-right">
      <div className="w-20 h-3.5 bg-[#1E2329] rounded animate-pulse mb-1.5" />
      <div className="w-16 h-3 bg-[#1E2329] rounded animate-pulse" />
    </div>
    <div className="ml-3 w-16 h-8 bg-[#1E2329] rounded animate-pulse" />
  </div>
);

async function fetchBscTopTokens(): Promise<DexToken[]> {
  const results: DexToken[] = [];
  const seen = new Set<string>();

  // Fetch 2 pages of trending BSC pools (they have logos from CoinGecko)
  // Plus 1 page of top-volume pools (catches newer tokens)
  const urls = [
    'https://api.geckoterminal.com/api/v2/networks/bsc/trending_pools?include=base_token,quote_token&page=1',
    'https://api.geckoterminal.com/api/v2/networks/bsc/trending_pools?include=base_token,quote_token&page=2',
    'https://api.geckoterminal.com/api/v2/networks/bsc/pools?sort=h24_volume_usd_desc&include=base_token,quote_token&page=1',
  ];

  const responses = await Promise.allSettled(urls.map(u => fetch(u).then(r => r.json())));

  for (const res of responses) {
    if (res.status !== 'fulfilled') continue;
    const d = res.value;
    const pools: any[] = d.data || [];
    const included: any[] = d.included || [];
    const tokMap: Record<string, any> = Object.fromEntries(included.map((t: any) => [t.id, t]));

    for (const pool of pools) {
      const attr = pool.attributes || {};
      const baseId: string = pool.relationships?.base_token?.data?.id || '';
      const quoteId: string = pool.relationships?.quote_token?.data?.id || '';
      const baseTok = tokMap[baseId]?.attributes || {};
      const sym: string = baseTok.symbol || '';

      if (!sym || SKIP_SYMBOLS.has(sym.toUpperCase())) continue;
      if (seen.has(baseId)) {
        // Update volume if we already have this token but found higher volume
        const existing = results.find(t => t.baseAddress === baseId.replace('bsc_', ''));
        if (existing) {
          const vol = parseFloat(attr.volume_usd?.h24 || '0');
          if (vol > existing.volume24h) existing.volume24h = vol;
        }
        continue;
      }
      seen.add(baseId);

      const priceUsd = parseFloat(attr.base_token_price_usd || '0');
      const priceBnb = parseFloat(attr.base_token_price_native_currency || '0');
      const chg24h = parseFloat(attr.price_change_percentage?.h24 || '0');
      const vol24h = parseFloat(attr.volume_usd?.h24 || '0');

      // Skip dust, micro-prices, or non-ASCII symbols (e.g. Chinese characters)
      if (priceUsd === 0 || vol24h < 100_000) continue;
      if (!/^[A-Za-z0-9._-]{1,15}$/.test(sym)) continue;

      results.push({
        symbol: sym,
        name: baseTok.name || sym,
        poolAddress: pool.attributes?.address || '',
        baseAddress: baseId.replace('bsc_', ''),
        icon: baseTok.image_url || null,
        priceUsd,
        priceBnb,
        priceChange24h: chg24h,
        volume24h: vol24h,
        dexUrl: `https://www.geckoterminal.com/bsc/pools/${pool.attributes?.address || ''}`,
      });
    }
  }

  // Sort by 24h volume descending (like Binance Alpha default)
  return results.sort((a, b) => b.volume24h - a.volume24h).slice(0, 30);
}

const HomeBDexList: React.FC = () => {
  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchBscTopTokens();
      setTokens(data);
      setLastUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="bg-[#0B0E11]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2B3139]">
        <div className="flex items-center gap-2">
          <span className="text-[#F0B90B] text-xs font-bold">BSC Chain</span>
          <span className="text-[#848E9C] text-[11px]">via GeckoTerminal</span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[#848E9C] text-[10px]">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
          <span className="text-[#0ECB81] text-[11px] font-semibold">LIVE</span>
        </div>
      </div>

      {/* Column headers — same as Binance Alpha */}
      <div className="flex items-center px-4 py-2 border-b border-[#2B3139]">
        <span className="text-[#848E9C] text-xs flex-1">Name / Vol</span>
        <span className="text-[#848E9C] text-xs w-[120px] text-right">Last Price</span>
        <span className="text-[#848E9C] text-xs w-[80px] text-right">24h Chg%</span>
      </div>

      {/* Skeletons */}
      {loading && Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}

      {/* Error */}
      {!loading && error && (
        <div className="py-16 text-center text-[#848E9C]">
          <div className="text-4xl mb-3">🔗</div>
          <div className="text-sm font-medium mb-1">DEX data unavailable</div>
          <div className="text-xs">Check your connection</div>
        </div>
      )}

      {/* Token rows */}
      {!loading && !error && tokens.map((token) => {
        const isUp = token.priceChange24h >= 0;
        const chgAbs = Math.min(Math.abs(token.priceChange24h), 9999.99);
        const chgStr = `${isUp ? '+' : '-'}${chgAbs.toFixed(2)}%`;

        return (
          <div
            key={token.baseAddress}
            className="flex items-center px-4 py-3 border-b border-[#1E2329] active:bg-[#1E2329] transition-colors cursor-pointer"
            onClick={() => window.open(token.dexUrl, '_blank')}
          >
            {/* Logo */}
            <TokenLogo icon={token.icon} symbol={token.symbol} />

            {/* Name + volume */}
            <div className="ml-3 flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{token.symbol}</div>
              <div className="text-[#848E9C] text-xs">{formatVolume(token.volume24h)}</div>
            </div>

            {/* Price */}
            <div className="w-[120px] text-right pr-3">
              <div className="text-white text-sm font-medium tabular-nums">
                {formatPrice(token.priceUsd)}
              </div>
              <div className="text-[#848E9C] text-[11px] tabular-nums">
                ł{formatBnb(token.priceBnb)}
              </div>
            </div>

            {/* 24h change badge */}
            <div
              className={`w-[72px] py-1.5 rounded text-xs font-bold text-center tabular-nums flex-shrink-0 ${
                isUp ? 'bg-[#0ECB81] text-black' : 'bg-[#F6465D] text-white'
              }`}
            >
              {chgStr}
            </div>
          </div>
        );
      })}

      {!loading && !error && tokens.length > 0 && (
        <div className="px-4 py-4 text-center text-[#848E9C] text-[11px] border-t border-[#2B3139]">
          Powered by GeckoTerminal · BSC Chain · Refreshes every 30s
        </div>
      )}
    </div>
  );
};

export default HomeBDexList;
