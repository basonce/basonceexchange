import { Users, TrendingUp, Clock } from 'lucide-react';

interface Friend {
  id: string;
  referred_id: string;
  username: string;
  avatar_url: string;
  status: string;
  total_traded_volume: number;
  commission_earned: number;
  commission_rate: number;
  created_at: string;
  activated_at: string;
}

interface ReferralFriendsListProps {
  friends: Friend[];
  loading: boolean;
}

export default function ReferralFriendsList({ friends, loading }: ReferralFriendsListProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const fmtDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#181A20] rounded-xl p-4 border border-[#2B3139] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2B3139] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#2B3139] rounded w-24" />
                  <div className="h-2 bg-[#2B3139] rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="px-4">
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-[#2B3139] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <div className="text-white font-bold mb-2">No Referrals Yet</div>
          <div className="text-gray-400 text-sm">Share your referral link to start earning commissions</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-2">
      {friends.map((friend) => (
        <div key={friend.id} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4 hover:border-[#363D47] transition-colors">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.referred_id}`}
                alt={friend.username}
                className="w-10 h-10 rounded-full object-cover bg-[#2B3139]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.referred_id}`;
                }}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181A20] ${
                friend.status === 'active' ? 'bg-[#0ECB81]' : 'bg-gray-500'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-white text-sm truncate">{friend.username}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  friend.status === 'active'
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                    : friend.status === 'pending'
                    ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                    : 'bg-gray-500/15 text-gray-400'
                }`}>
                  {friend.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fmtDate(friend.created_at)}
                </span>
                {friend.total_traded_volume > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    ${fmt(friend.total_traded_volume)} vol
                  </span>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className={`font-bold text-sm ${friend.commission_earned > 0 ? 'text-[#0ECB81]' : 'text-gray-500'}`}>
                +${fmt(friend.commission_earned)}
              </div>
              <div className="text-xs text-gray-500">USDT earned</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
