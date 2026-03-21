import { useState, useEffect } from 'react';
import { Users, Gift, Copy, Check, TrendingUp, DollarSign, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  this_month_earnings: number;
}

interface Referral {
  id: string;
  referred_user_id: string;
  referred_username: string;
  referred_avatar: string;
  status: 'pending' | 'active' | 'inactive';
  total_traded: number;
  commission_earned: number;
  joined_at: string;
}

export default function ReferralSystem() {
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    active_referrals: 0,
    total_earnings: 0,
    this_month_earnings: 0
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setReferralCode(profileData.referral_code);
      }

      const { data: referralsData } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:user_profiles!referrals_referred_user_id_fkey(username, avatar_url)
        `)
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsData) {
        const mappedReferrals: Referral[] = referralsData.map(ref => ({
          id: ref.id,
          referred_user_id: ref.referred_user_id,
          referred_username: ref.referred?.username || 'User',
          referred_avatar: ref.referred?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ref.referred_user_id}`,
          status: ref.status,
          total_traded: ref.total_traded_volume || 0,
          commission_earned: ref.commission_earned || 0,
          joined_at: ref.created_at
        }));

        setReferrals(mappedReferrals);

        const totalReferrals = mappedReferrals.length;
        const activeReferrals = mappedReferrals.filter(r => r.status === 'active').length;
        const totalEarnings = mappedReferrals.reduce((sum, r) => sum + r.commission_earned, 0);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthEarnings = mappedReferrals
          .filter(r => new Date(r.joined_at) >= thisMonth)
          .reduce((sum, r) => sum + r.commission_earned, 0);

        setStats({
          total_referrals: totalReferrals,
          active_referrals: activeReferrals,
          total_earnings: totalEarnings,
          this_month_earnings: thisMonthEarnings
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading referral data:', error);
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] pb-24">
      <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] border-b border-gray-800 px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Referral Program</h1>
            <p className="text-sm text-gray-400">Earn 10% commission on every trade</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Total Referrals</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.total_referrals}</div>
            <div className="text-xs text-purple-400 mt-1">
              {stats.active_referrals} active
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Total Earned</span>
            </div>
            <div className="text-2xl font-black text-white">${formatNumber(stats.total_earnings)}</div>
            <div className="text-xs text-green-400 mt-1">
              +${formatNumber(stats.this_month_earnings)} this month
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">Your Referral Link</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${window.location.origin}?ref=${referralCode}`}
              readOnly
              className="flex-1 bg-[#0a0e1a] text-white rounded-lg px-4 py-3 border border-gray-700 text-sm"
            />
            <button
              onClick={copyReferralLink}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Referral Code: <span className="text-purple-400 font-bold">{referralCode}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Gift className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">How It Works</h3>
              <p className="text-sm text-gray-400">
                Share your referral link with friends and earn 10% commission on their trading fees forever.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-800">
              <div className="text-2xl mb-2">1️⃣</div>
              <div className="text-sm font-bold text-white mb-1">Share Link</div>
              <div className="text-xs text-gray-400">Send your unique referral link to friends</div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-800">
              <div className="text-2xl mb-2">2️⃣</div>
              <div className="text-sm font-bold text-white mb-1">They Trade</div>
              <div className="text-xs text-gray-400">Your referrals start trading on the platform</div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-800">
              <div className="text-2xl mb-2">3️⃣</div>
              <div className="text-sm font-bold text-white mb-1">You Earn</div>
              <div className="text-xs text-gray-400">Get 10% of their trading fees instantly</div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl border border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Your Referrals ({referrals.length})</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="divide-y divide-gray-800">
            {referrals.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <div className="text-gray-400 text-sm mb-2">No referrals yet</div>
                <div className="text-gray-600 text-xs">Share your link to start earning</div>
              </div>
            ) : (
              referrals.map((referral) => (
                <div key={referral.id} className="px-4 py-3 hover:bg-[#0a0e1a] transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={referral.referred_avatar}
                      alt={referral.referred_username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-white">{referral.referred_username}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          referral.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : referral.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {referral.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Joined {formatDate(referral.joined_at)} · Traded ${formatNumber(referral.total_traded)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">${formatNumber(referral.commission_earned)}</div>
                      <div className="text-xs text-gray-500">earned</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-white mb-1">VIP Referral Program</div>
              <div className="text-xs text-gray-400">
                Refer 10+ active traders and unlock VIP status with increased commission rates up to 15%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
