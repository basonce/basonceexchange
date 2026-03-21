import { ChevronLeft, Crown, Trophy, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MiningDiscoverModalProps {
  onClose: () => void;
}

interface DiscoverUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  country: string;
  total_earned: number;
  total_withdrawn: number;
  mining_power: number;
  last_active: string;
  created_at: string;
}

export default function MiningDiscoverModal({ onClose }: MiningDiscoverModalProps) {
  const [miners, setMiners] = useState<DiscoverUser[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const { data: minersData } = await supabase
      .from('mining_discover_users')
      .select('*')
      .order('total_earned', { ascending: false });

    if (minersData) {
      setMiners(minersData);
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  return (
    <div className="fixed inset-0 bg-[#181A20] z-50 flex flex-col overflow-hidden">
      <div className="bg-[#181A20] border-[#2B3139] px-4 py-3 flex items-center gap-3 flex-shrink-0 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 flex-shrink-0 bg-[#2B3139] rounded-lg flex items-center justify-center hover:bg-[#374151] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="min-w-0">
          <h2 className="font-bold text-white">Discover Top Miners</h2>
          <p className="text-gray-400">Elite Mining Community</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-hidden">
        <div className="px-4 py-4 space-y-4">
          <div>
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#F0B90B]" />
              Top Gainers
            </h3>
            <div className="bg-[#181A20] rounded-lg border border-[#2B3139] overflow-hidden">
              {miners.slice(0, 10).map((miner, index) => {
                const usdValue = miner.total_earned * 0.5;
                const isTop3 = index < 3;

                return (
                  <div
                    key={miner.id}
                    className="px-3 py-2 flex items-center gap-2 border-b border-[#2B3139] last:border-b-0 hover:bg-[#2B3139]/30 transition-colors"
                  >
                    <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${ index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' : index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' : index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' : 'bg-[#2B3139] text-gray-400' }`}>
                      {index === 0 && <Crown className="w-2.5 h-2.5" />}
                      {index > 0 && (index + 1)}
                    </div>

                    <img
                      src={miner.avatar_url}
                      alt={miner.username}
                      className={`w-8 h-8 flex-shrink-0 rounded-full ${isTop3 ? 'border-2 border-[#F0B90B]' : 'border border-[#2B3139]'}`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate text-white">{miner.username}</span>
                        {isTop3 && (
                          <span className="px-1 py-0.5 bg-[#F0B90B]/20 text-[#F0B90B] rounded text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                            Elite
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">{miner.country}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-xs whitespace-nowrap text-white">
                        {formatNumber(miner.total_earned, 0)} EQ
                      </div>
                      <div className="text-[10px] text-green-400 whitespace-nowrap">
                        ${formatNumber(usdValue, 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {miners.slice(10, 12).map((miner) => {
              const usdEarned = miner.total_earned * 0.5;
              const hourlyUSD = miner.mining_power * 0.5;
              const hashRate = (miner.mining_power * 1.2).toFixed(2);

              return (
                <div
                  key={`miner-card-${miner.id}`}
                  className="bg-[#181A20] rounded-lg border border-[#2B3139] p-2.5"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <img
                      src={miner.avatar_url}
                      alt={miner.username}
                      className="w-7 h-7 flex-shrink-0 rounded-full border-[#2B3139]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate text-xs">{miner.username}</div>
                      <div className="text-gray-400 truncate text-[10px]">{miner.country}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <div className="text-gray-400 text-[10px]">Hash Rate</div>
                      <div className="font-bold text-white text-xs">{hashRate} TH/s</div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-[10px]">Hourly Rate</div>
                      <div className="font-bold text-[#F0B90B] text-xs">${formatNumber(hourlyUSD, 4)}</div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-[10px]">Total Earned</div>
                      <div className="font-bold text-green-400 text-xs">${formatNumber(usdEarned, 2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Recent Losses
            </h3>
            <div className="bg-[#181A20] rounded-lg border border-[#2B3139] overflow-hidden">
              {miners.filter(m => m.total_earned < 0).slice(0, 5).map((miner) => {
                const usdValue = Math.abs(miner.total_earned * 0.5);

                return (
                  <div
                    key={`loser-${miner.id}`}
                    className="px-3 py-2 flex items-center gap-2 border-b border-[#2B3139] last:border-b-0 hover:bg-[#2B3139]/30 transition-colors"
                  >
                    <img
                      src={miner.avatar_url}
                      alt={miner.username}
                      className="w-8 h-8 flex-shrink-0 rounded-full border border-red-500/30"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-white">{miner.username}</div>
                      <div className="text-[10px] text-gray-400 truncate">{miner.country}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-xs whitespace-nowrap text-red-400">
                        -{formatNumber(Math.abs(miner.total_earned), 0)} EQ
                      </div>
                      <div className="text-[10px] text-red-400 whitespace-nowrap">
                        -${formatNumber(usdValue, 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
