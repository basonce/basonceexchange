import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Star, TrendingUp, TrendingDown, Globe, ChevronDown, ChevronUp, Bell, Settings } from 'lucide-react';
import {
  GlobalAsset, AssetCategory, CATEGORY_CONFIG,
  getBaseAssets, formatGlobalPrice, generateSparkline, seededRandom
} from '../lib/global-markets-data';
import GlobalMarketDetailModal from '../components/global-markets/GlobalMarketDetailModal';

const FAVS_KEY = 'gm_favs_v9';
const TICK_MS = 1200;

type SortMode = 'default' | 'gainers' | 'losers' | 'volume';

const CATS: { id: 'all' | AssetCategory; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'forex',       label: 'Forex' },
  { id: 'indices',     label: 'Indices' },
  { id: 'stocks',      label: 'Stocks' },
  { id: 'metals',      label: 'Metals' },
  { id: 'energy',      label: 'Energy' },
  { id: 'agriculture', label: 'Agriculture' },
];

function useLivePrices(base: GlobalAsset[]) {
  const [assets, setAssets] = useState<GlobalAsset[]>(base);
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down'>>({});
  const prevRef = useRef<Record<string, number>>({});
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      const newFlashes: Record<string, 'up' | 'down'> = {};
      setAssets(prev => prev.map((a, i) => {
        const vol =
          a.category === 'forex' ? 0.000065 :
          a.category === 'indices' ? 0.00035 :
          a.category === 'stocks' ? 0.00055 : 0.0009;
        const s = a.symbol.charCodeAt(0) * 17 + tickRef.current * 997 + i * 41;
        const r = seededRandom(s);
        const delta = (r - 0.4975) * 2 * vol * a.price;
        const newPrice = Math.max(a.price * 0.3, a.price + delta);
        const prev = prevRef.current[a.symbol] ?? a.price;
        if (newPrice > prev) newFlashes[a.symbol] = 'up';
        else if (newPrice < prev) newFlashes[a.symbol] = 'down';
        prevRef.current[a.symbol] = newPrice;
        const base0 = a.price - a.change24h;
        return {
          ...a,
          price: newPrice,
          change24h: newPrice - base0,
          changePercent: base0 > 0 ? ((newPrice - base0) / base0) * 100 : 0,
        };
      }));
      setFlashes(newFlashes);
      const tid = setTimeout(() => setFlashes({}), 500);
      return () => clearTimeout(tid);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return { assets, flashes };
}

const CC: Record<string, string> = {
  eur: 'eu', usd: 'us', gbp: 'gb', jpy: 'jp', chf: 'ch', aud: 'au',
  cad: 'ca', nzd: 'nz', try: 'tr', zar: 'za', mxn: 'mx', hkd: 'hk', sgd: 'sg'
};

function ForexFlag({ symbol }: { symbol: string }) {
  const base = symbol.substring(0, 3).toLowerCase();
  const quote = symbol.substring(3, 6).toLowerCase();
  const b = CC[base] || 'us';
  const q = CC[quote] || 'us';
  return (
    <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
      <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/10" style={{ background: '#1a2030' }}>
        <img src={`https://flagcdn.com/w80/${b}.png`} alt={b}
          className="absolute top-1 left-1 rounded shadow-md object-cover border border-white/20"
          style={{ width: 26, height: 18 }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
        <img src={`https://flagcdn.com/w80/${q}.png`} alt={q}
          className="absolute bottom-1 right-1 rounded shadow-md object-cover border border-white/20"
          style={{ width: 26, height: 18 }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
      </div>
    </div>
  );
}

const PEXELS_IMAGES: Record<string, string> = {
  XAUUSD:  'https://images.pexels.com/photos/47047/gold-bar-gold-ingot-ingot-gold-47047.jpeg?auto=compress&cs=tinysrgb&w=200',
  XAGUSD:  'https://images.pexels.com/photos/8391288/pexels-photo-8391288.jpeg?auto=compress&cs=tinysrgb&w=200',
  XPTUSD:  'https://images.pexels.com/photos/3873209/pexels-photo-3873209.jpeg?auto=compress&cs=tinysrgb&w=200',
  XPDUSD:  'https://images.pexels.com/photos/3873209/pexels-photo-3873209.jpeg?auto=compress&cs=tinysrgb&w=200',
  COPPER:  'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=200',
  XRHRUSD: 'https://images.pexels.com/photos/3873209/pexels-photo-3873209.jpeg?auto=compress&cs=tinysrgb&w=200',
  BRENT:   'https://images.pexels.com/photos/247763/pexels-photo-247763.jpeg?auto=compress&cs=tinysrgb&w=200',
  USOIL:   'https://images.pexels.com/photos/162568/oil-pump-oil-pump-jack-oilfield-oil-field-162568.jpeg?auto=compress&cs=tinysrgb&w=200',
  NATGAS:  'https://images.pexels.com/photos/459728/pexels-photo-459728.jpeg?auto=compress&cs=tinysrgb&w=200',
  GASOIL:  'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=200',
  HEAT:    'https://images.pexels.com/photos/266403/pexels-photo-266403.jpeg?auto=compress&cs=tinysrgb&w=200',
  RBOB:    'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=200',
  WHEAT:   'https://images.pexels.com/photos/326082/pexels-photo-326082.jpeg?auto=compress&cs=tinysrgb&w=200',
  CORN:    'https://images.pexels.com/photos/547263/pexels-photo-547263.jpeg?auto=compress&cs=tinysrgb&w=200',
  SOYBEAN: 'https://images.pexels.com/photos/1459339/pexels-photo-1459339.jpeg?auto=compress&cs=tinysrgb&w=200',
  COFFEE:  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=200',
  COTTON:  'https://images.pexels.com/photos/5247/cotton-wool-white-nature.jpg?auto=compress&cs=tinysrgb&w=200',
  SUGAR:   'https://images.pexels.com/photos/65882/sugar-sweet-delicious-white-65882.jpeg?auto=compress&cs=tinysrgb&w=200',
  COCOA:   'https://images.pexels.com/photos/5765/chocolate-cake-dark.jpg?auto=compress&cs=tinysrgb&w=200',
  OJ:      'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=200',
  LUMBER:  'https://images.pexels.com/photos/129733/pexels-photo-129733.jpeg?auto=compress&cs=tinysrgb&w=200',
  LHOG:    'https://images.pexels.com/photos/1300375/pexels-photo-1300375.jpeg?auto=compress&cs=tinysrgb&w=200',
  FCATTLE: 'https://images.pexels.com/photos/735977/pexels-photo-735977.jpeg?auto=compress&cs=tinysrgb&w=200',
};

const FLAG_INDICES: Record<string, string> = {
  US30: 'us', SPX500: 'us', NAS100: 'us', GER40: 'de', UK100: 'gb',
  JP225: 'jp', FR40: 'fr', EU50: 'eu', AUS200: 'au', HK50: 'hk',
  CHINA50: 'cn', IT40: 'it', ES35: 'es', RUS2000: 'us', VIX: 'us',
};

const STOCK_LOGOS: Record<string, { url: string; bg: string }> = {
  AAPL:  { url: 'https://logo.clearbit.com/apple.com', bg: '#1c1c1c' },
  MSFT:  { url: 'https://logo.clearbit.com/microsoft.com', bg: '#fff' },
  NVDA:  { url: 'https://logo.clearbit.com/nvidia.com', bg: '#1a1a1a' },
  GOOGL: { url: 'https://logo.clearbit.com/google.com', bg: '#fff' },
  AMZN:  { url: 'https://logo.clearbit.com/amazon.com', bg: '#fff' },
  META:  { url: 'https://logo.clearbit.com/meta.com', bg: '#fff' },
  TSLA:  { url: 'https://logo.clearbit.com/tesla.com', bg: '#1c1c1e' },
  BRKB:  { url: 'https://logo.clearbit.com/berkshirehathaway.com', bg: '#fff' },
  JPM:   { url: 'https://logo.clearbit.com/jpmorganchase.com', bg: '#fff' },
  V:     { url: 'https://logo.clearbit.com/visa.com', bg: '#1a1f71' },
  JNJ:   { url: 'https://logo.clearbit.com/jnj.com', bg: '#fff' },
  WMT:   { url: 'https://logo.clearbit.com/walmart.com', bg: '#0071ce' },
  XOM:   { url: 'https://logo.clearbit.com/exxonmobil.com', bg: '#fff' },
  BAC:   { url: 'https://logo.clearbit.com/bankofamerica.com', bg: '#012169' },
  KO:    { url: 'https://logo.clearbit.com/coca-cola.com', bg: '#f40000' },
  PFE:   { url: 'https://logo.clearbit.com/pfizer.com', bg: '#0068a5' },
  SAP:   { url: 'https://logo.clearbit.com/sap.com', bg: '#fff' },
  ASML:  { url: 'https://logo.clearbit.com/asml.com', bg: '#006db6' },
  NESN:  { url: 'https://logo.clearbit.com/nestle.com', bg: '#fff' },
  LVMH:  { url: 'https://logo.clearbit.com/lvmh.com', bg: '#1a1000' },
  TM:    { url: 'https://logo.clearbit.com/toyota.com', bg: '#fff' },
  TSM:   { url: 'https://logo.clearbit.com/tsmc.com', bg: '#fff' },
  BABA:  { url: 'https://logo.clearbit.com/alibaba.com', bg: '#ff6a00' },
  NVO:   { url: 'https://logo.clearbit.com/novonordisk.com', bg: '#001a2a' },
};

function AssetIcon({ asset }: { asset: GlobalAsset }) {
  const [err, setErr] = useState(false);

  if (asset.category === 'forex') {
    return <ForexFlag symbol={asset.symbol} />;
  }

  if (asset.category === 'indices') {
    const flag = FLAG_INDICES[asset.symbol];
    if (flag && !err) {
      return (
        <div className="flex-shrink-0 rounded-xl overflow-hidden border border-white/10" style={{ width: 44, height: 44 }}>
          <img src={`https://flagcdn.com/w80/${flag}.png`} alt={asset.symbol}
            className="w-full h-full object-cover" onError={() => setErr(true)} />
        </div>
      );
    }
  }

  if (asset.category === 'stocks') {
    const logo = STOCK_LOGOS[asset.symbol];
    if (logo && !err) {
      return (
        <div className="flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden border border-white/10"
          style={{ width: 44, height: 44, background: logo.bg }}>
          <img src={logo.url} alt={asset.symbol}
            style={{ width: 30, height: 30, objectFit: 'contain' }}
            onError={() => setErr(true)} />
        </div>
      );
    }
  }

  const imgUrl = PEXELS_IMAGES[asset.symbol];
  if (imgUrl && !err) {
    return (
      <div className="flex-shrink-0 rounded-xl overflow-hidden border border-white/10" style={{ width: 44, height: 44 }}>
        <img src={imgUrl} alt={asset.symbol}
          className="w-full h-full object-cover" onError={() => setErr(true)} />
      </div>
    );
  }

  const cfg = CATEGORY_CONFIG[asset.category];
  const initials = asset.displayName.slice(0, 3).toUpperCase();
  return (
    <div className="flex-shrink-0 rounded-xl flex items-center justify-center border border-white/10 font-black text-[10px]"
      style={{ width: 44, height: 44, background: cfg.bgColor, color: cfg.color }}>
      {initials}
    </div>
  );
}

function MiniChart({ points, up, width = 70, height = 28 }: { points: number[]; up: boolean; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const mn = Math.min(...points), mx = Math.max(...points);
  const r = mx - mn || 1;
  const W = width, H = height;
  const pts = points.map((p, i) => ({
    x: (i / (points.length - 1)) * W,
    y: H - ((p - mn) / r) * (H - 2) - 1,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fill = `${d} L${W} ${H} L0 ${H} Z`;
  const c = up ? '#10b981' : '#ef4444';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`mg-${up ? 'u' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#mg-${up ? 'u' : 'd'})`} />
      <path d={d} stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface RowProps {
  asset: GlobalAsset;
  flash: 'up' | 'down' | undefined;
  isFav: boolean;
  onFav: () => void;
  onOpen: () => void;
  spark: number[];
}

function Row({ asset, flash, isFav, onFav, onOpen, spark }: RowProps) {
  const up = asset.changePercent >= 0;
  const netChange = asset.change24h;
  const absNet = Math.abs(netChange);

  let netStr = '';
  if (absNet >= 1000) netStr = (netChange >= 0 ? '+' : '') + netChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  else if (absNet >= 10) netStr = (netChange >= 0 ? '+' : '') + netChange.toFixed(2);
  else if (absNet >= 1) netStr = (netChange >= 0 ? '+' : '') + netChange.toFixed(4);
  else netStr = (netChange >= 0 ? '+' : '') + netChange.toFixed(5);

  const flashBg = flash === 'up' ? 'rgba(16,185,129,0.06)' : flash === 'down' ? 'rgba(239,68,68,0.06)' : 'transparent';

  return (
    <div
      onClick={onOpen}
      className="flex items-center cursor-pointer transition-all duration-150"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.035)',
        background: flashBg,
        minHeight: 64,
      }}
    >
      <button className="flex-shrink-0 mr-2 p-1 -ml-1"
        onClick={e => { e.stopPropagation(); onFav(); }}>
        <Star size={12} style={{
          color: isFav ? '#f59e0b' : '#374151',
          fill: isFav ? '#f59e0b' : 'none',
          transition: 'all .2s'
        }} />
      </button>

      <div className="flex-shrink-0 mr-3">
        <AssetIcon asset={asset} />
      </div>

      <div className="flex-1 min-w-0 mr-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[13px] font-bold text-white leading-tight">{asset.displayName}</span>
          {asset.tags?.includes('popular') && (
            <span className="text-[8px] font-black px-1 py-0.5 rounded-sm" style={{ background: 'rgba(234,179,8,0.2)', color: '#eab308', letterSpacing: '0.05em' }}>HOT</span>
          )}
        </div>
        <div className="text-[10px] truncate leading-tight" style={{ color: '#4b5563' }}>
          {asset.exchange ? `${asset.exchange} · ${asset.currency}` : asset.currency}
        </div>
      </div>

      <div className="flex-shrink-0 mr-3 hidden sm:block">
        <MiniChart points={spark} up={up} />
      </div>

      <div className="flex-shrink-0 text-right" style={{ minWidth: 90 }}>
        <div className="text-[14px] font-black font-mono leading-tight mb-0.5 transition-colors duration-300"
          style={{
            color: flash === 'up' ? '#10b981' : flash === 'down' ? '#ef4444' : '#f0f0f0',
            letterSpacing: '-0.3px'
          }}>
          {formatGlobalPrice(asset.price, asset.symbol)}
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-[10px] font-semibold font-mono" style={{ color: up ? '#10b981' : '#ef4444' }}>
            {netStr}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: up ? '#10b981' : '#ef4444',
            }}>
            {up ? '+' : ''}{asset.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  title, color, assets, flashes, favs, onFav, onOpen, sparks, sortMode, defaultOpen = true
}: {
  title: string; color: string;
  assets: GlobalAsset[];
  flashes: Record<string, 'up' | 'down'>;
  favs: Set<string>;
  onFav: (s: string) => void;
  onOpen: (a: GlobalAsset) => void;
  sparks: Record<string, number[]>;
  sortMode: SortMode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ups = assets.filter(a => a.changePercent >= 0).length;
  const downs = assets.length - ups;

  const sorted = useMemo(() => {
    const arr = [...assets];
    if (sortMode === 'gainers') return arr.sort((a, b) => b.changePercent - a.changePercent);
    if (sortMode === 'losers') return arr.sort((a, b) => a.changePercent - b.changePercent);
    if (sortMode === 'volume') return arr.sort((a, b) => b.volume - a.volume);
    return arr;
  }, [assets, sortMode]);

  return (
    <div>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5"
        style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[11px] font-black text-white uppercase tracking-widest">{title}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af' }}>{assets.length}</span>
        <div className="flex items-center gap-2 ml-1">
          <span className="text-[9px] font-bold" style={{ color: '#10b981' }}>▲{ups}</span>
          <span className="text-[9px] font-bold" style={{ color: '#ef4444' }}>▼{downs}</span>
        </div>
        <div className="ml-auto" style={{ color: '#374151' }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>
      {open && sorted.map(a => (
        <Row
          key={a.symbol}
          asset={a}
          flash={flashes[a.symbol]}
          isFav={favs.has(a.symbol)}
          onFav={() => onFav(a.symbol)}
          onOpen={() => onOpen(a)}
          spark={sparks[a.symbol] ?? []}
        />
      ))}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="flex-shrink-0 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', minWidth: 100 }}>
      <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#6b7280' }}>{label}</div>
      <div className="text-[16px] font-black leading-none" style={{ color }}>{value}</div>
      <div className="text-[9px] font-semibold mt-0.5 truncate" style={{ color: '#4b5563' }}>{sub}</div>
    </div>
  );
}

export default function GlobalMarketsPage() {
  const base = useMemo(() => getBaseAssets(), []);
  const { assets, flashes } = useLivePrices(base);
  const [favs, setFavs] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const [cat, setCat] = useState<'all' | AssetCategory>('all');
  const [sort, setSort] = useState<SortMode>('default');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GlobalAsset | null>(null);
  const [watchOnly, setWatchOnly] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const sparks = useMemo(() => {
    const m: Record<string, number[]> = {};
    base.forEach(a => { m[a.symbol] = generateSparkline(a); });
    return m;
  }, [base]);

  const toggleFav = useCallback((s: string) => {
    setFavs(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      localStorage.setItem(FAVS_KEY, JSON.stringify([...n]));
      return n;
    });
  }, []);

  const visible = useMemo(() => {
    let list = assets;
    if (cat !== 'all') list = list.filter(a => a.category === cat);
    if (watchOnly) list = list.filter(a => favs.has(a.symbol));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.symbol.toLowerCase().includes(q) ||
        a.displayName.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [assets, cat, watchOnly, search, favs]);

  const grouped = useMemo(() => {
    const order: AssetCategory[] = ['forex', 'indices', 'metals', 'energy', 'stocks', 'agriculture'];
    return order.map(c => ({ cat: c, items: visible.filter(a => a.category === c) })).filter(g => g.items.length > 0);
  }, [visible]);

  const totalUp = assets.filter(a => a.changePercent >= 0).length;
  const totalDown = assets.length - totalUp;
  const sentPct = Math.round((totalUp / assets.length) * 100);

  const topGainer = useMemo(() => [...assets].sort((a, b) => b.changePercent - a.changePercent)[0], [assets]);
  const topLoser = useMemo(() => [...assets].sort((a, b) => a.changePercent - b.changePercent)[0], [assets]);
  const mostActive = useMemo(() => [...assets].sort((a, b) => b.volume - a.volume)[0], [assets]);

  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0e14', color: '#fff' }}>

      {/* ── HEADER ── */}
      <div style={{ background: '#0f1218', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <div className="text-[18px] font-black text-white leading-none tracking-tight">CommodityUSD</div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 4px #10b981' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#4b5563' }}>LIVE</span>
              <span className="text-[10px] font-mono" style={{ color: '#374151' }}>· {timeStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bell size={16} style={{ color: '#374151' }} />
            <Settings size={16} style={{ color: '#374151' }} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <SummaryCard
            label="Last Traded"
            value={topGainer ? formatGlobalPrice(topGainer.price, topGainer.symbol) : '—'}
            sub={topGainer?.displayName || ''}
            color="#f0f0f0"
          />
          <SummaryCard
            label="Net Change"
            value={topGainer ? (topGainer.change24h >= 0 ? '+' : '') + topGainer.change24h.toFixed(2) : '—'}
            sub="24h change"
            color="#10b981"
          />
          <SummaryCard
            label="% Change"
            value={`${sentPct >= 50 ? '+' : ''}${(sentPct - 50) * 0.5}%`}
            sub={`${sentPct}% Bulls`}
            color={sentPct >= 50 ? '#10b981' : '#ef4444'}
          />
          <SummaryCard
            label="Last Update"
            value={timeStr}
            sub="Real-time"
            color="#6b7280"
          />
        </div>

        {/* Market Status Bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={10} style={{ color: '#10b981' }} />
            <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>{totalUp} up</span>
          </div>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(239,68,68,0.2)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sentPct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={10} style={{ color: '#ef4444' }} />
            <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>{totalDown} dn</span>
          </div>
        </div>

        {/* Top Movers Ticker */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-1 h-1 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>TOP MOVERS</span>
            </div>
            {[...assets].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 8).map(a => (
              <button
                key={a.symbol}
                onClick={() => setSelected(a)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 transition-opacity hover:opacity-80"
                style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-[10px] font-bold text-white">{a.displayName}</span>
                <span className="text-[9px] font-bold"
                  style={{ color: a.changePercent >= 0 ? '#10b981' : '#ef4444' }}>
                  {a.changePercent >= 0 ? '+' : ''}{a.changePercent.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {CATS.map(c => {
            const active = cat === c.id;
            const count = c.id === 'all' ? assets.length : assets.filter(a => a.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id as any)}
                className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold transition-all whitespace-nowrap relative"
                style={{
                  padding: '10px 14px',
                  color: active ? '#fff' : '#6b7280',
                  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                {c.label}
                <span className="text-[9px]" style={{ color: active ? '#93c5fd' : '#374151' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="flex items-center gap-2 px-4 py-2 sticky top-0 z-20"
        style={{ background: '#0b0e14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex-1 relative">
          <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg text-[12px] pl-8 pr-3 py-1.5 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
          />
        </div>
        <button
          onClick={() => setWatchOnly(p => !p)}
          className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all"
          style={{
            background: watchOnly ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
            border: watchOnly ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: watchOnly ? '#f59e0b' : '#6b7280',
          }}
        >
          <Star size={11} fill={watchOnly ? '#f59e0b' : 'none'} color={watchOnly ? '#f59e0b' : '#6b7280'} />
          {favs.size > 0 && <span>{favs.size}</span>}
        </button>
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
          {(['default', 'gainers', 'losers'] as SortMode[]).map(m => (
            <button
              key={m}
              onClick={() => setSort(m)}
              className="text-[9px] font-black uppercase tracking-wider transition-all"
              style={{
                padding: '5px 8px',
                background: sort === m ? '#3b82f6' : 'transparent',
                color: sort === m ? '#fff' : '#4b5563',
              }}
            >
              {m === 'default' ? 'DEF' : m === 'gainers' ? '▲UP' : '▼DN'}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE HEADER ── */}
      <div className="flex items-center px-4 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ width: 14 }} />
        <div className="flex-shrink-0 ml-2" style={{ width: 44 }} />
        <div className="flex-1 ml-3">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#374151' }}>Instrument</span>
        </div>
        <div className="flex-shrink-0 mr-3 hidden sm:block" style={{ width: 70 }}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#374151' }}>Chart</span>
        </div>
        <div className="text-right" style={{ minWidth: 90 }}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#374151' }}>Price / Change</span>
        </div>
      </div>

      {/* ── LIST ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: '#374151' }}>
            <Globe size={36} className="mb-3 opacity-30" />
            <div className="text-sm font-medium">No results found</div>
          </div>
        ) : cat !== 'all' ? (
          [...visible]
            .sort((a, b) => {
              if (sort === 'gainers') return b.changePercent - a.changePercent;
              if (sort === 'losers') return a.changePercent - b.changePercent;
              if (sort === 'volume') return b.volume - a.volume;
              return 0;
            })
            .map(a => (
              <Row
                key={a.symbol}
                asset={a}
                flash={flashes[a.symbol]}
                isFav={favs.has(a.symbol)}
                onFav={() => toggleFav(a.symbol)}
                onOpen={() => setSelected(a)}
                spark={sparks[a.symbol] ?? []}
              />
            ))
        ) : (
          grouped.map(g => (
            <Section
              key={g.cat}
              title={CATEGORY_CONFIG[g.cat].label}
              color={CATEGORY_CONFIG[g.cat].color}
              assets={g.items}
              flashes={flashes}
              favs={favs}
              onFav={toggleFav}
              onOpen={setSelected}
              sparks={sparks}
              sortMode={sort}
              defaultOpen={g.cat === 'forex' || g.cat === 'indices' || g.cat === 'metals'}
            />
          ))
        )}
      </div>

      {/* ── WATCHLIST BAR ── */}
      {!watchOnly && favs.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 overflow-x-auto scrollbar-hide"
          style={{ background: '#0f1218', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0 px-3 py-2" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <Star size={10} fill="#f59e0b" color="#f59e0b" />
            </div>
            {assets.filter(a => favs.has(a.symbol)).map(a => {
              const up = a.changePercent >= 0;
              const fl = flashes[a.symbol];
              return (
                <button
                  key={a.symbol}
                  onClick={() => setSelected(a)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 transition-opacity hover:opacity-80"
                  style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="text-[10px] font-bold text-white">{a.displayName}</span>
                  <span className="text-[10px] font-mono font-bold transition-colors duration-200"
                    style={{ color: fl === 'up' ? '#10b981' : fl === 'down' ? '#ef4444' : up ? '#10b981' : '#ef4444' }}>
                    {formatGlobalPrice(a.price, a.symbol)}
                  </span>
                  <span className="text-[9px] font-bold" style={{ color: up ? '#10b981' : '#ef4444' }}>
                    {up ? '+' : ''}{a.changePercent.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <GlobalMarketDetailModal
          asset={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
