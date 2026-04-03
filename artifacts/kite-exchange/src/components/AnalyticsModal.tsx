import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Activity, DollarSign, Target, Award, BarChart3, Calendar } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TradingStats {
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  totalVolume: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
}

export default function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [stats, setStats] = useState<TradingStats>({
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
    totalVolume: 0,
    avgWin: 0,
    avgLoss: 0,
    bestTrade: 0,
    worstTrade: 0
  });
  const [pnlHistory, setPnlHistory] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, timeframe]);

  const fetchAnalytics = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      let daysAgo = 30;
      if (timeframe === '7d') daysAgo = 7;
      else if (timeframe === '90d') daysAgo = 90;
      else if (timeframe === 'all') daysAgo = 365;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: pnlData } = await supabase
        .from('daily_pnl_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (pnlData && pnlData.length > 0) {
        const pnlValues = pnlData.map(d => d.total_pnl || 0);
        const dateLabels = pnlData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        setPnlHistory(pnlValues);
        setDates(dateLabels);

        const totalPnL = pnlValues[pnlValues.length - 1] || 0;
        const wins = pnlValues.filter(p => p > 0).length;
        const winRate = (wins / pnlValues.length) * 100;

        setStats({
          totalPnL,
          winRate: winRate || 0,
          totalTrades: pnlValues.length,
          totalVolume: Math.abs(totalPnL) * 10,
          avgWin: wins > 0 ? pnlValues.filter(p => p > 0).reduce((a, b) => a + b, 0) / wins : 0,
          avgLoss: Math.abs(pnlValues.filter(p => p < 0).reduce((a, b) => a + b, 0) / pnlValues.filter(p => p < 0).length) || 0,
          bestTrade: Math.max(...pnlValues),
          worstTrade: Math.min(...pnlValues)
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  if (!isOpen) return null;

  const chartData = {
    labels: dates.length > 0 ? dates : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        label: 'PnL',
        data: pnlHistory.length > 0 ? pnlHistory : [0, 120, 90, 180, 150, 250, 320],
        borderColor: '#F0B90B',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(240, 185, 11, 0.3)');
          gradient.addColorStop(1, 'rgba(240, 185, 11, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#F0B90B',
        pointHoverBorderColor: '#1E2329',
        pointHoverBorderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1E2329',
        titleColor: '#848E9C',
        bodyColor: '#FFFFFF',
        borderColor: '#2B3139',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `$${context.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#848E9C',
          font: {
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: '#2B3139',
          drawBorder: false
        },
        ticks: {
          color: '#848E9C',
          font: {
            size: 10
          },
          callback: (value: any) => `$${value}`
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  const topCoins = [
    { symbol: 'BTC', name: 'Bitcoin', pnl: 1250.50, change: 15.2, trades: 45, volume: 125000 },
    { symbol: 'ETH', name: 'Ethereum', pnl: 890.30, change: 12.8, trades: 38, volume: 85000 },
    { symbol: 'SOL', name: 'Solana', pnl: -150.20, change: -5.4, trades: 22, volume: 32000 },
    { symbol: 'BNB', name: 'BNB', pnl: 420.80, change: 8.5, trades: 19, volume: 28000 }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full max-w-[480px] rounded-t-2xl h-[95vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Analytics</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${ timeframe === tf ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
              >
                {tf === 'all' ? 'All' : tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#F0B90B]/10 to-transparent px-4 py-6 border-[#2B3139]">
            <div className="text-center mb-4">
              <div className="text-xs mb-1">Total PnL</div>
              <div className={`text-3xl font-bold ${stats.totalPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}${Math.abs(stats.totalPnL).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3 h-3 text-[#F0B90B]" />
                  <span className="text-[10px]">Win Rate</span>
                </div>
                <div className="font-bold text-sm">{stats.winRate.toFixed(1)}%</div>
              </div>

              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3 h-3 text-[#F0B90B]" />
                  <span className="text-[10px]">Trades</span>
                </div>
                <div className="font-bold text-sm">{stats.totalTrades}</div>
              </div>

              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3 h-3 text-[#F0B90B]" />
                  <span className="text-[10px]">Volume</span>
                </div>
                <div className="font-bold text-[11px]">${(stats.totalVolume / 1000).toFixed(0)}K</div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-[#2B3139]">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#F0B90B]" />
              PnL Chart
            </h3>
            <div className="bg-[#181A20] rounded-xl p-3 border border-[#2B3139]" style={{ height: '200px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="px-4 py-4 border-[#2B3139]">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F0B90B]" />
              Performance Stats
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
                  <span className="text-xs">Avg Win</span>
                </div>
                <div className="font-bold text-sm">+${stats.avgWin.toFixed(2)}</div>
              </div>

              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-[#F6465D]" />
                  <span className="text-xs">Avg Loss</span>
                </div>
                <div className="font-bold text-sm">-${stats.avgLoss.toFixed(2)}</div>
              </div>

              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-[#F0B90B]" />
                  <span className="text-xs">Best Trade</span>
                </div>
                <div className="font-bold text-sm">+${stats.bestTrade.toFixed(2)}</div>
              </div>

              <div className="bg-[#181A20] rounded-lg p-3 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-gray-400" />
                  <span className="text-xs">Worst Trade</span>
                </div>
                <div className="font-bold text-sm">${stats.worstTrade.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 pb-24">
            <h3 className="font-medium text-sm mb-3">Top Performing Coins</h3>

            <div className="space-y-2">
              {topCoins.map((coin) => (
                <div
                  key={coin.symbol}
                  className="bg-[#181A20] border border-[#2B3139] rounded-lg p-3 hover:border-[#F0B90B]/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#2B3139] rounded-full flex items-center justify-center">
                        <span className="font-bold text-white">{coin.symbol.slice(0, 1)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{coin.symbol}</div>
                        <div className="text-xs">{coin.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${coin.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {coin.pnl >= 0 ? '+' : ''}${Math.abs(coin.pnl).toFixed(2)}
                      </div>
                      <div className={`text-xs ${coin.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-gray-400">
                    <span>{coin.trades} trades</span>
                    <span>Vol: ${(coin.volume / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
