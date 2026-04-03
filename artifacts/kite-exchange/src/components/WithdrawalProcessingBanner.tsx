import { useState, useEffect } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import WithdrawalProcessingDetail from './WithdrawalProcessingDetail';

interface WithdrawalTransaction {
  id: string;
  coin_symbol: string;
  amount: number;
  receive_amount: number;
  network: string;
  status: string;
  destination_address: string;
  created_at: string;
  completed_at?: string;
  admin_notes?: string;
}

export default function WithdrawalProcessingBanner() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalTransaction[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalTransaction | null>(null);

  useEffect(() => {
    fetchActiveWithdrawals();

    const setupRealtime = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      const channel = supabase
        .channel('withdrawal_status_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'withdrawal_transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchActiveWithdrawals();
          }
        )
        .subscribe();

      return () => { channel.unsubscribe(); };
    };

    setupRealtime();
  }, []);

  const fetchActiveWithdrawals = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data } = await supabase
      .from('withdrawal_transactions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing', 'completed', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      const relevant = data.filter(w => {
        if (w.status === 'pending' || w.status === 'processing') return true;
        if (w.status === 'completed' || w.status === 'rejected') {
          const completedAt = new Date(w.reviewed_at || w.completed_at || w.created_at);
          const hoursSince = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
          return hoursSince < 24;
        }
        return false;
      });
      setWithdrawals(relevant);
    }
  };

  if (withdrawals.length === 0) return null;

  const displayed = withdrawals.slice(0, 3);

  return (
    <>
      <div className="mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#1E2026' }}>
        {displayed.map((w, idx) => (
          <button
            key={w.id}
            onClick={() => setSelectedWithdrawal(w)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#22262E] transition-colors active:bg-[#2B3139]"
            style={{ borderBottom: idx < displayed.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          >
            <Bell className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="flex-1 text-left text-xs text-gray-300 truncate">
              Crypto withdraw{' '}
              <span className="text-white font-medium tabular-nums">
                {w.receive_amount.toFixed(8)}
              </span>{' '}
              {w.coin_symbol}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`text-xs font-semibold ${
                  w.status === 'completed'
                    ? 'text-[#0ECB81]'
                    : w.status === 'rejected'
                    ? 'text-[#F6465D]'
                    : 'text-[#F0B90B]'
                }`}
              >
                {w.status === 'pending' || w.status === 'processing'
                  ? 'Processing'
                  : w.status === 'completed'
                  ? 'Complete'
                  : 'Rejected'}
              </span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
            </div>
          </button>
        ))}
      </div>

      {selectedWithdrawal && (
        <WithdrawalProcessingDetail
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
        />
      )}
    </>
  );
}
