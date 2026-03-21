import { useState, useEffect } from 'react';
import { Trophy, Clock, Flame } from 'lucide-react';
import { fetchActiveCompetition } from '../../lib/alpha-service';
import type { AlphaCompetition as CompetitionType } from '../../types/alpha';

export default function AlphaCompetition() {
  const [competition, setCompetition] = useState<CompetitionType | null>(null);

  useEffect(() => {
    fetchActiveCompetition().then(setCompetition).catch(() => {});
  }, []);

  if (!competition) return null;

  const endTime = new Date(competition.end_date).getTime();
  const now = Date.now();
  const hoursLeft = Math.max(0, Math.floor((endTime - now) / 3600000));
  const daysLeft = Math.floor(hoursLeft / 24);
  const remainingHours = hoursLeft % 24;

  return (
    <div className="mx-4 mb-3 bg-gradient-to-r from-[#F0B90B]/10 via-[#F8D12F]/5 to-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#F0B90B]/20 rounded-lg flex items-center justify-center">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-xs font-bold">{competition.title}</span>
              <Flame className="w-3 h-3 text-[#F6465D] animate-pulse" />
            </div>
            <span className="text-gray-500 text-[10px]">Prize: ${competition.prize_pool.toLocaleString()} USDT</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-[#2B3139] rounded-lg">
          <Clock className="w-3 h-3 text-[#F0B90B]" />
          <span className="text-[#F0B90B] text-[10px] font-bold">
            {daysLeft > 0 ? `${daysLeft}d ${remainingHours}h` : `${remainingHours}h`}
          </span>
        </div>
      </div>
    </div>
  );
}
