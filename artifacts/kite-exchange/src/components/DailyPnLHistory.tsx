import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface DailyPnLRecord {
  id: string;
  date: string;
  daily_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  starting_balance: number;
  ending_balance: number;
}

export default function DailyPnLHistory() {
  const [history, setHistory] = useState<DailyPnLRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDailyPnl, setCurrentDailyPnl] = useState(0);

  useEffect(() => {
    loadPnLHistory();
    loadCurrentDailyPnl();
  }, []);

  const loadPnLHistory = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_pnl_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error('Error loading PnL history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentDailyPnl = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_balances')
        .select('daily_pnl')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentDailyPnl(parseFloat(data.daily_pnl || '0'));
      }
    } catch (error) {
      console.error('Error loading current daily PnL:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-blue-400" />
        <h2 className="font-semibold text-white">Günlük PnL Geçmişi</h2>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm">Bugünkü PnL</span>
          <div className="flex items-center gap-2">
            {currentDailyPnl >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold">
                  {formatCurrency(currentDailyPnl)}
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-semibold">
                  {formatCurrency(currentDailyPnl)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-gray-500 mt-1">
          24 saat sonra otomatik sıfırlanacak
        </div>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="py-8 text-gray-400">
            Henüz geçmiş kayıt yok
          </div>
        ) : (
          history.map((record) => {
            const pnl = parseFloat(record.daily_pnl.toString());
            const winRate = record.total_trades > 0
              ? (record.winning_trades / record.total_trades) * 100
              : 0;

            return (
              <div
                key={record.id}
                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-850 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-white font-medium">
                      {formatDate(record.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pnl >= 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">
                          {formatCurrency(pnl)}
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 font-semibold">
                          {formatCurrency(pnl)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-gray-800">
                  <div>
                    <div className="text-gray-500">İşlemler</div>
                    <div className="text-white font-medium">
                      {record.total_trades}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Kazanma Oranı</div>
                    <div className={`font-medium ${ winRate >= 50 ? 'text-green-400' : 'text-red-400' }`}>
                      {winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Kazanan/Kaybeden</div>
                    <div className="text-white font-medium">
                      {record.winning_trades}/{record.losing_trades}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
