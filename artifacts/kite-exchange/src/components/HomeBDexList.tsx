import React, { useEffect, useState } from 'react';

interface DexToken {
  symbol: string;
  name: string;
  address: string;
  icon?: string;
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  dexUrl: string;
  pairLabel: string;
}

const formatVolume = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};

const formatPrice = (p: string) => {
  const n = parseFloat(p);
  if (!n) return '$0.00';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(2)}`;
};

const SkeletonRow = () => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2329]">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[#1E2329] animate-pulse flex-shrink-0" />
      <div>
        <div className="w-16 h-3.5 bg-[#1E2329] rounded animate-pulse mb-1.5" />
        <div className="w-20 h-3 bg-[#1E2329] rounded animate-pulse" />
      </div>
    </div>
    <div className="text-right">
      <div className="w-20 h-3.5 bg-[#1E2329] rounded animate-pulse mb-1.5" />
      <div className="w-14 h-5 bg-[#1E2329] rounded animate-pulse" />
    </div>
  </div>
);

const HomeBDexList: React.FC = () => {
  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTokens = async () => {
      try {
        // Step 1: Get latest token profiles (with logos, chain info)
        const profilesRes = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
          headers: { 'Accept': 'application/json' },
        });
        const profiles: Array<{ tokenAddress: string; chainId: string; icon?: string; url?: string }> =
          await profilesRes.json();

        // Step 2: Filter BSC tokens and take top 25
        const bscProfiles = Array.isArray(profiles)
          ? profiles.filter(p => p.chainId === 'bsc').slice(0, 25)
          : [];

        if (bscProfiles.length === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        // Step 3: Batch fetch prices for all addresses
        const addresses = bscProfiles.map(p => p.tokenAddress).join(',');
        const pairsRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`);
        const pairsData: { pairs?: any[] } = await pairsRes.json();

        if (cancelled) return;

        // Step 4: Build token map — pick highest-volume pair per token
        const tokenMap = new Map<string, DexToken>();

        for (const pair of pairsData.pairs || []) {
          const addr = pair.baseToken?.address?.toLowerCase();
          if (!addr || pair.chainId !== 'bsc') continue;

          const profile = bscProfiles.find(p => p.tokenAddress.toLowerCase() === addr);
          if (!profile) continue;

          const volume = parseFloat(pair.volume?.h24 || '0');
          const existing = tokenMap.get(addr);

          if (!existing || volume > existing.volume24h) {
            tokenMap.set(addr, {
              symbol: pair.baseToken.symbol || '???',
              name: pair.baseToken.name || pair.baseToken.symbol || '???',
              address: addr,
              icon: profile.icon || pair.info?.imageUrl,
              priceUsd: pair.priceUsd || '0',
              priceChange24h: parseFloat(pair.priceChange?.h24 ?? '0'),
              volume24h: volume,
              dexUrl: pair.url || profile.url || '',
              pairLabel: pair.quoteToken?.symbol || 'BNB',
            });
          }
        }

        // Sort by 24h volume descending
        const sorted = Array.from(tokenMap.values())
          .sort((a, b) => b.volume24h - a.volume24h)
          .slice(0, 20);

        if (!cancelled) {
          setTokens(sorted);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchTokens();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTokens, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-[#0B0E11]">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2B3139]">
        <div className="flex items-center gap-2">
          <span className="text-[#F0B90B] text-xs font-bold">🔗 B-DeX</span>
          <span className="text-[#848E9C] text-[11px]">BSC Chain · Dexscreener</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
          <span className="text-[#0ECB81] text-[11px] font-semibold">LIVE</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0B0E11]">
        <span className="text-[#848E9C] text-[11px] uppercase tracking-wide">Name / Vol</span>
        <div className="flex gap-6 pr-1">
          <span className="text-[#848E9C] text-[11px] uppercase tracking-wide">Last Price</span>
          <span className="text-[#848E9C] text-[11px] uppercase tracking-wide">24H Chg%</span>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

      {/* Error state */}
      {!loading && error && (
        <div className="py-12 text-center text-[#848E9C]">
          <div className="text-3xl mb-3">🔗</div>
          <div className="text-sm font-medium mb-1">DEX data unavailable</div>
          <div className="text-xs">Check your connection and try again</div>
        </div>
      )}

      {/* Token rows */}
      {!loading && !error && tokens.map((token) => {
        const isUp = token.priceChange24h >= 0;
        return (
          <div
            key={token.address}
            className="flex items-center justify-between px-4 py-3 border-b border-[#1E2329] active:bg-[#1E2329] transition-colors cursor-pointer"
            onClick={() => token.dexUrl && window.open(token.dexUrl, '_blank')}
          >
            {/* Left: icon + name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#1E2329] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#2B3139]">
                {token.icon ? (
                  <img
                    src={token.icon}
                    alt={token.symbol}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).replaceWith(
                        Object.assign(document.createElement('span'), {
                          className: 'text-xs font-bold text-[#F0B90B]',
                          textContent: token.symbol.slice(0, 2),
                        })
                      );
                    }}
                  />
                ) : (
                  <span className="text-xs font-bold text-[#F0B90B]">{token.symbol.slice(0, 2)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-semibold truncate">{token.symbol}</div>
                <div className="text-[#848E9C] text-xs">{formatVolume(token.volume24h)}</div>
              </div>
            </div>

            {/* Right: price + change */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="text-white text-sm font-medium">{formatPrice(token.priceUsd)}</div>
                <div className="text-[#848E9C] text-[10px]">/{token.pairLabel}</div>
              </div>
              <div
                className={`text-xs font-bold px-2 py-1 rounded min-w-[64px] text-center ${
                  isUp ? 'bg-[#0ECB81] text-black' : 'bg-[#F6465D] text-white'
                }`}
              >
                {isUp ? '+' : ''}{token.priceChange24h.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {!loading && !error && tokens.length > 0 && (
        <div className="px-4 py-3 text-center text-[#848E9C] text-xs border-t border-[#2B3139]">
          Powered by Dexscreener · BSC Chain · Updates every 30s
        </div>
      )}
    </div>
  );
};

export default HomeBDexList;
