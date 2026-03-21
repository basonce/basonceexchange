import { useState, useEffect } from 'react';
import { X, ChevronRight, TrendingUp, Clock, Coins, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StakingProgram {
  id: number;
  type: 'flexible' | 'locked' | 'launchpool';
  asset: string;
  apy: string;
  minAmount: string;
  description: string;
  logo: string;
  totalStaked: string;
  lockPeriod?: string;
  lockDays?: number;
  featured?: boolean;
  colorClass: string;
}

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: StakingProgram;
}

export default function StakingModal({ isOpen, onClose, program }: StakingModalProps) {
  const [amount, setAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'error'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [estimatedReward, setEstimatedReward] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setStep('input');
      setErrorMsg('');
      fetchBalance();
    }
  }, [isOpen, program.asset]);

  useEffect(() => {
    const val = parseFloat(amount) || 0;
    const apy = parseFloat(program.apy) / 100;
    const days = program.lockDays || 365;
    const reward = val * apy * (days / 365);
    setEstimatedReward(reward);
  }, [amount, program.apy, program.lockDays]);

  async function fetchBalance() {
    setFetchingBalance(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFetchingBalance(false); return; }

    const { data } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .eq('symbol', program.asset)
      .maybeSingle();

    setAvailableBalance(data?.balance || 0);
    setFetchingBalance(false);
  }

  function handlePercentage(pct: number) {
    const val = availableBalance * pct;
    setAmount(val.toFixed(6).replace(/\.?0+$/, ''));
  }

  async function handleStake() {
    const stakeAmount = parseFloat(amount);
    const minAmount = parseFloat(program.minAmount);

    if (!stakeAmount || stakeAmount < minAmount) {
      setErrorMsg(`Minimum stake amount is ${program.minAmount} ${program.asset}`);
      return;
    }
    if (stakeAmount > availableBalance) {
      setErrorMsg('Insufficient balance');
      return;
    }
    setStep('confirm');
  }

  async function confirmStake() {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const stakeAmount = parseFloat(amount);

      const { data: balRow } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('symbol', program.asset)
        .maybeSingle();

      const currentBalance = balRow?.balance || 0;
      if (stakeAmount > currentBalance) throw new Error('Insufficient balance');

      const endsAt = program.lockDays
        ? new Date(Date.now() + program.lockDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: posErr } = await supabase
        .from('staking_positions')
        .insert({
          user_id: user.id,
          asset: program.asset,
          amount: stakeAmount,
          apy: parseFloat(program.apy),
          stake_type: program.type,
          lock_period_days: program.lockDays || null,
          ends_at: endsAt,
          earned_rewards: 0,
          status: 'active'
        });

      if (posErr) throw posErr;

      const { error: balErr } = await supabase
        .from('user_balances')
        .update({ balance: currentBalance - stakeAmount })
        .eq('user_id', user.id)
        .eq('symbol', program.asset);

      if (balErr) throw balErr;

      setStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Staking failed';
      setErrorMsg(msg);
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const stakeAmount = parseFloat(amount) || 0;
  const isValid = stakeAmount >= parseFloat(program.minAmount) && stakeAmount <= availableBalance;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full bg-[#181A20] rounded-t-3xl overflow-hidden" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2B3139]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden p-1">
              <img src={program.logo} alt={program.asset} className="w-full h-full object-contain"
                onError={(e) => {
                  const t = e.currentTarget; t.style.display = 'none';
                  const p = t.parentElement;
                  if (p) { p.classList.replace('bg-white', 'bg-[#2B3139]'); p.innerHTML = `<span class="text-white font-bold text-xs">${program.asset.slice(0, 2)}</span>`; }
                }} />
            </div>
            <div>
              <div className="font-bold text-white text-base">{program.asset} Staking</div>
              <div className="text-xs text-gray-400">{program.type === 'flexible' ? 'Flexible' : program.type === 'locked' ? `${program.lockPeriod} Lock` : 'Launchpool'}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2B3139] text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 72px)' }}>
          {step === 'input' && (
            <div className="px-5 py-5 space-y-5">
              <div className="flex justify-between items-center bg-[#0C0E14] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#F0B90B]" />
                  <span className="text-sm text-gray-400">APY</span>
                </div>
                <span className="text-xl font-bold text-[#F0B90B]">{program.apy}%</span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Stake Amount</span>
                  <span className="text-xs text-gray-500">
                    {fetchingBalance ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      `Available: ${availableBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${program.asset}`
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-[#0C0E14] rounded-2xl px-4 py-3 border border-[#2B3139] focus-within:border-[#F0B90B]/50 transition-colors">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-white text-lg font-bold outline-none placeholder:text-gray-600"
                  />
                  <span className="text-gray-400 font-medium text-sm">{program.asset}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handlePercentage(pct / 100)}
                      className="text-xs py-1.5 rounded-lg bg-[#2B3139] text-gray-300 active:bg-[#F0B90B]/20 active:text-[#F0B90B] transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0C0E14] rounded-2xl p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-300 mb-1">Staking Details</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min. Amount</span>
                  <span className="text-white font-medium">{program.minAmount} {program.asset}</span>
                </div>
                {program.lockDays && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lock Period</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#F0B90B]" />
                      {program.lockPeriod}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reward Type</span>
                  <span className="text-white font-medium">{program.type === 'flexible' ? 'Daily' : 'At Maturity'}</span>
                </div>
                {stakeAmount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-[#2B3139]">
                    <span className="text-gray-500">Est. Reward</span>
                    <span className="text-[#F0B90B] font-bold">
                      +{estimatedReward.toLocaleString(undefined, { maximumFractionDigits: 6 })} {program.asset}
                    </span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleStake}
                disabled={!isValid || fetchingBalance}
                className="w-full bg-[#F0B90B] text-black font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stake {program.asset}
              </button>

              <p className="text-center text-xs text-gray-600 pb-2">
                {program.type === 'flexible'
                  ? 'You can unstake anytime without penalty'
                  : `Funds will be locked for ${program.lockPeriod}`}
              </p>
            </div>
          )}

          {step === 'confirm' && (
            <div className="px-5 py-5 space-y-5">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#F0B90B]/10 border-2 border-[#F0B90B]/30 flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-8 h-8 text-[#F0B90B]" />
                </div>
                <div className="text-lg font-bold text-white mb-1">Confirm Staking</div>
                <div className="text-gray-400 text-sm">Please review your staking details</div>
              </div>

              <div className="bg-[#0C0E14] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-white font-bold">{parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })} {program.asset}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">APY</span>
                  <span className="text-[#F0B90B] font-bold">{program.apy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="text-white font-medium capitalize">{program.type}</span>
                </div>
                {program.lockDays && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lock Until</span>
                    <span className="text-white font-medium">
                      {new Date(Date.now() + program.lockDays * 86400000).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-[#2B3139]">
                  <span className="text-gray-500">Est. Total Reward</span>
                  <span className="text-[#F0B90B] font-bold">+{estimatedReward.toLocaleString(undefined, { maximumFractionDigits: 6 })} {program.asset}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  disabled={loading}
                  className="flex-1 bg-[#2B3139] text-white font-semibold py-4 rounded-2xl text-sm active:opacity-80 transition-opacity"
                >
                  Back
                </button>
                <button
                  onClick={confirmStake}
                  disabled={loading}
                  className="flex-1 bg-[#F0B90B] text-black font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Processing...' : 'Confirm Stake'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="px-5 py-10 text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white mb-2">Staked Successfully!</div>
                <div className="text-gray-400 text-sm">
                  You have staked <span className="text-white font-semibold">{parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })} {program.asset}</span>
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  at <span className="text-[#F0B90B] font-semibold">{program.apy}% APY</span>
                </div>
              </div>

              <div className="bg-[#0C0E14] rounded-2xl p-4">
                <div className="text-sm text-gray-400 mb-1">Expected rewards</div>
                <div className="text-2xl font-bold text-[#F0B90B]">
                  +{estimatedReward.toLocaleString(undefined, { maximumFractionDigits: 6 })} {program.asset}
                </div>
                {program.lockDays && (
                  <div className="text-xs text-gray-600 mt-1">
                    Paid at maturity: {new Date(Date.now() + program.lockDays * 86400000).toLocaleDateString()}
                  </div>
                )}
                {!program.lockDays && (
                  <div className="text-xs text-gray-600 mt-1">Distributed daily to your account</div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full bg-[#F0B90B] text-black font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition-transform"
              >
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="px-5 py-10 text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white mb-2">Staking Failed</div>
                <div className="text-gray-400 text-sm">{errorMsg || 'Something went wrong. Please try again.'}</div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setErrorMsg(''); }}
                  className="flex-1 bg-[#2B3139] text-white font-semibold py-4 rounded-2xl text-sm"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-[#F0B90B] text-black font-bold py-4 rounded-2xl text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
