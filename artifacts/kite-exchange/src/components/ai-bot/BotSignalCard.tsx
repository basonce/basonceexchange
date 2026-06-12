import { TrendingUp, TrendingDown, Minus, Target, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { BotSignal } from '../../lib/ai-bot-engine';
import { LiveTick, fmtLivePrice } from '../../lib/useLivePrices';

interface BotSignalCardProps {
  signal: BotSignal;
  onFollow?: (signal: BotSignal) => void;
  isFollowing?: boolean;
  livePrice?: LiveTick;
}

export default function BotSignalCard({ signal, onFollow, isFollowing, livePrice }: BotSignalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isLong = signal.signalType === 'LONG';
  const isShort = signal.signalType === 'SHORT';
  const isWait = signal.signalType === 'WAIT';

  const signalColor = isLong ? '#10B981' : isShort ? '#EF4444' : '#6B7280';
  const signalBg = isLong ? '#10B98115' : isShort ? '#EF444415' : '#6B728015';

  const tpPct = signal.entryPrice > 0
    ? ((signal.targetPrice - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)
    : '0.00';
  const slPct = signal.entryPrice > 0
    ? ((signal.stopLoss - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)
    : '0.00';

  const confidenceColor = signal.confidence >= 75 ? '#10B981' : signal.confidence >= 55 ? '#F59E0B' : '#EF4444';

  const base = signal.symbol.replace('USDT', '');

  return (
    <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] overflow-hidden">
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
              <div className="font-bold text-white text-sm flex items-center gap-2">
                {base}/USDT
                {livePrice && (
                  <span
                    key={livePrice.price}
                    className="inline-flex items-center gap-0.5 text-xs font-bold tabular-nums whitespace-nowrap rounded-md px-1.5 py-0.5"
                    style={{
                      color: livePrice.dir >= 0 ? '#10B981' : '#EF4444',
                      animation: `${livePrice.dir >= 0 ? 'liveFlashUp' : 'liveFlashDown'} 0.7s ease-out`,
                    }}
                  >
                    {livePrice.dir >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    ${fmtLivePrice(livePrice.price)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {signal.timeframe} · {new Date(signal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm"
              style={{ backgroundColor: signalBg, color: signalColor, border: `1px solid ${signalColor}40` }}
            >
              {isLong && <TrendingUp className="w-4 h-4" />}
              {isShort && <TrendingDown className="w-4 h-4" />}
              {isWait && <Minus className="w-4 h-4" />}
              {signal.signalType}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 bg-[#2B3139] rounded-xl h-2 overflow-hidden">
            <div
              className="relative h-full rounded-xl transition-all duration-700 overflow-hidden"
              style={{ width: `${signal.confidence}%`, backgroundColor: confidenceColor }}
            >
              <span
                className="absolute inset-y-0 w-1/3 -skew-x-12"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', animation: 'botSheen 1.8s ease-in-out infinite' }}
              />
            </div>
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: confidenceColor }}>{signal.confidence}%</span>
          <span className="text-xs text-gray-500">confidence</span>
        </div>

        {!isWait && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#2B3139] rounded-xl p-2.5 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Entry</div>
              <div className="text-xs font-bold text-white">${formatPrice(signal.entryPrice)}</div>
            </div>
            <div className="bg-[#10B98115] rounded-xl p-2.5 text-center border border-[#10B98130]">
              <div className="text-xs text-green-400 mb-0.5 flex items-center justify-center gap-1">
                <Target className="w-3 h-3" /> TP
              </div>
              <div className="text-xs font-bold text-green-400">
                {isLong ? '+' : '-'}{Math.abs(Number(tpPct))}%
              </div>
            </div>
            <div className="bg-[#EF444415] rounded-xl p-2.5 text-center border border-[#EF444430]">
              <div className="text-xs text-red-400 mb-0.5 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> SL
              </div>
              <div className="text-xs font-bold text-red-400">
                {isShort ? '+' : '-'}{Math.abs(Number(slPct))}%
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isWait && onFollow && (
            <button
              onClick={() => onFollow(signal)}
              disabled={isFollowing}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${isFollowing ? 'bg-[#2B3139] text-gray-500' : isLong ? 'bg-[#10B98120] text-green-400 border border-green-500/30 hover:bg-[#10B98130]' : 'bg-[#EF444420] text-red-400 border border-red-500/30 hover:bg-[#EF444430]'}`}
            >
              {isFollowing ? 'Following' : `Follow ${signal.signalType}`}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2.5 rounded-xl border border-[#2B3139] text-gray-400 hover:text-white transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2B3139] p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Technical Indicators</h4>
          <div className="grid grid-cols-2 gap-2">
            <IndicatorRow label="RSI (14)" value={signal.indicators.rsi.toFixed(1)} alert={signal.indicators.rsi < 30 ? 'oversold' : signal.indicators.rsi > 70 ? 'overbought' : undefined} />
            <IndicatorRow label="MACD Hist" value={signal.indicators.macdHist.toFixed(4)} positive={signal.indicators.macdHist > 0} />
            <IndicatorRow label="EMA20" value={`$${formatPrice(signal.indicators.ema20)}`} />
            <IndicatorRow label="EMA50" value={`$${formatPrice(signal.indicators.ema50)}`} />
            <IndicatorRow label="BB Upper" value={`$${formatPrice(signal.indicators.bbUpper)}`} />
            <IndicatorRow label="BB Lower" value={`$${formatPrice(signal.indicators.bbLower)}`} />
            <IndicatorRow label="Vol Change" value={`${signal.indicators.volumeChange > 0 ? '+' : ''}${signal.indicators.volumeChange}%`} positive={signal.indicators.volumeChange > 0} />
          </div>
          {signal.reasoning && (
            <div className="bg-[#2B3139] rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Analysis</div>
              <div className="text-xs text-gray-300">{signal.reasoning}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IndicatorRow({ label, value, positive, alert }: { label: string; value: string; positive?: boolean; alert?: string }) {
  const color = alert === 'oversold' ? '#10B981' : alert === 'overbought' ? '#EF4444' : positive === true ? '#10B981' : positive === false ? '#EF4444' : '#9CA3AF';
  return (
    <div className="bg-[#2B3139] rounded-xl p-2.5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xs font-bold mt-0.5" style={{ color }}>{value}</div>
      {alert && <div className="text-xs mt-0.5" style={{ color }}>{alert}</div>}
    </div>
  );
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
