import { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Play, Pause, RefreshCw, Settings, ChevronLeft, AlertCircle, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  BotConfig, BotSignal, BotPosition, BotStats,
  generateSignal, getStrategyTimeframe, calcPositionSize, calcPnL,
  STRATEGY_CONFIGS, TOP_BOT_COINS,
} from '../lib/ai-bot-engine';
import BotSetupScreen from '../components/ai-bot/BotSetupScreen';
import BotSignalCard from '../components/ai-bot/BotSignalCard';
import BotPositionCard from '../components/ai-bot/BotPositionCard';
import BotStatsPanel from '../components/ai-bot/BotStatsPanel';

type ActiveTab = 'signals' | 'positions' | 'history' | 'stats';

const DEFAULT_CONFIG: BotConfig = {
  strategy: 'swing',
  riskLevel: 'medium',
  maxDailyLossPct: 5,
  isActive: false,
  selectedCoins: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  simBalance: 1000,
  leverage: 5,
};

export default function AIBotPage() {
  const [user, setUser] = useState<any>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('signals');
  const [signals, setSignals] = useState<BotSignal[]>([]);
  const [openPositions, setOpenPositions] = useState<BotPosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<BotPosition[]>([]);
  const [stats, setStats] = useState<BotStats>({ totalTrades: 0, winningTrades: 0, totalPnl: 0, winRate: 0, bestTradePct: 0, worstTradePct: 0, currentStreak: 0 });
  const [simBalance, setSimBalance] = useState(1000);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [realUsdtBalance, setRealUsdtBalance] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [hasConfig, setHasConfig] = useState(false);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const configRef = useRef(config);
  const openPositionsRef = useRef(openPositions);
  const simBalanceRef = useRef(simBalance);
  const statsRef = useRef(stats);
  const userRef = useRef(user);
  const isRunningRef = useRef(isRunning);
  const signalsRef = useRef(signals);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { openPositionsRef.current = openPositions; }, [openPositions]);
  useEffect(() => { simBalanceRef.current = simBalance; }, [simBalance]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { signalsRef.current = signals; }, [signals]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    try {
      const usdtRes = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('symbol', 'USDT')
        .maybeSingle();
      if (usdtRes.data) {
        setRealUsdtBalance(parseFloat(usdtRes.data.balance) || 0);
      }

      const [configRes, positionsRes, statsRes] = await Promise.all([
        supabase.from('ai_bot_configs').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('ai_bot_positions').select('*').eq('user_id', userId).order('opened_at', { ascending: false }).limit(50),
        supabase.from('ai_bot_stats').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (configRes.data) {
        setHasConfig(true);
        const c = configRes.data;
        const loadedConfig = {
          strategy: c.strategy,
          riskLevel: c.risk_level,
          maxDailyLossPct: c.max_daily_loss_pct,
          isActive: c.is_active,
          selectedCoins: c.selected_coins,
          simBalance: c.sim_balance,
          leverage: c.leverage,
        };
        setConfig(loadedConfig);
        setSimBalance(c.sim_balance);
        setInitialBalance(c.sim_balance);
        setIsRunning(c.is_active);
        isRunningRef.current = c.is_active;
      }

      if (positionsRes.data) {
        const all = positionsRes.data.map(mapPosition);
        setOpenPositions(all.filter(p => p.status === 'open'));
        setClosedPositions(all.filter(p => p.status !== 'open'));
      }

      if (statsRes.data) {
        const s = statsRes.data;
        const loadedStats = {
          totalTrades: s.total_trades,
          winningTrades: s.winning_trades,
          totalPnl: s.total_pnl,
          winRate: s.win_rate,
          bestTradePct: s.best_trade_pct,
          worstTradePct: s.worst_trade_pct,
          currentStreak: s.current_streak,
        };
        setStats(loadedStats);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (cfg: BotConfig) => {
    if (!userRef.current) return;
    await supabase.from('ai_bot_configs').upsert({
      user_id: userRef.current.id,
      strategy: cfg.strategy,
      risk_level: cfg.riskLevel,
      max_daily_loss_pct: cfg.maxDailyLossPct,
      is_active: cfg.isActive,
      selected_coins: cfg.selectedCoins,
      sim_balance: cfg.simBalance,
      leverage: cfg.leverage,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const openBotPosition = useCallback(async (signal: BotSignal) => {
    const currentUser = userRef.current;
    const currentConfig = configRef.current;
    const currentBalance = simBalanceRef.current;
    if (!currentUser) return;

    const sizeUsdt = calcPositionSize(currentBalance, currentConfig.riskLevel, currentConfig.leverage);

    const { data: pos } = await supabase.from('ai_bot_positions').insert({
      user_id: currentUser.id,
      symbol: signal.symbol,
      side: signal.signalType as 'LONG' | 'SHORT',
      entry_price: signal.entryPrice,
      current_price: signal.entryPrice,
      target_price: signal.targetPrice,
      stop_loss: signal.stopLoss,
      size_usdt: sizeUsdt,
      leverage: currentConfig.leverage,
      status: 'open',
      pnl: 0,
      pnl_pct: 0,
    }).select().maybeSingle();

    if (pos) {
      setOpenPositions(prev => [mapPosition(pos), ...prev]);
    }
  }, []);

  const scanSignals = useCallback(async () => {
    const currentConfig = configRef.current;
    const currentUser = userRef.current;
    const currentRunning = isRunningRef.current;
    const currentOpenPositions = openPositionsRef.current;

    if (!currentConfig.selectedCoins.length) return;
    setIsScanning(true);
    try {
      const timeframe = getStrategyTimeframe(currentConfig.strategy);
      const newSignals = await Promise.all(
        currentConfig.selectedCoins.map(symbol => generateSignal(symbol, currentConfig.strategy, timeframe))
      );
      setSignals(newSignals);
      signalsRef.current = newSignals;
      setLastScan(new Date());

      if (currentRunning && currentUser) {
        for (const signal of newSignals) {
          if (signal.signalType !== 'WAIT' && signal.confidence >= 65) {
            const alreadyOpen = currentOpenPositions.find(p => p.symbol === signal.symbol && p.status === 'open');
            if (!alreadyOpen) {
              await openBotPosition(signal);
            }
          }
        }
      }
    } finally {
      setIsScanning(false);
    }
  }, [openBotPosition]);

  const updateOpenPositions = useCallback(async () => {
    const currentOpenPositions = openPositionsRef.current;
    const currentUser = userRef.current;
    const currentBalance = simBalanceRef.current;
    const currentStats = statsRef.current;
    const currentSignals = signalsRef.current;

    if (!currentOpenPositions.length || !currentUser) return;

    const updated: BotPosition[] = [];
    for (const pos of currentOpenPositions) {
      const signal = currentSignals.find(s => s.symbol === pos.symbol);
      const currentPrice = signal?.entryPrice || pos.currentPrice;
      const { pnl, pnlPct } = calcPnL({ ...pos, currentPrice }, currentPrice);

      const hitTP = pos.side === 'LONG' ? currentPrice >= pos.targetPrice : currentPrice <= pos.targetPrice;
      const hitSL = pos.side === 'LONG' ? currentPrice <= pos.stopLoss : currentPrice >= pos.stopLoss;

      if (hitTP || hitSL) {
        const newStatus = hitTP ? 'closed_tp' : 'closed_sl';
        const newBalance = currentBalance + pnl;

        await supabase.from('ai_bot_positions').update({
          current_price: currentPrice,
          status: newStatus,
          pnl,
          pnl_pct: pnlPct,
          closed_at: new Date().toISOString(),
        }).eq('id', pos.id);

        await supabase.from('ai_bot_configs').update({ sim_balance: newBalance }).eq('user_id', currentUser.id);
        setSimBalance(newBalance);
        simBalanceRef.current = newBalance;

        if (pnl !== 0) {
          const { data: usdtBalance } = await supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', currentUser.id)
            .eq('symbol', 'USDT')
            .maybeSingle();
          if (usdtBalance) {
            const newUsdtBalance = Math.max(0, parseFloat(usdtBalance.balance) + pnl);
            await supabase.from('user_balances').update({ balance: newUsdtBalance }).eq('user_id', currentUser.id).eq('symbol', 'USDT');
          }
        }

        const newStats = {
          ...currentStats,
          totalTrades: currentStats.totalTrades + 1,
          winningTrades: hitTP ? currentStats.winningTrades + 1 : currentStats.winningTrades,
          totalPnl: currentStats.totalPnl + pnl,
          winRate: ((hitTP ? currentStats.winningTrades + 1 : currentStats.winningTrades) / (currentStats.totalTrades + 1)) * 100,
          bestTradePct: Math.max(currentStats.bestTradePct, pnlPct),
          worstTradePct: Math.min(currentStats.worstTradePct, pnlPct),
          currentStreak: hitTP ? currentStats.currentStreak + 1 : 0,
        };
        setStats(newStats);
        statsRef.current = newStats;
        await supabase.from('ai_bot_stats').upsert({ user_id: currentUser.id, ...flattenStats(newStats), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        const closedPos = { ...pos, currentPrice, status: newStatus as any, pnl, pnlPct, closedAt: new Date() };
        setClosedPositions(prev => [closedPos, ...prev].slice(0, 50));
      } else {
        await supabase.from('ai_bot_positions').update({ current_price: currentPrice, pnl, pnl_pct: pnlPct }).eq('id', pos.id);
        updated.push({ ...pos, currentPrice, pnl, pnlPct });
      }
    }
    setOpenPositions(updated);
    openPositionsRef.current = updated;
  }, []);

  useEffect(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    if (isRunning) {
      scanSignals();
      const interval = getInterval(config.strategy);
      scanIntervalRef.current = setInterval(() => {
        scanSignals();
        updateOpenPositions();
      }, interval);
    }

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isRunning, config.strategy]);

  const handleFollowSignal = async (signal: BotSignal) => {
    if (!user) return;
    await openBotPosition(signal);
    setActiveTab('positions');
  };

  const handleClosePosition = async (id: string) => {
    const currentUser = userRef.current;
    const currentBalance = simBalanceRef.current;
    if (!currentUser) return;
    const pos = openPositionsRef.current.find(p => p.id === id);
    if (!pos) return;
    const { pnl, pnlPct } = calcPnL(pos, pos.currentPrice);
    const newBalance = currentBalance + pnl;

    await supabase.from('ai_bot_positions').update({
      status: 'closed_manual',
      pnl,
      pnl_pct: pnlPct,
      closed_at: new Date().toISOString(),
    }).eq('id', id);

    await supabase.from('ai_bot_configs').update({ sim_balance: newBalance }).eq('user_id', currentUser.id);
    setSimBalance(newBalance);
    simBalanceRef.current = newBalance;

    if (pnl !== 0) {
      const { data: usdtBalance } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', currentUser.id)
        .eq('symbol', 'USDT')
        .maybeSingle();
      if (usdtBalance) {
        const newUsdtBalance = Math.max(0, parseFloat(usdtBalance.balance) + pnl);
        await supabase.from('user_balances').update({ balance: newUsdtBalance }).eq('user_id', currentUser.id).eq('symbol', 'USDT');
      }
    }

    setOpenPositions(prev => prev.filter(p => p.id !== id));
    setClosedPositions(prev => [{ ...pos, status: 'closed_manual', pnl, pnlPct, closedAt: new Date() }, ...prev]);
  };

  const handleStartBot = async () => {
    if (!user) return;
    const startBalance = config.simBalance;
    const newConfig = { ...config, isActive: true, simBalance: startBalance };
    setConfig(newConfig);
    configRef.current = newConfig;
    setHasConfig(true);
    await saveConfig(newConfig);
    setIsRunning(true);
    isRunningRef.current = true;
    setShowSetup(false);
    setSimBalance(startBalance);
    simBalanceRef.current = startBalance;
    setInitialBalance(startBalance);
    scanSignals();
  };

  const handleToggleBot = async () => {
    const newRunning = !isRunning;
    setIsRunning(newRunning);
    isRunningRef.current = newRunning;
    const newConfig = { ...config, isActive: newRunning };
    setConfig(newConfig);
    configRef.current = newConfig;
    await saveConfig(newConfig);
  };

  const strategyInfo = STRATEGY_CONFIGS[config.strategy];

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

function mapPosition(p: any): BotPosition {
  return {
    id: p.id,
    userId: p.user_id,
    signalId: p.signal_id,
    symbol: p.symbol,
    side: p.side,
    entryPrice: p.entry_price,
    currentPrice: p.current_price,
    targetPrice: p.target_price,
    stopLoss: p.stop_loss,
    sizeUsdt: p.size_usdt,
    leverage: p.leverage,
    status: p.status,
    pnl: p.pnl,
    pnlPct: p.pnl_pct,
    openedAt: new Date(p.opened_at),
    closedAt: p.closed_at ? new Date(p.closed_at) : undefined,
  };
}

function flattenStats(s: BotStats) {
  return {
    total_trades: s.totalTrades,
    winning_trades: s.winningTrades,
    total_pnl: s.totalPnl,
    win_rate: s.winRate,
    best_trade_pct: s.bestTradePct,
    worst_trade_pct: s.worstTradePct,
    current_streak: s.currentStreak,
  };
}

function getInterval(strategy: string): number {
  const intervals: Record<string, number> = {
    scalper: 30000,
    aggressive: 60000,
    swing: 120000,
    conservative: 300000,
  };
  return intervals[strategy] || 60000;
}
