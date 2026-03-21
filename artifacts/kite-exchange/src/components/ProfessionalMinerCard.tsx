import React from 'react';
import { Zap, Play, Square, TrendingUp, Info } from 'lucide-react';

interface MinerCardProps {
  id: string;
  name: string;
  icon: string;
  hashRate: number;
  hourlyUSD: number;
  hourlyEQ: number;
  sessionEarned: number;
  isActive: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  showTooltip?: boolean;
}

export default function ProfessionalMinerCard({
  id,
  name,
  icon,
  hashRate,
  hourlyUSD,
  hourlyEQ,
  sessionEarned,
  isActive,
  onToggle,
  showTooltip = false
}: MinerCardProps) {
  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(id, isActive);
  };

  return (
    <div
      data-miner-card
      style={{ minHeight: '280px', contain: 'layout' }}
      className={`relative rounded-2xl border-2 ${
        isActive
          ? 'bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-emerald-600/10 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
          : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
      }`}
    >

      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent animate-shimmer rounded-2xl pointer-events-none" />
      )}

      <div className="relative p-4" style={{ minHeight: '280px' }}>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
              isActive
                ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/30'
                : 'bg-slate-800 border-2 border-slate-700'
            }`}>
              {icon}
            </div>
            <div className="relative">
              <h3 className="font-bold text-white text-base mb-0.5">{name}</h3>
              <div className="flex items-center gap-2 min-h-[20px]">
                <p className="text-xs text-gray-400">{hashRate} TH/s</p>
                <div className={`flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full px-2 py-0.5 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {showTooltip && (
            <button className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
              <Info className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/20 rounded-xl p-3 border border-slate-700/30">
            <p className="text-[10px] text-gray-500 mb-1">Hourly Rate</p>
            <p className={`text-lg font-bold ${isActive ? 'text-emerald-400' : 'text-yellow-400'}`}>
              ${hourlyUSD.toFixed(4)}
            </p>
            <p className="text-[10px] text-gray-500">{hourlyEQ.toFixed(6)} EQ</p>
          </div>

          <div className="bg-black/20 rounded-xl p-3 border border-slate-700/30">
            <p className="text-[10px] text-gray-500 mb-1">Session Earned</p>
            <p className="text-lg font-bold text-white">
              ${(sessionEarned * 0.5).toFixed(4)}
            </p>
            <p className="text-[10px] text-gray-500">{sessionEarned.toFixed(6)} EQ</p>
          </div>
        </div>

        <button
          onClick={handleToggleClick}
          style={{ willChange: 'transform, opacity' }}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors transform hover:scale-102 ${
            isActive
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isActive ? (
            <span className="flex items-center justify-center gap-2">
              <Square className="w-4 h-4" />
              Stop Mining
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Start Mining
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}