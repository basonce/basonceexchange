import { useState, useEffect } from 'react';
import { Users, BarChart3, Clock, Info } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import ReferralStats from './ReferralStats';
import ReferralShareCard from './ReferralShareCard';
import ReferralFriendsList from './ReferralFriendsList';
import ReferralCommissionHistory from './ReferralCommissionHistory';
import ReferralHowItWorks from './ReferralHowItWorks';

type TabType = 'overview' | 'friends' | 'history' | 'howto';

interface Stats {
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  this_month_earnings: number;
  this_week_earnings: number;
  today_earnings: number;
  total_volume: number;
}

const defaultStats: Stats = {
  referral_code: '',
  total_referrals: 0,
  active_referrals: 0,
  total_earnings: 0,
  this_month_earnings: 0,
  this_week_earnings: 0,
  today_earnings: 0,
  total_volume: 0,
};

export default function ReferralPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [friends, setFriends] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'friends' && userId && friends.length === 0) {
      loadFriends();
    }
    if (activeTab === 'history' && userId && commissions.length === 0) {
      loadHistory();
    }
  }, [activeTab, userId]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase.rpc('get_referral_stats', { p_user_id: user.id });
      if (!error && data) {
        setStats(data as Stats);
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('referral_code')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setStats(prev => ({ ...prev, referral_code: profile.referral_code || '' }));
        }
      }
    } catch (e) {
      console.error('Error loading referral stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadFriends = async () => {
    if (!userId) return;
    setLoadingFriends(true);
    try {
      const { data } = await supabase.rpc('get_referral_list', { p_user_id: userId });
      if (data) setFriends(data);
    } catch (e) {
      console.error('Error loading friends:', e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadHistory = async () => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase.rpc('get_commission_history', { p_user_id: userId });
      if (data) setCommissions(data);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'howto', label: 'Guide', icon: Info },
  ];

  const commissionRate = 0.20;

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] pb-28">
      <div className="bg-gradient-to-b from-[#181A20] to-[#0B0E11] px-4 pt-6 pb-5 border-b border-[#2B3139]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black text-white">Referral</h1>
          <div className="flex items-center gap-1.5 bg-[#F0B90B]/15 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-[#F0B90B] rounded-full animate-pulse" />
            <span className="text-xs font-bold text-[#F0B90B]">LIVE</span>
          </div>
        </div>
        <p className="text-sm text-gray-400">Invite friends, earn USDT commissions forever</p>
      </div>

      <div className="sticky top-0 z-10 bg-[#0B0E11]/95 backdrop-blur-sm border-b border-[#2B3139]">
        <div className="flex px-4 gap-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#F0B90B] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-[#181A20]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            <ReferralShareCard referralCode={stats.referral_code || ''} commissionRate={commissionRate} />
            <ReferralStats stats={stats} />
          </>
        )}

        {activeTab === 'friends' && (
          <>
            <div className="px-4 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">{stats.total_referrals} Friends Invited</div>
                  <div className="text-xs text-gray-400">{stats.active_referrals} active traders</div>
                </div>
                <button
                  onClick={loadFriends}
                  className="text-xs text-[#F0B90B] hover:text-[#F0B90B]/80 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
            <ReferralFriendsList friends={friends} loading={loadingFriends} />
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="px-4 mb-2">
              <div>
                <div className="text-white font-bold">Commission History</div>
                <div className="text-xs text-gray-400">All USDT payouts from referrals</div>
              </div>
            </div>
            <ReferralCommissionHistory commissions={commissions} loading={loadingHistory} />
          </>
        )}

        {activeTab === 'howto' && <ReferralHowItWorks />}
      </div>
    </div>
  );
}
