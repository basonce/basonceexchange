import { useState, useEffect } from 'react';
import { X, ChevronRight, ArrowDownUp, Info } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState<'spot' | 'futures'>('spot');
  const [to, setTo] = useState<'spot' | 'futures'>('futures');
  const [spotBalance, setSpotBalance] = useState(0);
  const [futuresBalance, setFuturesBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBalances();
    }
  }, [isOpen]);

  const fetchBalances = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('user_balances')
        .select('balance, futures_balance')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();

      console.log('Transfer Modal - Fetched balances:', data, 'Error:', error);

      if (data) {
        setSpotBalance(parseFloat(data.balance || '0'));
        setFuturesBalance(parseFloat(data.futures_balance || '0'));
      } else {
        console.log('No balance data found, using 0');
        setSpotBalance(0);
        setFuturesBalance(0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setSpotBalance(0);
      setFuturesBalance(0);
    }
  };

  const switchDirection = () => {
    const tempFrom = from;
    setFrom(to);
    setTo(tempFrom);
    setAmount('');
  };

  const handleTransfer = async () => {
    try {
      setLoading(true);
      const transferAmount = parseFloat(amount);

      if (!transferAmount || transferAmount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const availableBalance = from === 'spot' ? spotBalance : futuresBalance;
      if (transferAmount > availableBalance) {
        alert('Insufficient balance');
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        alert('Please log in');
        return;
      }

      const newSpotBalance = from === 'spot'
        ? spotBalance - transferAmount
        : spotBalance + transferAmount;

      const newFuturesBalance = from === 'futures'
        ? futuresBalance - transferAmount
        : futuresBalance + transferAmount;

      console.log('Updating balances:', {
        spotBalance: spotBalance,
        futuresBalance: futuresBalance,
        transferAmount,
        newSpotBalance,
        newFuturesBalance,
        from,
        to
      });

      const { data: updateData, error } = await supabase
        .from('user_balances')
        .update({
          balance: newSpotBalance,
          futures_balance: newFuturesBalance
        })
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .select();

      console.log('Update result:', { updateData, error });

      if (error) throw error;

      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'transfer',
          symbol: 'USDT',
          amount: transferAmount,
          status: 'completed',
          description: `Transfer from ${from === 'spot' ? 'Spot Wallet' : 'USD©-M Futures'} to ${to === 'spot' ? 'Spot Wallet' : 'USD©-M Futures'}`
        });

      setAmount('');
      await fetchBalances();
      alert('Transfer successful!');
      onClose();
    } catch (error: any) {
      console.error('Error transferring:', error);
      alert(error.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const availableBalance = from === 'spot' ? spotBalance : futuresBalance;
  const canTransfer = parseFloat(amount || '0') > 0 && parseFloat(amount || '0') <= availableBalance;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#181A20] z-50 max-w-[480px] mx-auto">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2B3139]">
          <button onClick={onClose} className="text-[#EAECEF] hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-[#EAECEF]">Transfer</h1>
          <button className="text-[#848E9C] hover:text-[#EAECEF] transition-colors">
            <Info className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-[#2B3139] rounded-xl mb-6">
            <button className="w-full flex items-center justify-between p-4 hover:bg-[#363D47] transition-colors border-b border-[#1E2329] group">
              <span className="text-sm text-[#848E9C] font-medium">From</span>
              <div className="flex items-center gap-2">
                <span className="text-[#EAECEF] font-semibold text-base">
                  {from === 'spot' ? 'Spot Wallet' : 'USDC-M Futures'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#848E9C] group-hover:text-[#EAECEF] transition-colors" />
              </div>
            </button>

            <button
              onClick={switchDirection}
              className="flex items-center justify-center py-3 w-full hover:bg-[#363D47] transition-colors border-b border-[#1E2329] group"
            >
              <div className="w-8 h-8 rounded-full bg-[#1E2329] flex items-center justify-center group-hover:bg-[#2B3139] transition-colors">
                <ArrowDownUp className="w-4 h-4 text-[#848E9C] group-hover:text-[#F0B90B] transition-colors" />
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-[#363D47] transition-colors group">
              <span className="text-sm text-[#848E9C] font-medium">To</span>
              <div className="flex items-center gap-2">
                <span className="text-[#EAECEF] font-semibold text-base">
                  {to === 'spot' ? 'Spot Wallet' : 'USDC-M Futures'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#848E9C] group-hover:text-[#EAECEF] transition-colors" />
              </div>
            </button>
          </div>

          <div className="mb-6">
            <label className="text-sm text-[#848E9C] font-medium mb-2 block">Coin</label>
            <button className="w-full bg-[#2B3139] rounded-xl p-4 flex items-center justify-between hover:bg-[#363D47] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#26A17B] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-white text-lg">₮</span>
                </div>
                <div className="text-left">
                  <div className="text-[#EAECEF] font-semibold text-base">USDT</div>
                  <div className="text-xs text-[#848E9C]">TetherUS</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#848E9C] group-hover:text-[#EAECEF] transition-colors flex-shrink-0" />
            </button>
            {availableBalance === 0 && (
              <p className="text-xs text-[#848E9C] mt-2">
                No amount available to transfer, please select another coin.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="text-sm text-[#848E9C] font-medium mb-2 block">Amount</label>
            <div className="bg-[#2B3139] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="bg-transparent text-2xl text-[#EAECEF] font-semibold outline-none flex-1 min-w-0"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[#EAECEF] font-semibold text-sm">USDT</span>
                  <button
                    onClick={() => setAmount(availableBalance.toString())}
                    className="bg-[#F0B90B] text-[#181A20] font-semibold px-3 py-1 rounded text-xs hover:bg-[#F0B90B]/90 transition-colors whitespace-nowrap"
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#848E9C]">
                <span>Available</span>
                <span className="text-[#EAECEF] font-medium">{availableBalance.toFixed(2)} USDT</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleTransfer}
            disabled={!canTransfer || loading}
            className={`w-full font-semibold text-base py-4 rounded-xl transition-all ${ canTransfer && !loading ? 'bg-[#F0B90B] text-[#181A20] hover:bg-[#F0B90B]/90 active:scale-[0.98]' : 'bg-[#474D57] text-[#707A8A] cursor-not-allowed' }`}
          >
            {loading ? 'Processing...' : 'Confirm Transfer'}
          </button>

          <div className="h-24"></div>
        </div>
      </div>
    </div>
  );
}
