import {
  Bot, Play, Pause, RefreshCw, Settings, AlertCircle, Wifi, ChevronLeft,
  Wallet, Target, TrendingUp, Award, Zap, Activity, ShieldCheck, Cpu, LineChart,
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
        <div className="w-full max-w-[760px] mx-auto px-6">
          <button
            onClick={() => setShowSetup(false)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-5"
          >
            <ChevronLeft className="w-4 h-4" /> Back to dashboard
          </button>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-3xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#2B3139] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0B90B] flex items-center justify-center">
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
      {/* Header band */}
      <div className="border-b border-[#1E2329] bg-gradient-to-b from-[#12161C] to-[#0B0E11]">
        <div className={`${SHELL} py-6`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isRunning ? 'bg-[#F0B90B]' : 'bg-[#1E2329] border border-[#2B3139]'}`}>
                <Bot className={`w-7 h-7 ${isRunning ? 'text-black' : 'text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white leading-tight">AI Trading Bot</h1>
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
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isRunning ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25' : 'bg-[#F0B90B] text-black hover:bg-[#f8c33a]'}`}
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
          <NotLoggedIn />
        ) : isLoading ? (
          <LoadingState />
        ) : !hasConfig ? (
          <GetStarted onSetup={() => setShowSetup(true)} />
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <Kpi
                icon={Wallet}
                label="Bot Balance"
                value={`$${simBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                accent="#F0B90B"
              />
              <Kpi
                icon={TrendingUp}
                label="Total Return"
                value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`}
                accent={totalReturn >= 0 ? '#0ECB81' : '#F6465D'}
              />
              <Kpi
                icon={Target}
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                sub={`${stats.winningTrades}/${stats.totalTrades} trades`}
                accent="#0ECB81"
              />
              <Kpi
                icon={LineChart}
                label="Total PnL"
                value={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`}
                accent={stats.totalPnl >= 0 ? '#0ECB81' : '#F6465D'}
              />
              <Kpi
                icon={Award}
                label="Best Trade"
                value={`+${stats.bestTradePct.toFixed(2)}%`}
                accent="#F0B90B"
              />
              <Kpi
                icon={Activity}
                label="Open Positions"
                value={`${openPositions.length}`}
                sub={`${closedPositions.length} closed`}
                accent="#8B5CF6"
              />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,340px)] gap-6 items-start">
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
                    <EmptyState
                      title={isRunning ? 'Scanning markets…' : 'No signals yet'}
                      subtitle={isRunning ? 'AI is analyzing your selected coins' : 'Start the bot to generate signals'}
                      scanning={isScanning}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {signals.map((signal, i) => (
                        <BotSignalCard
                          key={`${signal.symbol}-${i}`}
                          signal={signal}
                          onFollow={handleFollowSignal}
                          isFollowing={openPositions.some(p => p.symbol === signal.symbol)}
                        />
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'positions' && (
                  openPositions.length === 0 ? (
                    <EmptyState title="No open positions" subtitle="The bot opens positions automatically based on high-confidence signals" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {openPositions.map(pos => (
                        <BotPositionCard key={pos.id} position={pos} onClose={handleClosePosition} />
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'history' && (
                  closedPositions.length === 0 ? (
                    <EmptyState title="No trade history" subtitle="Closed positions will appear here" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {closedPositions.map(pos => (
                        <BotPositionCard key={pos.id} position={pos} />
                      ))}
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
                      {lastScan && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Last scan {lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 items-end">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Configuration */}
                <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Configuration</h3>
                    <button onClick={() => setShowSetup(true)} className="text-xs text-[#F0B90B] font-semibold hover:underline">Edit</button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <Row label="Strategy">
                      <span className="font-semibold" style={{ color: strategyInfo?.color || '#F0B90B' }}>{strategyInfo?.label}</span>
                    </Row>
                    <Row label="Timeframe"><span className="text-white font-medium">{strategyInfo?.timeframe}</span></Row>
                    <Row label="Risk Level"><span className="text-white font-medium capitalize">{config.riskLevel}</span></Row>
                    <Row label="Leverage"><span className="text-white font-medium">{config.leverage}x</span></Row>
                    <Row label="Max Daily Loss"><span className="text-white font-medium">{config.maxDailyLossPct}%</span></Row>
                    <Row label="Markets"><span className="text-white font-medium">{config.selectedCoins.length} coins</span></Row>
                  </div>
                </div>

                {/* Watchlist */}
                <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Active Markets</h3>
                  <div className="space-y-2.5">
                    {config.selectedCoins.map(symbol => {
                      const base = symbol.replace('USDT', '');
                      const sig = signals.find(s => s.symbol === symbol);
                      const sigColor = sig?.signalType === 'LONG' ? '#0ECB81' : sig?.signalType === 'SHORT' ? '#F6465D' : '#848E9C';
                      return (
                        <div key={symbol} className="flex items-center gap-3 min-w-0">
                          <img
                            src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(base)}.png`}
                            alt={base}
                            className="w-7 h-7 rounded-full shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${base}&background=f0b90b&color=000&size=64`; }}
                          />
                          <div className="flex-1 min-w-0 truncate text-sm font-medium text-white">{base}<span className="text-gray-500">/USDT</span></div>
                          {sig ? (
                            <span className="text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-md" style={{ color: sigColor, backgroundColor: `${sigColor}1A` }}>
                              {sig.signalType === 'WAIT' ? 'WAIT' : `${sig.signalType} ${sig.confidence}%`}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 whitespace-nowrap">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk note */}
                <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Bot PnL is reflected in your real USDT balance. Profits are added and losses are deducted automatically. Trade responsibly.
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4 min-w-0">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1A` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-xs text-gray-400 truncate">{label}</span>
      </div>
      <div className="text-xl font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5 truncate">{sub}</div>}
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

function NotLoggedIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
      <div className="w-20 h-20 rounded-3xl bg-[#181A20] border border-[#2B3139] flex items-center justify-center mb-5">
        <Bot className="w-10 h-10 text-gray-500" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
      <p className="text-sm text-gray-400 max-w-sm">Please log in to access the AI Trading Bot, configure strategies and track your positions.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh]">
      <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-400">Loading bot data…</p>
    </div>
  );
}

function GetStarted({ onSetup }: { onSetup: () => void }) {
  const features = [
    { icon: Cpu, title: 'Real-time Signal Engine', desc: 'RSI, MACD, Bollinger Bands and EMA analysis on every scan.' },
    { icon: Wallet, title: 'Real Balance Trading', desc: 'PnL is reflected directly in your USDT balance.' },
    { icon: LineChart, title: '4 Trading Strategies', desc: 'Scalper, Swing, Conservative and Aggressive presets.' },
    { icon: ShieldCheck, title: 'Auto Risk Management', desc: 'Automatic take-profit, stop-loss and daily loss limits.' },
  ];
  const strategyKeys = Object.keys(STRATEGY_CONFIGS) as Array<keyof typeof STRATEGY_CONFIGS>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_minmax(0,1fr)] gap-6 items-stretch">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[#F0B90B]/25 bg-gradient-to-br from-[#F0B90B]/12 via-[#181A20] to-[#0B0E11] p-8 flex flex-col">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#F0B90B]/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#F0B90B] flex items-center justify-center mb-5">
            <Bot className="w-9 h-9 text-black" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">Trade smarter with<br />your AI co-pilot</h2>
          <p className="text-sm text-gray-300/90 max-w-md leading-relaxed mb-7">
            Our engine continuously analyzes real-time market data across top assets and generates
            high-confidence trading signals — then executes them with disciplined risk management.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#0B0E11]/40 border border-[#2B3139] rounded-2xl p-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-[#F0B90B]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onSetup}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#F0B90B] text-black font-bold text-base hover:bg-[#f8c33a] transition-colors"
          >
            <Zap className="w-5 h-5" /> Configure Bot
          </button>
        </div>
      </div>

      {/* Strategy preview */}
      <div className="bg-[#181A20] border border-[#2B3139] rounded-3xl p-6 flex flex-col">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Available Strategies</h3>
        <div className="space-y-3 flex-1">
          {strategyKeys.map((key) => {
            const s = STRATEGY_CONFIGS[key];
            return (
              <div key={key} className="flex items-center gap-3 bg-[#0B0E11]/50 border border-[#2B3139] rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}1A` }}>
                  <Bot className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{s.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>{s.timeframe}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{s.leverage}x</span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 bg-[#0B0E11]/50 border border-[#2B3139] rounded-2xl p-4 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 shrink-0" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Bot PnL is reflected in your real USDT balance. Profitable trades add to your balance, losses are deducted. Trade responsibly.
          </p>
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
