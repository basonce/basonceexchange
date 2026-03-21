import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap } from 'lucide-react';

interface EarningsCounterProps {
  balance: number;
  usdBalance: number;
  hourlyRate: number;
  isActive: boolean;
}

export default function EarningsCounter({ balance, usdBalance, hourlyRate, isActive }: EarningsCounterProps) {
  const [prevBalance, setPrevBalance] = useState(usdBalance);
  const [showIncrease, setShowIncrease] = useState(false);

  useEffect(() => {
    if (usdBalance > prevBalance && isActive) {
      setShowIncrease(true);
      setTimeout(() => setShowIncrease(false), 1000);
    }
    setPrevBalance(usdBalance);
  }, [usdBalance]);

  return (
    <div className="relative bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-600/10 border-2 border-green-500/30 rounded-2xl p-6 overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent animate-shimmer" />

      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-green-400">EARNING</span>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Balance</p>
            <p className="text-[10px] text-gray-500">Live Updates</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-4xl font-bold text-white transition-all ${
              showIncrease ? 'scale-110 text-green-400' : ''
            }`}>
              ${usdBalance.toFixed(2)}
            </span>
            {showIncrease && (
              <span className="text-green-400 text-sm font-semibold animate-bounce">
                ↑
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{balance.toFixed(4)} EQ</p>
        </div>

        <div className="flex items-center justify-between bg-black/20 rounded-xl p-3 border border-green-500/20">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Earning Rate</p>
            <p className="text-lg font-bold text-green-400">${hourlyRate.toFixed(4)}/h</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 mb-0.5">Daily Estimate</p>
            <p className="text-lg font-bold text-white">${(hourlyRate * 24).toFixed(2)}</p>
          </div>
        </div>

        {isActive && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-400">
            <TrendingUp className="w-3 h-3 animate-bounce" />
            <span className="font-semibold">Earning in real-time</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}