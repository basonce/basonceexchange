import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

interface Stats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  this_month_earnings: number;
  this_week_earnings: number;
  today_earnings: number;
  total_volume: number;
}

interface ReferralStatsProps {
  stats: Stats;
}

export default function ReferralStats({ stats }: ReferralStatsProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="px-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#F0B90B]/15 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#F0B90B]" />
            </div>
            <span className="text-xs text-gray-400">Total Earned</span>
          </div>
          <div className="text-xl font-black text-white">${fmt(stats.total_earnings)}</div>
          <div className="text-xs text-[#0ECB81] mt-1">+${fmt(stats.today_earnings)} today</div>
        </div>

        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#0ECB81]/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#0ECB81]" />
            </div>
            <span className="text-xs text-gray-400">Friends</span>
          </div>
          <div className="text-xl font-black text-white">{stats.total_referrals}</div>
          <div className="text-xs text-[#0ECB81] mt-1">{stats.active_referrals} active</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-gray-400">This Month</span>
          </div>
          <div className="text-xl font-black text-white">${fmt(stats.this_month_earnings)}</div>
          <div className="text-xs text-blue-400 mt-1">${fmt(stats.this_week_earnings)} this week</div>
        </div>

        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-xs text-gray-400">Total Volume</span>
          </div>
          <div className="text-xl font-black text-white">${fmt(stats.total_volume)}</div>
          <div className="text-xs text-orange-400 mt-1">friends traded</div>
        </div>
      </div>
    </div>
  );
}
