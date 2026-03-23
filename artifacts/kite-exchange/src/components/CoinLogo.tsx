import { useState, useRef, useEffect } from 'react';
import { buildLogoChain, logoFailCache } from '../lib/logo-utils';

interface CoinLogoProps {
  symbol: string;
  dbUrl?: string | null;
  className?: string;
  size?: number;
  eager?: boolean;
}

const FALLBACK_COLORS = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#00D1FF', '#FF6B35', '#14b8a6', '#8b5cf6'];

const STOCK_SYMBOLS = new Set([
  'TSLA','AAPL','AMZN','NVDA','MSFT','GOOGL','META','NFLX','AMD',
  'COIN','HOOD','INTC','PLTR','MSTR','CRCL','DIS','JPM','BAC','GS',
  'BRK.B','V','MA','UBER','SPOT','SNAP','SPY','QQQ','GLD','SLV','ARKK',
  'SAP','LVMH',
]);

const STOCK_BG: Record<string, string> = {
  TSLA: '#CC0000', AAPL: '#1a1a1a', AMZN: '#FF9900', NVDA: '#76B900',
  MSFT: '#00A4EF', GOOGL: '#4285F4', META: '#0082FB', NFLX: '#E50914',
  AMD: '#ED1C24', COIN: '#1652F0', HOOD: '#00C805', INTC: '#1a1a1a',
  PLTR: '#101010', MSTR: '#F7931A', CRCL: '#2D8CFF', DIS: '#113CCF',
  JPM: '#003087', BAC: '#E31837', GS: '#7399C6', 'BRK.B': '#4E3629',
  V: '#1A1F71', MA: '#EB001B', UBER: '#1a1a1a', SPOT: '#1DB954',
  SNAP: '#FFFC00', SPY: '#1C3D5A', QQQ: '#1C4E8A', GLD: '#D4A027',
  SLV: '#9BA0A5', ARKK: '#1C3D5A',
  SAP: '#003366', LVMH: '#1a1000',
};

function getColor(symbol: string) {
  return FALLBACK_COLORS[(symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 0)) % FALLBACK_COLORS.length];
}

function getInitialIdx(chain: string[]): number {
  const found = chain.findIndex(url => !logoFailCache.has(url));
  return found >= 0 ? found : chain.length;
}

const BNC_DARK_BG_SYMBOLS = new Set(['BNC']);

export default function CoinLogo({ symbol, dbUrl, className = 'w-full h-full rounded-full object-cover', size, eager }: CoinLogoProps) {
  const prevSymbol = useRef<string>(symbol);
  const prevDbUrl = useRef<string | null | undefined>(dbUrl);
  const chainRef = useRef<string[]>(buildLogoChain(symbol, dbUrl));
  const [idx, setIdx] = useState(() => getInitialIdx(chainRef.current));

  useEffect(() => {
    const symbolChanged = symbol !== prevSymbol.current;
    const dbUrlChanged = dbUrl !== prevDbUrl.current && !!dbUrl && !logoFailCache.has(dbUrl);
    if (symbolChanged || dbUrlChanged) {
      prevSymbol.current = symbol;
      prevDbUrl.current = dbUrl;
      const newChain = buildLogoChain(symbol, dbUrl);
      chainRef.current = newChain;
      setIdx(getInitialIdx(newChain));
    }
  }, [dbUrl, symbol]);

  const src = chainRef.current[idx];

  const handleError = () => {
    logoFailCache.add(src);
    setIdx(i => {
      const next = chainRef.current.findIndex((url, j) => j > i && !logoFailCache.has(url));
      return next >= 0 ? next : chainRef.current.length;
    });
  };

  if (!src) {
    const sizeStyle = size ? { width: size, height: size, fontSize: size * 0.35, flexShrink: 0 as const } : {};
    return (
      <div
        className={`rounded-full flex items-center justify-center font-extrabold text-white ${className}`}
        style={{ background: getColor(symbol), ...sizeStyle }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }

  if (BNC_DARK_BG_SYMBOLS.has(symbol)) {
    const sizeStyle = size ? { width: size, height: size, flexShrink: 0 as const } : {};
    return (
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={sizeStyle || undefined}
      >
        <img
          key={src}
          src={src}
          alt={symbol}
          className="w-full h-full object-cover rounded-full"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          style={{ mixBlendMode: 'lighten', transform: 'scale(2.2)' }}
          onError={handleError}
        />
      </div>
    );
  }

  if (STOCK_SYMBOLS.has(symbol)) {
    const bg = STOCK_BG[symbol] || '#1a1a1a';
    const isLight = ['AMZN','SNAP'].includes(symbol);
    const sizeStyle = size ? { width: size, height: size, flexShrink: 0 as const } : {};
    return (
      <div
        className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ background: bg, ...sizeStyle }}
      >
        <img
          key={src}
          src={src}
          alt={symbol}
          className="w-[65%] h-[65%] object-contain"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          style={{ filter: isLight ? 'none' : 'brightness(0) invert(1)' }}
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={symbol}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
    />
  );
}
