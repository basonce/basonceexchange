import { TrendingUp, Target, BadgeCheck, Award } from 'lucide-react';
import { BotStats } from '../../lib/ai-bot-engine';

interface BotStatsPanelProps {
  stats: BotStats;
  simBalance: number;
  initialBalance: number;
}

export default function BotStatsPanel({ stats, simBalance, initialBalance }: BotStatsPanelProps) {
  const totalReturn = initialBalance > 0 ? ((simBalance - initialBalance) / initialBalance) * 100 : 0;
  const returnPositive = totalReturn >= 0;

  return (
    <div className="space-y-3">
      <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-400">Simulated Balance</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${returnPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {returnPositive ? '+' : ''}{totalReturn.toFixed(2)}%
          </span>
        </div>
        <div className="text-2xl font-bold text-white">${simBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className="text-xs text-gray-500 mt-0.5">Started at ${initialBalance.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Target}
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          sub={`${stats.winningTrades}/${stats.totalTrades} trades`}
          color="#10B981"
        />
        <StatCard
          icon={TrendingUp}
          label="Total PnL"
          value={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`}
          sub={`${stats.totalTrades} completed`}
          color={stats.totalPnl >= 0 ? '#10B981' : '#EF4444'}
        />
        <StatCard
          icon={Award}
          label="Best Trade"
          value={`+${stats.bestTradePct.toFixed(2)}%`}
          sub="All time"
          color="#F0B90B"
        />
        <StatCard
          icon={BadgeCheck}
          label="Win Streak"
          value={`${stats.currentStreak}`}
          sub="Consecutive wins"
          color="#8B5CF6"
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[#1E2026] rounded-2xl border border-[#2B3139] p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
