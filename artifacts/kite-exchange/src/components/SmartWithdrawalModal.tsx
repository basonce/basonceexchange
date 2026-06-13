import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Wallet, ArrowRight, Gem, Gift, AlertTriangle, Clock, DollarSign, Lock } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { checkWithdrawalPermission } from '../lib/withdrawal-permission';

interface SmartWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  eqBalance: number;
  eqPrice: number;
}

export default function SmartWithdrawalModal({ isOpen, onClose, eqBalance, eqPrice }: SmartWithdrawalModalProps) {
  const [selectedOption, setSelectedOption] = useState<'futures' | 'wallet' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawalBlocked, setIsWithdrawalBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [currentTier, setCurrentTier] = useState(0);
  const [requiredTierPrice, setRequiredTierPrice] = useState(0);
  const [bonusReceived, setBonusReceived] = useState(0);
  const [wageringRequired, setWageringRequired] = useState(0);
  const [wageringRemaining, setWageringRemaining] = useState(0);
  const [depositTotal, setDepositTotal] = useState(0);
  const [depositRequired, setDepositRequired] = useState(200);
  const [depositRemaining, setDepositRemaining] = useState(200);
  const [showDepositInfo, setShowDepositInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkPermission();
    }
  }, [isOpen]);

  const checkPermission = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const permission = await checkWithdrawalPermission(user.id);
    setBonusReceived(permission.bonusReceived || 0);
    setWageringRequired(permission.wageringRequired || 0);
    setWageringRemaining(permission.wageringRemaining || 0);
    setDepositTotal(permission.depositTotal || 0);
    setDepositRequired(permission.depositRequired || 200);
    setDepositRemaining(permission.depositRemaining || 0);
    if (!permission.allowed) {
      setIsWithdrawalBlocked(true);
      setBlockMessage(permission.message || '');
      setCurrentTier(permission.currentTier);
      setRequiredTierPrice(permission.requiredTier?.price || 0);
    }
  };

  const usdtValue = parseFloat(withdrawAmount || '0') * eqPrice;
  const futuresBonus = usdtValue * 0.10;
  const futuresTotal = usdtValue + futuresBonus;
  const walletFee = usdtValue * 0.05;
  const walletTotal = usdtValue - walletFee;

  const isFirstTransfer = async () => {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_balances')
      .select('futures_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    return data && data.futures_balance === 0;
  };

  const handleTransferToFutures = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > eqBalance) {
      alert('Insufficient EQ balance');
      return;
    }

    setIsProcessing(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const firstTransfer = await isFirstTransfer();
      const welcomeBonus = firstTransfer ? 5 : 0;
      const totalBonus = futuresBonus + welcomeBonus;

      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('futures_balance, eq_amount')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();

      if (!balanceData) throw new Error('Balance not found');

      const newFuturesBalance = (balanceData.futures_balance || 0) + futuresTotal + welcomeBonus;
      const newEqAmount = (balanceData.eq_amount || 0) - parseFloat(withdrawAmount);

      await supabase.from('user_balances').update({
        futures_balance: newFuturesBalance,
        eq_amount: newEqAmount,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id).eq('symbol', 'USDT');

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'mining_to_futures',
        amount: futuresTotal + welcomeBonus,
        status: 'completed',
        description: `Transferred ${withdrawAmount} EQ to Futures (+${totalBonus.toFixed(2)} USDT bonus)`
      });

      alert(`Success! ${futuresTotal.toFixed(2)} USDT added to Futures${welcomeBonus > 0 ? ` + ${welcomeBonus} USDT welcome bonus!` : '!'}`);
      onClose();
      window.location.reload();
    } catch (error: any) {
      alert('Transfer failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawToWallet = async () => {
    if (isWithdrawalBlocked) {
      alert('Withdrawal is locked. Please upgrade to Tier 5 to unlock.');
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > eqBalance) {
      alert('Insufficient EQ balance');
      return;
    }

    if (walletTotal < 10) {
      alert('Minimum withdrawal: 10 USDT');
      return;
    }

    setIsProcessing(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('balance, eq_amount')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();

      if (!balanceData) throw new Error('Balance not found');

      const newBalance = (balanceData.balance || 0) + walletTotal;
      const newEqAmount = (balanceData.eq_amount || 0) - parseFloat(withdrawAmount);

      await supabase.from('user_balances').update({
        balance: newBalance,
        eq_amount: newEqAmount,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id).eq('symbol', 'USDT');

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'mining_withdrawal',
        amount: walletTotal,
        status: 'pending',
        description: `Withdrew ${withdrawAmount} EQ to wallet (${walletFee.toFixed(2)} USDT fee)`
      });

      alert(`Withdrawal initiated! ${walletTotal.toFixed(2)} USDT will arrive in 5-30 minutes.`);
      onClose();
      window.location.reload();
    } catch (error: any) {
      alert('Withdrawal failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">

        <div className="sticky top-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Smart Withdrawal</h2>
            <p className="text-sm text-gray-400">Choose the best option for your EQ tokens</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {isWithdrawalBlocked && (
            <div className="bg-red-500/10 border-2 border-red-500/40 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <Lock className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-red-300">Withdrawal Locked</h3>
                  <p className="text-sm text-gray-300 mt-1">{blockMessage || 'Your account has received bonuses. Withdrawal is restricted until you meet one of the requirements below.'}</p>
                </div>
              </div>

              {bonusReceived > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3 text-sm">
                  <div className="text-yellow-300 font-semibold mb-1">📊 Trading Volume Requirement</div>
                  <div className="text-gray-300">
                    Bonus received: <b>${bonusReceived.toFixed(2)}</b> · Volume needed: <b>${wageringRequired.toFixed(2)}</b><br/>
                    Remaining: <b className="text-white">${wageringRemaining.toFixed(2)}</b>
                  </div>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-3 text-left">
                <div className="text-emerald-300 font-semibold text-sm mb-1">💡 Faster way: Deposit ${depositRequired} USDT</div>
                <div className="text-gray-300 text-xs leading-relaxed mb-2">
                  Don't want to trade? Deposit at least <b>${depositRequired} USDT</b> to unlock withdrawal of your full balance — bonuses included.
                  Current deposits: <b className="text-white">${depositTotal.toFixed(2)}</b> / ${depositRequired}
                  (Remaining: <b className="text-white">${depositRemaining.toFixed(2)}</b>)
                </div>
                <button
                  onClick={() => setShowDepositInfo(v => !v)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-2 rounded-lg text-sm transition-colors"
                >
                  Why do I need to deposit?
                </button>
                {showDepositInfo && (
                  <div className="mt-3 p-3 bg-black/30 rounded text-xs text-gray-300 leading-relaxed">
                    <b className="text-emerald-300">Deposit Requirement Explained</b><br/><br/>
                    All promotional bonuses (Welcome Chest, mining rewards, referral bonuses) are reserved
                    for active customers. To prevent bonus abuse, you must EITHER complete the trading
                    volume requirement OR make a real deposit of at least <b>${depositRequired} USDT</b>.
                    This rule applies to <b>every coin and every withdrawal method</b> — including EQ,
                    USDT, BTC, ETH, and any token you swap into. Once you deposit, the lock is fully
                    removed and your entire balance becomes withdrawable instantly.
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                You can still <b>transfer to Futures</b> and trade to complete the volume requirement.
              </p>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <label className="block text-sm text-gray-400 mb-2">Amount to Withdraw (EQ)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                max={eqBalance}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setWithdrawAmount(eqBalance.toString())}
                className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-semibold transition-colors"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Available: {eqBalance.toFixed(2)} EQ (~${usdtValue.toFixed(2)} USDT)</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">

            <button
              onClick={() => setSelectedOption('futures')}
              className={`relative overflow-hidden group ${
                selectedOption === 'futures'
                  ? 'ring-2 ring-green-500 scale-105'
                  : 'hover:scale-102'
              } transition-all duration-300`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-2 border-green-500/50 rounded-2xl p-6 text-left h-full">

                <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
                  RECOMMENDED
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Transfer to Futures</h3>
                    <p className="text-sm text-green-400 font-semibold flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      +10% BONUS USDT
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Gem className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300">Instant transfer</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">0% fee</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300">First transfer: +5 USDT extra</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">Start trading immediately</span>
                  </div>
                </div>

                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Base Amount:</span>
                      <span className="text-lg font-bold text-white">${usdtValue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-green-400 flex items-center gap-1">
                        <Gem className="w-3 h-3" />
                        10% Bonus:
                      </span>
                      <span className="text-lg font-bold text-green-400">+${futuresBonus.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-green-500/30 pt-2 mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-300 font-semibold">You'll Receive:</span>
                      <span className="text-2xl font-bold text-green-400">${futuresTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-semibold">
                  <span>Minimum: $5 USDT</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedOption('wallet')}
              disabled={isWithdrawalBlocked}
              className={`relative overflow-hidden group ${
                isWithdrawalBlocked ? 'opacity-50 cursor-not-allowed' :
                selectedOption === 'wallet'
                  ? 'ring-2 ring-gray-500 scale-105'
                  : 'hover:scale-102 opacity-75 hover:opacity-100'
              } transition-all duration-300`}
            >
              <div className="relative bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-2 border-gray-500/30 rounded-2xl p-6 text-left h-full">

                {isWithdrawalBlocked && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    LOCKED
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gray-500/20 rounded-xl">
                    {isWithdrawalBlocked ? (
                      <Lock className="w-8 h-8 text-red-400" />
                    ) : (
                      <Wallet className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Withdraw to Wallet</h3>
                    {isWithdrawalBlocked ? (
                      <p className="text-sm text-red-400 font-semibold flex items-center gap-1">
                        <Lock className="w-4 h-4" />
                        Tier {currentTier}/5 - Locked
                      </p>
                    ) : (
                      <p className="text-sm text-red-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        -5% Fee Applied
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400">5-30 minute wait</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-gray-400">5% withdrawal fee</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Minimum: $10 USDT</span>
                  </div>
                </div>

                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Base Amount:</span>
                      <span className="text-lg font-bold text-white">${usdtValue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        5% Fee:
                      </span>
                      <span className="text-lg font-bold text-red-400">-${walletFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-500/30 pt-2 mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-300 font-semibold">You'll Receive:</span>
                      <span className="text-2xl font-bold text-gray-300">${walletTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <span>Network: ERC-20</span>
                </div>
              </div>
            </button>
          </div>

          {selectedOption && withdrawAmount && parseFloat(withdrawAmount) > 0 && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">You're withdrawing:</p>
                  <p className="text-2xl font-bold text-white">{parseFloat(withdrawAmount).toFixed(2)} EQ</p>
                </div>
                <ArrowRight className="w-8 h-8 text-blue-400" />
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">You'll receive:</p>
                  <p className="text-2xl font-bold" style={{ color: selectedOption === 'futures' ? '#10b981' : '#9ca3af' }}>
                    ${(selectedOption === 'futures' ? futuresTotal : walletTotal).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedOption === 'futures' ? 'in Futures balance' : 'in Wallet'}
                  </p>
                </div>
              </div>

              <button
                onClick={selectedOption === 'futures' ? handleTransferToFutures : handleWithdrawToWallet}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
                  selectedOption === 'futures'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {isProcessing ? 'Processing...' : selectedOption === 'futures' ? 'Transfer to Futures' : 'Withdraw to Wallet'}
              </button>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
            <p className="text-sm text-yellow-400">
              <span className="font-bold">Smart Tip:</span> Transferring to Futures gives you 10% extra USDT and you can start trading immediately!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}