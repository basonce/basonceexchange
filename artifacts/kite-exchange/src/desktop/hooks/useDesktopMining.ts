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

const MINING_CACHE_KEY = 'basonce_mining_cache_v3';

export function useDesktopMining() {
  // Balances (real, from DB)
  const [dbUsdtBalance, setDbUsdtBalance] = useState(0);
  const [dbEqBalance, setDbEqBalance] = useState(0);

  // Mining session devices
  const [miners, setMiners] = useState<MinerDevice[]>([]);
  const minersRef = useRef(miners);

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
      daily_earning_usdt: 624,
      total_earned_usdt: 0,
      session_earned_usdt: 0,
      status: 'stopped',
      started_at: null,
      used_mining_seconds: 0,
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

  // ── Save session to DB (no balance change) ──────────────────────────────────
  const saveSessionToDatabase = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      if (isDemoMode && minersRef.current.length > 0) {
        localStorage.setItem('demo_miner', JSON.stringify(minersRef.current[0]));
      }
      return;
    }
    const currentMiners = minersRef.current;
    for (const miner of currentMiners) {
      if (miner.id === 'demo-cpu-miner') continue;
      const { error } = await supabase
        .from('user_mining_equipment')
        .update({
          session_earned_usdt: Number(miner.session_earned_usdt.toFixed(4)),
          total_earned_usdt: Number(miner.total_earned_usdt.toFixed(4)),
          used_mining_seconds: Math.floor(Number(miner.used_mining_seconds)),
          status: miner.status,
        })
        .eq('id', miner.id);
      if (error) console.error('Error saving session:', error);
    }
  }, [isDemoMode]);

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

    const mapDevice = (eq: any): MinerDevice => {
      const t = eq.mining_equipment_types || {};
      const durationHours = t.mining_duration_hours || eq.mining_duration_hours || 5;
      const maxSeconds = durationHours * 3600;
      const usedSeconds = eq.used_mining_seconds || 0;
      const hasTimeLimit = durationHours > 0;
      return {
        id: eq.id,
        name: t.name || 'CPU Miner',
        icon: t.icon || '💻',
        hash_rate: t.hash_rate || 10,
        daily_earning_usdt: t.daily_earning || 240,
        total_earned_usdt: eq.total_earned_usdt || 0,
        session_earned_usdt: eq.session_earned_usdt || 0,
        status: (eq.status || 'stopped') as 'active' | 'paused' | 'stopped',
        started_at: eq.started_at,
        used_mining_seconds: usedSeconds,
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
        const increment = 0.1;
        const newDuration = m.used_mining_seconds + increment;
        const usagePercent = (newDuration / maxDuration) * 100;
        const remainingSeconds = Math.max(0, maxDuration - newDuration);

        if (m.has_time_limit && newDuration >= maxDuration) {
          (async () => {
            const user = await getCurrentUser();
            if (user && m.id !== 'demo-cpu-miner') {
              await supabase
                .from('user_mining_equipment')
                .update({ status: 'stopped', used_mining_seconds: Math.floor(Number(maxDuration)) })
                .eq('id', m.id);
            } else if (!user) {
              setTimeout(() => setShowAuthModal(true), 500);
            }
          })();
          return {
            ...m,
            status: 'stopped' as const,
            used_mining_seconds: maxDuration,
            remaining_mining_seconds: 0,
            usage_percentage: 100,
          };
        }

        const earningPerSecond = m.daily_earning_usdt / 24 / 3600;
        return {
          ...m,
          session_earned_usdt: m.session_earned_usdt + earningPerSecond / 10,
          total_earned_usdt: m.total_earned_usdt + earningPerSecond / 10,
          used_mining_seconds: newDuration,
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

      const now = new Date();
      const updateData: any = { status: newStatus };
      const currentMiner = minersRef.current.find((m) => m.id === minerId);

      if (newStatus === 'active') {
        const remainingSeconds = currentMiner?.has_time_limit
          ? maxDuration - (currentMiner?.used_mining_seconds || 0)
          : maxDuration;
        updateData.started_at = now.toISOString();
        updateData.ends_at = new Date(now.getTime() + remainingSeconds * 1000).toISOString();
        setMiners((prev) => prev.map((m) => (m.id === minerId ? { ...m, status: 'active', started_at: now.toISOString() } : m)));
      } else {
        if (currentMiner?.started_at && currentMiner?.has_time_limit) {
          const startedAt = new Date(currentMiner.started_at).getTime();
          const sessionDuration = Math.floor((now.getTime() - startedAt) / 1000);
          updateData.used_mining_seconds = (currentMiner.used_mining_seconds || 0) + sessionDuration;
          updateData.ends_at = null;
        }
        setMiners((prev) => prev.map((m) => (m.id === minerId ? { ...m, status: 'stopped' } : m)));
      }

      supabase.from('user_mining_equipment').update(updateData).eq('id', minerId).then();
    },
    [isDemoMode]
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

    const restrictions = await getUserRestrictions(user.id);
    if (restrictions?.mining_blocked || restrictions?.usdt_frozen) {
      collectingRef.current = false;
      return { ok: false, collected: 0, expired: false, message: 'Mining earnings collection is currently restricted on your account. Please contact support.' };
    }

    setCollecting(true);
    try {
      const equipmentWithEarnings = minersRef.current.filter((m) => m.session_earned_usdt > 0);
      let totalCollected = 0;
      let anyTimeLimitReached = false;

      const { data: balRow } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();
      let currentBal = Number(balRow?.balance || 0);

      for (const miner of equipmentWithEarnings) {
        const amount = Number(miner.session_earned_usdt || 0);
        if (amount <= 0) continue;
        const maxDuration = miner.mining_duration_hours * 3600;
        const timeLimitExpired = miner.has_time_limit && miner.used_mining_seconds >= maxDuration;

        const { error: eqErr } = await supabase
          .from('user_mining_equipment')
          .update({ session_earned_usdt: 0, status: 'stopped', is_active: !timeLimitExpired })
          .eq('id', miner.id)
          .eq('user_id', user.id);
        if (eqErr) {
          console.error('Collect: equipment update failed', eqErr);
          continue;
        }
        currentBal = Number((currentBal + amount).toFixed(4));
        totalCollected += amount;
        if (timeLimitExpired) anyTimeLimitReached = true;
      }

      if (totalCollected > 0) {
        const { data: updated, error: balErr } = await supabase
          .from('user_balances')
          .update({ balance: currentBal })
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .select('id');
        if (balErr) {
          console.error('Collect: balance update failed', balErr);
          setCollecting(false); collectingRef.current = false;
          return { ok: false, collected: 0, expired: false, message: 'Collection failed — balance not updated. Contact support.' };
        }
        if (!updated || updated.length === 0) {
          const { error: insErr } = await supabase
            .from('user_balances')
            .insert({ user_id: user.id, symbol: 'USDT', balance: currentBal });
          if (insErr) {
            console.error('Collect: balance insert failed', insErr);
            setCollecting(false); collectingRef.current = false;
            return { ok: false, collected: 0, expired: false, message: 'Collection failed — balance not created. Contact support.' };
          }
        }
        setDbUsdtBalance(currentBal);
      }

      setMiners((prev) =>
        prev.map((m) => {
          if (m.session_earned_usdt > 0) {
            const maxDuration = m.mining_duration_hours * 3600;
            const hasTimeLimitExpired = m.has_time_limit && m.used_mining_seconds >= maxDuration;
            if (hasTimeLimitExpired) {
              return { ...m, session_earned_usdt: 0, status: 'stopped' as const, used_mining_seconds: maxDuration, remaining_mining_seconds: 0, usage_percentage: 100, started_at: null };
            }
            return {
              ...m,
              session_earned_usdt: 0,
              status: 'stopped' as const,
              used_mining_seconds: m.has_time_limit ? m.used_mining_seconds : 0,
              remaining_mining_seconds: m.has_time_limit ? Math.max(0, maxDuration - m.used_mining_seconds) : 999999,
              usage_percentage: m.has_time_limit ? (m.used_mining_seconds / maxDuration) * 100 : 0,
              started_at: null,
            };
          }
          return m;
        })
      );

      setCollecting(false); collectingRef.current = false;
      return { ok: true, collected: totalCollected, expired: anyTimeLimitReached };
    } catch (error) {
      console.error('Collect error:', error);
      setCollecting(false); collectingRef.current = false;
      return { ok: false, collected: 0, expired: false, message: 'Collection failed. Please try again.' };
    }
  }, [sessionUsdtTotal]);

  // ── Shop: load equipment ─────────────────────────────────────────────────────
  const loadShop = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;
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

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('current_mining_level')
          .eq('id', user.id)
          .maybeSingle();
        const currentLevel = profileData?.current_mining_level || 0;
        const equipmentLevel = item.level;
        const isLevelUp = equipmentLevel > currentLevel;

        const newBalance = Number((dbUsdtBalance - item.price).toFixed(4));

        const { data: balUpdated, error: balErr } = await supabase
          .from('user_balances')
          .update({ balance: newBalance })
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .gte('balance', item.price)
          .select('id');

        if (balErr || !balUpdated || balUpdated.length === 0) {
          console.error('Purchase: balance deduction failed', balErr);
          setPurchasing(false); purchasingRef.current = false;
          return { ok: false, message: 'Purchase failed — insufficient balance or payment error. Please try again.' };
        }

        const { error: insertError } = await supabase
          .from('user_mining_equipment')
          .insert({
            user_id: user.id,
            equipment_type_id: item.id,
            equipment_level: equipmentLevel,
            icon: item.icon,
            is_active: true,
            status: 'stopped',
            session_earned_usdt: 0,
            total_earned_usdt: 0,
            used_mining_seconds: 0,
            started_at: null,
            ends_at: null,
            total_earned_from_equipment: 0,
          })
          .select();

        if (insertError) {
          await supabase.from('user_balances').update({ balance: dbUsdtBalance }).eq('user_id', user.id).eq('symbol', 'USDT');
          console.error('Purchase: insert failed — balance refunded', insertError);
          setPurchasing(false); purchasingRef.current = false;
          return { ok: false, message: 'Purchase failed — your balance has been refunded. Please try again.' };
        }

        if (isLevelUp) {
          await supabase.from('user_profiles').update({ current_mining_level: equipmentLevel }).eq('id', user.id);
        }

        setDbUsdtBalance(newBalance);
        setShowPurchaseSuccess(true);
        setTimeout(() => setShowPurchaseSuccess(false), 3000);

        await loadShop();
        await loadMiningData();
        setPurchasing(false); purchasingRef.current = false;
        return { ok: true, leveledUp: isLevelUp, level: equipmentLevel };
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

  // ── Effects: earnings tick + periodic save ───────────────────────────────────
  useEffect(() => {
    const earningsInterval = setInterval(updateRealtimeEarnings, 100);
    const saveInterval = setInterval(() => {
      saveSessionToDatabase();
    }, 5000);
    const handleBeforeUnload = () => {
      saveSessionToDatabase();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(earningsInterval);
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveSessionToDatabase();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateRealtimeEarnings, saveSessionToDatabase]);

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
