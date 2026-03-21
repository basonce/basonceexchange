import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TPSLModalProps {
  positionId: string;
  currentPrice: number;
  side: 'long' | 'short';
  onClose: () => void;
  onSave: (tp: number | null, sl: number | null) => void;
  existingTP?: number;
  existingSL?: number;
}

export default function TPSLModal({
  positionId,
  currentPrice,
  side,
  onClose,
  onSave,
  existingTP,
  existingSL
}: TPSLModalProps) {
  const [takeProfit, setTakeProfit] = useState(existingTP?.toString() || '');
  const [stopLoss, setStopLoss] = useState(existingSL?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);

  const calculateProfitLoss = (price: number) => {
    const diff = side === 'long' ? price - currentPrice : currentPrice - price;
    const percentage = (diff / currentPrice) * 100;
    return percentage;
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (takeProfit) {
        await supabase.from('futures_tpsl_orders').upsert({
          user_id: user.id,
          position_id: positionId,
          type: 'tp',
          trigger_price: parseFloat(takeProfit),
          order_price: parseFloat(takeProfit),
          quantity: 0,
          status: 'active'
        });
      }

      if (stopLoss) {
        await supabase.from('futures_tpsl_orders').upsert({
          user_id: user.id,
          position_id: positionId,
          type: 'sl',
          trigger_price: parseFloat(stopLoss),
          order_price: parseFloat(stopLoss),
          quantity: 0,
          status: 'active'
        });
      }

      onSave(
        takeProfit ? parseFloat(takeProfit) : null,
        stopLoss ? parseFloat(stopLoss) : null
      );
      onClose();
    } catch (error) {
      console.error('Error saving TP/SL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-[60]" onClick={onClose}>
      <div className="bg-[#181A20] w-full rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-base">Take Profit / Stop Loss</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-[#2B3139] rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Mark Price</span>
              <span className="text-white font-medium">{currentPrice.toFixed(2)} USDT</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Take Profit</label>
            <div className="relative">
              <input
                type="text"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#2B3139] border border-[#2B3139] rounded px-3 py-2.5 text-sm focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                USDT
              </div>
            </div>
            {takeProfit && parseFloat(takeProfit) > 0 && (
              <div className="mt-1.5 text-xs">
                <span className="text-gray-400">Est. Profit: </span>
                <span className={calculateProfitLoss(parseFloat(takeProfit)) > 0 ? 'text-[#00FF7F]' : 'text-[#F6465D]'}>
                  {calculateProfitLoss(parseFloat(takeProfit)).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Stop Loss</label>
            <div className="relative">
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#2B3139] border border-[#2B3139] rounded px-3 py-2.5 text-sm focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                USDT
              </div>
            </div>
            {stopLoss && parseFloat(stopLoss) > 0 && (
              <div className="mt-1.5 text-xs">
                <span className="text-gray-400">Est. Loss: </span>
                <span className={calculateProfitLoss(parseFloat(stopLoss)) > 0 ? 'text-[#00FF7F]' : 'text-[#F6465D]'}>
                  {calculateProfitLoss(parseFloat(stopLoss)).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          <div className="bg-[#2B3139] rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="text-xs mt-0.5">💡</div>
              <div className="text-xs leading-relaxed">
                {side === 'long'
                  ? 'For long positions: TP > Mark Price, SL < Mark Price'
                  : 'For short positions: TP < Mark Price, SL > Mark Price'
                }
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading || (!takeProfit && !stopLoss)}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#181A20] font-semibold rounded transition-all disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
