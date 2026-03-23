import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Star, TrendingUp, TrendingDown, Globe, ChevronDown, ChevronUp, Bell, Settings } from 'lucide-react';
import {
  GlobalAsset, AssetCategory, CATEGORY_CONFIG,
  getBaseAssets, getAssetsWithDbLogos, formatGlobalPrice, generateSparkline, seededRandom
} from '../lib/global-markets-data';
import GlobalMarketDetailModal from '../components/global-markets/GlobalMarketDetailModal';
import MetalIcon, { isMetalSymbol } from '../components/MetalIcon';

const FAVS_KEY = 'gm_favs_v9';
const TICK_MS = 1200;

type SortMode = 'default' | 'gainers' | 'losers' | 'volume';

const CATS: { id: 'all' | AssetCategory; label: string; icon?: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'forex',       label: 'Forex' },
  { id: 'indices',     label: 'Indices',     icon: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png' },
  { id: 'stocks',      label: 'Stocks' },
  { id: 'metals',      label: 'Metals' },
  { id: 'energy',      label: 'Energy',      icon: '/Enerji_kaynaklari_simgeleri.png' },
  { id: 'agriculture', label: 'Agriculture', icon: '/Altin_cerceveli_gida_ikonlari.png' },
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
    <div className="relative flex-shrink-0" style={{ width: 46, height: 46 }}>
      <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-white/15" style={{ background: '#1a2030', boxShadow: '0 3px 16px rgba(0,0,0,0.6)' }}>
        <img src={`https://flagcdn.com/w80/${b}.png`} alt={b}
          className="absolute top-1 left-1 rounded-sm shadow-lg object-cover border border-white/25"
          style={{ width: 28, height: 19 }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
        <img src={`https://flagcdn.com/w80/${q}.png`} alt={q}
          className="absolute bottom-1 right-1 rounded-sm shadow-lg object-cover border border-white/25"
          style={{ width: 28, height: 19 }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
      </div>
    </div>
  );
}

type StockDef = { bg: string; text: string; shape: 'letter' | 'svg'; content?: string; svgContent?: string; textSize?: number };

const STOCK_BADGE_DEFS: Record<string, StockDef> = {
  AAPL:  { bg: 'linear-gradient(145deg,#2a2a2a,#111)', text: '#f0f0f0', shape: 'svg',
    svgContent: '<path d="M22 17.5c-.1 2.1.9 3.7 2.8 4.9-.5 1.4-1.1 2.7-2 3.8-.8 1.1-1.6 2.2-2.9 2.2-1.2 0-1.7-.7-3-.7-1.4 0-1.9.7-3.1.7s-2-.9-3-2.3c-1.1-1.5-2-3.9-2-6.2 0-4.4 2.9-6.7 5.7-6.7 1.3 0 2.5.8 3.3.8.7 0 2.1-.8 3.6-.8.8 0 2.5.2 3.7 1.8-.1.1-2.2 1.3-2.1 3.5zm-3.7-6.8c.9-1 1.4-2.4 1.3-3.7-1.2.1-2.6.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.6 1.3.1 2.6-.6 3.5-1.7z" fill="#f0f0f0"/>' },
  MSFT:  { bg: 'linear-gradient(145deg,#0067c0,#004a90)', text: '#fff', shape: 'svg',
    svgContent: '<rect x="10" y="10" width="10" height="10" fill="#f25022"/><rect x="22" y="10" width="10" height="10" fill="#7fba00"/><rect x="10" y="22" width="10" height="10" fill="#00a4ef"/><rect x="22" y="22" width="10" height="10" fill="#ffb900"/>' },
  NVDA:  { bg: 'linear-gradient(145deg,#5a9a00,#3d6e00)', text: '#fff', shape: 'svg',
    svgContent: '<text x="16" y="25" font-family="Arial Black,Arial" font-weight="900" font-size="14" fill="#76B900" letter-spacing="-1">NV</text>' },
  GOOGL: { bg: 'linear-gradient(145deg,#4285F4,#2a6bd0)', text: '#fff', shape: 'svg',
    svgContent: '<text x="14.5" y="26" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#fff">G</text>' },
  AMZN:  { bg: 'linear-gradient(145deg,#232f3e,#111820)', text: '#FF9900', shape: 'svg',
    svgContent: '<text x="9" y="26" font-family="Arial Black,Arial" font-weight="900" font-size="13" fill="#FF9900">amzn</text>' },
  META:  { bg: 'linear-gradient(145deg,#0082FB,#0060c0)', text: '#fff', shape: 'svg',
    svgContent: '<path d="M8 20c0-3.3 2.5-8 4.5-8 1 0 2 1.2 3.5 3.5 1.5-2.4 2.5-3.5 3.5-3.5 2 0 4.5 4.7 4.5 8 0 2-1 3-2 3-1.2 0-2.5-2-2.5-2s-1.3 2-3.5 2c-2.2 0-3.5-2-3.5-2S10 23 8 23c-1 0-2-1-2-3h2z" fill="#fff"/>' },
  TSLA:  { bg: 'linear-gradient(145deg,#CC0000,#900000)', text: '#fff', shape: 'svg',
    svgContent: '<path d="M16 8c-4 0-7 .8-8 1.5.5.6 1.5 1 3 1.2L16 28l5-17.3c1.5-.2 2.5-.6 3-1.2-1-.7-4-1.5-8-1.5zm0 0c-1.5 0-2.5.2-3 .4l3 .6 3-.6c-.5-.2-1.5-.4-3-.4z" fill="#fff"/>' },
  JPM:   { bg: 'linear-gradient(145deg,#003087,#001a55)', text: '#fff', shape: 'letter', content: 'JPM', textSize: 10 },
  V:     { bg: 'linear-gradient(145deg,#1A1F71,#0d1248)', text: '#fff', shape: 'svg',
    svgContent: '<text x="12" y="27" font-family="Arial,sans-serif" font-weight="900" font-size="21" fill="#fff" letter-spacing="-1">VISA</text>' },
  MA:    { bg: 'linear-gradient(145deg,#252525,#111)', text: '#fff', shape: 'svg',
    svgContent: '<circle cx="13" cy="20" r="8" fill="#EB001B" opacity="0.9"/><circle cx="23" cy="20" r="8" fill="#F79E1B" opacity="0.9"/><ellipse cx="18" cy="20" rx="3" ry="6.5" fill="#FF5F00" opacity="0.9"/>' },
  BAC:   { bg: 'linear-gradient(145deg,#E31837,#a00020)', text: '#fff', shape: 'letter', content: 'BAC', textSize: 10 },
  GS:    { bg: 'linear-gradient(145deg,#4a6fa5,#2a4a80)', text: '#fff', shape: 'letter', content: 'GS', textSize: 14 },
  AMD:   { bg: 'linear-gradient(145deg,#ED1C24,#a00015)', text: '#fff', shape: 'svg',
    svgContent: '<text x="9" y="26" font-family="Arial Black,Arial" font-weight="900" font-size="14" fill="#fff">AMD</text>' },
  NFLX:  { bg: 'linear-gradient(145deg,#E50914,#a00008)', text: '#fff', shape: 'svg',
    svgContent: '<text x="10" y="26" font-family="Arial Black,Arial" font-weight="900" font-size="12" fill="#fff">NET</text><rect x="8" y="12" width="3.5" height="16" rx="1" fill="#fff"/><rect x="24.5" y="12" width="3.5" height="16" rx="1" fill="#fff"/><path d="M11.5 12 L24.5 28" stroke="#fff" stroke-width="3.5"/>' },
  DIS:   { bg: 'linear-gradient(145deg,#1d3461,#0d1a35)', text: '#fff', shape: 'letter', content: 'DIS', textSize: 11 },
  JNJ:   { bg: 'linear-gradient(145deg,#CC0000,#800000)', text: '#fff', shape: 'letter', content: 'J&J', textSize: 12 },
  WMT:   { bg: 'linear-gradient(145deg,#0071CE,#004a90)', text: '#fff', shape: 'svg',
    svgContent: '<circle cx="18" cy="18" r="3" fill="#FFC220"/><line x1="18" y1="8" x2="18" y2="13" stroke="#FFC220" stroke-width="2.5"/><line x1="18" y1="23" x2="18" y2="28" stroke="#FFC220" stroke-width="2.5"/><line x1="8" y1="18" x2="13" y2="18" stroke="#FFC220" stroke-width="2.5"/><line x1="23" y1="18" x2="28" y2="18" stroke="#FFC220" stroke-width="2.5"/><line x1="11" y1="11" x2="14.5" y2="14.5" stroke="#FFC220" stroke-width="2.5"/><line x1="21.5" y1="21.5" x2="25" y2="25" stroke="#FFC220" stroke-width="2.5"/><line x1="25" y1="11" x2="21.5" y2="14.5" stroke="#FFC220" stroke-width="2.5"/><line x1="14.5" y1="21.5" x2="11" y2="25" stroke="#FFC220" stroke-width="2.5"/>' },
  XOM:   { bg: 'linear-gradient(145deg,#CC0000,#800000)', text: '#fff', shape: 'letter', content: 'XOM', textSize: 11 },
  KO:    { bg: 'linear-gradient(145deg,#F40009,#a80006)', text: '#fff', shape: 'svg',
    svgContent: '<text x="11" y="26" font-family="Arial,sans-serif" font-weight="900" font-size="16" fill="#fff">KO</text>' },
  PFE:   { bg: 'linear-gradient(145deg,#003087,#001a55)', text: '#fff', shape: 'letter', content: 'PFE', textSize: 11 },
  SAP:   { bg: 'linear-gradient(145deg,#003366,#001a40)', text: '#1CAAFF', shape: 'svg',
    svgContent: '<text x="9" y="26" font-family="Arial Black,Arial" font-weight="900" font-size="14" fill="#1CAAFF">SAP</text>' },
  ASML:  { bg: 'linear-gradient(145deg,#009FDF,#006fa0)', text: '#fff', shape: 'letter', content: 'ASML', textSize: 9 },
  NESN:  { bg: 'linear-gradient(145deg,#009A44,#005a28)', text: '#fff', shape: 'letter', content: 'NESN', textSize: 9 },
  LVMH:  { bg: 'linear-gradient(145deg,#2a1f10,#1a1208)', text: '#D4A843', shape: 'letter', content: 'LVMH', textSize: 9 },
  TM:    { bg: 'linear-gradient(145deg,#CC0000,#800000)', text: '#fff', shape: 'svg',
    svgContent: '<ellipse cx="18" cy="18" rx="10" ry="7" fill="none" stroke="#fff" stroke-width="2.5"/><ellipse cx="18" cy="18" rx="6" ry="7" fill="none" stroke="#fff" stroke-width="2.5"/><line x1="8" y1="18" x2="28" y2="18" stroke="#fff" stroke-width="2.5"/>' },
  TSM:   { bg: 'linear-gradient(145deg,#003087,#001a55)', text: '#fff', shape: 'letter', content: 'TSM', textSize: 11 },
  BABA:  { bg: 'linear-gradient(145deg,#FF6A00,#c04a00)', text: '#fff', shape: 'svg',
    svgContent: '<text x="12" y="26" font-family="Arial Black,Arial" font-weight="900" font-size="13" fill="#fff">ALI</text>' },
  NVO:   { bg: 'linear-gradient(145deg,#003087,#001a55)', text: '#fff', shape: 'letter', content: 'NVO', textSize: 11 },
  INTC:  { bg: 'linear-gradient(145deg,#0068B5,#00468a)', text: '#fff', shape: 'svg',
    svgContent: '<text x="7" y="26" font-family="Arial,sans-serif" font-weight="900" font-size="12" fill="#fff">intel</text>' },
  COIN:  { bg: 'linear-gradient(145deg,#1652F0,#0a38c0)', text: '#fff', shape: 'svg',
    svgContent: '<path d="M18 8c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm3.5 14c-.8.5-1.8.8-3 .8-3.3 0-5.8-2.5-5.8-5.8s2.5-5.8 5.8-5.8c1.2 0 2.2.3 3 .8l-1.5 2.5c-.4-.2-.9-.4-1.5-.4-1.8 0-3 1.3-3 3s1.2 3 3 3c.6 0 1.1-.2 1.5-.4l1.5 2.3z" fill="#fff"/>' },
  PLTR:  { bg: 'linear-gradient(145deg,#1a1a1a,#0a0a0a)', text: '#7ec8e3', shape: 'letter', content: 'PLTR', textSize: 8 },
  SPOT:  { bg: 'linear-gradient(145deg,#1DB954,#128040)', text: '#fff', shape: 'svg',
    svgContent: '<circle cx="18" cy="18" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M14 15.5h8M13 18h10M14 20.5h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' },
  SNAP:  { bg: 'linear-gradient(145deg,#FFFC00,#c0c000)', text: '#222', shape: 'svg',
    svgContent: '<path d="M18 9c-2 0-4 1-5 2.5-.8 1.2-1 2.5-.9 3.5-1 0-2 .3-2 1s1 1.5 2 1.5c.2.5.5 1 1 1.3-.3.3-.8.5-1.5.7 1 .8 2.5 1 3.5.5.5.3 1.2.5 2 .5s1.5-.2 2-.5c1 .5 2.5.3 3.5-.5-.7-.2-1.2-.4-1.5-.7.5-.3.8-.8 1-1.3 1 0 2-.8 2-1.5s-1-1-2-1c.1-1-.1-2.3-.9-3.5-1-1.5-3-2.5-5-2.5z" fill="#222"/>' },
  MSTR:  { bg: 'linear-gradient(145deg,#f97316,#c05500)', text: '#fff', shape: 'letter', content: 'MSTR', textSize: 8 },
  HOOD:  { bg: 'linear-gradient(145deg,#00C805,#008a04)', text: '#fff', shape: 'letter', content: 'HOOD', textSize: 9 },
  CRCL:  { bg: 'linear-gradient(145deg,#2775CA,#1a55a0)', text: '#fff', shape: 'letter', content: 'CRCL', textSize: 9 },
  UBER:  { bg: 'linear-gradient(145deg,#1a1a1a,#000)', text: '#fff', shape: 'svg',
    svgContent: '<text x="8" y="26" font-family="Arial Black,Arial" font-weight="900" font-size="13" fill="#fff">UBER</text>' },
  BRKB:  { bg: 'linear-gradient(145deg,#4E3629,#2e1e15)', text: '#f0d080', shape: 'letter', content: 'BRK', textSize: 11 },
  SPY:   { bg: 'linear-gradient(145deg,#B22222,#7a1515)', text: '#fff', shape: 'letter', content: 'SPY', textSize: 11 },
  QQQ:   { bg: 'linear-gradient(145deg,#003087,#001a55)', text: '#fff', shape: 'letter', content: 'QQQ', textSize: 11 },
  GLD:   { bg: 'linear-gradient(145deg,#c8a800,#8a7200)', text: '#fff', shape: 'letter', content: 'GLD', textSize: 11 },
  SLV:   { bg: 'linear-gradient(145deg,#888,#555)', text: '#fff', shape: 'letter', content: 'SLV', textSize: 11 },
  ARKK:  { bg: 'linear-gradient(145deg,#1a1a2e,#0d0d20)', text: '#7ec8e3', shape: 'letter', content: 'ARKK', textSize: 9 },
};

const SYMBOL_ICONS: Record<string, { bg: string; svgContent: string }> = {
  SPX500:  { bg: 'linear-gradient(145deg,#1a2a4a,#0d1830)', svgContent: '<text x="8" y="23" font-family="Arial Black,Arial" font-weight="900" font-size="10" fill="#4a9eff">S&P</text><text x="8" y="33" font-family="Arial Black,Arial" font-weight="900" font-size="10" fill="#fff">500</text>' },
  NAS100:  { bg: 'linear-gradient(145deg,#1a2a4a,#0d1830)', svgContent: '<text x="7" y="22" font-family="Arial Black,Arial" font-weight="900" font-size="9" fill="#4a9eff">NAS</text><text x="7" y="32" font-family="Arial Black,Arial" font-weight="900" font-size="9" fill="#fff">100</text>' },
  US30:    { bg: 'linear-gradient(145deg,#1a2a4a,#0d1830)', svgContent: '<text x="11" y="22" font-family="Arial Black,Arial" font-weight="900" font-size="9" fill="#4a9eff">DOW</text><text x="12" y="32" font-family="Arial Black,Arial" font-weight="900" font-size="9" fill="#fff">30</text>' },
  GER40:   { bg: 'linear-gradient(145deg,#1a1500,#0d0d00)', svgContent: '<rect x="9" y="10" width="18" height="5.5" rx="1" fill="#000"/><rect x="9" y="16.5" width="18" height="5.5" rx="1" fill="#DD0000"/><rect x="9" y="22" width="18" height="5.5" rx="1" fill="#FFCE00"/>' },
  UK100:   { bg: 'linear-gradient(145deg,#00007a,#00004a)', svgContent: '<rect x="9" y="10" width="18" height="16" rx="1" fill="#012169"/><path d="M9 10 L27 26 M27 10 L9 26" stroke="#fff" stroke-width="3"/><path d="M9 10 L27 26 M27 10 L9 26" stroke="#C8102E" stroke-width="1.5"/><rect x="16" y="10" width="4" height="16" fill="#fff"/><rect x="9" y="16" width="18" height="4" fill="#fff"/><rect x="16.5" y="10" width="3" height="16" fill="#C8102E"/><rect x="9" y="16.5" width="18" height="3" fill="#C8102E"/>' },
  JP225:   { bg: 'linear-gradient(145deg,#2a0000,#1a0000)', svgContent: '<rect x="9" y="10" width="18" height="16" rx="1" fill="#fff"/><circle cx="18" cy="18" r="5" fill="#BC002D"/>' },
  FR40:    { bg: 'linear-gradient(145deg,#001050,#000830)', svgContent: '<rect x="9" y="10" width="6" height="16" rx="1" fill="#002395"/><rect x="15" y="10" width="6" height="16" fill="#fff"/><rect x="21" y="10" width="6" height="16" rx="1" fill="#ED2939"/>' },
  EU50:    { bg: 'linear-gradient(145deg,#003399,#001a66)', svgContent: '<rect x="9" y="10" width="18" height="16" rx="1" fill="#003399"/><text x="14" y="22" font-family="Arial" font-size="14" fill="#FFDD00">★</text>' },
  AUS200:  { bg: 'linear-gradient(145deg,#00205B,#001238)', svgContent: '<rect x="9" y="10" width="18" height="16" rx="1" fill="#00205B"/><text x="14.5" y="22" font-family="Arial" font-size="13" fill="#fff">✦</text>' },
  HK50:    { bg: 'linear-gradient(145deg,#8B0000,#5a0000)', svgContent: '<rect x="9" y="10" width="18" height="16" rx="1" fill="#DE2910"/><path d="M18 12 Q19 16 23 16 Q19 17 20 21 Q18 17 14 18 Q17 16 16 12 Q18 14 18 12z" fill="#FFDE00"/>' },
  BRENT:   { bg: 'linear-gradient(145deg,#1a1200,#0d0a00)', svgContent: '<ellipse cx="18" cy="22" rx="9" ry="6" fill="#1a1a1a" stroke="#555" stroke-width="1"/><rect x="15" y="10" width="6" height="14" rx="2" fill="#555"/><rect x="13" y="9" width="10" height="3" rx="1.5" fill="#666"/>' },
  USOIL:   { bg: 'linear-gradient(145deg,#1a1200,#0d0a00)', svgContent: '<ellipse cx="18" cy="22" rx="9" ry="6" fill="#2a2a2a" stroke="#666" stroke-width="1"/><rect x="15" y="10" width="6" height="14" rx="2" fill="#666"/><rect x="13" y="9" width="10" height="3" rx="1.5" fill="#777"/>' },
  NATGAS:  { bg: 'linear-gradient(145deg,#001a3a,#000d20)', svgContent: '<path d="M18 28 C14 24 12 20 15 16 C16 14 15 12 17 10 C17 14 20 14 20 17 C22 15 21 13 22 11 C25 15 24 20 20 24 C21 22 22 21 22 22 C22 25 20 27 18 28z" fill="#ff9500"/><path d="M18 26 C16 23 15 20 17 17 C18 19 19 19 19 21 C20 19 20 18 21 17 C22 20 21 23 18 26z" fill="#ffce00"/>' },
  COFFEE:  { bg: 'linear-gradient(145deg,#3a1a08,#1a0804)', svgContent: '<path d="M12 14 Q18 10 24 14 L23 24 Q18 28 13 24 Z" fill="#4a2010" stroke="#8B4513" stroke-width="1"/><path d="M24 15 Q28 15 28 18 Q28 21 24 20" fill="none" stroke="#8B4513" stroke-width="1.5"/><path d="M15 11 Q16 8 17 11" fill="none" stroke="#ccc" stroke-width="1.5"/><path d="M18 10 Q19 7 20 10" fill="none" stroke="#ccc" stroke-width="1.5"/>' },
  COCOA:   { bg: 'linear-gradient(145deg,#3a1a08,#1a0804)', svgContent: '<ellipse cx="18" cy="20" rx="8" ry="6" fill="#5C3317"/><path d="M18 9 C16 12 15 15 15 18 Q18 14 21 18 C21 15 20 12 18 9z" fill="#3d7a00"/><line x1="18" y1="16" x2="18" y2="20" stroke="#3d7a00" stroke-width="1"/>' },
  SUGAR:   { bg: 'linear-gradient(145deg,#3a1040,#1a0820)', svgContent: '<circle cx="14" cy="16" r="3" fill="#fff" opacity="0.9"/><circle cx="22" cy="14" r="2.5" fill="#fff" opacity="0.8"/><circle cx="18" cy="21" r="3.5" fill="#fff" opacity="0.9"/><circle cx="12" cy="22" r="2" fill="#fff" opacity="0.7"/><circle cx="24" cy="21" r="2.5" fill="#fff" opacity="0.8"/>' },
  WHEAT:   { bg: 'linear-gradient(145deg,#4a3010,#2a1808)', svgContent: '<line x1="18" y1="28" x2="18" y2="10" stroke="#c8a000" stroke-width="2"/><ellipse cx="18" cy="14" rx="3" ry="5" fill="#c8a000"/><ellipse cx="14" cy="17" rx="2.5" ry="4" fill="#d4b010" transform="rotate(-20 14 17)"/><ellipse cx="22" cy="17" rx="2.5" ry="4" fill="#d4b010" transform="rotate(20 22 17)"/>' },
  CORN:    { bg: 'linear-gradient(145deg,#4a3010,#2a1808)', svgContent: '<path d="M15 27 Q13 20 14 14 Q18 10 22 14 Q23 20 21 27 Z" fill="#c8a000"/><path d="M14 12 Q12 10 10 12 Q10 8 14 10 Z" fill="#2a6a00"/><path d="M22 12 Q24 10 26 12 Q26 8 22 10 Z" fill="#2a6a00"/><line x1="14" y1="14" x2="22" y2="14" stroke="#aa8800" stroke-width="1"/><line x1="14" y1="17" x2="22" y2="17" stroke="#aa8800" stroke-width="1"/><line x1="14" y1="20" x2="22" y2="20" stroke="#aa8800" stroke-width="1"/><line x1="14" y1="23" x2="22" y2="23" stroke="#aa8800" stroke-width="1"/>' },
  SOYBEAN: { bg: 'linear-gradient(145deg,#1a3a10,#0d2008)', svgContent: '<ellipse cx="18" cy="18" rx="9" ry="7" fill="#4a8a20"/><ellipse cx="18" cy="18" rx="7" ry="5" fill="#5aaa2a"/><path d="M12 15 Q18 12 24 15 Q18 24 12 15z" fill="#3a7a18"/>' },
  LUMBER:  { bg: 'linear-gradient(145deg,#3a2010,#1a1008)', svgContent: '<rect x="9" y="14" width="18" height="5" rx="1" fill="#8B6914"/><rect x="9" y="20.5" width="18" height="5" rx="1" fill="#a07a20"/><line x1="13" y1="14" x2="13" y2="25.5" stroke="#6a4a00" stroke-width="1"/><line x1="17" y1="14" x2="17" y2="25.5" stroke="#6a4a00" stroke-width="1"/><line x1="21" y1="14" x2="21" y2="25.5" stroke="#6a4a00" stroke-width="1"/><line x1="25" y1="14" x2="25" y2="25.5" stroke="#6a4a00" stroke-width="1"/>' },
  FCATTLE: { bg: 'linear-gradient(145deg,#2a3a1a,#1a2a0d)', svgContent: '<text x="13" y="25" font-family="Arial" font-size="20">🐄</text>' },
  LHOG:    { bg: 'linear-gradient(145deg,#3a1a1a,#2a0d10)', svgContent: '<text x="13" y="25" font-family="Arial" font-size="20">🥩</text>' },
};

function PremiumSVGIcon({ size, bg, svgContent }: { size: number; bg: string; svgContent: string }) {
  return (
    <div
      className="flex-shrink-0"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: bg,
        boxShadow: '0 3px 16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)',
        border: '1.5px solid rgba(255,255,255,0.13)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 36 36" width={size - 2} height={size - 2} xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: svgContent }} />
    </div>
  );
}

function LetterBadge({ size, bg, text, textColor, textSize = 11 }: { size: number; bg: string; text: string; textColor: string; textSize?: number }) {
  const len = text.length;
  const fs = len <= 2 ? 15 : len <= 3 ? 12 : textSize;
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: bg,
        boxShadow: '0 3px 16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)',
        border: '1.5px solid rgba(255,255,255,0.13)',
        overflow: 'hidden',
      }}
    >
      <span style={{
        color: textColor,
        fontSize: fs,
        fontWeight: 900,
        fontFamily: 'Arial Black, Arial, sans-serif',
        letterSpacing: len >= 4 ? '-0.5px' : '0',
        lineHeight: 1,
        textAlign: 'center',
        userSelect: 'none',
      }}>
        {text}
      </span>
    </div>
  );
}

const FLAG_INDICES: Record<string, string> = {
  US30: 'us', SPX500: 'us', NAS100: 'us', GER40: 'de', UK100: 'gb',
  JP225: 'jp', FR40: 'fr', EU50: 'eu', AUS200: 'au', HK50: 'hk',
  CHINA50: 'cn', IT40: 'it', ES35: 'es', RUS2000: 'us', VIX: 'us',
};

function AssetIcon({ asset }: { asset: GlobalAsset }) {
  const [imgErr, setImgErr] = useState(false);
  const SIZE = 46;

  if (asset.category === 'forex') {
    return <ForexFlag symbol={asset.symbol} />;
  }

  if (asset.category === 'metals' && isMetalSymbol(asset.symbol)) {
    return <MetalIcon symbol={asset.symbol} size={SIZE} />;
  }

  const symbolDef = SYMBOL_ICONS[asset.symbol];
  if (symbolDef) {
    return <PremiumSVGIcon size={SIZE} bg={symbolDef.bg} svgContent={symbolDef.svgContent} />;
  }

  if (asset.category === 'indices') {
    const flag = FLAG_INDICES[asset.symbol];
    if (flag && !imgErr) {
      return (
        <div className="flex-shrink-0 rounded-full overflow-hidden"
          style={{ width: SIZE, height: SIZE, boxShadow: '0 3px 16px rgba(0,0,0,0.65)', border: '2px solid rgba(255,255,255,0.18)' }}>
          <img src={`https://flagcdn.com/w160/${flag}.png`} alt={asset.symbol}
            className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        </div>
      );
    }
    return <LetterBadge size={SIZE} bg="linear-gradient(145deg,#1a2a4a,#0d1830)" text={asset.displayName.slice(0, 4)} textColor="#4a9eff" textSize={9} />;
  }

  if (asset.category === 'stocks') {
    const def = STOCK_BADGE_DEFS[asset.symbol];
    if (def) {
      if (def.shape === 'svg' && def.svgContent) {
        return <PremiumSVGIcon size={SIZE} bg={def.bg} svgContent={def.svgContent} />;
      }
      return <LetterBadge size={SIZE} bg={def.bg} text={def.content ?? asset.displayName.slice(0,4)} textColor={def.text} textSize={def.textSize} />;
    }
    if (asset.logoUrl && !imgErr) {
      return (
        <div className="flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full"
          style={{ width: SIZE, height: SIZE, background: asset.bgColor || '#0d1830', boxShadow: '0 3px 16px rgba(0,0,0,0.65)', border: '1.5px solid rgba(255,255,255,0.13)' }}>
          <img src={asset.logoUrl} alt={asset.symbol}
            style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: '50%' }}
            onError={() => setImgErr(true)} />
        </div>
      );
    }
    return <LetterBadge size={SIZE} bg="linear-gradient(145deg,#1e2d45,#0d1830)" text={asset.displayName.slice(0,4)} textColor="#7ec8e3" textSize={10} />;
  }

  if (asset.category === 'energy') {
    const def = SYMBOL_ICONS[asset.symbol];
    if (def) return <PremiumSVGIcon size={SIZE} bg={def.bg} svgContent={def.svgContent} />;
    return <LetterBadge size={SIZE} bg="linear-gradient(145deg,#2a1a00,#150d00)" text={asset.displayName.slice(0,4)} textColor="#ff9500" textSize={10} />;
  }

  if (asset.category === 'agriculture') {
    const def = SYMBOL_ICONS[asset.symbol];
    if (def) return <PremiumSVGIcon size={SIZE} bg={def.bg} svgContent={def.svgContent} />;
    return <LetterBadge size={SIZE} bg="linear-gradient(145deg,#1a3a10,#0d2008)" text={asset.displayName.slice(0,4)} textColor="#7acc30" textSize={10} />;
  }

  if (asset.logoUrl && !imgErr) {
    return (
      <div className="flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full"
        style={{ width: SIZE, height: SIZE, background: asset.bgColor || '#1a1a1a', boxShadow: '0 3px 16px rgba(0,0,0,0.65)', border: '1.5px solid rgba(255,255,255,0.13)' }}>
        <img src={asset.logoUrl} alt={asset.symbol}
          style={{ width: 32, height: 32, objectFit: 'contain' }}
          onError={() => setImgErr(true)} />
      </div>
    );
  }

  const cfg = CATEGORY_CONFIG[asset.category];
  return <LetterBadge size={46} bg={cfg.bgColor || '#1a1a2e'} text={asset.displayName.slice(0, 4)} textColor={cfg.color || '#fff'} textSize={10} />;
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

const SECTION_ICONS: Record<string, string> = {
  'Indices':     '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png',
  'Energy':      '/Enerji_kaynaklari_simgeleri.png',
  'Agriculture': '/Altin_cerceveli_gida_ikonlari.png',
};

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
  const sectionIcon = SECTION_ICONS[title];

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
        className="w-full flex items-center gap-2.5 px-4 py-2"
        style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {sectionIcon ? (
          <div className="flex-shrink-0 rounded-lg overflow-hidden"
            style={{ width: 32, height: 22, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <img src={sectionIcon} alt={title}
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center' }} />
          </div>
        ) : (
          <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
        )}
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
    <div className="flex-shrink-0 rounded-full p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', minWidth: 100 }}>
      <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#6b7280' }}>{label}</div>
      <div className="text-[16px] font-black leading-none" style={{ color }}>{value}</div>
      <div className="text-[9px] font-semibold mt-0.5 truncate" style={{ color: '#4b5563' }}>{sub}</div>
    </div>
  );
}

export default function GlobalMarketsPage() {
  const [base, setBase] = useState<GlobalAsset[]>(() => getBaseAssets());
  const { assets, flashes } = useLivePrices(base);

  useEffect(() => {
    getAssetsWithDbLogos().then(data => setBase(data));
  }, []);
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
                className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-semibold transition-all whitespace-nowrap relative"
                style={{
                  padding: '8px 12px',
                  color: active ? '#fff' : '#6b7280',
                  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                {c.icon && (
                  <div className="rounded overflow-hidden flex-shrink-0"
                    style={{ width: 20, height: 14, opacity: active ? 1 : 0.5 }}>
                    <img src={c.icon} alt={c.label}
                      className="w-full h-full object-contain" />
                  </div>
                )}
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
