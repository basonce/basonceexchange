import { X, TrendingUp, Zap, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MiningUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShopClick: () => void;
  totalEarned: number;
}

interface ShopItem {
  id: string;
  name: string;
  price: number;
  hash_rate: number;
  daily_earning: number;
  icon: string;
  badge: string | null;
  withdrawal_limit: number;
}

export default function MiningUpgradeModal({ isOpen, onClose, onShopClick, totalEarned }: MiningUpgradeModalProps) {
  const [recommendedItem, setRecommendedItem] = useState<ShopItem | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [minWithdrawalLimit, setMinWithdrawalLimit] = useState(500);

  useEffect(() => {
    if (isOpen) {
      loadRecommendation();
    }
  }, [isOpen]);

  const loadRecommendation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: balance } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .eq('symbol', 'USDT')
      .maybeSingle();

    if (balance) {
      setUserBalance(Number(balance.balance || 0));
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('minimum_withdrawal_limit')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      setMinWithdrawalLimit(Number(profile.minimum_withdrawal_limit || 500));
    }

    const { data: items } = await supabase
      .from('mining_equipment_types')
      .select('*')
      .eq('level', 1)
      .eq('is_free', false)
      .maybeSingle();

    if (items) {
      setRecommendedItem(items);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
      <div className="bg-gradient-to-br from-[#1A1B23] to-[#0D0E12] border-2 border-[#F0B90B] rounded-t-2xl sm:rounded-2xl max-w-md w-full pb-24 sm:pb-6 p-6 relative max-h-screen overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">FREE Trial Complete!</h2>
          <p className="text-gray-400">Your 3-hour free mining session has ended</p>
        </div>

        <div className="bg-[#0D0E12]/60 border border-[#2B3139] rounded-xl p-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Total Earned This Session</div>
            <div className="text-4xl font-bold text-emerald-400 mb-1">
              ${totalEarned.toFixed(2)}
            </div>
            <div className="text-lg text-[#F0B90B]">
              {(totalEarned * 4).toFixed(2)} EQ
            </div>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
          <div className="text-center space-y-2">
            <div className="text-sm text-orange-200">
              ⚠️ <strong>Cannot Withdraw Yet!</strong>
            </div>
            <div className="text-xs text-gray-400">
              Minimum withdrawal: <span className="text-white font-bold">${minWithdrawalLimit.toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-400">
              You need: <span className="text-orange-300 font-bold">${(minWithdrawalLimit - totalEarned).toFixed(2)} more</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#F0B90B]/10 to-transparent border border-[#F0B90B]/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-[#F0B90B]" />
            <span className="text-sm font-bold text-white">✅ Recommended: Level 1 Upgrade</span>
          </div>

          {recommendedItem ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{recommendedItem.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-white">{recommendedItem.name}</div>
                  <div className="text-sm text-gray-400">
                    {recommendedItem.hash_rate} TH/s • ${recommendedItem.daily_earning}/day
                  </div>
                </div>
                {recommendedItem.badge && (
                  <span className="text-xs bg-[#F0B90B] text-black px-2 py-1 rounded font-bold">
                    {recommendedItem.badge}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[#0D0E12]/60 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Price</div>
                  <div className="text-lg font-bold text-white">
                    ${recommendedItem.price}
                  </div>
                </div>
                <div className="bg-[#0D0E12]/60 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Can Earn</div>
                  <div className="text-lg font-bold text-emerald-400">
                    ${(recommendedItem.daily_earning * 3).toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mb-3">
                <div className="text-xs text-green-200 text-center">
                  ✅ Unlocks <strong>${recommendedItem.withdrawal_limit.toLocaleString()}</strong> withdrawal limit
                </div>
              </div>

              <div className="text-xs text-center text-gray-500">
                Your balance: ${userBalance.toFixed(2)} USDT
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400">Loading recommendations...</div>
          )}
        </div>

        <button
          onClick={onShopClick}
          className="w-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535] text-black font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-[#F0B90B]/30 transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          Browse Mining Shop
        </button>

        <button
          onClick={onClose}
          className="w-full bg-[#2B3139] text-white font-bold py-3 rounded-xl hover:bg-[#3B4149] transition-all mt-3"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
