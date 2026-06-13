import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { TRADFI_ASSETS, CATEGORY_STYLES, TEXT_LOGO_ASSETS, TradFiAsset, TradFiCategory } from '../../lib/tradfi-data';
import { getAllTradFiPrices, subscribeAllTradFiPrices, startTradFiPriceUpdater, TradFiPriceData } from '../../lib/tradfi-price-service';
import { supabase } from '../../lib/supabase';
import MetalIcon, { isMetalSymbol } from '../../components/MetalIcon';
import TradFiIcon, { isTradFiIcon } from '../../components/TradFiIcon';
import Sparkline from '../components/Sparkline';

type PageProps = {
  user?: any;
  onAuth?: (m: 'login' | 'register') => void;
  onDeposit?: () => void;
  onNavigate?: (t: any) => void;
};

const FAVS_KEY = 'tradfi_favs_desktop_v1';

const DB_KEY_MAP: Record<string, string> = {
  WTI: 'USOIL',
  SPX: 'SPX500',
  NDX: 'NAS100',
  DJI: 'US30',
};

const GROUPS: { key: string; label: string; categories: TradFiCategory[] }[] = [
  { key: 'all', label: 'All', categories: [] },
  { key: 'stocks', label: 'Stocks', categories: ['Stock'] },
  { key: 'etfs', label: 'ETFs', categories: ['ETF'] },
  { key: 'indices', label: 'Indices', categories: ['Index'] },
  { key: 'commodities', label: 'Commodities', categories: ['Commodity', 'Agriculture'] },
  { key: 'metals', label: 'Metals', categories: ['Gold', 'Silver', 'Platinum', 'Palladium'] },
  { key: 'forex', label: 'Forex', categories: ['Forex'] },
];

function formatTradFiPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 100) return price.toFixed(2);
  if (price >= 10) return price.toFixed(3);
  return price.toFixed(4);
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

function AssetLogo({ displayName, logoUrl, bgColor, size = 36 }: { displayName: string; logoUrl: string; bgColor?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const textDef = TEXT_LOGO_ASSETS[displayName];
  const px = `${size}px`;

  if (isMetalSymbol(displayName)) return <MetalIcon symbol={displayName} size={size} />;
  if (isTradFiIcon(displayName)) return <TradFiIcon symbol={displayName} size={size} />;

  if (logoUrl && !imgError) {
    return (
      <div
        className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ width: px, height: px, background: bgColor || '#2B3139', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
      >
        <img
          src={logoUrl}
          alt={displayName}
          style={{ width: '90%', height: '90%', objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (textDef) {
    return (
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ width: px, height: px, background: textDef.bg, border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
      >
        <span className="font-black leading-none" style={{ color: textDef.textColor, fontSize: `${textDef.fontSize ?? 9}px` }}>
          {textDef.text}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center bg-[#2B3139]" style={{ width: px, height: px, border: '2px solid rgba(255,255,255,0.12)' }}>
      <span className="text-white font-bold text-[10px]">{displayName.slice(0, 3)}</span>
    </div>
  );
}

export default function DesktopStock({ onNavigate }: PageProps) {
  const [prices, setPrices] = useState<Map<string, TradFiPriceData>>(() => getAllTradFiPrices());
  const [flash, setFlash] = useState<Map<string, 'up' | 'down'>>(new Map());
  const dbLogos = useRef<Record<string, string>>({});
  const [, forceRender] = useState(0);

  const [group, setGroup] = useState<string>('all');
  const [query, setQuery] = useState('');

  const [favs, setFavs] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); }
    catch { return new Set(); }
  });

  const toggleFav = useCallback((s: string) => {
    setFavs(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      localStorage.setItem(FAVS_KEY, JSON.stringify([...n]));
      return n;
    });
  }, []);

  useEffect(() => {
    supabase.from('tradfi_logos').select('symbol, logo_url').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) {
          if (row.symbol && row.logo_url) map[row.symbol] = row.logo_url;
        }
        dbLogos.current = map;
        forceRender(n => n + 1);
      }
    }, () => {});
  }, []);

  useEffect(() => {
    const stop = startTradFiPriceUpdater();
    const unsub = subscribeAllTradFiPrices(() => {
      const next = getAllTradFiPrices();
      setPrices(prev => {
        const newFlash = new Map<string, 'up' | 'down'>();
        next.forEach((data, sym) => {
          const old = prev.get(sym);
          if (old && data.price !== old.price) {
            newFlash.set(sym, data.price > old.price ? 'up' : 'down');
          }
        });
        if (newFlash.size > 0) {
          setFlash(newFlash);
          setTimeout(() => setFlash(new Map()), 600);
        }
        return next;
      });
    });
    return () => { stop(); unsub(); };
  }, []);

  const resolveLogoUrl = (displayName: string, fallbackUrl: string): string => {
    const dbKey = DB_KEY_MAP[displayName] || displayName;
    return dbLogos.current[dbKey] || dbLogos.current[displayName] || fallbackUrl;
  };

  const goTrade = (symbol: string) => {
    localStorage.setItem('selectedCoinSymbol', symbol);
    localStorage.setItem('selectedCoinSide', 'buy');
    window.dispatchEvent(new CustomEvent('desk-select-coin', { detail: symbol }));
    onNavigate?.('futures');
  };

  const activeGroup = GROUPS.find(g => g.key === group) || GROUPS[0];

  const rows = useMemo(() => {
    let r = TRADFI_ASSETS;
    if (group === 'favorites') {
      r = r.filter(a => favs.has(a.symbol));
    } else if (activeGroup.categories.length > 0) {
      r = r.filter(a => activeGroup.categories.includes(a.category));
    }
    const q = query.trim().toLowerCase();
    if (q) r = r.filter(a => a.displayName.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
    return r;
  }, [group, activeGroup, favs, query]);

  const withPrice = (a: TradFiAsset) => {
    const pd = prices.get(a.symbol);
    return { asset: a, price: pd?.price ?? a.basePrice, change: pd?.change24h ?? 0 };
  };

  const movers = useMemo(() => TRADFI_ASSETS.map(withPrice), [prices]);
  const gainers = useMemo(() => [...movers].sort((a, b) => b.change - a.change).slice(0, 4), [movers]);
  const losers = useMemo(() => [...movers].sort((a, b) => a.change - b.change).slice(0, 4), [movers]);

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Title block */}
        <div className="mb-6">
          <h1 className="text-white font-bold text-3xl">Stocks &amp; ETFs</h1>
          <p className="text-[#848E9C] text-sm mt-2">
            Trade tokenized stocks, ETFs, indices, commodities, metals and forex with real-time market prices.
          </p>
        </div>

        {/* Movers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <MoversCard title="Top Gainers" icon="up" items={gainers} resolveLogo={resolveLogoUrl} onTrade={goTrade} />
          <MoversCard title="Top Losers" icon="down" items={losers} resolveLogo={resolveLogoUrl} onTrade={goTrade} />
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setGroup('favorites')}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                group === 'favorites' ? 'bg-[#1E2329] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5" /> Favorites
            </button>
            {GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGroup(g.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  group === g.key ? 'bg-[#1E2329] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2 flex items-center gap-2 lg:w-80">
            <Search className="w-4 h-4 text-[#848E9C]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search asset"
              className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] flex-1 min-w-0"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[40px_2fr_1fr_1.2fr_1fr_1.4fr_1.3fr_120px] gap-4 px-6 py-3 text-xs text-[#848E9C] font-medium border-b border-[#2B3139]">
            <div></div>
            <div>Name</div>
            <div>Category</div>
            <div className="text-right">Last Price</div>
            <div className="text-right">24h Change</div>
            <div className="text-right">24h Volume</div>
            <div className="text-center">Last 7 Days</div>
            <div className="text-right">Action</div>
          </div>

          {rows.length === 0 ? (
            <div className="py-20 text-center text-[#848E9C] text-sm">No assets found</div>
          ) : (
            rows.map((asset) => {
              const pd = prices.get(asset.symbol);
              const price = pd?.price ?? asset.basePrice;
              const change = pd?.change24h ?? 0;
              const isUp = change >= 0;
              const flashDir = flash.get(asset.symbol);
              const logoUrl = resolveLogoUrl(asset.displayName, asset.logoUrl);
              const catStyle = CATEGORY_STYLES[asset.category];

              return (
                <div
                  key={asset.symbol}
                  onClick={() => goTrade(asset.symbol)}
                  className={`grid grid-cols-[40px_2fr_1fr_1.2fr_1fr_1.4fr_1.3fr_120px] gap-4 px-6 py-4 items-center border-b border-[#2B3139]/60 last:border-0 cursor-pointer transition-colors group ${
                    flashDir === 'up' ? 'bg-[#0ECB81]/8' : flashDir === 'down' ? 'bg-[#F6465D]/8' : 'hover:bg-[#1E2329]'
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFav(asset.symbol); }}
                    className="flex items-center justify-center"
                    aria-label={favs.has(asset.symbol) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 transition-colors ${favs.has(asset.symbol) ? 'text-[#F0B90B] fill-[#F0B90B]' : 'text-[#474D57] group-hover:text-[#848E9C]'}`} />
                  </button>

                  <div className="flex items-center gap-3 min-w-0">
                    <AssetLogo displayName={asset.displayName} logoUrl={logoUrl} bgColor={asset.bgColor} size={32} />
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{asset.displayName}</div>
                      <div className="text-[#848E9C] text-xs">Perp</div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded leading-none ${catStyle.bg} ${catStyle.text}`}>
                      {catStyle.label}
                    </span>
                  </div>

                  <div className={`text-right font-semibold text-sm whitespace-nowrap tabular-nums transition-colors duration-500 ${
                    flashDir === 'up' ? 'text-[#0ECB81]' : flashDir === 'down' ? 'text-[#F6465D]' : 'text-white'
                  }`}>
                    ${formatTradFiPrice(price)}
                  </div>

                  <div className={`text-right font-semibold text-sm whitespace-nowrap tabular-nums ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </div>

                  <div className="text-right text-[#B7BDC6] text-sm whitespace-nowrap tabular-nums">
                    {formatVolume(asset.volume24hBase)}
                  </div>

                  <div className="flex justify-center">
                    <Sparkline symbol={asset.symbol} positive={isUp} />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); goTrade(asset.symbol); }}
                      className="px-4 py-1.5 text-sm font-medium text-[#F0B90B] hover:bg-[#F0B90B] hover:text-black rounded-md border border-[#F0B90B]/40 transition-colors whitespace-nowrap"
                    >
                      Trade
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MoversCard({
  title, icon, items, resolveLogo, onTrade,
}: {
  title: string;
  icon: 'up' | 'down';
  items: { asset: TradFiAsset; price: number; change: number }[];
  resolveLogo: (displayName: string, fallback: string) => string;
  onTrade: (symbol: string) => void;
}) {
  return (
    <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon === 'up'
          ? <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
          : <TrendingDown className="w-4 h-4 text-[#F6465D]" />}
        <span className="text-white font-semibold text-sm">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ asset, price, change }) => {
          const isUp = change >= 0;
          return (
            <button
              key={asset.symbol}
              onClick={() => onTrade(asset.symbol)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#1E2329] transition-colors text-left min-w-0"
            >
              <AssetLogo displayName={asset.displayName} logoUrl={resolveLogo(asset.displayName, asset.logoUrl)} bgColor={asset.bgColor} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-medium truncate">{asset.displayName}</div>
                <div className="text-[#848E9C] text-xs whitespace-nowrap tabular-nums">${formatTradFiPrice(price)}</div>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
