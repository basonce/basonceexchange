import { useState, useEffect, useRef } from 'react';
import { Pickaxe, Clock, Download, Lock, Gem, Lightbulb } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { getUserRestrictions } from '../../lib/user-restrictions';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import AnimatedCounter from '../AnimatedCounter';
import MiningMachineCard from '../MiningMachineCard';
import { chestForName } from '../../lib/shopChests';
import FlyingCoin from '../FlyingCoin';
import MiningUpgradeModal from '../MiningUpgradeModal';
import ForcedUpgradeModal from '../ForcedUpgradeModal';
import AuthModal from '../AuthModal';
import MiningFAQModal from '../MiningFAQModal';

interface MinerDevice {
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

export default function MineTab({ onSwitchToShop }: { onSwitchToShop?: () => void }) {
  // ✅ DATABASE BALANCES (Real, Available, Can be used for shop/swap)
  const [dbUsdtBalance, setDbUsdtBalance] = useState(0);
  const [dbEqBalance, setDbEqBalance] = useState(0);

  // ✅ MINING SESSION EARNINGS (Locked, Need to collect first)
  const [miners, setMiners] = useState<MinerDevice[]>([]);

  const [showCoins, setShowCoins] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showForcedUpgradeModal, setShowForcedUpgradeModal] = useState(false);
  const [eqPrice, setEqPrice] = useState(0.055);
  // 🔒 Locked EQ price for "Display Only" calculations.
  // The session EQ shown to the user must NEVER decrease just because the
  // live market price of EQ moved up. We snapshot the price once and keep it
  // stable so the displayed "EQ Earned" only ever grows with USDT earnings.
  const lockedEqPriceRef = useRef<number>(0.055);
  const [lockedEqPrice, setLockedEqPrice] = useState(0.055);
  const [collecting, setCollecting] = useState(false);
  const [nextTierInfo, setNextTierInfo] = useState<{ name: string; price: number } | null>(null);

  // ✅ DEMO MODE (for non-authenticated users)
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const minersRef = useRef(miners);
  // Equipment ids whose "time exhausted" state we already synced to the server
  const stoppedSyncRef = useRef<Set<string>>(new Set());

  // ✅ LOCKED EARNINGS (in mining session, not yet collected)
  const sessionUsdtTotal = miners.reduce((sum, m) => sum + m.session_earned_usdt, 0);
  // Use locked price so EQ display only grows with USDT, never shrinks on price changes.
  const sessionEqTotal = sessionUsdtTotal / lockedEqPrice;

  const activeMiners = miners.filter(m => m.status === 'active').length;
  const totalMiners = miners.length;
  const hourlyRate = miners.filter(m => m.status === 'active').reduce((sum, m) => sum + (m.daily_earning_usdt / 24), 0);
  const eqHourlyRate = hourlyRate / lockedEqPrice;
  const dailyEstimate = hourlyRate * 24;

  useEffect(() => {
    minersRef.current = miners;
  }, [miners]);

  useEffect(() => {
    
    loadMiningData().catch(() => { setAuthChecked(true); initDemoMode(); });

    // Subscribe to EQ price updates
    const priceManager = EarnQuestPriceManager.getInstance();
    const initialPrice = priceManager.getPrice();
    setEqPrice(initialPrice);
    // 🔒 Snapshot the price ONCE for "Display Only" EQ calculations.
    // This is intentionally NOT updated by the live price subscription so
    // the displayed EQ Earned cannot decrease while the user is watching.
    if (initialPrice && initialPrice > 0) {
      lockedEqPriceRef.current = initialPrice;
      setLockedEqPrice(initialPrice);
    }

    const unsubscribePrice = priceManager.subscribe(() => {
      const p = priceManager.getPrice();
      setEqPrice(p);
      // First valid price wins; never overwrite once locked.
      if (p && p > 0 && lockedEqPriceRef.current === 0.055) {
        lockedEqPriceRef.current = p;
        setLockedEqPrice(p);
      }
    });

    // Subscribe to balance changes
    let channel: any = null;

    getCurrentUser().then((user) => {
      if (!user) return;

      channel = supabase
        .channel('balance_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_balances',
            filter: `user_id=eq.${user.id}`,
          },
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
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    // Display-only tick. All real earnings are computed on the server from
    // started_at — nothing is periodically written from the client anymore.
    const earningsInterval = setInterval(updateRealtimeEarnings, 100);
    return () => {
      clearInterval(earningsInterval);
    };
  }, []);

  // ✅ DEMO MODE INITIALIZATION
  const initDemoMode = () => {
    setAuthChecked(true);
    setIsDemoMode(true);

    // Always clear old demo data and start fresh - better conversion
    localStorage.removeItem('demo_mining_start');
    localStorage.removeItem('demo_miner');

    // Create demo CPU miner - 15 minute free trial
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
      mining_duration_hours: 0.25, // 15 minutes
      withdrawal_limit: 130,
      times_used: 0,
      tier: 1,
      max_uses: 1,
      has_time_limit: true,
      remaining_mining_seconds: 15 * 60, // 900 seconds = 15 minutes
      usage_percentage: 0
    };

    setMiners([demoMiner]);
    setDemoTimeRemaining(15 * 60);
  };

  const MINING_CACHE_KEY = 'basonce_mining_cache_v4';

  // Map a DB equipment row (+ joined type) to a display device.
  // Pending earnings are ALWAYS derived from server-tracked seconds — the
  // client never invents an amount.
  const mapEquipmentToDevice = (eq: any): MinerDevice => {
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
      usage_percentage: hasTimeLimit ? (usedSeconds / maxSeconds * 100) : 0,
    };
  };

  const loadMiningData = async () => {
    // Önce cache'den anında göster
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

    // Check localStorage for any stored Supabase session (synchronous, fast)
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

    // Try current session (cached)
    let user = await getCurrentUser();

    // If cached session returned null but localStorage has session data,
    // make a definitive network request to Supabase (always reliable)
    if (!user && hasStoredSession) {
      const { data } = await supabase.auth.getUser();
      if (data?.user) user = data.user;
    }

    // Last resort: try refreshSession which forces a token renewal
    if (!user && hasStoredSession) {
      const { data } = await supabase.auth.refreshSession();
      if (data?.user) user = data.user;
    }

    setAuthChecked(true);
    // Only go to demo mode if we are CERTAIN there is no session
    if (!user) { initDemoMode(); return; }

    // User is logged in — force demo mode OFF permanently
    setIsDemoMode(false);

    // Balance + equipment + types paralel (join KULLANMA — schema cache FK'yi tanımıyor)
    const [{ data: balanceData }, { data: rawEquipmentRaw }, { data: typesData }] = await Promise.all([
      supabase.from('user_balances').select('balance, eq_amount').eq('user_id', user.id).eq('symbol', 'USDT').maybeSingle(),
      supabase.from('user_mining_equipment')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase.from('mining_equipment_types').select('*'),
    ]);
    // Ekipman ile type'ı JS tarafında birleştir
    const typesMap: Record<string, any> = {};
    (typesData || []).forEach((t: any) => { typesMap[t.id] = t; });
    const rawEquipment = (rawEquipmentRaw || []).map((eq: any) => ({
      ...eq,
      mining_equipment_types: typesMap[eq.equipment_type_id] || null,
    }));

    if (balanceData) {
      setDbUsdtBalance(Number(balanceData.balance || 0));
      setDbEqBalance(Number(balanceData.eq_amount || 0));
    }

    if (!rawEquipment || rawEquipment.length === 0) {
      // Retry up to 6 times (initializeUser() in MiningPage may still be running).
      // NO self-assign here — that caused duplicate records. initializeUser handles it.
      let retryEquipment: any[] | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise(r => setTimeout(r, 1500));
        const { data } = await supabase
          .from('user_mining_equipment')
          .select('*, mining_equipment_types(*)')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (data && data.length > 0) { retryEquipment = data; break; }
      }

      if (!retryEquipment || retryEquipment.length === 0) {
        setMiners([]);
        return;
      }
      // Use the freshly fetched equipment
      setMiners(retryEquipment.map(mapEquipmentToDevice));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const equipment = rawEquipment as any[];

    const devices: MinerDevice[] = equipment.map(mapEquipmentToDevice);

    setMiners(devices);

    // 30 saniye cache
    try {
      localStorage.setItem(MINING_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        miners: devices,
        usdt: balanceData ? Number(balanceData.balance || 0) : undefined,
        eq: balanceData ? Number(balanceData.eq_amount || 0) : undefined,
      }));
    } catch {}
  };

  const updateRealtimeEarnings = async () => {
    setMiners(prev => {
      const activeDevices = prev.filter(m => m.status === 'active');
      if (activeDevices.length === 0) return prev;

      if (Math.random() < 0.02) {
        setShowCoins(true);
        setTimeout(() => setShowCoins(false), 1000);
      }

      return prev.map(m => {
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
        // started_at timestamp, so every device shows the exact same numbers
        // and nothing the client renders can change what actually gets paid.
        if (!m.started_at) return m;
        const elapsed = Math.max(0, (Date.now() - new Date(m.started_at).getTime()) / 1000);
        const totalUsed = Math.min(m.base_used_seconds + elapsed, maxDuration);
        const pendingUsd = Math.max(0, totalUsed - m.paid_mining_seconds) * m.daily_earning_usdt / 86400;
        const usagePercent = m.has_time_limit ? (totalUsed / maxDuration) * 100 : 0;
        const remainingSeconds = Math.max(0, maxDuration - totalUsed);

        // 🔔 70% WARNING (Soft reminder to consider upgrade) — fire once on crossing
        if (m.has_time_limit && usagePercent >= 70 && (m.usage_percentage ?? 0) < 70 && m.name === 'CPU Miner') {
          setTimeout(() => {
            if (confirm(
              `⚠️ Free Mining Almost Complete\n\n` +
              `You've used ${usagePercent.toFixed(0)}% of your CPU Miner's ${m.mining_duration_hours}-hour limit.\n` +
              `${(remainingSeconds / 60).toFixed(0)} minutes remaining.\n\n` +
              `💡 Tip: Upgrade to premium equipment for higher earnings.\n\n` +
              `View Shop now?`
            )) {
              if (onSwitchToShop) onSwitchToShop();
            }
          }, 100);
        }

        // ✅ 100% STOP (time exhausted) — sync server state once; the server
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
  };

  const handleCollectEarnings = async () => {
    if (sessionUsdtTotal <= 0) {
      alert('No earnings to collect!');
      return;
    }

    // Always check real auth status — never rely on isDemoMode flag alone
    const user = await getCurrentUser();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const restrictions = await getUserRestrictions();
    if (restrictions?.mining_blocked || restrictions?.usdt_frozen) {
      alert('Mining earnings collection is currently restricted on your account. Please contact support for assistance.');
      return;
    }

    const confirmed = confirm(
      `Collect Mining Earnings?\n\n` +
      `You will receive: $${sessionUsdtTotal.toFixed(2)} USDT\n\n` +
      `This will be added to your available balance.`
    );

    if (!confirmed) return;

    setCollecting(true);

    try {
      // SERVER-AUTHORITATIVE collect: the server computes earnings from its
      // own timestamps and credits the balance atomically. The client cannot
      // influence the amount.
      const { data, error } = await supabase.rpc('mining_collect');

      if (error) {
        console.error('Collect error:', error);
        setCollecting(false);
        alert('Collection failed. Please try again.');
        return;
      }

      const collected = Number((data as any)?.collected || 0);
      const newBalance = Number((data as any)?.new_balance || 0);
      const expired = Boolean((data as any)?.expired);

      setDbUsdtBalance(newBalance);
      stoppedSyncRef.current.clear();
      try { localStorage.removeItem(MINING_CACHE_KEY); } catch {}
      await loadMiningData();

      setCollecting(false);

      if (collected <= 0) {
        alert('No earnings to collect!');
        return;
      }

      if (expired) {
        const shouldUpgrade = confirm(
          `Mining Earnings Collected!\n\n` +
          `+$${collected.toFixed(2)} USDT\n\n` +
          `Equipment has been deactivated (time limit reached).\n\n` +
          `Visit Shop to buy unlimited mining equipment?`
        );

        if (shouldUpgrade && onSwitchToShop) {
          onSwitchToShop();
        }
      } else {
        alert(
          `Collected Successfully!\n\n` +
          `+$${collected.toFixed(2)} USDT`
        );
      }
    } catch (error) {
      console.error('Collect error:', error);
      setCollecting(false);
      alert('Collection failed. Please try again.');
    }
  };

  // ❌ SWAP REMOVED: EQ is just a display metric, not real swappable balance
  // Mining directly earns USDT, EQ is just shown as a bonus metric for UX

  const toggleMiner = async (minerId: string, currentStatus: string) => {
    const miner = miners.find(m => m.id === minerId);
    if (!miner) return;

    const maxDuration = miner.mining_duration_hours * 3600;

    if (currentStatus === 'stopped' && miner.used_mining_seconds < maxDuration) {
      const remainingSeconds = maxDuration - miner.used_mining_seconds;
      const remainingHours = remainingSeconds / 3600;
      const remainingEarnings = miner.daily_earning_usdt * (remainingHours / 24);

      const isCPUMiner = miner.name === 'CPU Miner' && miner.has_time_limit;
      const usedHours = miner.used_mining_seconds / 3600;

      const message = isCPUMiner && miner.used_mining_seconds > 0
        ? `Resume Mining?\n\n` +
          `${miner.icon} ${miner.name}\n` +
          `Already Used: ${usedHours.toFixed(1)}h / ${miner.mining_duration_hours}h\n` +
          `Remaining: ${remainingHours.toFixed(1)}h\n` +
          `Est. Earnings: $${remainingEarnings.toFixed(2)} USDT\n` +
          `\n⚠️ Time-limited equipment: Use your remaining time wisely!\n` +
          `Collect earnings when timer ends.`
        : `Start Mining?\n\n` +
          `${miner.icon} ${miner.name}\n` +
          `Duration: ${miner.mining_duration_hours} hour${miner.mining_duration_hours > 1 ? 's' : ''}\n` +
          `Earnings: $${(miner.daily_earning_usdt * (miner.mining_duration_hours / 24)).toFixed(2)} USDT\n` +
          `\nMining continues even if you switch pages.\n` +
          `Collect earnings when timer ends.`;

      const confirmed = confirm(message);
      if (!confirmed) return;
    }

    if (miner.used_mining_seconds >= maxDuration && currentStatus === 'stopped') {
      if (miner.name === 'CPU Miner') {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setShowAuthModal(true);
        } else {
          setShowUpgradeModal(true);
        }
      } else {
        alert(
          `⏱️ Mining Cycle Completed!\n\n` +
          `${miner.icon} ${miner.name} has finished its ${miner.mining_duration_hours}h mining cycle.\n\n` +
          `Total Earned: $${miner.session_earned_usdt.toFixed(2)} USDT\n\n` +
          `Click "Collect" to claim your earnings and start a new cycle!`
        );
      }
      return;
    }

    const newStatus = currentStatus === 'active' ? 'stopped' : 'active';

    if (isDemoMode) {
      if (newStatus === 'active') {
        const now = Date.now();
        localStorage.setItem('demo_mining_start', now.toString());
        setDemoTimeRemaining(maxDuration);
      }

      setMiners(prev => prev.map(m =>
        m.id === minerId ? {
          ...m,
          status: newStatus as 'active' | 'stopped',
          started_at: newStatus === 'active' ? new Date().toISOString() : m.started_at
        } : m
      ));
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
          alert('Could not start mining. Please try again.');
        }
        await loadMiningData();
        return;
      }
      const row: any = data;
      stoppedSyncRef.current.delete(minerId);
      setMiners(prev => prev.map(m =>
        m.id === minerId ? {
          ...m,
          status: 'active',
          started_at: row?.started_at || new Date().toISOString(),
          base_used_seconds: Number(row?.used_mining_seconds ?? m.base_used_seconds),
          used_mining_seconds: Number(row?.used_mining_seconds ?? m.used_mining_seconds),
          paid_mining_seconds: Number(row?.paid_mining_seconds ?? m.paid_mining_seconds),
        } : m
      ));
    } else {
      const { data, error } = await supabase.rpc('mining_stop', { p_equipment_id: minerId });
      if (error) {
        console.error('Stop mining failed:', error);
        await loadMiningData();
        return;
      }
      const row: any = data;
      const newUsed = Number(row?.used_mining_seconds ?? miner.used_mining_seconds);
      setMiners(prev => prev.map(m =>
        m.id === minerId ? {
          ...m,
          status: 'stopped',
          started_at: null,
          base_used_seconds: newUsed,
          used_mining_seconds: newUsed,
          paid_mining_seconds: Number(row?.paid_mining_seconds ?? m.paid_mining_seconds),
          session_earned_usdt: Number(row?.session_earned_usdt ?? m.session_earned_usdt),
          remaining_mining_seconds: Math.max(0, maxDuration - newUsed),
          usage_percentage: m.has_time_limit ? (newUsed / maxDuration) * 100 : 0,
        } : m
      ));
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Show loading spinner until auth is definitively resolved
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0D0E12] flex items-center justify-center pb-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-400 text-sm">Loading mining data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0E12] pb-24 relative">
      {showCoins && <FlyingCoin />}

      <MiningUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onShopClick={() => {
          setShowUpgradeModal(false);
          if (onSwitchToShop) onSwitchToShop();
        }}
        totalEarned={miners.find(m => m.name === 'CPU Miner')?.session_earned_usdt || 0}
      />

      {nextTierInfo && (
        <ForcedUpgradeModal
          isOpen={showForcedUpgradeModal}
          onClose={() => setShowForcedUpgradeModal(false)}
          onUpgrade={() => {
            setShowForcedUpgradeModal(false);
            if (onSwitchToShop) onSwitchToShop();
          }}
          lockedAmount={sessionUsdtTotal}
          requiredTier={nextTierInfo.name}
          requiredPrice={nextTierInfo.price}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign Up to Claim Your Earnings!"
        subtitle={`You earned $${sessionUsdtTotal.toFixed(2)} USDT in demo mode!`}
      />

      {isDemoMode && (() => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i) || '';
            if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
              const v = localStorage.getItem(k);
              if (v && v !== 'null') return false;
            }
          }
        } catch {}
        return true;
      })() && (
        <div className="bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-blue-500/20 border-b border-blue-500/30">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-blue-400 animate-pulse" />
                <div>
                  <div className="text-sm font-bold text-white">FREE Demo Mining</div>
                  <div className="text-xs text-gray-300">No signup required - Try now!</div>
                </div>
              </div>
              {demoTimeRemaining !== null && demoTimeRemaining > 0 ? (
                <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-1">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-400">
                    {Math.floor(demoTimeRemaining / 60)}:{String(demoTimeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all"
                >
                  Sign Up Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MiningFAQModal
        isOpen={showFAQModal}
        onClose={() => setShowFAQModal(false)}
        isDemoMode={isDemoMode}
      />

      <div className="bg-gradient-to-b from-[#1A1B23] to-[#0D0E12] border-b border-[#2B3139]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pickaxe className="w-6 h-6 text-[#F0B90B]" />
              <h1 className="text-xl font-bold text-white">Mining</h1>
              <button
                onClick={() => {
                  console.log('💡 Lightbulb clicked! Opening FAQ Modal...');
                  setShowFAQModal(true);
                }}
                className="ml-2 p-1.5 bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 border border-[#F0B90B]/30 rounded-lg transition-all group"
                title="Frequently Asked Questions"
              >
                <Lightbulb className="w-4 h-4 text-[#F0B90B] group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* SESSION EARNINGS - Ready to collect */}
          {sessionUsdtTotal > 0 && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    Session Earnings (Not Collected)
                  </div>
                  <div className="text-xl font-bold text-emerald-400">
                    +${sessionUsdtTotal.toFixed(2)} USDT
                  </div>
                  <div className="text-xs text-gray-500">
                    +${sessionEqTotal.toFixed(2)} EQ (display only)
                  </div>
                </div>
                <button
                  onClick={handleCollectEarnings}
                  disabled={collecting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Collect
                </button>
              </div>
            </div>
          )}

          {/* AVAILABLE BALANCE - Can use for shop/swap */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1B23] border border-[#2B3139] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Available USDT</div>
                <AnimatedCounter
                  value={dbUsdtBalance}
                  decimals={2}
                  prefix="$"
                  className="text-xl font-bold text-white"
                />
                <div className="text-xs text-gray-500 mt-1">Can use for shop</div>
              </div>

              <div className="bg-gradient-to-br from-[#F0B90B]/10 to-transparent border border-[#F0B90B]/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">EQ Earned (Display Only)</div>
                <AnimatedCounter
                  value={sessionEqTotal}
                  decimals={4}
                  suffix=" EQ"
                  className="text-xl font-bold text-[#F0B90B]"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Mining bonus metric
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A1B23] border border-[#2B3139] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Hourly Rate</div>
              <div className="text-xl font-bold text-[#F0B90B]">
                ${hourlyRate.toFixed(2)}/h
              </div>
              <div className="text-xs text-gray-500">{eqHourlyRate.toFixed(2)} EQ/h (display)</div>
            </div>

            <div className="bg-[#1A1B23] border border-[#2B3139] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Active Devices</div>
              <div className="text-xl font-bold text-white">
                {activeMiners}/{totalMiners}
              </div>
              <div className="text-xs text-gray-500">Mining devices</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-[#1A1B23] border border-[#2B3139] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Your Mining Devices</h3>
            <div className="text-xs font-bold text-gray-400">
              {activeMiners}/{totalMiners} Active
            </div>
          </div>

          {(() => {
            const expiredCount = miners.filter(m => m.has_time_limit && (m.remaining_mining_seconds ?? 0) <= 0 && m.status !== 'active').length;
            if (expiredCount === 0) return null;
            return (
              <div className="mb-4 bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/50 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-red-300">
                      {expiredCount} device{expiredCount > 1 ? 's' : ''} expired
                    </div>
                    <div className="text-[11px] text-red-200/80 truncate">Get a new device from Shop to keep mining</div>
                  </div>
                </div>
                <button
                  onClick={() => onSwitchToShop && onSwitchToShop()}
                  className="flex-shrink-0 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  🛒 Open Shop
                </button>
              </div>
            );
          })()}

          <div className="space-y-4">
            {miners.map(miner => {
              const hourlyUSDT = miner.daily_earning_usdt / 24;
              const isCPUMiner = miner.name === 'CPU Miner';

              return (
                <MiningMachineCard
                  key={miner.id}
                  minerId={miner.id}
                  name={miner.name}
                  icon={miner.icon}
                  image={chestForName(miner.name, miner.level).img}
                  imageGlow={chestForName(miner.name, miner.level).glow}
                  hashRate={miner.hash_rate}
                  hourlyRate={hourlyUSDT}
                  sessionEarned={miner.session_earned_usdt}
                  totalEarned={miner.total_earned_usdt}
                  isActive={miner.status === 'active'}
                  onToggle={() => toggleMiner(miner.id, miner.status)}
                  level={miner.level}
                  miningDurationSeconds={isCPUMiner ? miner.used_mining_seconds : undefined}
                  miningDurationHours={isCPUMiner ? miner.mining_duration_hours : undefined}
                  hasTimeLimit={miner.has_time_limit}
                  remainingSeconds={miner.remaining_mining_seconds}
                  usagePercentage={miner.usage_percentage}
                  timesUsed={miner.times_used}
                  maxUses={miner.max_uses}
                  onShopClick={onSwitchToShop}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
