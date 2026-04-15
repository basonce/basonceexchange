import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { BDexToken } from '../pages/BDexTradePage';

type DexToken = BDexToken;

const SKIP_SYMBOLS = new Set([
  'USDT','USDC','BUSD','DAI','FDUSD','TUSD','FRAX','USDD','USDP','GUSD',
  'WBNB','BNB','WETH','ETH','WBTC','BTC','BTCB','CAKE','XRP','ADA',
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

// Fetch missing logos from DexScreener (batch, up to 30 addresses)
async function fetchDexScreenerLogos(addresses: string[]): Promise<Record<string, string>> {
  const logoMap: Record<string, string> = {};
  if (addresses.length === 0) return logoMap;

  // Chunk into groups of 30 (DexScreener limit)
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }

  await Promise.allSettled(
    chunks.map(async (chunk) => {
      try {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const pairs: any[] = json.pairs || [];
        for (const pair of pairs) {
          const addr = (pair.baseToken?.address || '').toLowerCase();
          const imgUrl = pair.info?.imageUrl || pair.info?.header || '';
          if (addr && imgUrl && !logoMap[addr]) {
            logoMap[addr] = imgUrl;
          }
        }
      } catch {}
    })
  );

  return logoMap;
}

// Fetch logo from GeckoTerminal token endpoint for a single missing address
async function fetchGTTokenLogo(address: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/bsc/tokens/${address}`,
      { headers: { Accept: 'application/json;version=20230302' } }
    );
    if (!res.ok) return '';
    const json = await res.json();
    return json?.data?.attributes?.image_url || '';
  } catch {
    return '';
  }
}

// In-memory logo cache (persists across refreshes)
const logoCache: Record<string, string> = {};

const TokenLogo: React.FC<{ icon: string | null; symbol: string }> = ({ icon, symbol }) => {
  const [src, setSrc] = useState<string | null>(icon || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(icon || null);
    setFailed(false);
  }, [icon]);

  const colors = [
    '#F0B90B','#0ECB81','#F6465D','#3B82F6','#A855F7',
    '#EC4899','#EF4444','#22D3EE','#FB923C','#84CC16',
  ];
  const color = colors[symbol.charCodeAt(0) % colors.length];
  const letter = symbol.slice(0, 2).toUpperCase();

  return (
    <div
      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#2B3139]"
      style={{ background: (src && !failed) ? 'transparent' : color }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={symbol}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
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

  const urls = [
    'https://api.geckoterminal.com/api/v2/networks/bsc/pools?sort=h24_volume_usd_desc&include=base_token,quote_token&page=1',
    'https://api.geckoterminal.com/api/v2/networks/bsc/pools?sort=h24_volume_usd_desc&include=base_token,quote_token&page=2',
    'https://api.geckoterminal.com/api/v2/networks/bsc/trending_pools?include=base_token,quote_token&page=1',
  ];

  const responses = await Promise.allSettled(
    urls.map(async u => {
      const r = await fetch(u, { headers: { Accept: 'application/json;version=20230302' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
  );

  for (const res of responses) {
    if (res.status !== 'fulfilled') continue;
    const d = res.value;
    const pools: any[] = d.data || [];
    const included: any[] = d.included || [];
    const tokMap: Record<string, any> = Object.fromEntries(
      included.map((t: any) => [t.id, t])
    );

    for (const pool of pools) {
      const attr = pool.attributes || {};
      const baseId: string = pool.relationships?.base_token?.data?.id || '';
      const quoteId: string = pool.relationships?.quote_token?.data?.id || '';
      const baseTok = tokMap[baseId]?.attributes || {};
      const sym: string = (baseTok.symbol || '').toUpperCase();

      if (!sym || SKIP_SYMBOLS.has(sym)) continue;
      if (!/^[A-Za-z0-9._-]{1,20}$/.test(sym)) continue;

      const vol24h = parseFloat(attr.volume_usd?.h24 || '0');

      if (seen.has(baseId)) {
        const existing = results.find(t => t.baseAddress === baseId.replace('bsc_', ''));
        if (existing && vol24h > existing.volume24h) existing.volume24h = vol24h;
        continue;
      }
      seen.add(baseId);

      const priceUsd = parseFloat(attr.base_token_price_usd || '0');
      const priceBnb = parseFloat(attr.base_token_price_native_currency || '0');
      const chg24h = parseFloat(attr.price_change_percentage?.h24 || '0');

      if (priceUsd === 0 || vol24h < 500_000) continue;

      const baseAddress = baseId.replace('bsc_', '');

      // Check in-memory logo cache first
      const cachedLogo = logoCache[baseAddress.toLowerCase()];
      const icon = cachedLogo || baseTok.image_url || null;

      results.push({
        symbol: sym,
        name: baseTok.name || sym,
        poolAddress: attr.address || '',
        baseAddress,
        icon,
        priceUsd,
        priceBnb,
        priceChange24h: chg24h,
        volume24h: vol24h,
        dexUrl: `https://www.geckoterminal.com/bsc/pools/${attr.address || ''}`,
        pairLabel: tokMap[quoteId]?.attributes?.symbol || 'BNB',
      });
    }
  }

  const sorted = results.sort((a, b) => b.volume24h - a.volume24h).slice(0, 40);

  // Find tokens with missing logos that aren't cached yet
  const missing = sorted.filter(
    t => !t.icon && !logoCache[t.baseAddress.toLowerCase()]
  );

  if (missing.length > 0) {
    // Batch-fetch from DexScreener
    const dsLogos = await fetchDexScreenerLogos(missing.map(t => t.baseAddress));

    // For any still missing, try GeckoTerminal token API (first 5 only to avoid too many requests)
    const stillMissing = missing.filter(t => !dsLogos[t.baseAddress.toLowerCase()]).slice(0, 5);
    const gtLogos = await Promise.all(
      stillMissing.map(async t => ({
        addr: t.baseAddress.toLowerCase(),
        logo: await fetchGTTokenLogo(t.baseAddress),
      }))
    );

    // Merge and cache all found logos
    for (const [addr, url] of Object.entries(dsLogos)) {
      if (url) logoCache[addr] = url;
    }
    for (const { addr, logo } of gtLogos) {
      if (logo) logoCache[addr] = logo;
    }

    // Apply logos to results
    for (const token of sorted) {
      const addr = token.baseAddress.toLowerCase();
      if (!token.icon && logoCache[addr]) {
        token.icon = logoCache[addr];
      }
    }
  }

  return sorted;
}

interface HomeBDexListProps {
  onSelectToken?: (token: DexToken) => void;
}

// Inject CSS keyframes once
const FLASH_STYLE = `
@keyframes flashGreen {
  0%   { color: #0ECB81; }
  60%  { color: #0ECB81; }
  100% { color: #fff; }
}
@keyframes flashRed {
  0%   { color: #F6465D; }
  60%  { color: #F6465D; }
  100% { color: #fff; }
}
.price-flash-up   { animation: flashGreen 700ms ease-out forwards; }
.price-flash-down { animation: flashRed   700ms ease-out forwards; }
`;

type FlashDir = 'up' | 'down' | null;

const HomeBDexList: React.FC<HomeBDexListProps> = ({ onSelectToken }) => {
  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [priceFlash, setPriceFlash] = useState<Record<string, FlashDir>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await fetchBscTopTokens();
      if (data.length > 0) {
        // Compute flash directions by comparing to previous prices
        const flashMap: Record<string, FlashDir> = {};
        const prev = prevPricesRef.current;
        for (const token of data) {
          const key = token.baseAddress;
          const oldPrice = prev[key];
          if (oldPrice !== undefined && oldPrice !== token.priceUsd) {
            flashMap[key] = token.priceUsd > oldPrice ? 'up' : 'down';
          }
          prev[key] = token.priceUsd;
        }

        setTokens(data);
        setLastUpdated(new Date());
        setError(false);

        if (Object.keys(flashMap).length > 0) {
          setPriceFlash(flashMap);
          setTimeout(() => setPriceFlash({}), 750);
        }
      }
      // If 0 results (rate-limited/filtered), keep stale tokens but signal error on first load
      else {
        setTokens(prev => {
          if (prev.length === 0) setError(true); // first load, no stale data
          return prev; // keep stale
        });
      }
    } catch {
      setTokens(prev => {
        if (prev.length === 0) setError(true);
        return prev;
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="bg-[#0B0E11]">
      <style>{FLASH_STYLE}</style>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2B3139]">
        <div className="flex items-center gap-2">
          <span className="text-[#F0B90B] text-xs font-bold">BSC Chain · High Volume</span>
          <span className="text-[#848E9C] text-[11px]">GeckoTerminal</span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[#848E9C] text-[10px]">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
          <span className="text-[#0ECB81] text-[11px] font-semibold">LIVE</span>
        </div>
      </div>

      <div className="flex items-center px-4 py-2 border-b border-[#2B3139]">
        <span className="text-[#848E9C] text-xs flex-1">Name / Vol</span>
        <span className="text-[#848E9C] text-xs w-[120px] text-right">Last Price</span>
        <span className="text-[#848E9C] text-xs w-[80px] text-right">24h Chg%</span>
      </div>

      {loading && Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && error && tokens.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center min-h-[320px]">
          <div className="text-3xl mb-3">🔗</div>
          <div className="text-[#848E9C] text-sm font-medium mb-1">DEX data temporarily unavailable</div>
          <div className="text-[#848E9C] text-xs mb-4">GeckoTerminal rate limit — retrying automatically</div>
          <button
            onClick={() => { setError(false); setLoading(true); load(); }}
            className="px-4 py-2 bg-[#F0B90B] text-black text-xs font-bold rounded hover:bg-[#d4a017] transition-colors"
          >
            Retry Now
          </button>
        </div>
      )}

      {!loading && !error && tokens.map((token) => {
        const isUp = token.priceChange24h >= 0;
        const chgAbs = Math.min(Math.abs(token.priceChange24h), 9999.99);
        const chgStr = `${isUp ? '+' : '-'}${chgAbs.toFixed(2)}%`;
        const flash = priceFlash[token.baseAddress];

        return (
          <div
            key={token.baseAddress}
            className="flex items-center px-4 py-3 border-b border-[#1E2329] active:bg-[#1E2329] transition-colors cursor-pointer"
            onClick={() => onSelectToken ? onSelectToken(token) : window.open(token.dexUrl, '_blank')}
          >
            <TokenLogo icon={token.icon} symbol={token.symbol} />

            <div className="ml-3 flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{token.symbol}</div>
              <div className="text-[#848E9C] text-xs">{formatVolume(token.volume24h)}</div>
            </div>

            <div className="w-[120px] text-right pr-3">
              <div
                className={`text-sm font-medium tabular-nums ${flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : 'text-white'}`}
              >
                {formatPrice(token.priceUsd)}
              </div>
              <div className="text-[#848E9C] text-[11px] tabular-nums">
                ł{formatBnb(token.priceBnb)}
              </div>
            </div>

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
          Powered by GeckoTerminal · DexScreener · BSC Chain · Refreshes every 20s
        </div>
      )}
    </div>
  );
};

export default HomeBDexList;
