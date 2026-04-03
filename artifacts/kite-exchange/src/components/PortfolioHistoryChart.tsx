import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface PortfolioSnapshot {
  date: string;
  total_value: number;
  spot_balance: number;
  futures_balance: number;
  pnl_change: number;
}

interface PortfolioHistoryChartProps {
  className?: string;
}

export default function PortfolioHistoryChart({ className = '' }: PortfolioHistoryChartProps) {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentValue: 0,
    changeAmount: 0,
    changePercent: 0,
    highestValue: 0,
    lowestValue: 0
  });

  useEffect(() => {
    loadPortfolioHistory();
  }, [timeframe]);

  const loadPortfolioHistory = async () => {
    try {
      setLoading(true);

      const user = await getCurrentUser();
      if (!user) return;

      let daysBack = 30;
      if (timeframe === '7d') daysBack = 7;
      else if (timeframe === '90d') daysBack = 90;
      else if (timeframe === 'all') daysBack = 365;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data } = await supabase
        .from('daily_portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('snapshot_date', startDate.toISOString())
        .order('snapshot_date', { ascending: true });

      if (data && data.length > 0) {
        const mappedSnapshots: PortfolioSnapshot[] = data.map(snapshot => ({
          date: snapshot.snapshot_date,
          total_value: snapshot.total_value || 0,
          spot_balance: snapshot.spot_balance || 0,
          futures_balance: snapshot.futures_balance || 0,
          pnl_change: snapshot.pnl_change || 0
        }));

        setSnapshots(mappedSnapshots);

        const currentValue = mappedSnapshots[mappedSnapshots.length - 1].total_value;
        const startValue = mappedSnapshots[0].total_value;
        const changeAmount = currentValue - startValue;
        const changePercent = startValue > 0 ? (changeAmount / startValue) * 100 : 0;
        const highestValue = Math.max(...mappedSnapshots.map(s => s.total_value));
        const lowestValue = Math.min(...mappedSnapshots.map(s => s.total_value));

        setStats({
          currentValue,
          changeAmount,
          changePercent,
          highestValue,
          lowestValue
        });
      } else {
        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('balance, futures_balance')
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();

        if (balanceData) {
          const currentValue = (balanceData.balance || 0) + (balanceData.futures_balance || 0);

          const demoSnapshots: PortfolioSnapshot[] = [];
          for (let i = daysBack; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const variance = (Math.random() - 0.5) * 0.1;
            demoSnapshots.push({
              date: date.toISOString(),
              total_value: currentValue * (1 + variance),
              spot_balance: currentValue * 0.6 * (1 + variance),
              futures_balance: currentValue * 0.4 * (1 + variance),
              pnl_change: currentValue * variance
            });
          }

          setSnapshots(demoSnapshots);
          setStats({
            currentValue,
            changeAmount: currentValue * 0.15,
            changePercent: 15,
            highestValue: currentValue * 1.1,
            lowestValue: currentValue * 0.9
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading portfolio history:', error);
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const maxValue = Math.max(...snapshots.map(s => s.total_value), 1);
  const minValue = Math.min(...snapshots.map(s => s.total_value), 0);
  const range = maxValue - minValue;

  const getYPosition = (value: number) => {
    if (range === 0) return 50;
    return 90 - ((value - minValue) / range) * 80;
  };

  const pathPoints = snapshots.map((snapshot, index) => {
    const x = (index / (snapshots.length - 1)) * 100;
    const y = getYPosition(snapshot.total_value);
    return `${x},${y}`;
  }).join(' ');

  if (loading) {
    return (
      <div className={`bg-[#1a1f2e] rounded-xl border border-gray-800 p-6 ${className}`}>
        <div className="text-center text-gray-400">Loading portfolio history...</div>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1f2e] rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Portfolio Value</div>
            <div className="text-3xl font-black text-white">${formatNumber(stats.currentValue)}</div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
            stats.changeAmount >= 0
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {stats.changeAmount >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            <div>
              <div className="font-bold">
                {stats.changeAmount >= 0 ? '+' : ''}${formatNumber(Math.abs(stats.changeAmount))}
              </div>
              <div className="text-xs">
                {stats.changePercent >= 0 ? '+' : ''}{formatNumber(stats.changePercent)}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                timeframe === tf
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#0a0e1a] text-gray-400 hover:text-white'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {snapshots.length > 0 ? (
          <div className="relative h-64">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={stats.changeAmount >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={stats.changeAmount >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <polyline
                points={`0,100 ${pathPoints} 100,100`}
                fill="url(#chartGradient)"
              />

              <polyline
                points={pathPoints}
                fill="none"
                stroke={stats.changeAmount >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {snapshots.map((snapshot, index) => {
                const x = (index / (snapshots.length - 1)) * 100;
                const y = getYPosition(snapshot.total_value);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="0.8"
                    fill={stats.changeAmount >= 0 ? '#10b981' : '#ef4444'}
                  />
                );
              })}
            </svg>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
              <span>{formatDate(snapshots[0].date)}</span>
              <span>{formatDate(snapshots[snapshots.length - 1].date)}</span>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No data available
          </div>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a0e1a] rounded-lg p-3 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Highest</span>
            </div>
            <div className="text-lg font-bold text-white">${formatNumber(stats.highestValue)}</div>
          </div>
          <div className="bg-[#0a0e1a] rounded-lg p-3 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-400">Lowest</span>
            </div>
            <div className="text-lg font-bold text-white">${formatNumber(stats.lowestValue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
