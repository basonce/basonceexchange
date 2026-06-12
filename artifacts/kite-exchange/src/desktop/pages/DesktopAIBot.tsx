import { useEffect, useId, useRef, useState } from 'react';
import {
  Bot, Play, Pause, RefreshCw, Settings, AlertCircle, Wifi, ChevronLeft,
  Wallet, Target, TrendingUp, TrendingDown, Award, Zap, Activity, ShieldCheck,
  Cpu, LineChart, Gauge, BarChart3, Radar, Boxes, ArrowUpRight,
} from 'lucide-react';
import BotSetupScreen from '../../components/ai-bot/BotSetupScreen';
import BotSignalCard from '../../components/ai-bot/BotSignalCard';
import BotPositionCard from '../../components/ai-bot/BotPositionCard';
import BotStatsPanel from '../../components/ai-bot/BotStatsPanel';
import { useAIBot } from '../../hooks/useAIBot';
import { STRATEGY_CONFIGS, TOP_BOT_COINS } from '../../lib/ai-bot-engine';
import { useLivePrices, fmtLivePrice, LivePriceMap } from '../../lib/useLivePrices';

const SHELL = 'w-full max-w-[1600px] mx-auto px-6';

const SCAN_INTERVAL_MS: Record<string, number> = {
  scalper: 30000,
  aggressive: 60000,
  swing: 120000,
  conservative: 300000,
};

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function getCMCId(symbol: string): number {
  const map: Record<string, number> = {
    BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426, XRP: 52,
    ADA: 2010, DOGE: 74, AVAX: 5805, LINK: 1975, DOT: 6636,
  };
  return map[symbol] || 1;
}

/* ---------- shared visual atoms ---------- */

function BotStyles() {
  return (
    <style>{`
      @keyframes botScan { 0% { transform: translateY(-120%); opacity: 0; } 15% { opacity: .9; } 85% { opacity: .9; } 100% { transform: translateY(2200%); opacity: 0; } }
      @keyframes botFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes botPulseRing { 0% { transform: scale(.85); opacity: .55; } 100% { transform: scale(1.7); opacity: 0; } }
      @keyframes botDash { to { stroke-dashoffset: 0; } }
      @keyframes botSheen { 0% { transform: translateX(-150%); } 100% { transform: translateX(250%); } }
      @keyframes liveFlashUp { 0% { background-color: rgba(16,185,129,0.35); } 100% { background-color: transparent; } }
      @keyframes liveFlashDown { 0% { background-color: rgba(239,68,68,0.35); } 100% { background-color: transparent; } }
      @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes liveDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.7); } }
      @keyframes iconOrbit { to { transform: rotate(360deg); } }
      @keyframes iconCore { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .7; transform: scale(.78); } }
      @keyframes boltGlow { 0%,100% { opacity: .35; transform: scale(.85); } 50% { opacity: .9; transform: scale(1.18); } }
      @keyframes boltSheen { 0% { transform: translateX(-10px); } 100% { transform: translateX(34px); } }
      @keyframes boltKick { 0%,88%,100% { transform: scale(1) rotate(0deg); } 92% { transform: scale(1.18) rotate(-6deg); } 96% { transform: scale(1.18) rotate(6deg); } }
      @keyframes iconOrbitRev { to { transform: rotate(-360deg); } }
      @keyframes barPulse { 0%,100% { transform: scaleY(.32); } 50% { transform: scaleY(1); } }
      @keyframes flameFlicker { 0%,100% { transform: scale(1) translateY(0); opacity: .9; } 45% { transform: scale(1.14) translateY(-1px); opacity: 1; } 72% { transform: scale(.95) translateY(.5px); opacity: .95; } }
      @keyframes shieldBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      @keyframes coinShine { 0% { transform: translateX(-160%); } 55%,100% { transform: translateX(180%); } }
    `}</style>
  );
}

function GridGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #2B3139 1px, transparent 1px), linear-gradient(to bottom, #2B3139 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />
      <div className="absolute -top-28 left-1/3 w-[480px] h-[480px] rounded-full bg-[#F0B90B]/12 blur-[120px]" />
      <div className="absolute top-10 right-10 w-[360px] h-[360px] rounded-full bg-[#0ECB81]/8 blur-[120px]" />
    </div>
  );
}

/* Animated AI core for the badge — pulsing ring + orbiting electron + glowing nucleus */
function AICoreIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full border border-[#F0B90B]/70"
        style={{ animation: 'botPulseRing 1.9s ease-out infinite' }}
      />
      <span className="absolute inset-0" style={{ animation: 'iconOrbit 2.8s linear infinite' }}>
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-[#FFE9A8] shadow-[0_0_6px_2px_rgba(240,185,11,0.9)]" />
      </span>
      <span
        className="rounded-full bg-gradient-to-br from-[#FFF0BD] via-[#FFD75E] to-[#F0B90B] shadow-[0_0_8px_2px_rgba(240,185,11,0.75)]"
        style={{ width: size * 0.5, height: size * 0.5, animation: 'iconCore 1.6s ease-in-out infinite' }}
      />
    </span>
  );
}

/* Energized launch bolt for the primary CTA — soft glow pulse, light sheen sweep, periodic kick */
function LaunchBoltIcon({ size = 20 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const fillId = `boltFill-${uid}`;
  const clipId = `boltClip-${uid}`;
  const path = 'M13 2 L4 13.5 H10 L9 22 L20 9.5 H14 Z';
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span
        className="absolute inset-[-3px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.28), transparent 70%)', animation: 'boltGlow 1.5s ease-in-out infinite' }}
      />
      <svg viewBox="0 0 24 24" width={size} height={size} className="relative" style={{ animation: 'boltKick 3.2s ease-in-out infinite', overflow: 'visible' }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2A1E04" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <clipPath id={clipId}><path d={path} /></clipPath>
        </defs>
        <path d={path} fill={`url(#${fillId})`} stroke="rgba(0,0,0,0.55)" strokeWidth="0.6" strokeLinejoin="round" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="-8" y="-2" width="6" height="28" fill="rgba(255,255,255,0.6)" style={{ animation: 'boltSheen 1.7s ease-in-out infinite' }} />
        </g>
      </svg>
    </span>
  );
}

/* ===== Premium strategy + feature icons (bespoke, animated) ===== */

// Scalper — rapid-fire micro candles (speed / high frequency)
function ScalperIcon({ color, size = 26 }: { color: string; size?: number }) {
  const bars = [{ x: 3, d: 0 }, { x: 8.5, d: 0.12 }, { x: 14, d: 0.24 }, { x: 19.5, d: 0.36 }];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={3} width={2.4} height={18} rx={1.2} fill={color}
          style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: `barPulse 0.8s ease-in-out ${b.d}s infinite` }} />
      ))}
    </svg>
  );
}

// Swing — a glowing bead riding a market wave (ride the swings)
function SwingIcon({ color, size = 26 }: { color: string; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const pid = `swing-${uid}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      <path id={pid} d="M2 17 Q6.5 6 11 12 T22 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
      <circle r={2.4} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
        <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pid}`} xlinkHref={`#${pid}`} />
        </animateMotion>
      </circle>
    </svg>
  );
}

// Conservative / Aegis — breathing shield with protective aura (capital preservation)
function ShieldIcon({ color, size = 26, showRing = true }: { color: string; size?: number; showRing?: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {showRing && (
        <span className="absolute rounded-full border" style={{ inset: size * 0.08, borderColor: `${color}55`, animation: 'botPulseRing 2.3s ease-out infinite' }} />
      )}
      <svg viewBox="0 0 24 24" width={size} height={size}
        style={{ position: 'relative', transformBox: 'fill-box', transformOrigin: 'center', animation: 'shieldBreathe 2.6s ease-in-out infinite' }}>
        <path d="M12 2 L20 5.2 V11 C20 16 16.4 19.6 12 21.5 C7.6 19.6 4 16 4 11 V5.2 Z" fill={`${color}22`} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M8.4 12 l2.5 2.5 L15.8 8.8" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Aggressive — twin flickering flame (high heat, big risk)
function AggressiveIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      <path d="M12 2 C13.6 6.4 18 8 18 13.2 A6 6 0 0 1 6 13.2 C6 9.9 8.4 9 9.3 6.6 C11 7.8 11.4 9.5 11 11 C12.7 10.4 12.9 6.6 12 2 Z"
        fill={color} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: 'flameFlicker 1.1s ease-in-out infinite' }} />
      <path d="M12 10 C12.8 11.8 14 12.8 14 14.8 A2.4 2.4 0 0 1 9.2 14.8 C9.2 13.1 10.5 12.6 11 11.5 C11.6 12.1 11.7 12.9 11.5 13.6 C12.4 13.2 12.6 11.4 12 10 Z"
        fill="rgba(255,236,205,0.92)" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: 'flameFlicker 0.8s ease-in-out 0.15s infinite' }} />
    </svg>
  );
}

function StrategyIcon({ kind, color, size = 26 }: { kind: string; color: string; size?: number }) {
  if (kind === 'swing') return <SwingIcon color={color} size={size} />;
  if (kind === 'conservative') return <ShieldIcon color={color} size={size} showRing={false} />;
  if (kind === 'aggressive') return <AggressiveIcon color={color} size={size} />;
  return <ScalperIcon color={color} size={size} />;
}

// Header emblem — twin counter-orbiting nodes around a glowing core (strategy engine)
function StrategiesEmblem({ size = 24 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full border border-[#F0B90B]/30" style={{ animation: 'botPulseRing 2.4s ease-out infinite' }} />
      <span className="absolute inset-0" style={{ animation: 'iconOrbit 4.5s linear infinite' }}>
        <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-[#FFE9A8]" style={{ width: size * 0.16, height: size * 0.16, boxShadow: '0 0 6px 2px rgba(240,185,11,0.9)' }} />
      </span>
      <span className="absolute inset-0" style={{ animation: 'iconOrbitRev 6.5s linear infinite' }}>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-[#F0B90B]" style={{ width: size * 0.12, height: size * 0.12, boxShadow: '0 0 5px 1px rgba(240,185,11,0.8)' }} />
      </span>
      <span className="rounded-full bg-gradient-to-br from-[#FFF0BD] via-[#FFD75E] to-[#F0B90B]"
        style={{ width: size * 0.42, height: size * 0.42, boxShadow: '0 0 8px 2px rgba(240,185,11,0.7)', animation: 'iconCore 1.8s ease-in-out infinite' }} />
    </span>
  );
}

// Auto TP/SL badge — compact glowing protect shield
function AutoProtectIcon({ size = 15 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="absolute inset-[-2px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(240,185,11,0.4), transparent 70%)', animation: 'boltGlow 1.9s ease-in-out infinite' }} />
      <svg viewBox="0 0 24 24" width={size} height={size} className="relative">
        <path d="M12 2 L20 5.2 V11 C20 16 16.4 19.6 12 21.5 C7.6 19.6 4 16 4 11 V5.2 Z" fill="rgba(240,185,11,0.18)" stroke="#F0B90B" strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M8.4 12 l2.5 2.5 L15.8 8.8" fill="none" stroke="#F0B90B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Real USDT settlement — a coin with a sweeping shine
function SettlementIcon({ color = '#0ECB81', size = 22 }: { color?: string; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const cid = `coin-${uid}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <defs><clipPath id={cid}><circle cx="12" cy="12" r="9" /></clipPath></defs>
      <circle cx="12" cy="12" r="9" fill={`${color}1F`} stroke={color} strokeWidth={1.6} />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="800" fill={color} fontFamily="system-ui, sans-serif">$</text>
      <g clipPath={`url(#${cid})`}>
        <rect x="-6" y="0" width="6" height="24" fill="rgba(255,255,255,0.5)" style={{ animation: 'coinShine 2.6s ease-in-out infinite' }} />
      </g>
    </svg>
  );
}

// 24/7 market scanning — rotating radar sweep over concentric rings
function RadarScanIcon({ color = '#8B5CF6', size = 22 }: { color?: string; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gid = `radar-${uid}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="none" stroke={`${color}55`} strokeWidth={1.2} />
      <circle cx="12" cy="12" r="5" fill="none" stroke={`${color}40`} strokeWidth={1.2} />
      <g>
        <path d="M12 12 L12 3 A9 9 0 0 1 20.5 9 Z" fill={`url(#${gid})`} />
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="2.6s" repeatCount="indefinite" />
      </g>
      <circle cx="12" cy="12" r="1.6" fill={color} />
    </svg>
  );
}

function Sparkline({ data, color, width = 120, height = 34 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 6) - 3]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gid = `sg-${color.replace('#', '')}-${width}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 400, strokeDashoffset: 400, animation: 'botDash 1.6s ease forwards' }}
      />
    </svg>
  );
}

/* ---------- page ---------- */

export default function DesktopAIBot() {
  const {
    user,
    showSetup, setShowSetup,
    config, setConfig,
    isRunning,
    isLoading,
    activeTab, setActiveTab,
    signals,
    openPositions,
    closedPositions,
    stats,
    simBalance,
    initialBalance,
    realUsdtBalance,
    isScanning,
    lastScan,
    hasConfig,
    strategyInfo,
    scanSignals,
    updateOpenPositions,
    handleFollowSignal,
    handleClosePosition,
    handleStartBot,
    handleToggleBot,
  } = useAIBot();

  const live = useLivePrices(config.selectedCoins, hasConfig && !!user);
  const now = useNow(1000);

  // Live unrealized P&L across open positions (display-only; mirrors engine calcPnL).
  const unrealized = openPositions.reduce((acc, p) => {
    const lp = live.get(p.symbol);
    if (!lp) return acc + p.pnl;
    const diff = p.side === 'LONG'
      ? (lp.price - p.entryPrice) / p.entryPrice
      : (p.entryPrice - lp.price) / p.entryPrice;
    return acc + (p.sizeUsdt * diff * p.leverage);
  }, 0);

  const liveEquity = simBalance + unrealized;
  const liveTotalPnl = stats.totalPnl + unrealized;
  const totalReturn = initialBalance > 0 ? ((liveEquity - initialBalance) / initialBalance) * 100 : 0;

  const scanInterval = SCAN_INTERVAL_MS[config.strategy] ?? 120000;
  const nextScanSec = isRunning && lastScan
    ? Math.max(0, Math.ceil((lastScan.getTime() + scanInterval - now) / 1000))
    : 0;

  if (showSetup) {
    return (
      <div className="bg-[#0B0E11] min-h-screen py-10">
        <BotStyles />
        <div className="w-full max-w-[760px] mx-auto px-6">
          <button
            onClick={() => setShowSetup(false)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-5"
          >
            <ChevronLeft className="w-4 h-4" /> Back to dashboard
          </button>
          <div className="relative bg-[#181A20] border border-[#2B3139] rounded-3xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#2B3139] flex items-center gap-3 relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#C99400] flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(240,185,11,0.7)]">
                <Settings className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Bot Configuration</h1>
                <p className="text-xs text-gray-500">Set up your strategy, coins and risk preferences</p>
              </div>
            </div>
            <BotSetupScreen config={config} onConfigChange={setConfig} onStart={handleStartBot} realUsdtBalance={realUsdtBalance} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E11] min-h-screen pb-16">
      <BotStyles />

      {/* Header band */}
      <div className="relative border-b border-[#1E2329] bg-gradient-to-b from-[#12161C] to-[#0B0E11] overflow-hidden">
        <GridGlow />
        <div className={`${SHELL} py-7 relative`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                {isRunning && <span className="absolute inset-0 rounded-2xl bg-[#F0B90B]/40" style={{ animation: 'botPulseRing 1.8s ease-out infinite' }} />}
                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${isRunning ? 'bg-gradient-to-br from-[#F0B90B] to-[#C99400] shadow-[0_10px_30px_-8px_rgba(240,185,11,0.7)]' : 'bg-[#1E2329] border border-[#2B3139]'}`}>
                  <Bot className={`w-7 h-7 ${isRunning ? 'text-black' : 'text-gray-400'}`} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white leading-tight tracking-tight">AI Trading Bot</h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isRunning ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-[#1E2329] text-gray-400 border border-[#2B3139]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                    {isRunning ? `Active · ${strategyInfo?.label}` : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Automated signal engine — RSI, MACD, Bollinger Bands &amp; EMA across {config.selectedCoins.length} markets
                </p>
              </div>
            </div>

            {hasConfig && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { scanSignals(); updateOpenPositions(); }}
                  disabled={isScanning}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2B3139] text-gray-300 text-sm font-medium hover:border-[#3B4049] hover:text-white transition-all disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} /> Rescan
                </button>
                <button
                  onClick={() => setShowSetup(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2B3139] text-gray-300 text-sm font-medium hover:border-[#3B4049] hover:text-white transition-all"
                >
                  <Settings className="w-4 h-4" /> Configure
                </button>
                <button
                  onClick={handleToggleBot}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isRunning ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25' : 'bg-gradient-to-br from-[#F0B90B] to-[#D9A400] text-black hover:brightness-105 shadow-[0_10px_30px_-10px_rgba(240,185,11,0.8)]'}`}
                >
                  {isRunning ? <><Pause className="w-4 h-4" /> Stop Bot</> : <><Play className="w-4 h-4" /> Start Bot</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {user && hasConfig && <LiveTicker symbols={config.selectedCoins} live={live} />}

      <div className={`${SHELL} pt-7`}>
        {!user ? (
          <GetStarted onSetup={() => setShowSetup(true)} locked />
        ) : isLoading ? (
          <LoadingState />
        ) : !hasConfig ? (
          <GetStarted onSetup={() => setShowSetup(true)} />
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <Kpi icon={Wallet} label="Equity" value={`$${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={unrealized !== 0 ? `${unrealized >= 0 ? '+' : ''}$${unrealized.toFixed(2)} unrealized` : `$${simBalance.toFixed(2)} balance`} accent="#F0B90B" live />
              <Kpi icon={totalReturn >= 0 ? TrendingUp : TrendingDown} label="Total Return" value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`} accent={totalReturn >= 0 ? '#0ECB81' : '#F6465D'} live={unrealized !== 0} />
              <Kpi icon={Target} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.winningTrades}/${stats.totalTrades} trades`} accent="#0ECB81" />
              <Kpi icon={LineChart} label="Total PnL" value={`${liveTotalPnl >= 0 ? '+' : ''}$${liveTotalPnl.toFixed(2)}`} accent={liveTotalPnl >= 0 ? '#0ECB81' : '#F6465D'} live={unrealized !== 0} />
              <Kpi icon={Award} label="Best Trade" value={`+${stats.bestTradePct.toFixed(2)}%`} accent="#F0B90B" />
              <Kpi icon={Activity} label="Open Positions" value={`${openPositions.length}`} sub={`${closedPositions.length} closed`} accent="#8B5CF6" />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-6 items-start">
              {/* Left — work area */}
              <div className="min-w-0">
                <div className="flex items-center gap-1 bg-[#181A20] rounded-2xl p-1 border border-[#2B3139] mb-5 w-full max-w-[520px]">
                  {(['signals', 'positions', 'history', 'stats'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-[#F0B90B] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                      {tab === 'positions' ? `Positions (${openPositions.length})` : tab === 'history' ? 'History' : tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'signals' && (
                  signals.length === 0 ? (
                    <EmptyState title={isRunning ? 'Scanning markets…' : 'No signals yet'} subtitle={isRunning ? 'AI is analyzing your selected coins' : 'Start the bot to generate signals'} scanning={isScanning} />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {signals.map((signal, i) => (
                        <BotSignalCard key={`${signal.symbol}-${i}`} signal={signal} onFollow={handleFollowSignal} isFollowing={openPositions.some(p => p.symbol === signal.symbol)} livePrice={live.get(signal.symbol)} />
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'positions' && (
                  openPositions.length === 0 ? (
                    <EmptyState title="No open positions" subtitle="The bot opens positions automatically based on high-confidence signals" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {openPositions.map(pos => (<BotPositionCard key={pos.id} position={pos} onClose={handleClosePosition} livePrice={live.get(pos.symbol)} />))}
                    </div>
                  )
                )}

                {activeTab === 'history' && (
                  closedPositions.length === 0 ? (
                    <EmptyState title="No trade history" subtitle="Closed positions will appear here" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {closedPositions.map(pos => (<BotPositionCard key={pos.id} position={pos} />))}
                    </div>
                  )
                )}

                {activeTab === 'stats' && (
                  <div className="max-w-[640px]">
                    <BotStatsPanel stats={stats} simBalance={simBalance} initialBalance={initialBalance} />
                  </div>
                )}
              </div>

              {/* Right — sidebar */}
              <aside className="space-y-4 xl:sticky xl:top-4">
                {isRunning && (
                  <div className="relative p-4 bg-[#10B98112] border border-[#10B98130] rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-green-400 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'liveDot 1.1s ease-in-out infinite' }} />
                          Live · scanning {config.selectedCoins.length} coins
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                          {nextScanSec > 0 ? `Next scan in ${nextScanSec}s` : isScanning ? 'Scanning now…' : 'Scanning…'}
                          {lastScan && ` · last ${lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                        </div>
                      </div>
                      <div className="flex gap-1 items-end">
                        {[1, 2, 3].map(i => (<div key={i} className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />))}
                      </div>
                    </div>
                    <div className="mt-3 h-1 bg-[#10B98120] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${scanInterval > 0 ? Math.max(0, Math.min(100, ((scanInterval / 1000 - nextScanSec) / (scanInterval / 1000)) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Configuration</h3>
                    <button onClick={() => setShowSetup(true)} className="text-xs text-[#F0B90B] font-semibold hover:underline">Edit</button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <Row label="Strategy"><span className="font-semibold" style={{ color: strategyInfo?.color || '#F0B90B' }}>{strategyInfo?.label}</span></Row>
                    <Row label="Timeframe"><span className="text-white font-medium">{strategyInfo?.timeframe}</span></Row>
                    <Row label="Risk Level"><span className="text-white font-medium capitalize">{config.riskLevel}</span></Row>
                    <Row label="Leverage"><span className="text-white font-medium">{config.leverage}x</span></Row>
                    <Row label="Max Daily Loss"><span className="text-white font-medium">{config.maxDailyLossPct}%</span></Row>
                    <Row label="Markets"><span className="text-white font-medium">{config.selectedCoins.length} coins</span></Row>
                  </div>
                </div>

                <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Active Markets</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'liveDot 1.1s ease-in-out infinite' }} />
                      LIVE
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {config.selectedCoins.map(symbol => {
                      const base = symbol.replace('USDT', '');
                      const sig = signals.find(s => s.symbol === symbol);
                      const sigColor = sig?.signalType === 'LONG' ? '#0ECB81' : sig?.signalType === 'SHORT' ? '#F6465D' : '#848E9C';
                      const lp = live.get(symbol);
                      return (
                        <div key={symbol} className="flex items-center gap-3 min-w-0">
                          <img src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(base)}.png`} alt={base} className="w-7 h-7 rounded-full shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${base}&background=f0b90b&color=000&size=64`; }} />
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium text-white">{base}<span className="text-gray-500">/USDT</span></div>
                            {lp && (
                              <div
                                key={lp.price}
                                className="text-xs font-semibold tabular-nums whitespace-nowrap rounded px-1 -ml-1"
                                style={{ color: lp.dir >= 0 ? '#0ECB81' : '#F6465D', animation: `${lp.dir >= 0 ? 'liveFlashUp' : 'liveFlashDown'} 0.7s ease-out` }}
                              >
                                ${fmtLivePrice(lp.price)}
                              </div>
                            )}
                          </div>
                          {sig ? (
                            <span className="text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-md shrink-0" style={{ color: sigColor, backgroundColor: `${sigColor}1A` }}>{sig.signalType === 'WAIT' ? 'WAIT' : `${sig.signalType} ${sig.confidence}%`}</span>
                          ) : (<span className="text-xs text-gray-600 whitespace-nowrap shrink-0">—</span>)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-400 leading-relaxed">Bot PnL is reflected in your real USDT balance. Profits are added and losses are deducted automatically. Trade responsibly.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- KPI ---------- */

function Kpi({ icon: Icon, label, value, sub, accent, live }: { icon: any; label: string; value: string; sub?: string; accent: string; live?: boolean }) {
  return (
    <div className="relative overflow-hidden bg-[#181A20] border border-[#2B3139] rounded-2xl p-4 min-w-0 group hover:border-[#3B4049] transition-colors">
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: accent }} />
      {live && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent, animation: 'liveDot 1.1s ease-in-out infinite' }} />}
      <div className="relative flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1A`, border: `1px solid ${accent}33` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-xs text-gray-400 truncate">{label}</span>
      </div>
      <div className="relative text-xl font-bold whitespace-nowrap tabular-nums" style={{ color: accent }}>{value}</div>
      {sub && <div className="relative text-xs text-gray-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

/* ---------- live ticker strip ---------- */

function LiveTicker({ symbols, live }: { symbols: string[]; live: LivePriceMap }) {
  const items = symbols.filter(s => live.get(s));
  if (items.length === 0) return null;
  const row = (keyPrefix: string) => items.map((symbol) => {
    const base = symbol.replace('USDT', '');
    const lp = live.get(symbol)!;
    const up = lp.change24h >= 0;
    return (
      <div key={`${keyPrefix}-${symbol}`} className="flex items-center gap-2 px-5 whitespace-nowrap">
        <span className="text-xs font-bold text-gray-300">{base}<span className="text-gray-600">/USDT</span></span>
        <span
          key={lp.price}
          className="text-xs font-semibold tabular-nums rounded px-1"
          style={{ color: lp.dir >= 0 ? '#0ECB81' : '#F6465D', animation: `${lp.dir >= 0 ? 'liveFlashUp' : 'liveFlashDown'} 0.7s ease-out` }}
        >
          ${fmtLivePrice(lp.price)}
        </span>
        <span className="text-xs font-medium tabular-nums" style={{ color: up ? '#0ECB81' : '#F6465D' }}>
          {up ? '▲' : '▼'} {Math.abs(lp.change24h).toFixed(2)}%
        </span>
      </div>
    );
  });
  return (
    <div className="relative border-b border-[#1E2329] bg-[#0B0E11] overflow-hidden">
      <div className="flex w-max" style={{ animation: 'tickerScroll 28s linear infinite' }}>
        <div className="flex py-2.5">{row('a')}</div>
        <div className="flex py-2.5" aria-hidden>{row('b')}</div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0B0E11] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0B0E11] to-transparent" />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 whitespace-nowrap">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

/* ---------- live signal terminal (hero graphic) ---------- */

type LiveSig = { side: 'LONG' | 'SHORT'; conf: number; spark: number[] };

function LiveSparkline({ data, color, width = 84, height = 26 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 6) - 3]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gid = `lsg-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

function SignalTerminal() {
  const [sigs, setSigs] = useState<Record<string, LiveSig>>(() => {
    const init: Record<string, LiveSig> = {};
    TOP_BOT_COINS.forEach((c, i) => {
      const base = 40 + i * 4;
      init[c.symbol] = {
        side: i % 3 === 2 ? 'SHORT' : 'LONG',
        conf: 62 + Math.round(Math.random() * 28),
        spark: Array.from({ length: 14 }, (_, k) => base + Math.sin(k / 2 + i) * 5 + Math.random() * 4),
      };
    });
    return init;
  });
  const [scanIdx, setScanIdx] = useState(0);
  const tickRef = useRef(0);

  // Real-time prices: anchored to live CoinGecko values, then micro-ticking every
  // ~1.2s (mean-reverting random-walk) so the numbers visibly move like a real desk.
  const live = useLivePrices(TOP_BOT_COINS.map((c) => c.symbol), true);

  // Live "scanning" loop — updates one market per tick so the list stays alive
  useEffect(() => {
    const id = setInterval(() => {
      const idx = tickRef.current % TOP_BOT_COINS.length;
      tickRef.current += 1;
      setScanIdx(idx);
      const sym = TOP_BOT_COINS[idx].symbol;
      setSigs((prev) => {
        const cur = prev[sym];
        if (!cur) return prev;
        let conf = cur.conf + (Math.random() * 16 - 8);
        conf = Math.max(55, Math.min(96, conf));
        let side = cur.side;
        if (Math.random() < 0.22) {
          const bull = cur.spark[cur.spark.length - 1] >= cur.spark[0];
          side = Math.random() < (bull ? 0.72 : 0.28) ? 'LONG' : 'SHORT';
        }
        const last = cur.spark[cur.spark.length - 1];
        const np = last + (Math.random() * 6 - 3);
        const spark = [...cur.spark.slice(1), np];
        return { ...prev, [sym]: { ...cur, conf: Math.round(conf), side, spark } };
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const scanningBase = TOP_BOT_COINS[scanIdx]?.base ?? '';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#2B3139] bg-[#0E1116] flex flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 z-10" style={{ background: 'linear-gradient(180deg, rgba(240,185,11,0.16), transparent)', animation: 'botScan 3.4s linear infinite' }} />
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#F0B90B]/10 blur-[90px] pointer-events-none" />

      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[#2B3139]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/12 border border-[#F0B90B]/25 flex items-center justify-center shrink-0">
            <Radar className="w-5 h-5 text-[#F0B90B]" style={{ animation: 'botFloat 2.5s ease-in-out infinite' }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">Live Signal Terminal</div>
            <div className="text-[11px] text-gray-500 truncate">Scanning {scanningBase}/USDT · {TOP_BOT_COINS.length} markets</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-green-400 bg-green-500/12 border border-green-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
        </span>
      </div>

      <div className="relative divide-y divide-[#1E2329]">
        {TOP_BOT_COINS.map((c, i) => {
          const s = sigs[c.symbol];
          const t = live.get(c.symbol);
          const color = s.side === 'LONG' ? '#0ECB81' : '#F6465D';
          const isScanning = i === scanIdx;
          return (
            <div key={c.symbol} className="relative flex items-center gap-3 px-5 py-2.5 transition-colors" style={isScanning ? { background: 'linear-gradient(90deg, rgba(240,185,11,0.10), transparent 70%)' } : undefined}>
              {isScanning && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#F0B90B]" />}
              <img src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(c.base)}.png`} alt={c.base} className="w-7 h-7 rounded-full shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${c.base}&background=f0b90b&color=000&size=64`; }} />
              <div className="w-[92px] min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">{c.base}<span className="text-gray-500 text-[11px]">/USDT</span></div>
                <div
                  className="text-[11px] tabular-nums whitespace-nowrap transition-colors duration-200"
                  style={{ color: t ? (t.dir > 0 ? '#0ECB81' : t.dir < 0 ? '#F6465D' : (t.change24h >= 0 ? '#0ECB81' : '#F6465D')) : '#848E9C' }}
                >
                  {t ? `$${fmtLivePrice(t.price)}` : '···'}
                </div>
              </div>
              <div className="hidden sm:block shrink-0">
                <LiveSparkline data={s.spark} color={color} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap px-2 py-0.5 rounded-md" style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}33` }}>
                  {s.side === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {s.side}
                </span>
                <div className="flex items-center gap-1.5 w-full max-w-[118px]">
                  <div className="flex-1 h-1.5 rounded-full bg-[#2B3139] overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${s.conf}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums whitespace-nowrap w-8 text-right" style={{ color }}>{s.conf}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-auto px-5 py-3 border-t border-[#2B3139] flex items-center justify-between text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Cpu className="w-3.5 h-3.5 text-[#F0B90B]" /> Engine analyzing {TOP_BOT_COINS.length} markets</span>
        <span className="inline-flex items-center gap-1 text-[#F0B90B] font-semibold whitespace-nowrap">Auto-execute <ArrowUpRight className="w-3.5 h-3.5" /></span>
      </div>
    </div>
  );
}

/* ---------- states ---------- */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh]">
      <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-400">Loading bot data…</p>
    </div>
  );
}

const TRUST_STATS = [
  { icon: Gauge, label: 'Indicators', value: '12+' },
  { icon: Radar, label: 'Scanning', value: '24/7' },
  { icon: Boxes, label: 'Strategies', value: '4' },
  { icon: Zap, label: 'Signal Latency', value: '<50ms' },
];

function GetStarted({ onSetup, locked }: { onSetup: () => void; locked?: boolean }) {
  const features = [
    { icon: Cpu, title: 'Real-time Signal Engine', desc: 'RSI, MACD, Bollinger Bands and EMA analysis on every scan.' },
    { icon: Wallet, title: 'Real Balance Trading', desc: 'PnL is reflected directly in your USDT balance.' },
    { icon: BarChart3, title: '4 Trading Strategies', desc: 'Scalper, Swing, Conservative and Aggressive presets.' },
    { icon: ShieldCheck, title: 'Auto Risk Management', desc: 'Automatic take-profit, stop-loss and daily loss limits.' },
  ];
  const strategyKeys = Object.keys(STRATEGY_CONFIGS) as Array<keyof typeof STRATEGY_CONFIGS>;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-6 items-stretch">
        <div className="relative overflow-hidden rounded-3xl border border-[#F0B90B]/25 bg-gradient-to-br from-[#1A1610] via-[#15171D] to-[#0B0E11] p-8 flex flex-col">
          <GridGlow />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/25 mb-5">
              <AICoreIcon size={14} />
              <span className="text-[11px] font-bold tracking-[0.18em] text-[#F0B90B] uppercase">AI-Powered · Real-time</span>
            </div>

            <h2 className="text-4xl font-bold leading-[1.1] mb-4 tracking-tight">
              <span className="text-white">Trade smarter with</span><br />
              <span className="bg-gradient-to-r from-[#F0B90B] to-[#FFD75E] bg-clip-text text-transparent">your AI co-pilot</span>
            </h2>
            <p className="text-sm text-gray-300/90 max-w-md leading-relaxed mb-6">
              Our engine continuously analyzes real-time market data across top assets and generates
              high-confidence trading signals — then executes them with disciplined risk management.
            </p>

            {/* trust stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="rounded-2xl bg-[#0B0E11]/50 border border-[#2B3139] px-3 py-3">
                  <s.icon className="w-4 h-4 text-[#F0B90B] mb-1.5" />
                  <div className="text-lg font-bold text-white leading-none whitespace-nowrap">{s.value}</div>
                  <div className="text-[11px] text-gray-500 mt-1 truncate">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={onSetup} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-br from-[#F0B90B] to-[#D9A400] text-black font-bold text-base hover:brightness-105 transition-all shadow-[0_14px_40px_-12px_rgba(240,185,11,0.8)]">
                <LaunchBoltIcon size={20} /> {locked ? 'Get Started' : 'Configure Bot'}
              </button>
              {locked && <span className="text-xs text-gray-500">Sign in to launch your bot</span>}
            </div>
          </div>
        </div>

        {/* live terminal */}
        <SignalTerminal />
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <div key={i} className="relative overflow-hidden group bg-[#181A20] border border-[#2B3139] rounded-2xl p-5 hover:border-[#F0B90B]/40 transition-colors">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#F0B90B]/5 blur-2xl group-hover:bg-[#F0B90B]/10 transition-colors" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/25 flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-[#F0B90B]" />
            </div>
            <div className="relative text-sm font-bold text-white mb-1">{f.title}</div>
            <div className="relative text-xs text-gray-400 leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Strategies */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#15171D] to-[#0B0E11] border border-[#2B3139] rounded-3xl p-6 sm:p-7">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full bg-[#F0B90B]/5 blur-[120px] pointer-events-none" />
        <div className="relative flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/12 border border-[#F0B90B]/25 flex items-center justify-center shrink-0">
              <StrategiesEmblem size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">Trading Strategies</h3>
              <p className="text-xs text-gray-500">Four professionally tuned presets — choose one during setup</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 px-3 py-1.5 rounded-full border border-[#2B3139] bg-[#0B0E11]/50 whitespace-nowrap">
            <AutoProtectIcon size={15} /> Auto TP / SL on every trade
          </span>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {strategyKeys.map((key) => {
            const s = STRATEGY_CONFIGS[key];
            const riskTier = s.leverage <= 3 ? 1 : s.leverage <= 5 ? 2 : s.leverage <= 10 ? 3 : 4;
            const riskLabel = ['', 'Low', 'Medium', 'High', 'Very High'][riskTier];
            return (
              <div key={key} className="relative overflow-hidden bg-[#0E1116] border border-[#2B3139] rounded-2xl p-5 hover:border-[#3B4049] transition-all group">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: s.color }} />
                <div className="relative flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}1A`, border: `1px solid ${s.color}40` }}>
                    <StrategyIcon kind={key as string} color={s.color} size={26} />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>{s.timeframe}</span>
                </div>
                <div className="relative text-[15px] font-bold text-white mb-1 truncate">{s.label}</div>
                <p className="relative text-xs text-gray-400 leading-relaxed mb-4 min-h-[32px]">{s.description}</p>
                <div className="relative pt-3 border-t border-[#1E2329] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Max Leverage</div>
                    <div className="text-sm font-bold text-white whitespace-nowrap">{s.leverage}×</div>
                  </div>
                  <div className="text-right min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Risk</div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {[1, 2, 3, 4].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d <= riskTier ? s.color : '#2B3139' }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="sr-only">{riskLabel} risk</div>
              </div>
            );
          })}
        </div>

        {/* Trust footer */}
        <div className="relative mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 rounded-2xl bg-[#0B0E11]/50 border border-[#2B3139] p-4">
            <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/12 border border-[#F0B90B]/25 flex items-center justify-center shrink-0"><ShieldIcon color="#F0B90B" size={22} showRing={false} /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Disciplined risk management</div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Automatic take-profit, stop-loss and a configurable daily loss limit.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-[#0B0E11]/50 border border-[#2B3139] p-4">
            <div className="w-9 h-9 rounded-xl bg-[#0ECB8118] border border-[#0ECB8130] flex items-center justify-center shrink-0"><SettlementIcon color="#0ECB81" size={22} /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Real USDT settlement</div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Profits are credited and losses deducted from your real balance.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-[#0B0E11]/50 border border-[#2B3139] p-4">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF618] border border-[#8B5CF630] flex items-center justify-center shrink-0"><RadarScanIcon color="#8B5CF6" size={22} /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">24/7 market scanning</div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Continuous analysis across all selected markets, around the clock.</p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-start gap-2.5 rounded-2xl bg-[#181A20] border border-[#2B3139] p-3.5">
          <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 shrink-0" />
          <p className="text-xs text-gray-400 leading-relaxed">Bot PnL is reflected in your real USDT balance. Profitable trades add to your balance, losses are deducted. Trade responsibly.</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, scanning }: { title: string; subtitle: string; scanning?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-[#181A20] border border-[#2B3139] rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-[#0B0E11] flex items-center justify-center mb-4">
        {scanning ? <RefreshCw className="w-8 h-8 text-[#F0B90B] animate-spin" /> : <Bot className="w-8 h-8 text-gray-500" />}
      </div>
      <h4 className="text-base font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400 max-w-xs">{subtitle}</p>
    </div>
  );
}
