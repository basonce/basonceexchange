import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { canAddMargin, canReduceMargin, getMaintenanceMarginRate } from '../lib/futures-calculator';

interface MarginAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    symbol: string;
    margin: number;
    leverage: number;
    margin_mode: string;
  };
  availableBalance: number;
  onSuccess: () => void;
}

export default function MarginAdjustModal({
  isOpen,
  onClose,
  position,
  availableBalance,
  onSuccess
}: MarginAdjustModalProps) {
  const [adjustType, setAdjustType] = useState<'add' | 'reduce'>('add');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdjust = async () => {
    try {
      setLoading(true);

      const adjustAmount = parseFloat(amount);
      if (!adjustAmount || adjustAmount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      if (adjustType === 'add') {
        const validation = canAddMargin(position.id, adjustAmount, availableBalance);
        if (!validation.valid) {
          alert(validation.error);
          return;
        }

        const newMargin = position.margin + adjustAmount;

        const { error: positionError } = await supabase
          .from('futures_positions')
          .update({ margin: newMargin })
          .eq('id', position.id);

        if (positionError) throw positionError;

        const user = await getCurrentUser();
        if (!user) return;

        const { error: balanceError } = await supabase
          .from('user_balances')
          .update({
            futures_balance: availableBalance - adjustAmount
          })
          .eq('user_id', user.id)
          .eq('symbol', 'USDT');

        if (balanceError) throw balanceError;

        alert(`Successfully added ${adjustAmount} USDT margin`);
      } else {
        const maintenanceMarginRate = getMaintenanceMarginRate(position.symbol);
        const validation = canReduceMargin(
          position.margin,
          adjustAmount,
          position.leverage,
          maintenanceMarginRate
        );

        if (!validation.valid) {
          alert(validation.error);
          return;
        }

        const newMargin = position.margin - adjustAmount;

        const { error: positionError } = await supabase
          .from('futures_positions')
          .update({ margin: newMargin })
          .eq('id', position.id);

        if (positionError) throw positionError;

        const user = await getCurrentUser();
        if (!user) return;

        const { data: currentBalance } = await supabase
          .from('user_balances')
          .select('futures_balance')
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();

        const newBalance = parseFloat(currentBalance?.futures_balance || '0') + adjustAmount;

        const { error: balanceError } = await supabase
          .from('user_balances')
          .update({
            futures_balance: newBalance
          })
          .eq('user_id', user.id)
          .eq('symbol', 'USDT');

        if (balanceError) throw balanceError;

        alert(`Successfully reduced ${adjustAmount} USDT margin`);
      }

      onSuccess();
      onClose();
      setAmount('');
    } catch (error) {
      console.error('Error adjusting margin:', error);
      alert('Failed to adjust margin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1a1d28] rounded-xl max-w-md w-full border border-gray-800">
        <div className="flex items-center justify-between p-6 border-gray-800">
          <div>
            <h2 className="font-bold text-white">Adjust Margin</h2>
            <p className="text-gray-400 mt-1">
              {position.symbol} - {position.margin_mode.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setAdjustType('add')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${ adjustType === 'add' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700' }`}
            >
              <Plus className="w-4 h-4" />
              Add Margin
            </button>
            <button
              onClick={() => setAdjustType('reduce')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${ adjustType === 'reduce' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700' }`}
            >
              <Minus className="w-4 h-4" />
              Reduce Margin
            </button>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">
              Current Margin
            </label>
            <div className="text-white font-medium">
              {position.margin.toFixed(2)} USDT
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">
              Available Balance
            </label>
            <div className="text-white font-medium">
              {availableBalance.toFixed(2)} USDT
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">
              Amount (USDT)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">New Margin</span>
              <span className="text-white font-medium">
                {amount && parseFloat(amount) > 0
                  ? (adjustType === 'add'
                      ? position.margin + parseFloat(amount)
                      : position.margin - parseFloat(amount)
                    ).toFixed(2)
                  : position.margin.toFixed(2)}{' '}
                USDT
              </span>
            </div>
          </div>

          <button
            onClick={handleAdjust}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${ adjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700' } text-white disabled:opacity-50`}
          >
            {loading ? 'Processing...' : adjustType === 'add' ? 'Add Margin' : 'Reduce Margin'}
          </button>
        </div>
      </div>
    </div>
  );
}
