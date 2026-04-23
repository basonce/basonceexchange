import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { TradingService } from '../lib/trading-service';
import { getCachedCustomFeePct } from '../lib/user-restrictions';
import { supabase, getCurrentUser } from '../lib/supabase';

interface QuickTradeModalProps {
  symbol: string;
  currentPrice: number;
  onClose: () => void;
  defaultSide?: 'buy' | 'sell';
}

export default function QuickTradeModal({ symbol, currentPrice, onClose, defaultSide = 'buy' }: QuickTradeModalProps) {
  const [side, setSide] = useState<'buy' | 'sell'>(defaultSide);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: balances } = await supabase
        .from('user_balances')
        .select('symbol, balance')
        .eq('user_id', user.id)
        .in('symbol', ['USDT', symbol]);

      if (balances) {
        const usdt = balances.find(b => b.symbol === 'USDT');
        const coin = balances.find(b => b.symbol === symbol);
        setUsdtBalance(parseFloat(usdt?.balance || '0'));
        setCoinBalance(parseFloat(coin?.balance || '0'));
      }
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const numValue = parseFloat(value) || 0;
    const calculatedQty = numValue / currentPrice;
    setQuantity(calculatedQty.toFixed(8));
    setError('');
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const numValue = parseFloat(value) || 0;
    const calculatedAmount = numValue * currentPrice;
    setAmount(calculatedAmount.toFixed(2));
    setError('');
  };

  const handlePercentage = (percent: number) => {
    if (side === 'buy') {
      const amt = (usdtBalance * percent) / 100;
      handleAmountChange(amt.toFixed(2));
    } else {
      const qty = (coinBalance * percent) / 100;
      handleQuantityChange(qty.toFixed(8));
    }
  };

  const handleTrade = async () => {
    setError('');
    setSuccess('');

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (side === 'buy' && parseFloat(amount) > usdtBalance) {
      setError('Insufficient USDT balance');
      return;
    }

    if (side === 'sell' && qty > coinBalance) {
      setError(`Insufficient ${symbol} balance`);
      return;
    }

    setLoading(true);

    try {
      console.log('🎯 Starting trade:', { symbol, side, currentPrice, qty, usdtBalance, coinBalance });

      const result = await TradingService.executeTrade(
        symbol,
        side,
        currentPrice,
        qty
      );

      console.log('📦 Trade result:', result);

      if (result.success) {
        setSuccess(`${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${symbol} successfully!`);
        setAmount('');
        setQuantity('');
        await loadBalances();

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        console.error('❌ Trade failed:', result.error);
        setError(result.error || 'Trade failed');
      }
    } catch (err: any) {
      console.error('💥 Trade exception:', err);
      setError(err.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const maxBalance = side === 'buy' ? usdtBalance : coinBalance;
  const balanceLabel = side === 'buy' ? 'USDT' : symbol;
  const total = parseFloat(amount) || 0;
  const _customPct = getCachedCustomFeePct();
  const _feeRate = _customPct > 0 ? _customPct / 100 : 0.001;
  const fee = total * _feeRate;
  const finalTotal = side === 'buy' ? total + fee : total - fee;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-gray-800">
          <h3 className="font-bold text-white">Quick Trade - {symbol}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${ side === 'buy' ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700' }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${ side === 'sell' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700' }`}
            >
              <TrendingDown className="w-5 h-5 inline mr-2" />
              Sell
            </button>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-400">Price (USDT)</label>
              <span className="text-white font-mono">{currentPrice.toFixed(2)}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-white font-mono">
              {currentPrice.toLocaleString()} USDT
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-400">Amount (USDT)</label>
              <span className="text-gray-400">
                Balance: {maxBalance.toFixed(side === 'buy' ? 2 : 8)} {balanceLabel}
              </span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-400">Quantity ({symbol})</label>
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0.00000000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {[25, 50, 75, 100].map(percent => (
              <button
                key={percent}
                onClick={() => handlePercentage(percent)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                {percent}%
              </button>
            ))}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-mono">{total.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Fee (0.1%)</span>
              <span className="text-white font-mono">{fee.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-gray-700">
              <span className="text-gray-400 font-semibold">Final Total</span>
              <span className="text-white font-semibold">{finalTotal.toFixed(2)} USDT</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleTrade}
            disabled={loading || !quantity}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${ side === 'buy' ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30' } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}
