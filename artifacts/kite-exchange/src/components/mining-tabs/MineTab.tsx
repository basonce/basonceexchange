import { useState, useEffect, useRef } from 'react';
import { Zap, Clock, Download, Lock, Sparkles, Lightbulb } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { getUserRestrictions } from '../../lib/user-restrictions';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import AnimatedCounter from '../AnimatedCounter';
import MiningMachineCard from '../MiningMachineCard';
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
  const [collecting, setCollecting] = useState(false);
  const [nextTierInfo, setNextTierInfo] = useState<{ name: string; price: number } | null>(null);

  // ✅ DEMO MODE (for non-authenticated users)
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const minersRef = useRef(miners);

  // ✅ LOCKED EARNINGS (in mining session, not yet collected)
  const sessionUsdtTotal = miners.reduce((sum, m) => sum + m.session_earned_usdt, 0);
  const sessionEqTotal = sessionUsdtTotal / eqPrice; // Real EQ price calculation

  const activeMiners = miners.filter(m => m.status === 'active').length;
  const totalMiners = miners.length;
  const hourlyRate = miners.filter(m => m.status === 'active').reduce((sum, m) => sum + (m.daily_earning_usdt / 24), 0);
  const eqHourlyRate = hourlyRate / eqPrice;
  const dailyEstimate = hourlyRate * 24;

  useEffect(() => {
    minersRef.current = miners;
  }, [miners]);

  useEffect(() => {
    
    loadMiningData();

    // Subscribe to EQ price updates
    const priceManager = EarnQuestPriceManager.getInstance();
    setEqPrice(priceManager.getPrice());

    const unsubscribePrice = priceManager.subscribe(() => {
      setEqPrice(priceManager.getPrice());
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
    const earningsInterval = setInterval(updateRealtimeEarnings, 100);
    const saveInterval = setInterval(() => {
      saveSessionToDatabase();
    }, 5000);

    const handleBeforeUnload = async () => {
      await saveSessionToDatabase();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(earningsInterval);
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveSessionToDatabase();
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
      daily_earning_usdt: 624,
      total_earned_usdt: 0,
      session_earned_usdt: 0,
      status: 'stopped',
      started_at: null,
      used_mining_seconds: 0,
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

  // ✅ SAVE SESSION DATA TO DATABASE (No balance change, just save session progress)
  const saveSessionToDatabase = async () => {
    const user = await getCurrentUser();
    if (!user) {
      // Demo mode - save to localStorage
      if (isDemoMode && miners.length > 0) {
        localStorage.setItem('demo_miner', JSON.stringify(miners[0]));
      }
      return;
    }

    const currentMiners = minersRef.current;

    for (const miner of currentMiners) {
      const { error } = await supabase
        .from('user_mining_equipment')
        .update({
          session_earned_usdt: Number(miner.session_earned_usdt.toFixed(4)),
          total_earned_usdt: Number(miner.total_earned_usdt.toFixed(4)),
          used_mining_seconds: Math.floor(Number(miner.used_mining_seconds)),
          status: miner.status
        })
        .eq('id', miner.id);

      if (error) {
        console.error('Error saving session:', error);
      }
    }
  };

  const MINING_CACHE_KEY = 'basonce_mining_cache_v1';

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

    // Balance ve equipment paralel çalışır
    // Not: user_active_equipment VIEW yerine direkt tablo + join kullan
    // (VIEW'daki is_currently_usable koşulu bazı geçerli ekipmanları dışarıda bırakıyordu)
    const [{ data: balanceData }, { data: rawEquipment }] = await Promise.all([
      supabase.from('user_balances').select('balance, eq_amount').eq('user_id', user.id).eq('symbol', 'USDT').maybeSingle(),
      supabase.from('user_mining_equipment')
        .select('*, mining_equipment_types(*)')
        .eq('user_id', user.id)
        .eq('is_active', true),
    ]);

    if (balanceData) {
      setDbUsdtBalance(Number(balanceData.balance || 0));
      setDbEqBalance(Number(balanceData.eq_amount || 0));
    }

    if (!rawEquipment || rawEquipment.length === 0) {
      // Logged-in user has no active equipment (e.g. after collect deactivated it).
      // Retry once after 1.5s in case initializeUser() is still running.
      await new Promise(r => setTimeout(r, 1500));
      const { data: retryEquipment } = await supabase
        .from('user_mining_equipment')
        .select('*, mining_equipment_types(*)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!retryEquipment || retryEquipment.length === 0) {
        // Still nothing – show empty state, NOT demo mode
        setMiners([]);
        return;
      }
      // Use the freshly fetched equipment
      const retryDevices: MinerDevice[] = retryEquipment.map((eq: any) => {
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
          usage_percentage: hasTimeLimit ? (usedSeconds / maxSeconds * 100) : 0,
        };
      });
      setMiners(retryDevices);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const equipment = rawEquipment as any[];

    const devices: MinerDevice[] = equipment.map(eq => {
      const t = eq.mining_equipment_types || {};
      const durationHours = t.mining_duration_hours || eq.mining_duration_hours || 5;
      const maxSeconds = durationHours * 3600;
      const usedSeconds = eq.used_mining_seconds || 0;
      // has_time_limit: true if duration is set (> 0), otherwise unlimited
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
        usage_percentage: hasTimeLimit ? (usedSeconds / maxSeconds * 100) : 0,
      };
    });

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
        if (m.status === 'active') {
          // ✅ Calculate time wallet
          const maxDuration = m.mining_duration_hours * 3600;
          const increment = 0.1;
          const newDuration = m.used_mining_seconds + increment;
          const usagePercent = (newDuration / maxDuration) * 100;
          const remainingSeconds = Math.max(0, maxDuration - newDuration);

          // 🔔 70% WARNING (Soft reminder to consider upgrade)
          if (m.has_time_limit && usagePercent >= 70 && usagePercent < 70.1 && m.name === 'CPU Miner') {
            setTimeout(() => {
              if (confirm(
                `⚠️ Free Mining Almost Complete\n\n` +
                `You've used ${usagePercent.toFixed(0)}% of your CPU Miner's 5-hour limit.\n` +
                `${(remainingSeconds / 60).toFixed(0)} minutes remaining.\n\n` +
                `⏰ After 5 hours, CPU Miner will be deactivated.\n\n` +
                `💡 Tip: Upgrade to premium equipment for:\n` +
                `• Unlimited mining time\n` +
                `• 2x-10x higher earnings\n` +
                `• No restrictions\n\n` +
                `View Shop now?`
              )) {
                if (onSwitchToShop) onSwitchToShop();
              }
            }, 100);
          }

          // ✅ 100% STOP (Time wallet depleted)
          if (m.has_time_limit && newDuration >= maxDuration) {
            // Save to database (only for real users)
            (async () => {
              const user = await getCurrentUser();
              if (user) {
                await supabase
                  .from('user_mining_equipment')
                  .update({
                    status: 'stopped',
                    used_mining_seconds: Math.floor(Number(maxDuration))
                  })
                  .eq('id', m.id);
              } else {
                // Demo mode - show auth modal
                setTimeout(() => setShowAuthModal(true), 500);
              }
            })();

            return {
              ...m,
              status: 'stopped' as const,
              used_mining_seconds: maxDuration,
              remaining_mining_seconds: 0,
              usage_percentage: 100
            };
          }

          // Continue mining - REAL SPEED
          const earningPerSecond = m.daily_earning_usdt / 24 / 3600;
          const newSessionEarned = m.session_earned_usdt + (earningPerSecond / 10);
          const newTotalEarned = m.total_earned_usdt + (earningPerSecond / 10);

          return {
            ...m,
            session_earned_usdt: newSessionEarned,
            total_earned_usdt: newTotalEarned,
            used_mining_seconds: newDuration,
            remaining_mining_seconds: remainingSeconds,
            usage_percentage: usagePercent
          };
        }
        return m;
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

    const restrictions = await getUserRestrictions(user.id);
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
      const equipmentWithEarnings = miners.filter(m => m.session_earned_usdt > 0);

      let totalCollected = 0;
      let anyDeactivated = false;
      let anyTimeLimitReached = false;

      for (const miner of equipmentWithEarnings) {
        const { data, error } = await supabase
          .rpc('collect_mining_earnings', {
            p_user_id: user.id,
            p_equipment_id: miner.id
          });

        if (error) {
          console.error('Collect RPC error:', error);
          continue;
        }

        if (data?.success) {
          totalCollected += Number(data.collected_usdt || 0);
          if (data.deactivated) anyDeactivated = true;
          if (data.time_limit_reached) anyTimeLimitReached = true;

          const newBalance = Number(data.new_balance || 0);
          setDbUsdtBalance(newBalance);
        }
      }

      setMiners(prev => prev.map(m => {
        if (m.session_earned_usdt > 0) {
          const maxDuration = m.mining_duration_hours * 3600;
          const hasTimeLimitExpired = m.has_time_limit && m.used_mining_seconds >= maxDuration;

          if (hasTimeLimitExpired) {
            return {
              ...m,
              session_earned_usdt: 0,
              status: 'stopped' as const,
              used_mining_seconds: maxDuration,
              remaining_mining_seconds: 0,
              usage_percentage: 100,
              started_at: null
            };
          }

          return {
            ...m,
            session_earned_usdt: 0,
            status: 'stopped' as const,
            used_mining_seconds: m.has_time_limit ? m.used_mining_seconds : 0,
            remaining_mining_seconds: m.has_time_limit ? Math.max(0, maxDuration - m.used_mining_seconds) : 999999,
            usage_percentage: m.has_time_limit ? (m.used_mining_seconds / maxDuration * 100) : 0,
            started_at: null
          };
        }
        return m;
      }));

      setCollecting(false);

      if (anyTimeLimitReached || anyDeactivated) {
        const shouldUpgrade = confirm(
          `Mining Earnings Collected!\n\n` +
          `+$${totalCollected.toFixed(2)} USDT\n\n` +
          `Equipment has been deactivated (time limit reached).\n\n` +
          `Visit Shop to buy unlimited mining equipment?`
        );

        if (shouldUpgrade && onSwitchToShop) {
          onSwitchToShop();
        }
      } else {
        alert(
          `Collected Successfully!\n\n` +
          `+$${totalCollected.toFixed(2)} USDT`
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
        ? `⚡ Resume Mining?\n\n` +
          `${miner.icon} ${miner.name}\n` +
          `Already Used: ${usedHours.toFixed(1)}h / ${miner.mining_duration_hours}h\n` +
          `Remaining: ${remainingHours.toFixed(1)}h\n` +
          `Est. Earnings: $${remainingEarnings.toFixed(2)} USDT\n` +
          `\n⚠️ Time-limited equipment: Use your remaining time wisely!\n` +
          `Collect earnings when timer ends.`
        : `⚡ Start Mining?\n\n` +
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

    const now = new Date();
    const updateData: any = { status: newStatus };
    const currentMiner = miners.find(m => m.id === minerId);

    if (newStatus === 'active') {
      const remainingSeconds = currentMiner?.has_time_limit
        ? (maxDuration - (currentMiner?.used_mining_seconds || 0))
        : maxDuration;
      const endsAt = new Date(now.getTime() + remainingSeconds * 1000);

      updateData.started_at = now.toISOString();
      updateData.ends_at = endsAt.toISOString();

      setMiners(prev => prev.map(m =>
        m.id === minerId ? {
          ...m,
          status: 'active',
          started_at: now.toISOString()
        } : m
      ));
    } else {
      if (currentMiner?.started_at && currentMiner?.has_time_limit) {
        const startedAt = new Date(currentMiner.started_at).getTime();
        const sessionDuration = Math.floor((now.getTime() - startedAt) / 1000);
        const totalUsed = (currentMiner.used_mining_seconds || 0) + sessionDuration;

        updateData.used_mining_seconds = totalUsed;
        updateData.ends_at = null;
      }

      setMiners(prev => prev.map(m =>
        m.id === minerId ? {
          ...m,
          status: 'stopped'
        } : m
      ));
    }

    supabase
      .from('user_mining_equipment')
      .update(updateData)
      .eq('id', minerId)
      .then();
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
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
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
              <Zap className="w-6 h-6 text-[#F0B90B]" />
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
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
