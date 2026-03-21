import React from 'react';
import { Coins, ShoppingCart, ArrowDownToLine, TrendingUp, Gift, Info } from 'lucide-react';

interface MiningQuickActionsProps {
  onClaim: () => void;
  onShop: () => void;
  onWithdraw: () => void;
  onFutures: () => void;
  onRewardWheel: () => void;
  canClaim: boolean;
  balance: number;
}

export default function MiningQuickActions({
  onClaim,
  onShop,
  onWithdraw,
  onFutures,
  onRewardWheel,
  canClaim,
  balance
}: MiningQuickActionsProps) {
  return (
    <div className="space-y-3">

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onClaim}
          disabled={!canClaim}
          className={`relative overflow-hidden rounded-2xl p-4 transition-all transform ${
            canClaim
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 hover:scale-105 shadow-lg shadow-yellow-500/30'
              : 'bg-slate-800 opacity-50 cursor-not-allowed'
          }`}
        >
          {canClaim && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
          <div className="relative flex flex-col items-center justify-center gap-2">
            <Coins className="w-8 h-8 text-white" />
            <span className="font-bold text-white text-sm">Claim Rewards</span>
            {canClaim && (
              <span className="text-[10px] text-white/80 animate-pulse">Ready!</span>
            )}
          </div>
        </button>

        <button
          onClick={onRewardWheel}
          className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 hover:scale-105 rounded-2xl p-4 transition-all transform shadow-lg shadow-pink-500/30"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slow" />
          <div className="relative flex flex-col items-center justify-center gap-2">
            <Gift className="w-8 h-8 text-white animate-bounce" />
            <span className="font-bold text-white text-sm">Lucky Wheel</span>
            <span className="text-[10px] text-white/80">Free Spins!</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onShop}
          className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/30 hover:border-blue-500/50 rounded-xl p-3 transition-all transform hover:scale-105"
        >
          <div className="flex flex-col items-center gap-1.5">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            <span className="text-xs font-semibold text-white">Shop</span>
          </div>
        </button>

        <button
          onClick={onWithdraw}
          disabled={balance < 1}
          className={`rounded-xl p-3 transition-all transform ${
            balance >= 1
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 hover:border-green-500/50 hover:scale-105'
              : 'bg-slate-800/30 border-2 border-slate-700/30 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5">
            <ArrowDownToLine className={`w-6 h-6 ${balance >= 1 ? 'text-green-400' : 'text-gray-600'}`} />
            <span className={`text-xs font-semibold ${balance >= 1 ? 'text-white' : 'text-gray-600'}`}>
              Withdraw
            </span>
          </div>
        </button>

        <button
          onClick={onFutures}
          className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 hover:border-purple-500/50 rounded-xl p-3 transition-all transform hover:scale-105"
        >
          <div className="flex flex-col items-center gap-1.5">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            <span className="text-xs font-semibold text-white">Futures</span>
          </div>
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-400 mb-1">Pro Tip</p>
          <p className="text-[11px] text-gray-300">
            Transfer EQ to Futures for <span className="text-green-400 font-bold">+10% bonus</span> USDT! Start trading immediately.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        .animate-shimmer-slow {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}