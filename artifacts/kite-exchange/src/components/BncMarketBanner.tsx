import { useEffect, useState } from 'react';
import { computeBncMarket } from '../lib/bncMarket';

// BNC market banner — uses the SAME deterministic data source as the
// Telegram Mini App's order book, so users see identical numbers on both.
export default function BncMarketBanner() {
  const [m, setM] = useState(() => computeBncMarket());

  useEffect(() => {
    const id = setInterval(() => setM(computeBncMarket()), 2500);
    return () => clearInterval(id);
  }, []);

  const priceColor =
    m.dir === 'down' ? '#F6465D' : '#0ECB81';

  // In a browser (Safari/Chrome) the banner opens the in-app mining page so
  // iPhone/Android users can mine without leaving Safari. Inside Telegram, the
  // user is already in the Mini App, so the banner just stays in the page.
  const inTelegram =
    typeof window !== 'undefined' &&
    ((window as any).__IS_TELEGRAM_MINIAPP__ === true ||
      !!(window as any).Telegram?.WebApp?.initData);
  const href = inTelegram
    ? 'https://t.me/Basonce_Miner_Bot/miner'
    : '/miner';
  const target = inTelegram ? '_blank' : '_self';

  return (
    <a
      href={href}
      target={target}
      rel="noopener"
      className="block mx-4 mt-3 mb-1 rounded-xl px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
        border: '1px solid rgba(240, 185, 11, 0.25)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full bg-black overflow-hidden flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 0 12px rgba(240, 185, 11, 0.35)' }}
        >
          <img
            src="/miner/bnc-coin.png"
            alt="BNC"
            className="w-full h-full object-cover"
            style={{ transform: 'scale(1.7)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white leading-tight">
            BNC <span className="text-gray-500 font-normal">/USDT</span>
          </div>
          <div className="text-[10px] text-gray-500 leading-tight">
            Vol ${m.volumeMillions.toFixed(1)}M · Mine on Telegram
          </div>
        </div>
        <div className="text-base font-bold tabular-nums" style={{ color: priceColor }}>
          ${m.price.toFixed(4)}
        </div>
        <div
          className="text-xs font-bold px-2 py-1 rounded-md tabular-nums"
          style={{ background: '#0ECB81', color: '#000' }}
        >
          +{m.change24h.toFixed(2)}%
        </div>
      </div>
    </a>
  );
}
