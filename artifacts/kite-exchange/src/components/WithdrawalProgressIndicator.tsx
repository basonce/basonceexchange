import { CheckCircle, Lock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUserTierInfo } from '../lib/withdrawal-permission';
import { supabase, getCurrentUser } from '../lib/supabase';

interface TierEquipment {
  tier: number;
  name: string;
  price: number;
}

export function WithdrawalProgressIndicator() {
  const [highestTier, setHighestTier] = useState(0);
  const [ownedTiers, setOwnedTiers] = useState<number[]>([]);
  const [equipmentData, setEquipmentData] = useState<TierEquipment[]>([]);

  useEffect(() => {
    loadUserSession();
    loadEquipmentData();
  }, []);

  const loadUserSession = async () => {
    const user = await getCurrentUser();
    if (user) {
      loadTierInfo(user.id);
    }
  };

  const loadTierInfo = async (uid: string) => {
    const tierInfo = await getUserTierInfo(uid);
    setHighestTier(tierInfo.highestTier);
    setOwnedTiers(tierInfo.ownedTiers.map(t => t.tier));
  };

  const loadEquipmentData = async () => {
    const { data } = await supabase
      .from('mining_equipment_types')
      .select('level, name, price')
      .order('level', { ascending: true });

    if (data) {
      const mappedData: TierEquipment[] = data.map((item) => ({
        tier: item.level,
        name: item.name,
        price: item.price,
      }));

      setEquipmentData(mappedData);
    }
  };

  const hasTier = (tier: number) => ownedTiers.includes(tier);

  const isComplete = highestTier >= 5;

  return (
    <div className="relative bg-[#1E2329] border border-[#2B3139] rounded-xl p-4 shadow-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Withdrawal Progress</h3>
        </div>

        <div className="space-y-2">
          {equipmentData.filter(eq => eq.tier > 0).map((item) => {
            const owned = hasTier(item.tier);

            return (
              <div
                key={item.tier}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  owned
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-[#2B3139] border border-gray-700'
                }`}
              >
                {owned ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${owned ? 'text-emerald-400' : 'text-gray-400'}`}>
                    Tier {item.tier}: {item.name}
                  </div>
                </div>

                <div className={`text-sm font-semibold ${owned ? 'text-emerald-400' : 'text-gray-300'}`}>
                  {owned ? 'Owned' : `$${item.price.toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400">Progress to full withdrawal access</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{highestTier}/5 Complete</span>
                {isComplete ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>
            <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden">
              <div
                className={`h-full ${isComplete ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-yellow-500 to-amber-500'} transition-all duration-1000`}
                style={{ width: `${(highestTier / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className={`p-3 rounded-lg border ${isComplete ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
            <div className={`text-xs leading-relaxed ${isComplete ? 'text-emerald-300' : 'text-amber-300'}`}>
              {isComplete
                ? 'Withdrawal unlocked! You can now withdraw your earnings.'
                : 'Withdraw money after reaching Tier 5. Keep upgrading your equipment to unlock full access.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
