import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRightLeft } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface AssetsOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: () => void;
}

export default function AssetsOverview({ isOpen, onClose, onTransfer }: AssetsOverviewProps) {
  const [hideBalance, setHideBalance] = useState(false);
  const [spotBalance, setSpotBalance] = useState(0);
  const [futuresBalance, setFuturesBalance] = useState(0);
  const [unrealizedPnL, setUnrealizedPnL] = useState(0);
  const [todayPnL, setTodayPnL] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchBalances();
    }
  }, [isOpen]);

  const fetchBalances = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: balances } = await supabase
        .from('user_balances')
        .select('amount, futures_balance')
        .eq('user_id', user.id)
        .eq('coin_symbol', 'USDT')
        .maybeSingle();

      if (balances) {
        setSpotBalance(balances.amount || 0);
        setFuturesBalance(balances.futures_balance || 0);
      }

      const { data: positions } = await supabase
        .from('futures_positions')
        .select('unrealized_pnl')
        .eq('user_id', user.id)
        .eq('status', 'open');

      if (positions) {
        const total = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
        setUnrealizedPnL(total);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: dailyPnL } = await supabase
        .from('daily_pnl_history')
        .select('realized_pnl, unrealized_pnl')
        .eq('user_id', user.id)
        .gte('date', today.toISOString())
        .maybeSingle();

      if (dailyPnL) {
        setTodayPnL((dailyPnL.realized_pnl || 0) + (dailyPnL.unrealized_pnl || 0));
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const totalBalance = spotBalance + futuresBalance + unrealizedPnL;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center z-50 items-center">
      <div className="bg-[#181A20] w-full max-h-[80vh] overflow-y-auto rounded-xl">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] p-4 flex items-center justify-between">
          <h2 className="text-white font-semibold">Assets Overview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-[#2B3139] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs">Total Balance (USDT)</span>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="text-gray-400 hover:text-white"
              >
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="font-bold text-white">
              {hideBalance ? '****.**' : totalBalance.toFixed(2)}
            </div>
            <div className="text-gray-400 mt-1">
              ≈ ${hideBalance ? '****.**' : totalBalance.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#2B3139] rounded-lg p-3">
              <div className="text-xs mb-1">Today's PnL</div>
              <div className={`text-lg font-bold ${todayPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {hideBalance ? '****' : `${todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}`}
              </div>
            </div>

            <div className="bg-[#2B3139] rounded-lg p-3">
              <div className="text-xs mb-1">Unrealized PnL</div>
              <div className={`text-lg font-bold ${unrealizedPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {hideBalance ? '****' : `${unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-[#2B3139] rounded-lg">
              <div>
                <div className="text-sm font-medium">Spot Wallet</div>
                <div className="text-xs mt-0.5">Available for trading</div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">
                  {hideBalance ? '****.**' : spotBalance.toFixed(2)} USDT
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#2B3139] rounded-lg">
              <div>
                <div className="text-sm font-medium">Futures Wallet</div>
                <div className="text-xs mt-0.5">Available margin</div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">
                  {hideBalance ? '****.**' : futuresBalance.toFixed(2)} USDT
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onTransfer();
            }}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#181C23] font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer
          </button>

          <div className="bg-[#2B3139] rounded-lg p-3">
            <div className="text-xs font-medium mb-2">Account Summary</div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Equity</span>
                <span className="text-white">{hideBalance ? '****.**' : totalBalance.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Available Balance</span>
                <span className="text-white">{hideBalance ? '****.**' : (spotBalance + futuresBalance).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unrealized PnL</span>
                <span className={unrealizedPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {hideBalance ? '****' : `${unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}`} USDT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
