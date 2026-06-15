import { useState, useEffect } from 'react';
import { Star, TrendingUp, Zap, Clock, Users, ShoppingCart, AlertCircle, Check, X, Timer, Gem, Trophy, Target, Crown, Flame, ArrowRight, Shield } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { globalMiningStats } from '../../lib/global-mining-stats';
import { chestForName, type ShopChest } from '../../lib/shopChests';
import DeviceImage from '../DeviceImage';

interface MiningEquipment {
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

interface ActivityNotification {
  id: number;
  username: string;
  type: 'purchase' | 'withdrawal';
  equipment?: string;
  amount: number;
  timeAgo: string;
  country: string;
  avatar: string;
  actionText?: string;
}

const loadAnonymousUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('anonymous_profiles')
      .select('username, country, avatar_url')
      .limit(5000);

    if (error) {
      console.error('Error loading anonymous users:', error);
      return generateFallbackUsers();
    }

    if (data && data.length > 0) {
      return data.map(user => ({
        name: user.username,
        country: user.country,
        avatar: user.avatar_url
      }));
    }

    return generateFallbackUsers();
  } catch (err) {
    console.error('Failed to load users:', err);
    return generateFallbackUsers();
  }
};

const generateFallbackUsers = () => {
  const names = ['Emma S.', 'James B.', 'Sofia M.', 'Lucas W.', 'Olivia K.', 'Noah T.', 'Ava P.', 'Ethan R.', 'Isabella D.', 'Mason H.'];
  const countries = ['🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇯🇵', '🇨🇦', '🇦🇺', '🇮🇹', '🇪🇸', '🇧🇷'];

  return names.map((name, i) => ({
    name,
    country: countries[i % countries.length],
    avatar: `https://i.pravatar.cc/150?img=${i + 1}`
  }));
};

const generateDecimalAmount = (min: number, max: number): number => {
  const amount = Math.random() * (max - min) + min;
  return Math.floor(amount * 100) / 100;
};

export default function ShopTab({ onPurchaseComplete }: { onPurchaseComplete?: () => void }) {
  const [userBalance, setUserBalance] = useState(0);
  const [equipment, setEquipment] = useState<MiningEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveMiners, setLiveMiners] = useState(12847);
  const [hourlyEarnings, setHourlyEarnings] = useState(645000);
  const [recentUpgrades, setRecentUpgrades] = useState(5842);
  const [upgradesLast10Min, setUpgradesLast10Min] = useState(18);
  const [saleEndsIn, setSaleEndsIn] = useState(3 * 3600 + 42 * 60 + 15);
  const [recentActivity, setRecentActivity] = useState<ActivityNotification[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uniqueUsers, setUniqueUsers] = useState<{ name: string; country: string; avatar: string }[]>([]);
  const [usedUserIndices, setUsedUserIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
    initializeUsers();

    const unsubscribe = globalMiningStats.subscribe((stats) => {
      setLiveMiners(stats.activeMiners);
      setHourlyEarnings(stats.hourlyEarnings);
      setRecentUpgrades(stats.recentUpgrades);
      setUpgradesLast10Min(stats.upgradesLast10Min);
    });

    const countdownInterval = setInterval(() => {
      setSaleEndsIn(prev => {
        if (prev <= 0) return 5 * 3600 + 59 * 60 + 59;
        return prev - 1;
      });
    }, 1000);

    // ✅ Subscribe to realtime balance changes
    let channel: any = null;
    getCurrentUser().then((user) => {
      if (!user) return;

      channel = supabase
        .channel('shop_balance_changes')
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
              setUserBalance(Number(newBalance.balance || 0));
            }
          }
        )
        .subscribe();
    });

    return () => {
      unsubscribe();
      clearInterval(countdownInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    if (equipment.length === 0 || uniqueUsers.length === 0) return;

    const activityInterval = setInterval(() => {
      setUsedUserIndices(prevUsed => {
        let randomUserIndex: number;
        let attempts = 0;
        const maxAttempts = 100;

        do {
          randomUserIndex = Math.floor(Math.random() * uniqueUsers.length);
          attempts++;
        } while (prevUsed.has(randomUserIndex) && attempts < maxAttempts);

        const maxRecentUsers = Math.min(1000, Math.floor(uniqueUsers.length * 0.3));
        let newUsed: Set<number>;
        if (prevUsed.size >= maxRecentUsers) {
          const usedArray = Array.from(prevUsed);
          const keepRecent = usedArray.slice(-500);
          newUsed = new Set([...keepRecent, randomUserIndex]);
        } else {
          newUsed = new Set([...prevUsed, randomUserIndex]);
        }

        const user = uniqueUsers[randomUserIndex];
        const timeAgoOptions = ['Just now', '1 min ago', '2 min ago', '3 min ago', '4 min ago', '5 min ago', '6 min ago', '7 min ago'];
        const timeAgo = timeAgoOptions[Math.floor(Math.random() * timeAgoOptions.length)];

        const isWithdrawal = Math.random() > 0.6;

        let newActivity: ActivityNotification;

        if (isWithdrawal) {
          const amount = generateDecimalAmount(150, 15000);
          const withdrawalActions = [
            'Successfully withdrew',
            'Withdrew',
            'Cashed out',
            'Collected earnings',
            'Transferred',
            'Got paid',
            'Received payout',
            'Withdrawal completed'
          ];

          newActivity = {
            id: Date.now(),
            username: user.name,
            type: 'withdrawal',
            amount,
            timeAgo,
            country: user.country,
            avatar: user.avatar,
            actionText: withdrawalActions[Math.floor(Math.random() * withdrawalActions.length)]
          };
        } else {
          const randomEquipment = equipment[Math.floor(Math.random() * equipment.length)];
          const purchaseActions = [
            'Purchased',
            'Bought',
            'Upgraded to',
            'Got',
            'Acquired',
            'Just bought',
            'Now mining with',
            'Started using'
          ];

          newActivity = {
            id: Date.now(),
            username: user.name,
            type: 'purchase',
            equipment: randomEquipment.name,
            amount: randomEquipment.price,
            timeAgo,
            country: user.country,
            avatar: user.avatar,
            actionText: purchaseActions[Math.floor(Math.random() * purchaseActions.length)]
          };
        }

        setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);

        return newUsed;
      });
    }, 3500);

    return () => {
      clearInterval(activityInterval);
    };
  }, [equipment, uniqueUsers]);

  const initializeUsers = async () => {
    console.log('Initializing users...');
    const users = await loadAnonymousUsers();
    console.log('Loaded users:', users.length);

    if (users.length > 0) {
      setUniqueUsers(users);

      const withdrawalActions = ['Successfully withdrew', 'Withdrew', 'Cashed out', 'Collected earnings', 'Got paid', 'Received payout'];
      const usedIndices = new Set<number>();
      const getRandomUser = () => {
        let idx;
        do {
          idx = Math.floor(Math.random() * users.length);
        } while (usedIndices.has(idx) && usedIndices.size < users.length);
        usedIndices.add(idx);
        return { user: users[idx], index: idx };
      };

      const user1 = getRandomUser();
      const user2 = getRandomUser();
      const user3 = getRandomUser();

      const initialActivities: ActivityNotification[] = [
        {
          id: Date.now() - 5000,
          username: user1.user.name,
          type: 'withdrawal',
          amount: generateDecimalAmount(150, 15000),
          timeAgo: '2 min ago',
          country: user1.user.country,
          avatar: user1.user.avatar,
          actionText: withdrawalActions[Math.floor(Math.random() * withdrawalActions.length)]
        },
        {
          id: Date.now() - 3000,
          username: user2.user.name,
          type: 'withdrawal',
          amount: generateDecimalAmount(150, 15000),
          timeAgo: '4 min ago',
          country: user2.user.country,
          avatar: user2.user.avatar,
          actionText: withdrawalActions[Math.floor(Math.random() * withdrawalActions.length)]
        },
        {
          id: Date.now() - 1000,
          username: user3.user.name,
          type: 'withdrawal',
          amount: generateDecimalAmount(150, 15000),
          timeAgo: 'Just now',
          country: user3.user.country,
          avatar: user3.user.avatar,
          actionText: withdrawalActions[Math.floor(Math.random() * withdrawalActions.length)]
        }
      ];

      console.log('Setting initial activities:', initialActivities);
      setRecentActivity(initialActivities);
      setUsedUserIndices(usedIndices);
    }
  };

  const loadData = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .eq('symbol', 'USDT')
      .maybeSingle();

    if (balanceData) {
      setUserBalance(Number(balanceData.balance || 0));
    }

    const { data: equipmentData, error } = await supabase
      .rpc('get_available_shop_equipment', { p_user_id: user.id });

    if (error) {
      console.error('Error loading shop equipment:', error);

      const { data: fallbackData } = await supabase
        .from('mining_equipment_types')
        .select('*')
        .eq('is_free', false)
        .order('level', { ascending: true });

      if (fallbackData) {
        setEquipment(fallbackData.map((eq: any) => ({
          ...eq,
          hash_rate: Math.round(eq.daily_earning / 24),
          earning_rate: eq.daily_earning,
          badge: eq.level === 1 ? 'POPULAR' : null,
          can_afford: false,
          is_current_level: eq.level === 0 || eq.level === 1,
          user_count: 0
        })));
      }
      return;
    }

    if (equipmentData) {
      setEquipment(equipmentData.map((eq: any) => ({
        ...eq,
        hash_rate: Math.round(eq.daily_earning / 24),
        earning_rate: eq.daily_earning,
        badge: eq.is_current_level ? 'AVAILABLE' : eq.level === 1 ? 'POPULAR' : null
      })));
    }
  };

  const purchaseEquipment = async (item: MiningEquipment) => {
    if (userBalance < item.price) {
      alert(`Insufficient balance! You need $${item.price.toLocaleString()} USDT.\n\nYour balance: $${userBalance.toFixed(2)} USDT\n\nMine more to purchase this equipment.`);
      return;
    }

    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's current level
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('current_mining_level')
        .eq('id', user.id)
        .maybeSingle();

      const currentLevel = profileData?.current_mining_level || 0;
      const equipmentLevel = item.level;
      const isLevelUp = equipmentLevel > currentLevel;

      const hourlyEarning = item.daily_earning / 24;
      const totalEarnings = item.withdrawal_limit;

      const confirmed = confirm(
        `${isLevelUp ? '🔥 LEVEL UP! ' : ''}Purchase ${item.name}?\n\n` +
        `Price: $${item.price.toLocaleString()} USDT\n` +
        `Earnings: $${hourlyEarning.toFixed(2)}/hour\n` +
        `Total Limit: $${totalEarnings.toLocaleString()} USDT\n` +
        `Level: ${equipmentLevel}\n\n` +
        (isLevelUp ? `⚠️ This will deactivate all your Level ${currentLevel} equipment!\n\n` : '') +
        `Continue?`
      );

      if (!confirmed) {
        setLoading(false);
        return;
      }

      const newBalance = Number((userBalance - item.price).toFixed(4));

      // 1) USDT bakiyesini düş (yeterli mi kontrol — yarışta bakiye eksi düşmesin)
      const { data: balUpdated, error: balErr } = await supabase
        .from('user_balances')
        .update({ balance: newBalance })
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .gte('balance', item.price)
        .select('id');

      if (balErr || !balUpdated || balUpdated.length === 0) {
        console.error('Purchase: balance deduction failed', balErr);
        alert('Purchase failed — insufficient balance or payment error. Please try again.');
        setLoading(false);
        return;
      }

      // 2) Ekipmanı aktif olarak ekle (Mine sekmesinde hemen görünsün)
      const { data: newEquipment, error: insertError } = await supabase
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
        // Ekipman eklenemezse parayı iade et
        await supabase
          .from('user_balances')
          .update({ balance: userBalance })
          .eq('user_id', user.id)
          .eq('symbol', 'USDT');
        console.error('Purchase: insert failed — balance refunded', insertError);
        alert('Purchase failed — your balance has been refunded. Please try again.');
        setLoading(false);
        return;
      }

      // 3) Seviye yükseldiyse user_profiles'ta direkt güncelle
      if (isLevelUp) {
        await supabase
          .from('user_profiles')
          .update({ current_mining_level: equipmentLevel })
          .eq('id', user.id);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      alert(
        `✅ Successfully purchased ${item.name}!\n\n` +
        `${item.icon} ${item.name} has been added to your Mine tab!\n` +
        (isLevelUp ? `\n🔥 YOU LEVELED UP TO LEVEL ${equipmentLevel}!\n\n` : '\n') +
        `Earns up to: $${totalEarnings.toLocaleString()} USDT\n\n` +
        `Go to Mine tab to start earning!`
      );

      loadData();
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed! Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelGradient = (level: number) => {
    switch (level) {
      case 0: return { from: 'from-gray-500', to: 'to-gray-600', glow: 'shadow-gray-500/50' };
      case 1: return { from: 'from-blue-500', to: 'to-cyan-600', glow: 'shadow-blue-500/50' };
      case 2: return { from: 'from-green-500', to: 'to-emerald-600', glow: 'shadow-green-500/50' };
      case 3: return { from: 'from-orange-500', to: 'to-red-500', glow: 'shadow-orange-500/50' };
      case 4: return { from: 'from-pink-500', to: 'to-rose-600', glow: 'shadow-pink-500/50' };
      case 5: return { from: 'from-yellow-400', to: 'to-amber-600', glow: 'shadow-yellow-500/50' };
      default: return { from: 'from-gray-500', to: 'to-gray-600', glow: 'shadow-gray-500/50' };
    }
  };

  const EquipmentCard = ({ item, chest }: { item: MiningEquipment; chest?: ShopChest }) => {
    const canAfford = userBalance >= item.price;
    const hourlyEarning = item.daily_earning / 24;
    const roiDays = Math.ceil(item.price / item.daily_earning);
    const withdrawalEnabled = item.withdrawal_limit <= 5000;
    const discountPercent = item.level <= 2 ? 20 : item.level === 3 ? 15 : 10;
    const originalPrice = Math.floor(item.price / (1 - discountPercent / 100));
    const levelGrad = getLevelGradient(item.level);
    const powerLevel = Math.min(100, (item.level / 5) * 100);
    const stock = 100 - Math.floor(Math.random() * 30);

    return (
      <div className="group relative" style={{ perspective: '1000px' }}>
        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -z-10 animate-glow"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${item.level === 5 ? '#fbbf24' : item.level >= 3 ? '#f97316' : '#3b82f6'}, transparent 70%)`
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-50 transition-opacity duration-700 blur-3xl -z-10 animate-pulse"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${item.level === 5 ? '#fbbf24' : item.level >= 3 ? '#f97316' : '#3b82f6'}, transparent 60%)`
          }}
        />

        <div className="relative bg-gradient-to-br from-[#1A1B23] via-[#151820] to-[#0D0E12] rounded-2xl overflow-hidden border border-[#2B3139]/50 hover:border-[#2B3139] transition-all duration-500 transform hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:translate-y-[-8px] group-hover:rotate-y-2" style={{ transformStyle: 'preserve-3d' }}>

          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full"
              style={{
                background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${item.level === 5 ? 'rgba(251, 191, 36, 0.15)' : item.level >= 3 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)'}, transparent 50%)`
              }}
            />
          </div>

          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${levelGrad.from} ${levelGrad.to}`}></div>

          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>

          <div className="p-3">
            <div className="flex flex-wrap gap-1.5 mb-3">
              <div className={`relative bg-gradient-to-r ${levelGrad.from} ${levelGrad.to} text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse`}>
                <Flame className="w-2.5 h-2.5 fill-white" />
                {discountPercent}% OFF
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
              </div>

              {item.badge && (
                <div className={`bg-gradient-to-r ${levelGrad.from} ${levelGrad.to} text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg`}>
                  <Star className="w-2.5 h-2.5 fill-white" />
                  {item.badge}
                </div>
              )}

              {withdrawalEnabled ? (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <Check className="w-2.5 h-2.5" />
                  WITHDRAWALS
                </div>
              ) : (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <Shield className="w-2.5 h-2.5" />
                  HIGH LIMIT
                </div>
              )}

              {stock < 30 && (
                <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                  <Target className="w-2.5 h-2.5" />
                  {stock} LEFT
                </div>
              )}
            </div>

            <div className="flex gap-3 mb-3">
              {chest ? (
                <div
                  className="relative flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border border-[#2B3139] transition-all duration-500"
                  style={{
                    transform: 'translateZ(20px)',
                    background: `radial-gradient(circle at 50% 35%, ${chest.glow}26, #0B0E11 72%)`,
                    boxShadow: `0 10px 30px ${chest.glow}40`
                  }}
                >
                  <DeviceImage
                    img={chest.img}
                    glow={chest.glow}
                    alt={item.name}
                    imgClassName="transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className={`relative flex-shrink-0 w-16 h-16 bg-gradient-to-br ${levelGrad.from} ${levelGrad.to} rounded-xl flex items-center justify-center shadow-2xl ${levelGrad.glow} group-hover:shadow-[0_0_30px] transition-all duration-500`}
                  style={{
                    transform: 'translateZ(20px)',
                    boxShadow: `0 10px 30px ${item.level === 5 ? 'rgba(251, 191, 36, 0.3)' : item.level >= 3 ? 'rgba(249, 115, 22, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}
                >
                  <div className="absolute inset-0 rounded-xl opacity-50 group-hover:opacity-100 transition-opacity animate-glow"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%)`
                    }}
                  ></div>

                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>

                  <div className="text-2xl transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 relative z-10 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                    {item.icon}
                  </div>

                  <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>

                  <div className="absolute -inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"></div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-base font-black text-white">{item.name}</h3>
                  {item.level > 0 && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded bg-gradient-to-r ${levelGrad.from} ${levelGrad.to} text-white`}>
                      LV{item.level}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-2 leading-relaxed">{item.description}</p>

                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-400">Power Level</span>
                      <span className={`font-bold bg-gradient-to-r ${levelGrad.from} ${levelGrad.to} text-transparent bg-clip-text`}>
                        {powerLevel}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className={`h-full bg-gradient-to-r ${levelGrad.from} ${levelGrad.to} rounded-full transition-all duration-1000 relative overflow-hidden`}
                        style={{
                          width: `${powerLevel}%`,
                          boxShadow: `0 0 10px ${item.level === 5 ? 'rgba(251, 191, 36, 0.5)' : item.level >= 3 ? 'rgba(249, 115, 22, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                        <div className="h-full w-full bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {item.mining_duration_hours && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <Timer className="w-3 h-3 text-orange-400" />
                      <span className="text-orange-400 font-bold">
                        {item.mining_duration_hours}h Duration
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-2 hover:border-blue-500/40 transition-all group/stat overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover/stat:from-blue-500/20 group-hover/stat:to-cyan-500/20 transition-all duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap className="w-3 h-3 text-blue-400 group-hover/stat:animate-pulse" />
                    <span className="text-[10px] font-bold text-blue-400">Hash Power</span>
                  </div>
                  <div className="text-lg font-black text-white">{item.hash_rate}</div>
                  <div className="text-[10px] text-gray-500">TH/s</div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-2 hover:border-green-500/40 transition-all group/stat overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover/stat:from-green-500/20 group-hover/stat:to-emerald-500/20 transition-all duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <TrendingUp className="w-3 h-3 text-green-400 group-hover/stat:animate-pulse" />
                    <span className="text-[10px] font-bold text-green-400">Per Hour</span>
                  </div>
                  <div className="text-lg font-black text-white">${hourlyEarning.toFixed(1)}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">+{((hourlyEarning / item.price) * 100).toFixed(2)}%</div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-lg p-2 hover:border-yellow-500/40 transition-all group/stat overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-amber-500/0 group-hover/stat:from-yellow-500/20 group-hover/stat:to-amber-500/20 transition-all duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3 h-3 text-yellow-400 group-hover/stat:animate-pulse" />
                    <span className="text-[10px] font-bold text-yellow-400">ROI Time</span>
                  </div>
                  <div className="text-lg font-black text-white">{roiDays}d</div>
                  <div className="text-[10px] text-gray-500">{(item.price / item.daily_earning * 100).toFixed(0)}% daily</div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-2 hover:border-purple-500/40 transition-all group/stat overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover/stat:from-purple-500/20 group-hover/stat:to-pink-500/20 transition-all duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {withdrawalEnabled ? <Check className="w-3 h-3 text-purple-400 group-hover/stat:animate-pulse" /> : <X className="w-3 h-3 text-red-400" />}
                    <span className="text-[10px] font-bold text-purple-400">Min W/D</span>
                  </div>
                  <div className="text-lg font-black text-white">
                    ${item.withdrawal_limit >= 1000 ? `${item.withdrawal_limit / 1000}k` : item.withdrawal_limit}
                  </div>
                  <div className={`text-[10px] font-bold ${withdrawalEnabled ? 'text-green-400' : 'text-red-400'}`}>
                    {withdrawalEnabled ? 'Enabled' : 'High Limit'}
                  </div>
                </div>
              </div>
            </div>

            {!withdrawalEnabled && (
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-2 mb-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[10px] text-orange-200">
                    <strong className="text-orange-100">High Limit:</strong> Min ${item.withdrawal_limit.toLocaleString()} USDT
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 pt-2 border-t border-gray-800">
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <div className="text-xl font-black bg-gradient-to-r from-emerald-400 to-green-500 text-transparent bg-clip-text">
                    ${item.price.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-gray-600 line-through">
                    ${originalPrice.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">Total Earnings:</span>
                  <span className="font-black bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text">
                    ${item.withdrawal_limit.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => purchaseEquipment(item)}
                disabled={!canAfford || loading}
                className={`group/btn relative flex items-center gap-1.5 px-4 py-3 rounded-lg font-black text-xs transition-all overflow-hidden ${
                  canAfford && !loading
                    ? `bg-gradient-to-r ${levelGrad.from} ${levelGrad.to} text-white active:scale-95 hover:scale-105 hover:shadow-lg`
                    : 'bg-[#2B3139] text-gray-500 cursor-not-allowed'
                }`}
                style={canAfford && !loading ? {
                  boxShadow: `0 5px 15px ${item.level === 5 ? 'rgba(251, 191, 36, 0.4)' : item.level >= 3 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                } : {}}
              >
                {canAfford && !loading && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>

                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity animate-pulse"></div>
                  </>
                )}
                <ShoppingCart className="w-4 h-4 relative z-10" />
                <span className="relative z-10">BUY NOW</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const starterEquipment = equipment.filter(e => e.level === 1 || e.level === 2);
  const advancedEquipment = equipment.filter(e => e.level === 3 || e.level === 4);
  const legendaryEquipment = equipment.filter(e => e.level === 5);

  return (
    <div className="min-h-screen bg-[#0a0e1a] pb-24">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
            <div className="flex items-center gap-3">
              <Gem className="w-6 h-6" />
              <span className="text-lg font-black">PURCHASE SUCCESSFUL!</span>
              <Gem className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative max-w-md mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gem className="w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-4xl font-black">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600 text-transparent bg-clip-text">
                PREMIUM
              </span>
            </h1>
            <Gem className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black mb-3">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-transparent bg-clip-text">
              MINING EQUIPMENT
            </span>
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Upgrade Your Mining Power And Unlock Higher Withdrawal Limits With Our Premium Equipment
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mb-6">
          <div className="relative bg-gradient-to-br from-[#1A1B23] via-[#151820] to-[#0D0E12] border border-[#2B3139]/50 rounded-2xl p-4 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-black bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text tracking-wide">LIVE ACTIVITY</span>
                <div className="flex-1"></div>
                <span className="text-xs text-gray-500 font-bold">{recentActivity.length} recent</span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="relative bg-gradient-to-br from-[#1E2329]/50 to-[#0D0E12]/50 rounded-xl p-3 animate-fadeIn border hover:scale-[1.02] transition-all duration-300 group overflow-hidden"
                    style={{
                      borderColor: activity.type === 'withdrawal' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: activity.type === 'withdrawal'
                          ? 'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.1), transparent 70%)'
                          : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), transparent 70%)'
                      }}
                    ></div>

                    <div className="relative flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg"
                        style={{
                          borderColor: activity.type === 'withdrawal' ? 'rgb(34, 197, 94)' : 'rgb(59, 130, 246)'
                        }}>
                        <img
                          src={activity.avatar}
                          alt={activity.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.username}`;
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{activity.country}</span>
                          <span className="text-sm text-white font-bold truncate">{activity.username}</span>
                        </div>

                        {activity.type === 'withdrawal' ? (
                          <div className="text-xs text-gray-400">
                            <span className="text-green-400 font-bold">{activity.actionText || 'Successfully withdrew'}</span> ${activity.amount.toFixed(2)} USDT
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            <span className="text-blue-400 font-bold">{activity.actionText || 'Purchased'}</span> {activity.equipment}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-600">{activity.timeAgo}</span>
                          <span className="text-[10px] text-gray-700">•</span>
                          <span className={`text-xs font-black ${
                            activity.type === 'withdrawal' ? 'text-green-400' : 'text-blue-400'
                          }`}>
                            ${activity.type === 'withdrawal' ? activity.amount.toFixed(2) : activity.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-black ${
                        activity.type === 'withdrawal'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {activity.type === 'withdrawal' ? 'PAID' : 'SOLD'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>

      <div className="max-w-md mx-auto px-4 mb-6">
        <div className="relative bg-gradient-to-br from-[#1A1B23] via-[#151820] to-[#0D0E12] border border-[#2B3139]/50 rounded-2xl p-5 backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-black text-white tracking-wide">LIVE STATISTICS</h3>
              </div>
              <Gem className="w-4 h-4 text-yellow-400 animate-pulse" />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-3 hover:border-blue-500/40 transition-all">
                <div className="text-xs text-gray-400 font-medium mb-1">Active</div>
                <div className="text-xl font-black text-white">{liveMiners.toLocaleString()}</div>
                <div className="text-[10px] text-blue-400 font-bold">Miners</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-3 hover:border-green-500/40 transition-all">
                <div className="text-xs text-gray-400 font-medium mb-1">Hourly</div>
                <div className="text-xl font-black text-emerald-400">${Math.floor(hourlyEarnings / 1000)}K</div>
                <div className="text-[10px] text-emerald-400 font-bold">Earned</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-3 hover:border-orange-500/40 transition-all">
                <div className="text-xs text-gray-400 font-medium mb-1">Recent</div>
                <div className="text-xl font-black text-white">{recentUpgrades.toLocaleString()}</div>
                <div className="text-[10px] text-orange-400 font-bold">Upgrades</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-xs text-yellow-400 font-bold">
                {upgradesLast10Min} users upgraded in last 10 min
              </span>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-md mx-auto px-4">
        {starterEquipment.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 px-4 py-2 rounded-full">
                <Gem className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-black text-blue-300 tracking-wider">STARTER & POPULAR</h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            </div>

            <div className="space-y-4">
              {starterEquipment.map(item => (
                <EquipmentCard key={item.id} item={item} chest={chestForName(item.name, item.level)} />
              ))}
            </div>
          </div>
        )}

        {advancedEquipment.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 px-4 py-2 rounded-full">
                <Flame className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-black text-orange-300 tracking-wider">ADVANCED & ENTERPRISE</h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
            </div>

            <div className="space-y-4">
              {advancedEquipment.map(item => (
                <EquipmentCard key={item.id} item={item} chest={chestForName(item.name, item.level)} />
              ))}
            </div>
          </div>
        )}

        {legendaryEquipment.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 px-4 py-2 rounded-full">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-black text-yellow-300 tracking-wider">LEGENDARY VIP</h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
            </div>

            <div className="space-y-4">
              {legendaryEquipment.map(item => (
                <EquipmentCard key={item.id} item={item} chest={chestForName(item.name, item.level)} />
              ))}
            </div>
          </div>
        )}

        <div className="text-center sticky bottom-20 z-10">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-xl opacity-50"></div>
            <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 border-2 border-gray-700 rounded-2xl px-5 py-3 shadow-2xl">
              <div className="text-[10px] text-gray-400 mb-0.5 font-bold tracking-wider">YOUR BALANCE</div>
              <div className="text-xl font-black bg-gradient-to-r from-emerald-400 to-green-500 text-transparent bg-clip-text">
                ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-gray-500 font-medium">USDT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
