import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getUserRestrictions } from '../lib/user-restrictions';
import {
  BotConfig, BotSignal, BotPosition, BotStats,
  generateSignal, getStrategyTimeframe, calcPositionSize, calcPnL,
  STRATEGY_CONFIGS,
} from '../lib/ai-bot-engine';

export type BotActiveTab = 'signals' | 'positions' | 'history' | 'stats';

const DEFAULT_CONFIG: BotConfig = {
  strategy: 'swing',
  riskLevel: 'medium',
  maxDailyLossPct: 5,
  isActive: false,
  selectedCoins: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  simBalance: 1000,
  leverage: 5,
};

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

export function useAIBot() {
  const [user, setUser] = useState<any>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BotActiveTab>('signals');
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

  const loadUserData = useCallback(async (userId: string) => {
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
  }, []);

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
  }, [loadUserData]);

  const saveConfig = useCallback(async (cfg: BotConfig) => {
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
  }, []);

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
          const botRestrictions = await getUserRestrictions(currentUser.id);
          if (!botRestrictions?.usdt_frozen) {
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
  }, [isRunning, config.strategy, scanSignals, updateOpenPositions]);

  const handleFollowSignal = useCallback(async (signal: BotSignal) => {
    if (!userRef.current) return;
    await openBotPosition(signal);
    setActiveTab('positions');
  }, [openBotPosition]);

  const handleClosePosition = useCallback(async (id: string) => {
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
      const botRestrictions = await getUserRestrictions(currentUser.id);
      if (!botRestrictions?.usdt_frozen) {
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
    }

    setOpenPositions(prev => prev.filter(p => p.id !== id));
    setClosedPositions(prev => [{ ...pos, status: 'closed_manual', pnl, pnlPct, closedAt: new Date() }, ...prev]);
  }, []);

  const handleStartBot = useCallback(async () => {
    if (!userRef.current) return;
    const startBalance = configRef.current.simBalance;
    const newConfig = { ...configRef.current, isActive: true, simBalance: startBalance };
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
  }, [saveConfig, scanSignals]);

  const handleToggleBot = useCallback(async () => {
    const newRunning = !isRunningRef.current;
    setIsRunning(newRunning);
    isRunningRef.current = newRunning;
    const newConfig = { ...configRef.current, isActive: newRunning };
    setConfig(newConfig);
    configRef.current = newConfig;
    await saveConfig(newConfig);
  }, [saveConfig]);

  const strategyInfo = STRATEGY_CONFIGS[config.strategy];

  return {
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
  };
}
