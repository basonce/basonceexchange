import { X, Lock, TrendingUp, DollarSign } from 'lucide-react';

interface ForcedUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  lockedAmount: number;
  requiredTier: string;
  requiredPrice: number;
}

export default function ForcedUpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  lockedAmount,
  requiredTier,
  requiredPrice
}: ForcedUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-[#1A1B23] to-[#0D0E12] rounded-2xl max-w-md w-full border border-red-500/30 shadow-2xl shadow-red-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Earnings Locked</h2>
                <p className="text-sm text-gray-400">Upgrade Required</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#2B3139] hover:bg-[#363E48] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-red-400" />
                <span className="text-sm font-bold text-red-400">Your Earnings Are Locked</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${lockedAmount.toFixed(2)} USDT
              </div>
              <p className="text-xs text-gray-400">
                Cannot withdraw or collect
              </p>
            </div>

            <div className="bg-[#1A1B23] border border-[#2B3139] rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/20 flex items-center justify-center shrink-0">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <p className="text-sm text-gray-300 mb-2">
                    <span className="font-bold text-white">CPU Miner is a trial device.</span> To access your earnings, you must upgrade to professional mining equipment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-1">Upgrade Benefits:</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Unlock your ${lockedAmount.toFixed(2)} USDT</li>
                    <li>• Mine continuously (not one-time)</li>
                    <li>• Higher earning rates</li>
                    <li>• Full withdrawal access</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#F0B90B]/20 to-transparent border border-[#F0B90B]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-[#F0B90B]" />
                <span className="text-sm font-bold text-[#F0B90B]">Next Tier Required</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-white">{requiredTier}</div>
                  <div className="text-xs text-gray-400">Professional mining equipment</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[#F0B90B]">${requiredPrice}</div>
                  <div className="text-xs text-gray-500">Investment</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <TrendingUp className="w-5 h-5" />
              Upgrade to {requiredTier}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#2B3139] hover:bg-[#363E48] text-gray-300 rounded-xl font-bold transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            Your earnings remain safe. Upgrade anytime to unlock.
          </p>
        </div>
      </div>
    </div>
  );
}
