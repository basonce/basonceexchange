import { useState, useEffect } from 'react';
import { X, ArrowDownUp, Lock } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { checkWithdrawalPermission } from '../lib/withdrawal-permission';

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

    if (isBlocked && fromCurrency === 'EQ') {
      alert('EQ to USDT swap is locked. Please upgrade to Tier 5 to unlock.');
      return;
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
