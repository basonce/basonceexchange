import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { getUserRestrictions } from '../../lib/user-restrictions';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import { globalMiningStats } from '../../lib/global-mining-stats';

/**
 * useDesktopMining
 * ----------------
 * A faithful port of the MINING + SHOP business logic that lives inside the
 * mobile components MineTab.tsx and ShopTab.tsx. The mobile components are left
 * completely untouched. This hook duplicates the exact Supabase calls and the
 * exact earning/collect/purchase math so the desktop UI can be 100% presentational
 * while behaving identically to mobile.
 *
 * All money-mutating flows (collect, purchase, balance writes) replicate the
 * mobile guards verbatim (gte balance checks, refund on failure, restriction
 * checks, etc.).
 */

export interface MinerDevice {
  id: string;
  name: string;
  icon: string;
  hash_rate: number;
  daily_earning_usdt: number;
  total_earned_usdt: number;
  session_earned_usdt: number;
  status: 'active' | 'paused' | 'stopped';
  started_at: string | null;
  used_mining_seconds: number;
  base_used_seconds: number;
  paid_mining_seconds: number;
  level: number;
  mining_duration_hours: number;
  withdrawal_limit: number;
  times_used: number;
  tier: number;
  max_uses: number;
  has_time_limit: boolean;
  remaining_mining_seconds?: number;
  usage_percentage?: number;
}

export interface ShopEquipment {
  id: string;
  name: string;
  description: string;
  level: number;
  price: number;
  hash_rate: number;
  earning_rate: number;
  daily_earning: number;
  mining_duration_hours: number;
  withdrawal_limit: number;
  icon: string;
  badge: string | null;
  is_free: boolean;
}

export interface LiveStats {
  activeMiners: number;
  hourlyEarnings: number;
  recentUpgrades: number;
  upgradesLast10Min: number;
  onlineCount: number;
}

const MINING_CACHE_KEY = 'basonce_mining_cache_v4';

export function useDesktopMining() {
  // Balances (real, from DB)
  const [dbUsdtBalance, setDbUsdtBalance] = useState(0);
  const [dbEqBalance, setDbEqBalance] = useState(0);

  // Mining session devices
  const [miners, setMiners] = useState<MinerDevice[]>([]);
  const minersRef = useRef(miners);
  // Equipment ids whose "time exhausted" state we already synced to the server
  const stoppedSyncRef = useRef<Set<string>>(new Set());

  // EQ price (live + locked snapshot for display-only EQ)
  const [eqPrice, setEqPrice] = useState(0.055);
  const lockedEqPriceRef = useRef<number>(0.055);
  const [lockedEqPrice, setLockedEqPrice] = useState(0.055);

  // Flow state
  const [collecting, setCollecting] = useState(false);
  const collectingRef = useRef(false);
  const purchasingRef = useRef(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number | null>(null);

  // Modal flags (rendered by the page using existing modal components)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showForcedUpgradeModal, setShowForcedUpgradeModal] = useState(false);
  const [nextTierInfo] = useState<{ name: string; price: number } | null>(null);

  // Shop state
  const [shopItems, setShopItems] = useState<ShopEquipment[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);

  // Live social-proof stats
  const [liveStats, setLiveStats] = useState<LiveStats>(globalMiningStats.getStats());

  // Derived
  const sessionUsdtTotal = miners.reduce((sum, m) => sum + m.session_earned_usdt, 0);
  const sessionEqTotal = sessionUsdtTotal / lockedEqPrice;
  const activeMiners = miners.filter((m) => m.status === 'active').length;
  const totalMiners = miners.length;
  const hourlyRate = miners
    .filter((m) => m.status === 'active')
    .reduce((sum, m) => sum + m.daily_earning_usdt / 24, 0);
  const eqHourlyRate = hourlyRate / lockedEqPrice;
  const dailyEstimate = hourlyRate * 24;

  useEffect(() => {
    minersRef.current = miners;
  }, [miners]);

  // ── Demo mode ──────────────────────────────────────────────────────────────
  const initDemoMode = useCallback(() => {
    setAuthChecked(true);
    setIsDemoMode(true);
    localStorage.removeItem('demo_mining_start');
    localStorage.removeItem('demo_miner');

    const demoMiner: MinerDevice = {
      id: 'demo-cpu-miner',
      name: 'CPU Miner',
      icon: '💻',
      hash_rate: 10,
      daily_earning_usdt: 5,
      total_earned_usdt: 0,
      session_earned_usdt: 0,
      status: 'stopped',
      started_at: null,
      used_mining_seconds: 0,
      base_used_seconds: 0,
      paid_mining_seconds: 0,
      level: 0,
      mining_duration_hours: 0.25,
      withdrawal_limit: 130,
      times_used: 0,
      tier: 1,
      max_uses: 1,
      has_time_limit: true,
      remaining_mining_seconds: 15 * 60,
      usage_percentage: 0,
    };
    setMiners([demoMiner]);
    setDemoTimeRemaining(15 * 60);
  }, []);

  // ── Load mining data ─────────────────────────────────────────────────────────
  const loadMiningData = useCallback(async () => {
    try {
      const raw = localStorage.getItem(MINING_CACHE_KEY);
      if (raw) {
        const { ts, miners: cachedMiners, usdt, eq } = JSON.parse(raw);
        if (Date.now() - ts < 30 * 1000 && Array.isArray(cachedMiners)) {
          setMiners(cachedMiners);
          if (usdt) setDbUsdtBalance(usdt);
          if (eq) setDbEqBalance(eq);
        }
      }
    } catch {}

    const hasStoredSession = (() => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i) || '';
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            const val = localStorage.getItem(key);
            if (val && val !== 'null') return true;
          }
        }
      } catch {}
      return false;
    })();

    let user = await getCurrentUser();
    if (!user && hasStoredSession) {
      const { data } = await supabase.auth.getUser();
      if (data?.user) user = data.user;
    }
    if (!user && hasStoredSession) {
      const { data } = await supabase.auth.refreshSession();
      if (data?.user) user = data.user;
    }

    setAuthChecked(true);
    if (!user) {
      initDemoMode();
      return;
    }
    setIsDemoMode(false);

    const [{ data: balanceData }, { data: rawEquipmentRaw }, { data: typesData }] = await Promise.all([
      supabase.from('user_balances').select('balance, eq_amount').eq('user_id', user.id).eq('symbol', 'USDT').maybeSingle(),
      supabase.from('user_mining_equipment').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('mining_equipment_types').select('*'),
    ]);

    const typesMap: Record<string, any> = {};
    (typesData || []).forEach((t: any) => {
      typesMap[t.id] = t;
    });
    const rawEquipment = (rawEquipmentRaw || []).map((eq: any) => ({
      ...eq,
      mining_equipment_types: typesMap[eq.equipment_type_id] || null,
    }));

    if (balanceData) {
      setDbUsdtBalance(Number(balanceData.balance || 0));
      setDbEqBalance(Number(balanceData.eq_amount || 0));
    }

    // Pending earnings are ALWAYS derived from server-tracked seconds — the
    // client never invents an amount.
    const mapDevice = (eq: any): MinerDevice => {
      const t = eq.mining_equipment_types || {};
      const durationHours = t.mining_duration_hours || eq.mining_duration_hours || 5;
      const maxSeconds = durationHours * 3600;
      const usedSeconds = Number(eq.used_mining_seconds || 0);
      const paidSeconds = Number(eq.paid_mining_seconds || 0);
      const rate = Number(t.daily_earning ?? 5);
      const hasTimeLimit = durationHours > 0;
      const pendingUsd = Math.max(0, Math.min(usedSeconds, maxSeconds) - paidSeconds) * rate / 86400;
      return {
        id: eq.id,
        name: t.name || 'CPU Miner',
        icon: t.icon || '💻',
        hash_rate: t.hash_rate || 10,
        daily_earning_usdt: rate,
        total_earned_usdt: eq.total_earned_usdt || 0,
        session_earned_usdt: pendingUsd,
        status: (eq.status || 'stopped') as 'active' | 'paused' | 'stopped',
        started_at: eq.started_at,
        used_mining_seconds: usedSeconds,
        base_used_seconds: usedSeconds,
        paid_mining_seconds: paidSeconds,
        level: t.level || 0,
        mining_duration_hours: durationHours,
        withdrawal_limit: t.withdrawal_limit || 100,
        times_used: eq.times_used || 0,
        tier: 1,
        max_uses: 999,
        has_time_limit: hasTimeLimit,
        remaining_mining_seconds: hasTimeLimit ? Math.max(0, maxSeconds - usedSeconds) : 999999,
        usage_percentage: hasTimeLimit ? (usedSeconds / maxSeconds) * 100 : 0,
      };
    };

    if (!rawEquipment || rawEquipment.length === 0) {
      let retryEquipment: any[] | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((r) => setTimeout(r, 1500));
        const { data } = await supabase
          .from('user_mining_equipment')
          .select('*, mining_equipment_types(*)')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (data && data.length > 0) {
          retryEquipment = data;
          break;
        }
      }
      if (!retryEquipment || retryEquipment.length === 0) {
        setMiners([]);
        return;
      }
      setMiners(retryEquipment.map(mapDevice));
      return;
    }

    const devices = (rawEquipment as any[]).map(mapDevice);
    setMiners(devices);

    try {
      localStorage.setItem(
        MINING_CACHE_KEY,
        JSON.stringify({
          ts: Date.now(),
          miners: devices,
          usdt: balanceData ? Number(balanceData.balance || 0) : undefined,
          eq: balanceData ? Number(balanceData.eq_amount || 0) : undefined,
        })
      );
    } catch {}
  }, [initDemoMode]);

  // ── Realtime earnings tick (100ms, exact mobile math) ────────────────────────
  const updateRealtimeEarnings = useCallback(() => {
    setMiners((prev) => {
      const activeDevices = prev.filter((m) => m.status === 'active');
      if (activeDevices.length === 0) return prev;

      return prev.map((m) => {
        if (m.status !== 'active') return m;

        const maxDuration = m.mining_duration_hours * 3600;

        // Demo mode: purely visual local counter (no real money involved)
        if (m.id === 'demo-cpu-miner') {
          const newDuration = m.used_mining_seconds + 0.1;
          if (m.has_time_limit && newDuration >= maxDuration) {
            setTimeout(() => setShowAuthModal(true), 500);
            return { ...m, status: 'stopped' as const, used_mining_seconds: maxDuration, remaining_mining_seconds: 0, usage_percentage: 100 };
          }
          const earningPerSecond = m.daily_earning_usdt / 24 / 3600;
          return {
            ...m,
            session_earned_usdt: m.session_earned_usdt + earningPerSecond / 10,
            total_earned_usdt: m.total_earned_usdt + earningPerSecond / 10,
            used_mining_seconds: newDuration,
            remaining_mining_seconds: Math.max(0, maxDuration - newDuration),
            usage_percentage: (newDuration / maxDuration) * 100,
          };
        }

        // Real miners: DISPLAY ONLY. Everything is derived from the server's
        // started_at timestamp — nothing the client renders can change what
        // actually gets paid.
        if (!m.started_at) return m;
        const elapsed = Math.max(0, (Date.now() - new Date(m.started_at).getTime()) / 1000);
        const totalUsed = Math.min(m.base_used_seconds + elapsed, maxDuration);
        const pendingUsd = Math.max(0, totalUsed - m.paid_mining_seconds) * m.daily_earning_usdt / 86400;
        const usagePercent = m.has_time_limit ? (totalUsed / maxDuration) * 100 : 0;
        const remainingSeconds = Math.max(0, maxDuration - totalUsed);

        // 100% STOP (time exhausted) — sync server state once; the server
        // caps earnings at the duration limit regardless of what we do here.
        if (m.has_time_limit && totalUsed >= maxDuration) {
          if (!stoppedSyncRef.current.has(m.id)) {
            stoppedSyncRef.current.add(m.id);
            supabase.rpc('mining_stop', { p_equipment_id: m.id }).then();
          }
          return {
            ...m,
            status: 'stopped' as const,
            used_mining_seconds: maxDuration,
            session_earned_usdt: pendingUsd,
            remaining_mining_seconds: 0,
            usage_percentage: 100,
          };
        }

        return {
          ...m,
          session_earned_usdt: pendingUsd,
          used_mining_seconds: totalUsed,
          remaining_mining_seconds: remainingSeconds,
          usage_percentage: usagePercent,
        };
      });
    });
  }, []);

  // ── Toggle a miner on/off ────────────────────────────────────────────────────
  const toggleMiner = useCallback(
    async (minerId: string, currentStatus: string) => {
      const miner = minersRef.current.find((m) => m.id === minerId);
      if (!miner) return;
      const maxDuration = miner.mining_duration_hours * 3600;

      if (miner.used_mining_seconds >= maxDuration && currentStatus === 'stopped') {
        if (miner.name === 'CPU Miner') {
          const currentUser = await getCurrentUser();
          if (!currentUser) setShowAuthModal(true);
          else setShowUpgradeModal(true);
        }
        return;
      }

      const newStatus = currentStatus === 'active' ? 'stopped' : 'active';

      if (isDemoMode) {
        if (newStatus === 'active') {
          localStorage.setItem('demo_mining_start', Date.now().toString());
          setDemoTimeRemaining(maxDuration);
        }
        setMiners((prev) =>
          prev.map((m) =>
            m.id === minerId
              ? { ...m, status: newStatus as 'active' | 'stopped', started_at: newStatus === 'active' ? new Date().toISOString() : m.started_at }
              : m
          )
        );
        return;
      }

      // SERVER-AUTHORITATIVE start/stop: the server sets all timestamps and
      // caps. The client only mirrors the returned row.
      if (newStatus === 'active') {
        const { data, error } = await supabase.rpc('mining_start', { p_equipment_id: minerId });
        if (error) {
          if ((error.message || '').includes('time_exhausted')) {
            setShowUpgradeModal(true);
          } else {
            console.error('Start mining failed:', error);
          }
          await loadMiningData();
          return;
        }
        const row: any = data;
        stoppedSyncRef.current.delete(minerId);
        setMiners((prev) =>
          prev.map((m) =>
            m.id === minerId
              ? {
                  ...m,
                  status: 'active',
                  started_at: row?.started_at || new Date().toISOString(),
                  base_used_seconds: Number(row?.used_mining_seconds ?? m.base_used_seconds),
                  used_mining_seconds: Number(row?.used_mining_seconds ?? m.used_mining_seconds),
                  paid_mining_seconds: Number(row?.paid_mining_seconds ?? m.paid_mining_seconds),
                }
              : m
          )
        );
      } else {
        const { data, error } = await supabase.rpc('mining_stop', { p_equipment_id: minerId });
        if (error) {
          console.error('Stop mining failed:', error);
          await loadMiningData();
          return;
        }
        const row: any = data;
        const newUsed = Number(row?.used_mining_seconds ?? miner.used_mining_seconds);
        setMiners((prev) =>
          prev.map((m) =>
            m.id === minerId
              ? {
                  ...m,
                  status: 'stopped',
                  started_at: null,
                  base_used_seconds: newUsed,
                  used_mining_seconds: newUsed,
                  paid_mining_seconds: Number(row?.paid_mining_seconds ?? m.paid_mining_seconds),
                  session_earned_usdt: Number(row?.session_earned_usdt ?? m.session_earned_usdt),
                  remaining_mining_seconds: Math.max(0, maxDuration - newUsed),
                  usage_percentage: m.has_time_limit ? (newUsed / maxDuration) * 100 : 0,
                }
              : m
          )
        );
      }
    },
    [isDemoMode, loadMiningData]
  );

  // ── Collect earnings (exact mobile money flow) ───────────────────────────────
  const collectEarnings = useCallback(async (): Promise<{ ok: boolean; collected: number; expired: boolean; message?: string }> => {
    if (collectingRef.current) return { ok: false, collected: 0, expired: false, message: 'Collection already in progress.' };
    if (sessionUsdtTotal <= 0) return { ok: false, collected: 0, expired: false, message: 'No earnings to collect.' };
    collectingRef.current = true;

    const user = await getCurrentUser();
    if (!user) {
      collectingRef.current = false;
      setShowAuthModal(true);
      return { ok: false, collected: 0, expired: false, message: 'auth' };
    }

    const restrictions = await getUserRestrictions();
    if (restrictions?.mining_blocked || restrictions?.usdt_frozen) {
      collectingRef.current = false;
      return { ok: false, collected: 0, expired: false, message: 'Mining earnings collection is currently restricted on your account. Please contact support.' };
    }

    setCollecting(true);
    try {
      // SERVER-AUTHORITATIVE collect: the server computes earnings from its
      // own timestamps and credits the balance atomically. The client cannot
      // influence the amount.
      const { data, error } = await supabase.rpc('mining_collect');
      if (error) {
        console.error('Collect error:', error);
        setCollecting(false); collectingRef.current = false;
        return { ok: false, collected: 0, expired: false, message: 'Collection failed. Please try again.' };
      }

      const collected = Number((data as any)?.collected || 0);
      const newBalance = Number((data as any)?.new_balance || 0);
      const expired = Boolean((data as any)?.expired);

      setDbUsdtBalance(newBalance);
      stoppedSyncRef.current.clear();
      try { localStorage.removeItem(MINING_CACHE_KEY); } catch {}
      await loadMiningData();

      setCollecting(false); collectingRef.current = false;
      if (collected <= 0) {
        return { ok: false, collected: 0, expired: false, message: 'No earnings to collect.' };
      }
      return { ok: true, collected, expired };
    } catch (error) {
      console.error('Collect error:', error);
      setCollecting(false); collectingRef.current = false;
      return { ok: false, collected: 0, expired: false, message: 'Collection failed. Please try again.' };
    }
  }, [sessionUsdtTotal, loadMiningData]);

  // ── Shop: load equipment ─────────────────────────────────────────────────────
  const loadShop = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      setShopLoading(true);
      const { data: demoData } = await supabase
        .from('mining_equipment_types')
        .select('*')
        .eq('is_free', false)
        .order('level', { ascending: true });
      if (demoData) {
        setShopItems(
          demoData.map((eq: any) => ({
            ...eq,
            hash_rate: Math.round(eq.daily_earning / 24),
            earning_rate: eq.daily_earning,
            badge: eq.level === 1 ? 'POPULAR' : null,
          }))
        );
      }
      setShopLoading(false);
      return;
    }
    setShopLoading(true);

    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .eq('symbol', 'USDT')
      .maybeSingle();
    if (balanceData) setDbUsdtBalance(Number(balanceData.balance || 0));

    const { data: equipmentData, error } = await supabase.rpc('get_available_shop_equipment', { p_user_id: user.id });

    if (error) {
      console.error('Error loading shop equipment:', error);
      const { data: fallbackData } = await supabase
        .from('mining_equipment_types')
        .select('*')
        .eq('is_free', false)
        .order('level', { ascending: true });
      if (fallbackData) {
        setShopItems(
          fallbackData.map((eq: any) => ({
            ...eq,
            hash_rate: Math.round(eq.daily_earning / 24),
            earning_rate: eq.daily_earning,
            badge: eq.level === 1 ? 'POPULAR' : null,
          }))
        );
      }
      setShopLoading(false);
      return;
    }

    if (equipmentData) {
      setShopItems(
        equipmentData.map((eq: any) => ({
          ...eq,
          hash_rate: Math.round(eq.daily_earning / 24),
          earning_rate: eq.daily_earning,
          badge: eq.is_current_level ? 'AVAILABLE' : eq.level === 1 ? 'POPULAR' : null,
        }))
      );
    }
    setShopLoading(false);
  }, []);

  // ── Shop: purchase (exact mobile money flow) ─────────────────────────────────
  const purchaseEquipment = useCallback(
    async (item: ShopEquipment): Promise<{ ok: boolean; message?: string; leveledUp?: boolean; level?: number }> => {
      if (purchasingRef.current) return { ok: false, message: 'Purchase already in progress.' };
      if (dbUsdtBalance < item.price) {
        return { ok: false, message: `Insufficient balance. You need $${item.price.toLocaleString()} USDT. Your balance: $${dbUsdtBalance.toFixed(2)} USDT.` };
      }
      purchasingRef.current = true;
      setPurchasing(true);
      try {
        const user = await getCurrentUser();
        if (!user) {
          setPurchasing(false); purchasingRef.current = false;
          setShowAuthModal(true);
          return { ok: false, message: 'auth' };
        }

        // SERVER-AUTHORITATIVE purchase: balance check, deduction, equipment
        // creation and level-up all happen atomically on the server.
        const { data, error } = await supabase.rpc('mining_buy_equipment', { p_equipment_type_id: item.id });

        if (error) {
          console.error('Purchase failed:', error);
          setPurchasing(false); purchasingRef.current = false;
          const msg = (error.message || '').includes('insufficient_balance')
            ? `Insufficient balance. You need $${item.price.toLocaleString()} USDT.`
            : 'Purchase failed! Please try again.';
          return { ok: false, message: msg };
        }

        const res: any = data;
        setDbUsdtBalance(Number(res?.new_balance ?? dbUsdtBalance));
        setShowPurchaseSuccess(true);
        setTimeout(() => setShowPurchaseSuccess(false), 3000);

        try { localStorage.removeItem(MINING_CACHE_KEY); } catch {}
        await loadShop();
        await loadMiningData();
        setPurchasing(false); purchasingRef.current = false;
        return { ok: true, leveledUp: Boolean(res?.leveled_up), level: Number(res?.level ?? item.level) };
      } catch (error) {
        console.error('Purchase failed:', error);
        setPurchasing(false); purchasingRef.current = false;
        return { ok: false, message: 'Purchase failed! Please try again.' };
      }
    },
    [dbUsdtBalance, loadShop, loadMiningData]
  );

  // ── Effects: init load, price, balance realtime ──────────────────────────────
  useEffect(() => {
    loadMiningData().catch(() => {
      setAuthChecked(true);
      initDemoMode();
    });
    loadShop();

    const priceManager = EarnQuestPriceManager.getInstance();
    const initialPrice = priceManager.getPrice();
    setEqPrice(initialPrice);
    if (initialPrice && initialPrice > 0) {
      lockedEqPriceRef.current = initialPrice;
      setLockedEqPrice(initialPrice);
    }
    const unsubscribePrice = priceManager.subscribe(() => {
      const p = priceManager.getPrice();
      setEqPrice(p);
      if (p && p > 0 && lockedEqPriceRef.current === 0.055) {
        lockedEqPriceRef.current = p;
        setLockedEqPrice(p);
      }
    });

    const unsubscribeStats = globalMiningStats.subscribe((stats) => setLiveStats(stats));

    let channel: any = null;
    getCurrentUser().then((user) => {
      if (!user) return;
      channel = supabase
        .channel('desktop_balance_changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_balances', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newBalance = payload.new as any;
            if (newBalance.symbol === 'USDT') {
              setDbUsdtBalance(Number(newBalance.balance || 0));
              setDbEqBalance(Number(newBalance.eq_amount || 0));
            }
          }
        )
        .subscribe();
    });

    return () => {
      unsubscribePrice();
      unsubscribeStats();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Effects: display-only earnings tick ─────────────────────────────────────
  // All real earnings are computed on the server from started_at — nothing is
  // periodically written from the client anymore.
  useEffect(() => {
    const earningsInterval = setInterval(updateRealtimeEarnings, 100);
    return () => {
      clearInterval(earningsInterval);
    };
  }, [updateRealtimeEarnings]);

  return {
    // balances
    dbUsdtBalance,
    dbEqBalance,
    // mining
    miners,
    activeMiners,
    totalMiners,
    hourlyRate,
    eqHourlyRate,
    dailyEstimate,
    sessionUsdtTotal,
    sessionEqTotal,
    eqPrice,
    lockedEqPrice,
    // flow
    authChecked,
    isDemoMode,
    demoTimeRemaining,
    collecting,
    // modals
    showAuthModal,
    setShowAuthModal,
    showUpgradeModal,
    setShowUpgradeModal,
    showForcedUpgradeModal,
    setShowForcedUpgradeModal,
    nextTierInfo,
    // shop
    shopItems,
    shopLoading,
    purchasing,
    showPurchaseSuccess,
    // live stats
    liveStats,
    // actions
    toggleMiner,
    collectEarnings,
    purchaseEquipment,
    reloadMining: loadMiningData,
    reloadShop: loadShop,
  };
}
