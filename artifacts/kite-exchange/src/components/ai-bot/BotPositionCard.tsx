import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { BotPosition } from '../../lib/ai-bot-engine';
import { LiveTick } from '../../lib/useLivePrices';

interface BotPositionCardProps {
  position: BotPosition;
  onClose?: (id: string) => void;
  livePrice?: LiveTick;
}

export default function BotPositionCard({ position, onClose, livePrice }: BotPositionCardProps) {
  const isLong = position.side === 'LONG';
  const isOpen = position.status === 'open';
  const base = position.symbol.replace('USDT', '');

  // Live, display-only mark price + P&L (mirrors engine calcPnL). Real money
  // is only settled by the bot's scan loop, never by this ticking layer.
  const markPrice = isOpen && livePrice ? livePrice.price : position.currentPrice;
  const priceDiff = isLong
    ? (markPrice - position.entryPrice) / position.entryPrice
    : (position.entryPrice - markPrice) / position.entryPrice;
  const livePnlPct = isOpen && livePrice ? priceDiff * position.leverage * 100 : position.pnlPct;
  const livePnl = isOpen && livePrice ? (position.sizeUsdt * livePnlPct) / 100 : position.pnl;
  const pnlPositive = livePnl >= 0;
  const livePosition = { ...position, currentPrice: markPrice };

  const statusColors: Record<string, string> = {
    open: '#F0B90B',
    closed_tp: '#10B981',
    closed_sl: '#EF4444',
    closed_manual: '#9CA3AF',
  };
  const statusLabels: Record<string, string> = {
    open: 'OPEN',
    closed_tp: 'TP HIT',
    closed_sl: 'SL HIT',
    closed_manual: 'CLOSED',
  };

  return (
    <div className={`bg-[#1E2026] rounded-2xl border overflow-hidden transition-all ${isOpen ? 'border-[#F0B90B]/30' : 'border-[#2B3139]'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <img
              src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(base)}.png`}
              alt={base}
              className="w-8 h-8 rounded-full"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${base}&background=f0b90b&color=000&size=64`; }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{base}/USDT</span>
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-semibold"
                  style={{ backgroundColor: `${isLong ? '#10B981' : '#EF4444'}20`, color: isLong ? '#10B981' : '#EF4444' }}
                >
                  {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {position.side}
                </span>
                <span className="text-xs text-gray-500">{position.leverage}x</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                ${position.sizeUsdt.toFixed(2)} · {new Date(position.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${statusColors[position.status]}20`, color: statusColors[position.status] }}
            >
              {statusLabels[position.status]}
            </span>
            {isOpen && onClose && (
              <button
                onClick={() => onClose(position.id)}
                className="w-7 h-7 rounded-lg bg-[#2B3139] flex items-center justify-center hover:bg-[#3B4049] transition-all"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#2B3139] rounded-xl p-2.5">
            <div className="text-xs text-gray-500">Entry</div>
            <div className="text-xs font-bold text-white mt-0.5">${formatPrice(position.entryPrice)}</div>
          </div>
          <div className="bg-[#2B3139] rounded-xl p-2.5">
            <div className="text-xs text-gray-500">{isOpen ? 'Current' : 'Exit'}</div>
            <div
              key={isOpen && livePrice ? markPrice : undefined}
              className="text-xs font-bold text-white mt-0.5 tabular-nums rounded"
              style={isOpen && livePrice ? { animation: `${livePrice.dir >= 0 ? 'liveFlashUp' : 'liveFlashDown'} 0.7s ease-out` } : undefined}
            >
              ${formatPrice(markPrice)}
            </div>
          </div>
          <div className={`rounded-xl p-2.5 ${pnlPositive ? 'bg-[#10B98115] border border-[#10B98130]' : 'bg-[#EF444415] border border-[#EF444430]'}`}>
            <div className="text-xs" style={{ color: pnlPositive ? '#10B981' : '#EF4444' }}>PnL</div>
            <div className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: pnlPositive ? '#10B981' : '#EF4444' }}>
              {pnlPositive ? '+' : ''}{livePnl.toFixed(2)}
            </div>
            <div className="text-xs tabular-nums" style={{ color: pnlPositive ? '#10B981' : '#EF4444' }}>
              {pnlPositive ? '+' : ''}{livePnlPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">SL: ${formatPrice(position.stopLoss)}</span>
              <span className="text-gray-500">TP: ${formatPrice(position.targetPrice)}</span>
            </div>
            <div className="relative h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                style={{
                  width: `${getProgressPct(livePosition)}%`,
                  backgroundColor: pnlPositive ? '#10B981' : '#EF4444',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getProgressPct(position: BotPosition): number {
  const range = Math.abs(position.targetPrice - position.stopLoss);
  if (range === 0) return 50;
  const progress = position.side === 'LONG'
    ? (position.currentPrice - position.stopLoss) / range
    : (position.stopLoss - position.currentPrice) / range;
  return Math.max(0, Math.min(100, progress * 100));
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function getCMCId(symbol: string): number {
  const map: Record<string, number> = {
    BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426, XRP: 52,
    ADA: 2010, DOGE: 74, AVAX: 5805, LINK: 1975, DOT: 6636,
  };
  return map[symbol] || 1;
}
