import { useState, useEffect, useRef } from 'react';
import { TRADFI_ASSETS, CATEGORY_STYLES, TEXT_LOGO_ASSETS } from '../lib/tradfi-data';
import { getAllTradFiPrices, subscribeAllTradFiPrices, startTradFiPriceUpdater } from '../lib/tradfi-price-service';
import { supabase } from '../lib/supabase';
import MetalIcon, { isMetalSymbol } from './MetalIcon';
import TradFiIcon, { isTradFiIcon } from './TradFiIcon';

const DB_KEY_MAP: Record<string, string> = {
  WTI: 'USOIL',
  SPX: 'SPX500',
  NDX: 'NAS100',
  DJI: 'US30',
};

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

const CATEGORY_ORDER = ['Gold', 'Silver', 'Platinum', 'Palladium', 'Index', 'Stock', 'Commodity', 'Agriculture', 'Forex', 'ETF'];

function AssetLogo({ displayName, logoUrl, bgColor }: { displayName: string; logoUrl: string; bgColor?: string }) {
  const [imgError, setImgError] = useState(false);
  const textDef = TEXT_LOGO_ASSETS[displayName];

  if (isMetalSymbol(displayName)) {
    return <MetalIcon symbol={displayName} size={36} />;
  }
  if (isTradFiIcon(displayName)) {
    return <TradFiIcon symbol={displayName} size={36} />;
  }

  if (logoUrl && !imgError) {
    return (
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: bgColor || '#2B3139', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
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
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: textDef.bg, border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
      >
        <span
          className="font-black leading-none"
          style={{ color: textDef.textColor, fontSize: `${textDef.fontSize ?? 9}px` }}
        >
          {textDef.text}
        </span>
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-[#2B3139]" style={{ border: '2px solid rgba(255,255,255,0.12)' }}>
      <span className="text-white font-bold text-[10px]">{displayName.slice(0, 3)}</span>
    </div>
  );
}

export default function HomeTradFiList() {
  const [prices, setPrices] = useState(() => getAllTradFiPrices());
  const [flash, setFlash] = useState<Map<string, 'up' | 'down'>>(new Map());
  const dbLogos = useRef<Record<string, string>>({});
  const [, forceRender] = useState(0);

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
    }).catch(() => {});
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

  const sorted = [...TRADFI_ASSETS].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="bg-[#0B0E11]">
      <div className="flex items-center px-4 py-2 text-[11px] font-medium text-[#848E9C] border-b border-[#2B3139]/40">
        <span className="flex-1">NAME</span>
        <span className="w-28 text-right">LAST PRICE</span>
        <span className="w-20 text-right">24H CHG%</span>
      </div>

      {sorted.map(asset => {
        const priceData = prices.get(asset.symbol);
        const price = priceData?.price ?? asset.basePrice;
        const change = priceData?.change24h ?? 0;
        const isUp = change >= 0;
        const flashDir = flash.get(asset.symbol);
        const logoUrl = resolveLogoUrl(asset.displayName, asset.logoUrl);
        const catStyle = CATEGORY_STYLES[asset.category];

        return (
          <div
            key={asset.symbol}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate-to-futures', {
                detail: { symbol: asset.symbol }
              }));
            }}
            className={`flex items-center px-4 py-3 border-b border-[#2B3139]/40 cursor-pointer active:bg-[#2B3139]/50 transition-colors duration-200 overflow-hidden ${
              flashDir === 'up' ? 'bg-[#0ECB81]/8' : flashDir === 'down' ? 'bg-[#F6465D]/8' : 'hover:bg-[#2B3139]/20'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AssetLogo displayName={asset.displayName} logoUrl={logoUrl} bgColor={asset.bgColor} />

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white font-bold text-[14px] leading-tight">{asset.displayName}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2B3139] text-[#848E9C] leading-none">Perp</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${catStyle.bg} ${catStyle.text}`}>
                    {catStyle.label}
                  </span>
                </div>
                <div className="text-[#848E9C] text-[11px] mt-0.5">
                  Vol <span className="text-white">{formatVolume(asset.volume24hBase)}</span>
                </div>
              </div>
            </div>

            <div className={`w-28 text-right font-black text-[14px] transition-colors duration-500 tabular-nums ${
              flashDir === 'up' ? 'text-[#0ECB81]' : flashDir === 'down' ? 'text-[#F6465D]' : 'text-white'
            }`}>
              ${formatTradFiPrice(price)}
            </div>

            <div className={`w-20 text-right text-[14px] font-black tabular-nums ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
