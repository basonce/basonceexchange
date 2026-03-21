import { useState, useEffect } from 'react';
import { UserPlus, TrendingUp, Users, Star, Award, ChevronRight, BarChart2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Trade {
  coin: string;
  type: 'long' | 'short';
  pnl: number;
  roi: number;
}

interface SuggestedTrader {
  id: string;
  username: string;
  avatar_url: string;
  avatar_pool: string[];
  country: string;
  flag: string;
  win_rate: number;
  monthly_return: number;
  total_pnl: number;
  followers: number;
  specialty: string;
  badge: string;
  recent_trades: Trade[];
}

function getHourlyAvatar(trader: SuggestedTrader): string {
  return trader.avatar_url || `https://randomuser.me/api/portraits/men/1.jpg`;
}

function getBadgeStyle(badge: string) {
  switch (badge) {
    case 'Elite': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'Pro': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'Rising': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
}

function formatPnl(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatFollowers(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function TraderCard({ trader }: { trader: SuggestedTrader }) {
  const [followed, setFollowed] = useState(false);

  const winRateColor = trader.win_rate >= 85 ? '#0ECB81' : trader.win_rate >= 70 ? '#F0B90B' : '#F6465D';

  return (
    <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] hover:border-[#3B4149] transition-all duration-200 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={getHourlyAvatar(trader)}
              alt={trader.username}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#2B3139]"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*99)+1}.jpg`; }}
            />
            <div className="absolute -bottom-0.5 -right-0.5 text-base leading-none">{trader.flag}</div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-white text-sm">{trader.username}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getBadgeStyle(trader.badge)}`}>
                {trader.badge}
              </span>
            </div>
            <div className="text-xs text-gray-500">{trader.specialty} • {trader.country}</div>
          </div>

          <button
            onClick={() => setFollowed(!followed)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              followed
                ? 'bg-[#2B3139] text-gray-400'
                : 'bg-[#F0B90B] text-black'
            }`}
          >
            {followed ? (
              <><Check className="w-3.5 h-3.5" /> Following</>
            ) : (
              <><UserPlus className="w-3.5 h-3.5" /> Follow</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="text-center">
            <div className="font-bold text-sm" style={{ color: winRateColor }}>{trader.win_rate}%</div>
            <div className="text-[10px] text-gray-500">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm text-[#0ECB81]">+{trader.monthly_return}%</div>
            <div className="text-[10px] text-gray-500">Monthly</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm text-white">{formatPnl(trader.total_pnl)}</div>
            <div className="text-[10px] text-gray-500">Total PnL</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm text-white">{formatFollowers(trader.followers)}</div>
            <div className="text-[10px] text-gray-500">Followers</div>
          </div>
        </div>
      </div>

      {trader.recent_trades && trader.recent_trades.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-xs text-gray-500 mb-2 font-medium">Recent Trades</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {trader.recent_trades.slice(0, 3).map((trade, i) => (
              <div
                key={i}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs border ${
                  trade.pnl >= 0
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="font-bold text-white mb-0.5">{trade.coin}</div>
                <div className={`font-semibold ${trade.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.roi}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopTraderRow({ trader, rank }: { trader: SuggestedTrader; rank: number }) {
  const [followed, setFollowed] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2B3139] last:border-b-0 hover:bg-[#2B3139]/30 transition-colors">
      <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
        rank === 1 ? 'bg-yellow-500 text-black' :
        rank === 2 ? 'bg-gray-400 text-black' :
        rank === 3 ? 'bg-orange-500 text-black' :
        'bg-[#2B3139] text-gray-400'
      }`}>
        {rank}
      </div>

      <img
        src={getHourlyAvatar(trader)}
        alt={trader.username}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*99)+1}.jpg`; }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white text-xs">{trader.username}</span>
          <span className="text-xs">{trader.flag}</span>
        </div>
        <div className="text-[10px] text-gray-500">{trader.specialty}</div>
      </div>

      <div className="text-right mr-2">
        <div className="font-bold text-xs text-[#0ECB81]">+{trader.monthly_return}%</div>
        <div className="text-[10px] text-gray-500">Monthly</div>
      </div>

      <button
        onClick={() => setFollowed(!followed)}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
          followed ? 'bg-[#2B3139] text-gray-400' : 'bg-[#F0B90B]/20 text-[#F0B90B]'
        }`}
      >
        {followed ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function getHourlyShuffled<T>(arr: T[]): T[] {
  const hour = Math.floor(Date.now() / 3600000);
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const seed = (hour * 2654435761 + i * 1664525) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function FollowingTab() {
  const [allTraders, setAllTraders] = useState<SuggestedTrader[]>([]);
  const [traders, setTraders] = useState<SuggestedTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'suggested' | 'leaderboard'>('suggested');

  useEffect(() => {
    loadTraders();
  }, []);

  useEffect(() => {
    if (allTraders.length === 0) return;
    setTraders(getHourlyShuffled(allTraders));
    const now = Date.now();
    const msUntilNextHour = 3600000 - (now % 3600000);
    const timer = setTimeout(() => {
      setTraders(getHourlyShuffled(allTraders));
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, [allTraders]);

  const loadTraders = async () => {
    const { data } = await supabase
      .from('suggested_traders')
      .select('*')
      .eq('is_active', true)
      .order('monthly_return', { ascending: false });

    if (data) {
      setAllTraders(data.map(t => ({
        ...t,
        recent_trades: Array.isArray(t.recent_trades) ? t.recent_trades : [],
        avatar_pool: Array.isArray(t.avatar_pool) ? t.avatar_pool : []
      })));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#F0B90B]" />
          <h2 className="font-bold text-white text-base">Top Traders</h2>
          <span className="ml-auto bg-[#F0B90B]/20 text-[#F0B90B] text-xs font-bold px-2 py-0.5 rounded-full">
            {traders.length} Traders
          </span>
        </div>
        <p className="text-xs text-gray-500">Follow elite traders and copy their strategies</p>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          onClick={() => setView('suggested')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            view === 'suggested' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'
          }`}
        >
          Suggested
        </button>
        <button
          onClick={() => setView('leaderboard')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            view === 'leaderboard' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'
          }`}
        >
          Leaderboard
        </button>
      </div>

      {view === 'suggested' ? (
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-2 bg-[#1E2026] rounded-xl px-3 py-2.5 border border-[#2B3139] mb-4">
            <Star className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-xs text-gray-400">Follow traders to see their posts in your feed</span>
            <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
          </div>
          {traders.map(trader => (
            <TraderCard key={trader.id} trader={trader} />
          ))}
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-[#2B3139] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F0B90B]" />
              <span className="font-semibold text-white text-sm">Monthly ROI Rankings</span>
            </div>
            {traders.slice(0, 10).map((trader, i) => (
              <TopTraderRow key={trader.id} trader={trader} rank={i + 1} />
            ))}
          </div>

          <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2B3139] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#F0B90B]" />
              <span className="font-semibold text-white text-sm">Win Rate Rankings</span>
            </div>
            {[...traders].sort((a, b) => b.win_rate - a.win_rate).slice(0, 10).map((trader, i) => (
              <TopTraderRow key={trader.id} trader={trader} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
