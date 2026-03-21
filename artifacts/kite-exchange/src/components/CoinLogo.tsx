import { useState, useRef, useEffect } from 'react';
import { buildLogoChain, logoFailCache } from '../lib/logo-utils';

interface CoinLogoProps {
  symbol: string;
  dbUrl?: string | null;
  className?: string;
  size?: number;
}

const FALLBACK_COLORS = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#00D1FF', '#FF6B35', '#14b8a6', '#8b5cf6'];

function getColor(symbol: string) {
  return FALLBACK_COLORS[(symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 0)) % FALLBACK_COLORS.length];
}

function getInitialIdx(chain: string[]): number {
  const found = chain.findIndex(url => !logoFailCache.has(url));
  return found >= 0 ? found : chain.length;
}

const BNC_DARK_BG_SYMBOLS = new Set(['BNC']);

export default function CoinLogo({ symbol, dbUrl, className = 'w-full h-full rounded-full object-cover', size, eager }: CoinLogoProps & { eager?: boolean }) {
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
          onError={() => {
            logoFailCache.add(src);
            setIdx(i => {
              const next = chainRef.current.findIndex((url, j) => j > i && !logoFailCache.has(url));
              return next >= 0 ? next : chainRef.current.length;
            });
          }}
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
      onError={() => {
        logoFailCache.add(src);
        setIdx(i => {
          const next = chainRef.current.findIndex((url, j) => j > i && !logoFailCache.has(url));
          return next >= 0 ? next : chainRef.current.length;
        });
      }}
    />
  );
}
