import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Cpu, Bot, CircleDot } from 'lucide-react';
import { BotSignal } from '../../lib/ai-bot-engine';
import { LivePriceMap, fmtLivePrice } from '../../lib/useLivePrices';

interface Execution {
  id: number;
  symbol: string;
  base: string;
  side: 'LONG' | 'SHORT';
  price: number;
  sizeUsdt: number;
  leverage: number;
  pnlPct: number;
  at: number;
}

interface BotLiveTapeProps {
  coins: string[];
  live: LivePriceMap;
  signals: BotSignal[];
  leverage: number;
  closedCount: number;
  accent?: string;
}

function getCMCId(symbol: string): number {
  const map: Record<string, number> = {
    BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426, XRP: 52,
    ADA: 2010, DOGE: 74, AVAX: 5805, LINK: 1975, DOT: 6636,
  };
  return map[symbol] || 1;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function BotLiveTape({ coins, live, signals, leverage, closedCount, accent = '#F0B90B' }: BotLiveTapeProps) {
  const [tape, setTape] = useState<Execution[]>([]);
  const idxRef = useRef(0);
  const seqRef = useRef(1);
  const liveRef = useRef(live);
  const signalsRef = useRef(signals);
  const coinsRef = useRef(coins);
  liveRef.current = live;
  signalsRef.current = signals;
  coinsRef.current = coins;

  useEffect(() => {
    if (!coins.length) return;
    let cancelled = false;

    const emit = () => {
      if (cancelled) return;
      const list = coinsRef.current;
      if (!list.length) return;
      const idx = idxRef.current % list.length;
      idxRef.current = idx + 1;
      const symbol = list[idx];
      const tick = liveRef.current.get(symbol);
      if (!tick || !tick.price) return;

      const base = symbol.replace(/USDT$/i, '');
      const sig = signalsRef.current.find((s) => s.symbol === symbol);
      const side: 'LONG' | 'SHORT' =
        sig && sig.signalType !== 'WAIT'
          ? (sig.signalType as 'LONG' | 'SHORT')
          : tick.change24h >= 0
            ? 'LONG'
            : 'SHORT';

      // Realistic-looking micro-result: ~64% winners, small magnitudes.
      const win = Math.random() < 0.64;
      const pnlPct = win
        ? Math.round((0.08 + Math.random() * 1.45) * 100) / 100
        : -Math.round((0.06 + Math.random() * 0.82) * 100) / 100;
      const sizeUsdt = Math.round((45 + Math.random() * 380) * 100) / 100;

      const exec: Execution = {
        id: seqRef.current++,
        symbol,
        base,
        side,
        price: tick.price,
        sizeUsdt,
        leverage,
        pnlPct,
        at: Date.now(),
      };
      setTape((prev) => [exec, ...prev].slice(0, 9));
    };

    emit();
    const t = setInterval(emit, 2400);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins.join(','), leverage]);

  const spotlight = tape[0];

  return (
    <section className="mt-4 bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden">
      <style>{`
        @keyframes tapeRowIn { 0% { transform: translateY(-10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes spotSwap { 0% { transform: scale(.9) rotate(-6deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
        @keyframes tapeSheen { 0% { transform: translateX(-160%); } 100% { transform: translateX(260%); } }
      `}</style>

      {/* header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#2B3139]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1A`, border: `1px solid ${accent}33` }}>
            <Cpu className="w-4 h-4" style={{ color: accent }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate flex items-center gap-2">
              Live AI Execution
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 px-1.5 py-0.5 rounded-md bg-[#10B98115] border border-[#10B98130] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'liveDot 1.1s ease-in-out infinite' }} />
                LIVE
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded-md bg-[#2B3139] border border-[#3a414b] whitespace-nowrap">SIM</span>
            </h3>
            <p className="text-[11px] text-gray-500 truncate">Auto-rotating across {coins.length} markets · simulated strategy preview</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-white tabular-nums whitespace-nowrap">{closedCount}</div>
          <div className="text-[11px] text-gray-500 whitespace-nowrap">closed trades</div>
        </div>
      </div>

      {/* spotlight — the coin currently being executed */}
      {spotlight && (
        <div className="relative px-4 py-3.5 border-b border-[#2B3139] overflow-hidden bg-gradient-to-r from-[#1E2026] to-transparent">
          <span className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12" style={{ background: `linear-gradient(90deg, transparent, ${spotlight.side === 'LONG' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)'}, transparent)`, animation: 'tapeSheen 2.6s ease-in-out infinite' }} />
          <div className="relative flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0" key={spotlight.id} style={{ animation: 'spotSwap 0.45s ease-out' }}>
              <span className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${spotlight.side === 'LONG' ? '#10B98155' : '#EF444455'}`, animation: 'botPulseRing 1.6s ease-out infinite' }} />
              <img
                src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(spotlight.base)}.png`}
                alt={spotlight.base}
                className="relative w-11 h-11 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${spotlight.base}&background=f0b90b&color=000&size=64`; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base font-bold text-white truncate">{spotlight.base}<span className="text-gray-500">/USDT</span></span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0"
                  style={{ color: spotlight.side === 'LONG' ? '#10B981' : '#EF4444', backgroundColor: spotlight.side === 'LONG' ? '#10B98115' : '#EF444415', border: `1px solid ${spotlight.side === 'LONG' ? '#10B98130' : '#EF444430'}` }}
                >
                  {spotlight.side === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {spotlight.side === 'LONG' ? 'BUY' : 'SELL'}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Bot className="w-3 h-3" style={{ color: accent }} />
                <span className="truncate">AI strategy preview · {spotlight.leverage}x</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div key={spotlight.price} className="text-base font-bold text-white tabular-nums whitespace-nowrap">${fmtLivePrice(spotlight.price)}</div>
              <div className="text-[11px] font-semibold tabular-nums whitespace-nowrap" style={{ color: spotlight.pnlPct >= 0 ? '#10B981' : '#EF4444' }}>
                {spotlight.pnlPct >= 0 ? '+' : ''}{spotlight.pnlPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* streaming tape */}
      <div className="divide-y divide-[#2B3139]/60">
        {tape.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-500">Warming up the execution engine…</div>
        ) : (
          tape.map((e, i) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={i === 0 ? { animation: 'tapeRowIn 0.4s ease-out' } : undefined}
            >
              <span className="text-[11px] text-gray-600 tabular-nums whitespace-nowrap shrink-0 w-[58px]">{fmtTime(e.at)}</span>
              <img
                src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(e.base)}.png`}
                alt={e.base}
                className="w-6 h-6 rounded-full shrink-0"
                onError={(ev) => { (ev.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${e.base}&background=f0b90b&color=000&size=64`; }}
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-semibold text-white truncate">{e.base}<span className="text-gray-600">/USDT</span></span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0"
                  style={{ color: e.side === 'LONG' ? '#10B981' : '#EF4444', backgroundColor: e.side === 'LONG' ? '#10B98112' : '#EF444412' }}
                >
                  {e.side === 'LONG' ? 'BUY' : 'SELL'}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap hidden sm:inline">${fmtLivePrice(e.price)}</span>
                <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap hidden md:inline">${e.sizeUsdt.toFixed(0)}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums whitespace-nowrap w-[64px] justify-end" style={{ color: e.pnlPct >= 0 ? '#10B981' : '#EF4444' }}>
                  <CircleDot className="w-2.5 h-2.5" />
                  {e.pnlPct >= 0 ? '+' : ''}{e.pnlPct.toFixed(2)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
