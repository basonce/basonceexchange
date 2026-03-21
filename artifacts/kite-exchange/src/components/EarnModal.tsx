import { useState, useEffect } from 'react';
import { X, TrendingUp, Lock, Unlock, Zap, Info, ChevronRight, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StakingModal from './StakingModal';

interface EarnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const earnPrograms = [
  {
    id: 1,
    type: 'flexible' as const,
    asset: 'USDT',
    apy: '8.5',
    minAmount: '10',
    description: 'Withdraw anytime, no lock period',
    icon: Unlock,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/128x128/825.png',
    colorClass: 'text-green-400',
    totalStaked: '$125M',
    featured: false,
  },
  {
    id: 2,
    type: 'flexible' as const,
    asset: 'EQ',
    apy: '15.0',
    minAmount: '100',
    description: 'Exclusive high APY for EarnQuest token',
    icon: Zap,
    logo: '/EARNQUEST-LOGO-ICON-2.png',
    colorClass: 'text-yellow-400',
    totalStaked: '50M EQ',
    featured: true,
  },
  {
    id: 3,
    type: 'locked' as const,
    asset: 'BTC',
    apy: '12.0',
    minAmount: '0.001',
    lockPeriod: '30 Days',
    lockDays: 30,
    description: 'Higher APY with lock period',
    icon: Lock,
    logo: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/coin-logos/btc.png',
    colorClass: 'text-orange-400',
    totalStaked: '1,250 BTC',
    featured: false,
  },
  {
    id: 4,
    type: 'flexible' as const,
    asset: 'ETH',
    apy: '6.5',
    minAmount: '0.01',
    description: 'Flexible staking with daily rewards',
    icon: Unlock,
    logo: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/coin-logos/eth.png',
    colorClass: 'text-blue-400',
    totalStaked: '8,500 ETH',
    featured: false,
  },
  {
    id: 5,
    type: 'launchpool' as const,
    asset: 'FOGO',
    apy: '25.0',
    minAmount: '1000',
    description: 'Farm new tokens with your FOGO',
    icon: TrendingUp,
    logo: 'https://s2.coinmarketcap.com/static/img/coins/128x128/35031.png',
    colorClass: 'text-green-400',
    totalStaked: '38M FOGO',
    featured: true,
  },
  {
    id: 6,
    type: 'locked' as const,
    asset: 'BNC',
    apy: '18.0',
    minAmount: '10',
    lockPeriod: '60 Days',
    lockDays: 60,
    description: 'Long-term Basonce staking with premium APY',
    icon: Lock,
    logo: '/ChatGPT_Image_28_Sub_2026_03_53_59 copy.png',
    colorClass: 'text-yellow-400',
    totalStaked: '2.4M BNC',
    featured: true,
  },
];

export default function EarnModal({ isOpen, onClose }: EarnModalProps) {
  const [selectedProgram, setSelectedProgram] = useState<typeof earnPrograms[0] | null>(null);
  const [activePositions, setActivePositions] = useState<{ asset: string; amount: number; earned_rewards: number }[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchActivePositions();
    }
  }, [isOpen]);

  async function fetchActivePositions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('staking_positions')
      .select('asset, amount, earned_rewards')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_deleted', false);

    if (data) {
      setActivePositions(data);
      const total = data.reduce((sum, p) => sum + (p.earned_rewards || 0), 0);
      setTotalEarned(total);
    }
  }

  function getStakedForAsset(asset: string) {
    return activePositions.filter(p => p.asset === asset).reduce((sum, p) => sum + p.amount, 0);
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
        <div className="bg-[#181A20] w-full rounded-t-3xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>

          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2B3139]">
            <div>
              <h2 className="text-lg font-bold text-white">Earn</h2>
              <p className="text-xs text-gray-400">Stake & earn passive income</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2B3139] text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-8">
            {activePositions.length > 0 && (
              <div className="mx-4 mt-4 bg-gradient-to-r from-[#F0B90B]/15 to-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-[#F0B90B]" />
                  <span className="text-sm font-semibold text-white">My Active Stakes</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {activePositions.map((pos, i) => (
                    <div key={i} className="bg-[#0C0E14] rounded-xl px-3 py-2 min-w-[90px]">
                      <div className="text-[10px] text-gray-500 mb-0.5">{pos.asset}</div>
                      <div className="text-sm font-bold text-white">{pos.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 mt-4 mb-3">
              <div className="bg-gradient-to-br from-[#F0B90B]/20 via-[#F0B90B]/10 to-transparent rounded-2xl p-5">
                <div className="text-xs text-gray-400 mb-1">Total Platform Staked</div>
                <div className="text-2xl font-bold text-white">$2.4B+</div>
                <div className="text-xs text-[#F0B90B] mt-1">Up to 25% APY</div>
              </div>
            </div>

            <div className="px-4 space-y-3">
              {earnPrograms.map((program) => {
                const stakedAmount = getStakedForAsset(program.asset);
                const isStaked = stakedAmount > 0;
                const IconComp = program.icon;

                return (
                  <div
                    key={program.id}
                    onClick={() => setSelectedProgram(program)}
                    className="bg-[#0C0E14] rounded-2xl p-4 border border-[#2B3139] active:border-[#F0B90B]/40 transition-all cursor-pointer"
                  >
                    {program.featured && (
                      <div className="mb-3 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-0.5 rounded-md">
                          FEATURED
                        </span>
                        <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-md">
                          HOT
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                        <img
                          src={program.logo}
                          alt={program.asset}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.classList.replace('bg-white', 'bg-[#2B3139]');
                              parent.innerHTML = `<span class="text-white font-bold text-xs">${program.asset.slice(0, 2)}</span>`;
                            }
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white">{program.asset}</span>
                          {isStaked && (
                            <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-medium">
                              STAKED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{program.description}</div>
                        {isStaked && (
                          <div className="text-[10px] text-green-400 mt-0.5">
                            {stakedAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {program.asset} staked
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${program.colorClass}`}>{program.apy}%</div>
                          <div className="text-[9px] text-gray-500">APY</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#2B3139]">
                      <div>
                        <div className="text-[9px] text-gray-600 mb-0.5">Min. Stake</div>
                        <div className="text-xs font-semibold text-gray-300">{program.minAmount}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-600 mb-0.5">Lock</div>
                        <div className="text-xs font-semibold text-gray-300">
                          {program.lockPeriod || 'Flexible'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-600 mb-0.5">Total Staked</div>
                        <div className="text-xs font-semibold text-gray-300 truncate">{program.totalStaked}</div>
                      </div>
                    </div>

                    <button className="w-full mt-3 bg-[#F0B90B] text-black font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5">
                      <IconComp className="w-3.5 h-3.5" />
                      Stake Now
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mx-4 mt-5">
              <div className="bg-[#0C0E14] rounded-2xl p-4 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[#F0B90B]" />
                  <span className="text-sm font-semibold text-white">Important</span>
                </div>
                <div className="space-y-1.5 text-gray-500 text-xs">
                  <p>• Flexible staking allows withdrawal anytime</p>
                  <p>• Locked staking requires lock period completion</p>
                  <p>• Daily rewards distributed to your account</p>
                  <p>• APY rates may vary with market conditions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedProgram && (
        <StakingModal
          isOpen={!!selectedProgram}
          onClose={() => {
            setSelectedProgram(null);
            fetchActivePositions();
          }}
          program={selectedProgram}
        />
      )}
    </>
  );
}
