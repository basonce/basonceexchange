import {
  Bot, Play, Pause, RefreshCw, Settings, AlertCircle, Wifi, ChevronLeft,
  Wallet, Target, TrendingUp, TrendingDown, Award, Zap, Activity, ShieldCheck,
  Cpu, LineChart, Gauge, BarChart3, Sparkles, Radar, Boxes, ArrowUpRight,
} from 'lucide-react';
import BotSetupScreen from '../../components/ai-bot/BotSetupScreen';
import BotSignalCard from '../../components/ai-bot/BotSignalCard';
import BotPositionCard from '../../components/ai-bot/BotPositionCard';
import BotStatsPanel from '../../components/ai-bot/BotStatsPanel';
import { useAIBot } from '../../hooks/useAIBot';
import { STRATEGY_CONFIGS } from '../../lib/ai-bot-engine';

const SHELL = 'w-full max-w-[1600px] mx-auto px-6';

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

  const totalReturn = initialBalance > 0 ? ((simBalance - initialBalance) / initialBalance) * 100 : 0;

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
              <Kpi icon={Wallet} label="Bot Balance" value={`$${simBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent="#F0B90B" />
              <Kpi icon={totalReturn >= 0 ? TrendingUp : TrendingDown} label="Total Return" value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`} accent={totalReturn >= 0 ? '#0ECB81' : '#F6465D'} />
              <Kpi icon={Target} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.winningTrades}/${stats.totalTrades} trades`} accent="#0ECB81" />
              <Kpi icon={LineChart} label="Total PnL" value={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`} accent={stats.totalPnl >= 0 ? '#0ECB81' : '#F6465D'} />
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
                        <BotSignalCard key={`${signal.symbol}-${i}`} signal={signal} onFollow={handleFollowSignal} isFollowing={openPositions.some(p => p.symbol === signal.symbol)} />
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'positions' && (
                  openPositions.length === 0 ? (
                    <EmptyState title="No open positions" subtitle="The bot opens positions automatically based on high-confidence signals" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {openPositions.map(pos => (<BotPositionCard key={pos.id} position={pos} onClose={handleClosePosition} />))}
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
                  <div className="p-4 bg-[#10B98112] border border-[#10B98130] rounded-2xl flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-green-400 font-semibold">Live · scanning {config.selectedCoins.length} coins</div>
                      {lastScan && <div className="text-xs text-gray-500 mt-0.5">Last scan {lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>}
                    </div>
                    <div className="flex gap-1 items-end">
                      {[1, 2, 3].map(i => (<div key={i} className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />))}
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
                  <h3 className="text-sm font-bold text-white mb-4">Active Markets</h3>
                  <div className="space-y-2.5">
                    {config.selectedCoins.map(symbol => {
                      const base = symbol.replace('USDT', '');
                      const sig = signals.find(s => s.symbol === symbol);
                      const sigColor = sig?.signalType === 'LONG' ? '#0ECB81' : sig?.signalType === 'SHORT' ? '#F6465D' : '#848E9C';
                      return (
                        <div key={symbol} className="flex items-center gap-3 min-w-0">
                          <img src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(base)}.png`} alt={base} className="w-7 h-7 rounded-full shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${base}&background=f0b90b&color=000&size=64`; }} />
                          <div className="flex-1 min-w-0 truncate text-sm font-medium text-white">{base}<span className="text-gray-500">/USDT</span></div>
                          {sig ? (
                            <span className="text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-md" style={{ color: sigColor, backgroundColor: `${sigColor}1A` }}>{sig.signalType === 'WAIT' ? 'WAIT' : `${sig.signalType} ${sig.confidence}%`}</span>
                          ) : (<span className="text-xs text-gray-600 whitespace-nowrap">—</span>)}
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

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden bg-[#181A20] border border-[#2B3139] rounded-2xl p-4 min-w-0 group hover:border-[#3B4049] transition-colors">
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: accent }} />
      <div className="relative flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1A`, border: `1px solid ${accent}33` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-xs text-gray-400 truncate">{label}</span>
      </div>
      <div className="relative text-xl font-bold whitespace-nowrap" style={{ color: accent }}>{value}</div>
      {sub && <div className="relative text-xs text-gray-500 mt-0.5 truncate">{sub}</div>}
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

const PREVIEW_SIGNALS = [
  { base: 'BTC', side: 'LONG' as const, conf: 91, spark: [42, 44, 43, 46, 48, 47, 50, 53, 52, 56], price: '109,842.50' },
  { base: 'ETH', side: 'LONG' as const, conf: 78, spark: [30, 31, 29, 32, 34, 33, 35, 34, 37, 39], price: '3,512.18' },
  { base: 'SOL', side: 'SHORT' as const, conf: 84, spark: [60, 58, 59, 55, 53, 54, 50, 48, 47, 44], price: '184.07' },
  { base: 'BNB', side: 'LONG' as const, conf: 69, spark: [20, 21, 22, 21, 23, 24, 23, 25, 26, 27], price: '642.90' },
];

function SignalTerminal() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#2B3139] bg-[#0E1116] flex flex-col">
      {/* scan line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 z-10" style={{ background: 'linear-gradient(180deg, rgba(240,185,11,0.18), transparent)', animation: 'botScan 3.4s linear infinite' }} />
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#F0B90B]/10 blur-[90px] pointer-events-none" />

      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[#2B3139]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/12 border border-[#F0B90B]/25 flex items-center justify-center shrink-0">
            <Radar className="w-5 h-5 text-[#F0B90B]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">Live Signal Terminal</div>
            <div className="text-[11px] text-gray-500 truncate">Real-time confidence scoring</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-green-400 bg-green-500/12 border border-green-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
        </span>
      </div>

      <div className="relative divide-y divide-[#1E2329]">
        {PREVIEW_SIGNALS.map((s) => {
          const color = s.side === 'LONG' ? '#0ECB81' : '#F6465D';
          return (
            <div key={s.base} className="flex items-center gap-3 px-5 py-3.5">
              <img src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(s.base)}.png`} alt={s.base} className="w-8 h-8 rounded-full shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${s.base}&background=f0b90b&color=000&size=64`; }} />
              <div className="w-[88px] min-w-0">
                <div className="text-sm font-semibold text-white truncate">{s.base}<span className="text-gray-500 text-xs">/USDT</span></div>
                <div className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">${s.price}</div>
              </div>
              <div className="hidden sm:block shrink-0">
                <Sparkline data={s.spark} color={color} width={96} height={30} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-md" style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}33` }}>
                  {s.side === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {s.side}
                </span>
                <div className="flex items-center gap-1.5 w-full max-w-[120px]">
                  <div className="flex-1 h-1.5 rounded-full bg-[#2B3139] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.conf}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ color }}>{s.conf}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-auto px-5 py-3 border-t border-[#2B3139] flex items-center justify-between text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Cpu className="w-3.5 h-3.5 text-[#F0B90B]" /> Engine analyzing 10 markets</span>
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
  const stratIcons: Record<string, any> = { scalper: Zap, swing: TrendingUp, conservative: ShieldCheck, aggressive: Activity };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-6 items-stretch">
        <div className="relative overflow-hidden rounded-3xl border border-[#F0B90B]/25 bg-gradient-to-br from-[#1A1610] via-[#15171D] to-[#0B0E11] p-8 flex flex-col">
          <GridGlow />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/25 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-[#F0B90B]" />
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
                <Zap className="w-5 h-5" /> {locked ? 'Get Started' : 'Configure Bot'}
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

      {/* Strategies + disclaimer */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-6 items-start">
        <div className="bg-[#181A20] border border-[#2B3139] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Available Strategies</h3>
            <span className="text-xs text-gray-500">Pick one during setup</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strategyKeys.map((key) => {
              const s = STRATEGY_CONFIGS[key];
              const SIcon = stratIcons[key] || Bot;
              return (
                <div key={key} className="relative overflow-hidden flex items-center gap-3 bg-[#0B0E11]/50 border border-[#2B3139] rounded-2xl p-4 hover:border-[#3B4049] transition-colors">
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: s.color }} />
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-1" style={{ backgroundColor: `${s.color}1A`, border: `1px solid ${s.color}33` }}>
                    <SIcon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm truncate">{s.label}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>{s.timeframe}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-400 whitespace-nowrap shrink-0">{s.leverage}x</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-[#2B3139] bg-gradient-to-br from-[#15171D] to-[#0B0E11] p-6">
            <ShieldCheck className="w-8 h-8 text-[#F0B90B] mb-3" />
            <h4 className="text-base font-bold text-white mb-2">Disciplined risk management</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Every position ships with automatic take-profit and stop-loss levels, plus a configurable daily loss limit that pauses trading to protect your capital.
            </p>
          </div>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-3xl p-4 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 shrink-0" />
            <p className="text-xs text-gray-400 leading-relaxed">Bot PnL is reflected in your real USDT balance. Profitable trades add to your balance, losses are deducted. Trade responsibly.</p>
          </div>
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
