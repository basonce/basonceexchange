import { Bot, Play, Pause, RefreshCw, Settings, ChevronLeft, AlertCircle, Wifi } from 'lucide-react';
import BotSetupScreen from '../components/ai-bot/BotSetupScreen';
import BotSignalCard from '../components/ai-bot/BotSignalCard';
import BotPositionCard from '../components/ai-bot/BotPositionCard';
import BotStatsPanel from '../components/ai-bot/BotStatsPanel';
import { useAIBot } from '../hooks/useAIBot';

export default function AIBotPage() {
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

  if (showSetup) {
    return (
      <div className="min-h-screen bg-[#0B0E11]">
        <div className="bg-[#181A20] px-4 pt-10 pb-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSetup(false)} className="p-2 hover:bg-[#2B3139] rounded-xl transition-all">
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Bot Setup</h1>
              <p className="text-xs text-gray-500">Configure your AI trading bot</p>
            </div>
          </div>
        </div>
        <BotSetupScreen config={config} onConfigChange={setConfig} onStart={handleStartBot} realUsdtBalance={realUsdtBalance} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      <div className="bg-[#181A20] px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isRunning ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'}`}>
              <Bot className={`w-5 h-5 ${isRunning ? 'text-black' : 'text-gray-400'}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">AI Trading Bot</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-xs text-gray-400">{isRunning ? 'Active · ' + strategyInfo?.label : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasConfig && (
              <button
                onClick={() => { scanSignals(); updateOpenPositions(); }}
                disabled={isScanning}
                className="p-2 rounded-xl border border-[#2B3139] hover:border-[#3B4049] transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${isScanning ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setShowSetup(true)}
              className="p-2 rounded-xl border border-[#2B3139] hover:border-[#3B4049] transition-all"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            {hasConfig && (
              <button
                onClick={handleToggleBot}
                className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all ${isRunning ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#F0B90B] text-black'}`}
              >
                {isRunning ? <><Pause className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Start</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {!user ? (
        <NotLoggedIn />
      ) : isLoading ? (
        <LoadingState />
      ) : !hasConfig ? (
        <GetStarted onSetup={() => setShowSetup(true)} />
      ) : (
        <div className="pb-4">
          {isRunning && (
            <div className="mx-4 mt-3 p-3 bg-[#10B98115] border border-[#10B98130] rounded-2xl flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-green-400 font-medium">Bot is scanning {config.selectedCoins.length} coins</span>
                {lastScan && <span className="text-xs text-gray-500 ml-1">· Last: {lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              </div>
              <div className="flex gap-1 items-end">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          <div className="px-4 mt-3">
            <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Bot Balance</div>
                <div className="text-lg font-bold text-white">${simBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Strategy</div>
                <div className="text-sm font-semibold" style={{ color: strategyInfo?.color || '#F0B90B' }}>{strategyInfo?.label}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Open Pos.</div>
                <div className="text-sm font-semibold text-white">{openPositions.length}</div>
              </div>
            </div>
          </div>

          <div className="px-4 mt-3">
            <div className="flex gap-1 bg-[#1E2026] rounded-2xl p-1 border border-[#2B3139]">
              {(['signals', 'positions', 'history', 'stats'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'bg-[#F0B90B] text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab === 'positions' ? `Pos. (${openPositions.length})` : tab === 'history' ? `History` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-3 space-y-3">
            {activeTab === 'signals' && (
              <>
                {signals.length === 0 ? (
                  <EmptyState
                    title={isRunning ? "Scanning markets..." : "No signals yet"}
                    subtitle={isRunning ? "AI is analyzing your selected coins" : "Start the bot to generate signals"}
                    icon={isScanning ? "scanning" : "empty"}
                  />
                ) : (
                  signals.map((signal, i) => (
                    <BotSignalCard
                      key={`${signal.symbol}-${i}`}
                      signal={signal}
                      onFollow={handleFollowSignal}
                      isFollowing={openPositions.some(p => p.symbol === signal.symbol)}
                    />
                  ))
                )}
              </>
            )}

            {activeTab === 'positions' && (
              <>
                {openPositions.length === 0 ? (
                  <EmptyState title="No open positions" subtitle="Bot will automatically open positions based on signals" />
                ) : (
                  openPositions.map(pos => (
                    <BotPositionCard key={pos.id} position={pos} onClose={handleClosePosition} />
                  ))
                )}
              </>
            )}

            {activeTab === 'history' && (
              <>
                {closedPositions.length === 0 ? (
                  <EmptyState title="No trade history" subtitle="Closed positions will appear here" />
                ) : (
                  closedPositions.map(pos => (
                    <BotPositionCard key={pos.id} position={pos} />
                  ))
                )}
              </>
            )}

            {activeTab === 'stats' && (
              <BotStatsPanel stats={stats} simBalance={simBalance} initialBalance={initialBalance} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotLoggedIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#2B3139] flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Login Required</h3>
      <p className="text-sm text-gray-400">Please login to use the AI Trading Bot</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <RefreshCw className="w-8 h-8 text-[#F0B90B] animate-spin mb-3" />
      <p className="text-sm text-gray-400">Loading bot data...</p>
    </div>
  );
}

function GetStarted({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="px-4 pt-6">
      <div className="bg-gradient-to-br from-[#F0B90B]/10 to-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-3xl p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F0B90B] flex items-center justify-center mx-auto mb-4">
          <Bot className="w-9 h-9 text-black" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">AI Trading Bot</h2>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Our AI analyzes real-time market data, RSI, MACD, Bollinger Bands and more to generate high-confidence trading signals.
        </p>

        <div className="space-y-3 mb-6 text-left">
          {[
            { label: 'Real-time Signal Engine', desc: 'RSI, MACD, BB, EMA analysis' },
            { label: 'Real Balance Trading', desc: 'PnL directly reflected in your USDT balance' },
            { label: '4 Trading Strategies', desc: 'Scalper, Swing, Conservative, Aggressive' },
            { label: 'Auto Risk Management', desc: 'Auto TP/SL, daily loss limits' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-black" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{f.label}</div>
                <div className="text-xs text-gray-400">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#1E2026] rounded-2xl p-3 flex items-start gap-2 mb-5">
          <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-400 text-left">Bot PnL is reflected in your real USDT balance. Profitable trades add to your balance, losses are deducted. Trade responsibly.</p>
        </div>

        <button
          onClick={onSetup}
          className="w-full py-4 rounded-2xl bg-[#F0B90B] text-black font-bold text-base"
        >
          Configure Bot
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, icon }: { title: string; subtitle: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1E2026] flex items-center justify-center mb-3">
        {icon === 'scanning' ? (
          <RefreshCw className="w-7 h-7 text-[#F0B90B] animate-spin" />
        ) : (
          <Bot className="w-7 h-7 text-gray-500" />
        )}
      </div>
      <h4 className="text-base font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400 max-w-[200px]">{subtitle}</p>
    </div>
  );
}
