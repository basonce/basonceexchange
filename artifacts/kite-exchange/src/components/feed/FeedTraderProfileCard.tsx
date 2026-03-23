import { Users, TrendingUp, Copy, Star, Zap } from 'lucide-react';

interface TraderProfile {
  username: string;
  avatar: string;
  roi30d: number;
  totalFollowers: number;
  winRate: number;
  topCoin: string;
  tagline: string;
}

interface FeedTraderProfileCardProps {
  traderProfile: TraderProfile;
}

export default function FeedTraderProfileCard({ traderProfile }: FeedTraderProfileCardProps) {
  const roiColor = traderProfile.roi30d >= 0 ? '#0ECB81' : '#F6465D';

  return (
    <div className="rounded-xl border border-[#2B3139] mb-2 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d0f14 0%, #111418 100%)' }}>
      <div className="px-3 pt-3 pb-2 flex items-center gap-3">
        <div className="relative">
          <img
            src={traderProfile.avatar}
            alt={traderProfile.username}
            className="w-12 h-12 rounded-full object-cover border-2"
            style={{ borderColor: roiColor + '60' }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = `https://i.pravatar.cc/48?u=${traderProfile.username}`; }}
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F0B90B] flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-black fill-black" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[13px] text-white">{traderProfile.username}</span>
            <Zap className="w-3 h-3 text-[#F0B90B]" />
          </div>
          <p className="text-[10px] text-gray-400 truncate">{traderProfile.tagline}</p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-black"
          style={{ background: '#F0B90B' }}
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>

      <div className="grid grid-cols-3 gap-0 px-3 pb-3">
        <div className="text-center">
          <div className="text-[15px] font-black" style={{ color: roiColor }}>
            {traderProfile.roi30d >= 0 ? '+' : ''}{traderProfile.roi30d.toFixed(0)}%
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">30D ROI</div>
        </div>
        <div className="text-center border-x border-[#2B3139]">
          <div className="text-[15px] font-black text-white">{traderProfile.winRate}%</div>
          <div className="text-[9px] text-gray-500 mt-0.5">Win Rate</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-[13px] font-bold text-white">
              {traderProfile.totalFollowers >= 1000
                ? `${(traderProfile.totalFollowers / 1000).toFixed(1)}K`
                : traderProfile.totalFollowers}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">Copiers</div>
        </div>
      </div>

      <div className="mx-3 mb-3 px-2 py-1.5 rounded-lg flex items-center gap-2" style={{ background: '#1E2329' }}>
        <TrendingUp className="w-3.5 h-3.5 text-[#0ECB81] flex-shrink-0" />
        <span className="text-[10px] text-gray-300">Top coin: <span className="font-bold text-white">${traderProfile.topCoin}</span></span>
        <span className="ml-auto text-[9px] text-gray-500">Futures</span>
      </div>
    </div>
  );
}
