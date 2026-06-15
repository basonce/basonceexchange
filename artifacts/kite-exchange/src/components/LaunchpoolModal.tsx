import { useState } from 'react';
import { X, Clock, Coins, ChevronRight, Shield, TrendingUp, Users, Info, CheckCircle, Lock } from 'lucide-react';

interface LaunchpoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LaunchpoolModal({ isOpen, onClose }: LaunchpoolModalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'stake' | 'rules'>('overview');
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedPool, setSelectedPool] = useState<'bnb' | 'usdt'>('bnb');

  if (!isOpen) return null;

  const pools = [
    {
      id: 'bnb' as const,
      asset: 'BNB',
      apy: '42.3%',
      total: '1,240,000 BNB',
      myStake: '0 BNB',
      color: '#F0B90B',
      bg: '#F0B90B20',
    },
    {
      id: 'usdt' as const,
      asset: 'USDT',
      apy: '18.7%',
      total: '84,000,000 USDT',
      myStake: '0 USDT',
      color: '#0ECB81',
      bg: '#0ECB8120',
    },
  ];

  const tokenInfo = [
    { label: 'Token Name', value: 'OpenNet' },
    { label: 'Symbol', value: 'OPN' },
    { label: 'Total Supply', value: '1,000,000,000' },
    { label: 'Initial Price', value: '$0.0420' },
    { label: 'Launchpool Allocation', value: '6%' },
    { label: 'Network', value: 'BNB Chain' },
  ];

  const timeline = [
    { label: 'Warming Period', time: 'Now → +6H', status: 'active' },
    { label: 'Staking Opens', time: 'In 5H : 58M', status: 'upcoming' },
    { label: 'Distribution', time: 'Day 15', status: 'pending' },
    { label: 'Trading Starts', time: 'Day 16', status: 'pending' },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center pb-16" onClick={onClose}>
      <div
        className="bg-[#1E2329] w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 144px)', minHeight: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-transparent to-[#F0B90B]/10 pointer-events-none" />
          <div className="relative px-4 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center overflow-hidden">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    {[...Array(7)].map((_, i) => (
                      <rect
                        key={i}
                        x={2 + i * 3.5}
                        y={6 + Math.abs(3 - i) * 2}
                        width="2.2"
                        height={16 - Math.abs(3 - i) * 4}
                        rx="1"
                        fill="white"
                        fillOpacity="0.95"
                      />
                    ))}
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-[16px]">OPN</span>
                    <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">LAUNCHPOOL</span>
                  </div>
                  <div className="text-[#848E9C] text-[11px]">OpenNet Protocol</div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#848E9C]" />
              </button>
            </div>

            <div className="bg-[#0B0E11] rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[#848E9C] text-[11px]">Warming up — Staking opens in</span>
                <div className="flex gap-1 ml-auto">
                  {['05', '58', '23'].map((t, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                      <div className="bg-[#2B3139] rounded px-1.5 py-0.5 text-white font-bold text-[12px] font-mono">{t}</div>
                      {i < 2 && <span className="text-[#848E9C] text-[11px]">:</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full bg-[#2B3139] rounded-full h-1.5">
                <div className="bg-gradient-to-r from-orange-500 to-[#F0B90B] h-1.5 rounded-full" style={{ width: '8%' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-orange-400">Warming</span>
                <span className="text-[10px] text-[#848E9C]">8% complete</span>
              </div>
            </div>

            <div className="flex gap-1 bg-[#0B0E11] rounded-xl p-1 mb-4">
              {(['overview', 'stake', 'rules'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-bold capitalize transition-all ${
                    activeSection === tab ? 'bg-[#F0B90B] text-black' : 'text-[#848E9C]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {activeSection === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0B0E11] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="text-[#848E9C] text-[10px]">Participants</span>
                  </div>
                  <div className="text-white font-bold text-[15px]">8,241</div>
                </div>
                <div className="bg-[#0B0E11] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins className="w-3.5 h-3.5 text-[#F0B90B]" />
                    <span className="text-[#848E9C] text-[10px]">Total Rewards</span>
                  </div>
                  <div className="text-[#F0B90B] font-bold text-[15px]">60M OPN</div>
                </div>
              </div>

              <div className="bg-[#0B0E11] rounded-xl p-4">
                <div className="text-white font-bold text-[13px] mb-3">Token Information</div>
                <div className="space-y-2">
                  {tokenInfo.map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[#848E9C] text-[12px]">{label}</span>
                      <span className="text-white text-[12px] font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0B0E11] rounded-xl p-4">
                <div className="text-white font-bold text-[13px] mb-3">Timeline</div>
                <div className="space-y-3">
                  {timeline.map(({ label, time, status }, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        status === 'active' ? 'bg-orange-400 ring-2 ring-orange-400/30' :
                        status === 'upcoming' ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'
                      }`} />
                      <div className="flex-1">
                        <div className={`text-[12px] font-medium ${status === 'active' ? 'text-orange-400' : status === 'upcoming' ? 'text-white' : 'text-[#848E9C]'}`}>{label}</div>
                      </div>
                      <span className={`text-[11px] ${status === 'active' ? 'text-orange-400' : 'text-[#848E9C]'}`}>{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'stake' && (
            <div className="space-y-3">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-orange-400 text-[12px] font-semibold">Warming Period Active</div>
                  <div className="text-[#848E9C] text-[11px]">Staking will open in 5H : 58M. You can prepare your assets now.</div>
                </div>
              </div>

              <div className="flex gap-2">
                {pools.map(pool => (
                  <button
                    key={pool.id}
                    onClick={() => setSelectedPool(pool.id)}
                    className={`flex-1 rounded-xl p-3 border-2 transition-all ${selectedPool === pool.id ? 'border-[#F0B90B] bg-[#F0B90B]/5' : 'border-[#2B3139] bg-[#0B0E11]'}`}
                  >
                    <div className="text-white font-bold text-[14px]">{pool.asset}</div>
                    <div className="text-[#0ECB81] text-[11px] font-semibold">{pool.apy} APY</div>
                  </button>
                ))}
              </div>

              {pools.filter(p => p.id === selectedPool).map(pool => (
                <div key={pool.id} className="bg-[#0B0E11] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#848E9C]">Total Staked</span>
                    <span className="text-white font-medium">{pool.total}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#848E9C]">Estimated APY</span>
                    <span className="text-[#0ECB81] font-bold">{pool.apy}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#848E9C]">My Stake</span>
                    <span className="text-white">{pool.myStake}</span>
                  </div>
                  <div className="border-t border-[#2B3139] pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-[#848E9C] text-[12px]">Amount to Stake</span>
                      <span className="text-[#F0B90B] text-[12px]">Balance: 0.00 {pool.asset}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={e => setStakeAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-[#2B3139] rounded-lg px-3 py-2.5 text-white text-[13px] outline-none placeholder-[#474D57]"
                      />
                      <button className="bg-[#F0B90B]/10 text-[#F0B90B] px-3 rounded-lg text-[12px] font-bold">MAX</button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-2 bg-[#0B0E11] rounded-xl p-3">
                <Lock className="w-3.5 h-3.5 text-[#848E9C] mt-0.5 flex-shrink-0" />
                <span className="text-[#848E9C] text-[11px]">Flexible staking — withdraw anytime. No lock-up period.</span>
              </div>
            </div>
          )}

          {activeSection === 'rules' && (
            <div className="space-y-3">
              <div className="bg-[#0B0E11] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-white font-bold text-[13px]">Eligibility</span>
                </div>
                {[
                  'Account must be verified (KYC Level 1)',
                  'Minimum stake of 0.1 BNB or 10 USDT',
                  'Rewards calculated per second based on pool share',
                  'One account per user — multiple accounts will be banned',
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-[#2B3139] last:border-0">
                    <CheckCircle className="w-3.5 h-3.5 text-[#0ECB81] flex-shrink-0 mt-0.5" />
                    <span className="text-[#B7BDC6] text-[12px]">{rule}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#0B0E11] rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#F0B90B] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white text-[12px] font-semibold mb-1">Risk Disclaimer</div>
                    <div className="text-[#848E9C] text-[11px] leading-relaxed">
                      Launchpool farming carries risks. OPN token price may fluctuate significantly after listing.
                      Past performance of Launchpool projects does not guarantee future results.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-6 pt-3 border-t border-[#2B3139] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-[#F0B90B] text-black font-bold text-[15px] py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            Stake & Earn OPN
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <TrendingUp className="w-3 h-3 text-[#0ECB81]" />
            <span className="text-[#848E9C] text-[11px]">Estimated 42.3% APY on BNB pool</span>
          </div>
        </div>
      </div>
    </div>
  );
}
