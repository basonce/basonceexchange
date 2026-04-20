import { useState, useEffect } from 'react';
import { X, ArrowDownUp, Lock } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { checkWithdrawalPermission } from '../lib/withdrawal-permission';
import { getUserRestrictions } from '../lib/user-restrictions';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState<'EQ' | 'USDT'>('EQ');
  const [toCurrency, setToCurrency] = useState<'EQ' | 'USDT'>('USDT');
  const [eqBalance, setEqBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [exchangeRate] = useState(0.10);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [currentTier, setCurrentTier] = useState(0);
  const [bonusReceived, setBonusReceived] = useState(0);
  const [wageringRequired, setWageringRequired] = useState(0);
  const [wageringRemaining, setWageringRemaining] = useState(0);
  const [depositTotal, setDepositTotal] = useState(0);
  const [depositRequired, setDepositRequired] = useState(200);
  const [depositRemaining, setDepositRemaining] = useState(200);
  const [showDepositInfo, setShowDepositInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBalances();
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
      setIsBlocked(true);
      setBlockMessage(permission.message || '');
      setCurrentTier(permission.currentTier);
    }
  };

  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const amount = parseFloat(fromAmount);
      if (fromCurrency === 'EQ') {
        setToAmount((amount * exchangeRate).toFixed(2));
      } else {
        setToAmount((amount / exchangeRate).toFixed(2));
      }
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromCurrency, exchangeRate]);

  const loadBalances = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: balances } = await supabase
      .from('user_balances')
      .select('eq_balance, usdt_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (balances) {
      setEqBalance(balances.eq_balance || 0);
      setUsdtBalance(balances.usdt_balance || 0);
    }
  };

  const switchCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;

    if (isBlocked) {
      alert('Swap is locked. Complete the trading volume requirement OR deposit at least $' + depositRequired + ' USDT to unlock all swaps and withdrawals.');
      return;
    }

    if (fromCurrency === 'EQ') {
      const user = await getCurrentUser();
      if (user) {
        const restrictions = await getUserRestrictions(user.id);
        if (restrictions?.usdt_frozen) {
          alert('Your USDT balance is currently frozen. You cannot convert EQ to USDT. Please contact support to deposit funds directly.');
          return;
        }
      }
    }

    const amount = parseFloat(fromAmount);
    const targetAmount = parseFloat(toAmount);

    if (fromCurrency === 'EQ' && amount > eqBalance) {
      alert('Insufficient EQ balance');
      return;
    }
    if (fromCurrency === 'USDT' && amount > usdtBalance) {
      alert('Insufficient USDT balance');
      return;
    }

    setIsSwapping(true);

    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: currentBalance } = await supabase
        .from('user_balances')
        .select('eq_balance, usdt_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!currentBalance) return;

      let newEqBalance = currentBalance.eq_balance;
      let newUsdtBalance = currentBalance.usdt_balance;

      if (fromCurrency === 'EQ') {
        newEqBalance -= amount;
        newUsdtBalance += targetAmount;
      } else {
        newUsdtBalance -= amount;
        newEqBalance += targetAmount;
      }

      const { error } = await supabase
        .from('user_balances')
        .update({
          eq_balance: newEqBalance,
          usdt_balance: newUsdtBalance
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'swap',
        coin_symbol: fromCurrency,
        amount: -amount,
        status: 'completed'
      });

      await loadBalances();
      setFromAmount('');
      setToAmount('');
      alert(`Successfully swapped ${amount} ${fromCurrency} to ${targetAmount} ${toCurrency}`);
    } catch (error) {
      console.error('Swap error:', error);
      alert('Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1B23] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1A1B23] border-b border-[#2B3139] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Swap</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isBlocked && (
            <div className="bg-red-500/10 border-2 border-red-500/40 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-3">
                <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-300">Withdrawal & Swap Locked</h3>
                  <p className="text-xs text-gray-300 mt-1">{blockMessage || 'Your account has received bonuses. Conversion to USDT is restricted until you meet one of the requirements below.'}</p>
                </div>
              </div>
              {bonusReceived > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 mb-2 text-xs">
                  <div className="text-yellow-300 font-semibold mb-0.5">📊 Volume Requirement</div>
                  <div className="text-gray-300">
                    Bonus: <b>${bonusReceived.toFixed(2)}</b> · Need: <b>${wageringRequired.toFixed(2)}</b> · Remaining: <b className="text-white">${wageringRemaining.toFixed(2)}</b>
                  </div>
                </div>
              )}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
                <div className="text-emerald-300 font-semibold text-xs mb-1">💡 Faster: Deposit ${depositRequired} USDT</div>
                <div className="text-gray-300 text-[11px] leading-relaxed mb-2">
                  Deposit at least <b>${depositRequired} USDT</b> to unlock all withdrawals and swaps.
                  Current: <b className="text-white">${depositTotal.toFixed(2)}</b> / ${depositRequired}
                  (Remaining: <b className="text-white">${depositRemaining.toFixed(2)}</b>)
                </div>
                <button
                  onClick={() => setShowDepositInfo(v => !v)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-1.5 rounded text-xs transition-colors"
                >
                  Why do I need to deposit?
                </button>
                {showDepositInfo && (
                  <div className="mt-2 p-2 bg-black/30 rounded text-[11px] text-gray-300 leading-relaxed">
                    All bonuses are reserved for active customers. To withdraw or convert bonus
                    funds, you must EITHER complete the trading volume requirement OR deposit at
                    least <b>${depositRequired} USDT</b>. This rule applies to <b>every coin</b> —
                    EQ, USDT, BTC, ETH, and any token you swap into. Once you deposit, the lock is
                    fully removed.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-[#0D0E12] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">From</span>
              <span className="text-gray-400 text-sm">
                Balance: {fromCurrency === 'EQ' ? eqBalance.toFixed(2) : usdtBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-2xl font-bold outline-none"
              />
              <div className="flex items-center gap-2 bg-[#1A1B23] px-4 py-2 rounded-lg">
                {fromCurrency === 'EQ' ? (
                  <img src="/earnquest-logo-icon-2.png" alt="EQ" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    $
                  </div>
                )}
                <span className="text-white font-bold">{fromCurrency}</span>
              </div>
            </div>
            <button
              onClick={() => setFromAmount(fromCurrency === 'EQ' ? eqBalance.toString() : usdtBalance.toString())}
              className="text-[#F0B90B] text-sm mt-2 hover:underline"
            >
              Max
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={switchCurrencies}
              className="w-10 h-10 bg-[#2B3139] hover:bg-[#3B4149] rounded-full flex items-center justify-center transition-colors"
            >
              <ArrowDownUp className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="bg-[#0D0E12] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">To</span>
              <span className="text-gray-400 text-sm">
                Balance: {toCurrency === 'EQ' ? eqBalance.toFixed(2) : usdtBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-2xl font-bold outline-none"
              />
              <div className="flex items-center gap-2 bg-[#1A1B23] px-4 py-2 rounded-lg">
                {toCurrency === 'EQ' ? (
                  <img src="/earnquest-logo-icon-2.png" alt="EQ" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    $
                  </div>
                )}
                <span className="text-white font-bold">{toCurrency}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#2B3139]/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Exchange Rate</span>
              <span className="text-white font-medium">
                1 EQ = {exchangeRate.toFixed(2)} USDT
              </span>
            </div>
          </div>

          <button
            onClick={handleSwap}
            disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  );
}
