import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface BannerEvent {
  id: string;
  traderName: string;
  traderAvatar: string;
  coin: string;
  direction: 'LONG' | 'SHORT';
  leverage: number;
  action: 'opened' | 'closed';
  pnl?: number;
}

const EVENTS: Omit<BannerEvent, 'id'>[] = [
  { traderName: 'CryptoKing2024', traderAvatar: 'https://i.pravatar.cc/150?img=68', coin: 'BTC', direction: 'LONG', leverage: 20, action: 'opened' },
  { traderName: 'DiamondHands', traderAvatar: 'https://i.pravatar.cc/150?img=29', coin: 'ETH', direction: 'LONG', leverage: 10, action: 'opened' },
  { traderName: 'QuantBot_9000', traderAvatar: 'https://i.pravatar.cc/150?img=8', coin: 'SOL', direction: 'SHORT', leverage: 15, action: 'opened' },
  { traderName: 'MoonShot_Pro', traderAvatar: 'https://i.pravatar.cc/150?img=47', coin: 'BNB', direction: 'LONG', leverage: 5, action: 'closed', pnl: 127.45 },
  { traderName: 'BullMarket888', traderAvatar: 'https://i.pravatar.cc/150?img=59', coin: 'XRP', direction: 'LONG', leverage: 25, action: 'opened' },
  { traderName: 'WhaleAlert_Pro', traderAvatar: 'https://i.pravatar.cc/150?img=30', coin: 'AVAX', direction: 'SHORT', leverage: 10, action: 'closed', pnl: -43.20 },
  { traderName: 'NakamotoBot', traderAvatar: 'https://i.pravatar.cc/150?img=1', coin: 'BTC', direction: 'LONG', leverage: 20, action: 'closed', pnl: 380.90 },
  { traderName: 'TrendBreaker', traderAvatar: 'https://i.pravatar.cc/150?img=45', coin: 'ETH', direction: 'SHORT', leverage: 15, action: 'opened' },
  { traderName: 'AlphaHunter_X', traderAvatar: 'https://i.pravatar.cc/150?img=37', coin: 'DOGE', direction: 'LONG', leverage: 10, action: 'opened' },
  { traderName: 'VelocityTrade', traderAvatar: 'https://i.pravatar.cc/150?img=44', coin: 'SOL', direction: 'LONG', leverage: 20, action: 'closed', pnl: 215.75 },
];

interface Props {
  activeCopyTraderNames: string[];
}

export default function CopyTradeActivityBanner({ activeCopyTraderNames }: Props) {
  const [current, setCurrent] = useState<BannerEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (activeCopyTraderNames.length === 0) return;

    const showNext = () => {
      const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      const isTracked = activeCopyTraderNames.some(name =>
        event.traderName.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      ) || Math.random() > 0.4;

      if (!isTracked) return;

      setCurrent({ ...event, id: Math.random().toString(36).slice(2) });
      setDismissed(false);
      setVisible(true);

      setTimeout(() => setVisible(false), 4500);
    };

    showNext();
    const interval = setInterval(showNext, 12000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, [activeCopyTraderNames.length]);

  if (!current || !visible || dismissed) return null;

  const isLong = current.direction === 'LONG';
  const isProfit = current.pnl !== undefined ? current.pnl >= 0 : true;

  return (
    <div
      className="fixed top-16 left-3 right-3 z-40 animate-slide-down"
      style={{ animation: 'slideDown 0.35s ease-out' }}
    >
      <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xl">
        <div className="relative flex-shrink-0">
          <img
            src={current.traderAvatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`;
            }}
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1E2329] flex items-center justify-center ${
              isLong ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'
            }`}
          >
            {isLong ? (
              <TrendingUp className="w-1.5 h-1.5 text-white" />
            ) : (
              <TrendingDown className="w-1.5 h-1.5 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#EAECEF] text-[11px] font-semibold truncate max-w-[90px]">
              {current.traderName}
            </span>
            <span className="text-[#848E9C] text-[10px]">
              {current.action === 'opened' ? 'opened' : 'closed'}
            </span>
            <span
              className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                isLong
                  ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                  : 'bg-[#F6465D]/15 text-[#F6465D]'
              }`}
            >
              {current.direction} {current.leverage}x
            </span>
            <span className="text-[#EAECEF] text-[11px] font-medium">
              {current.coin}/USDT
            </span>
          </div>
          {current.action === 'closed' && current.pnl !== undefined && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[#848E9C] text-[10px]">Realized:</span>
              <span
                className={`text-[11px] font-bold ${
                  isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                {isProfit ? '+' : ''}${Math.abs(current.pnl).toFixed(2)} USDT
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-[#848E9C]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
