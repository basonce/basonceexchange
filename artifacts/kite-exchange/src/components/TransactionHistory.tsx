import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  coin_symbol: string;
  network: string;
  amount: number;
  status: string;
  created_at: string;
  txid?: string;
  destination_address?: string;
  receive_amount?: number;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  useEffect(() => {
    fetchTransactions();

    const depositChannel = supabase
      .channel('deposit_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deposit_transactions'
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    const withdrawalChannel = supabase
      .channel('withdrawal_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withdrawal_transactions'
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(depositChannel);
      supabase.removeChannel(withdrawalChannel);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [depositsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('deposit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const deposits: Transaction[] = (depositsRes.data || []).map(d => ({
        ...d,
        type: 'deposit' as const
      }));

      const withdrawals: Transaction[] = (withdrawalsRes.data || []).map(w => ({
        ...w,
        type: 'withdrawal' as const
      }));

      const allTransactions = [...deposits, ...withdrawals].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[#00FF7F]" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-[#F0B90B]" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-[#F6465D]" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'text-[#00FF7F]';
      case 'pending':
      case 'processing':
        return 'text-[#F0B90B]';
      case 'rejected':
        return 'text-[#F6465D]';
      default:
        return 'text-gray-400';
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#181A20]">
      <div className="flex items-center gap-2 p-4 border-[#2B3139]">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${ filter === 'all' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('deposit')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${ filter === 'deposit' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
        >
          Deposits
        </button>
        <button
          onClick={() => setFilter('withdrawal')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${ filter === 'withdrawal' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
        >
          Withdrawals
        </button>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-center">
            No transactions yet
          </p>
        </div>
      ) : (
        <div className="divide-[#2B3139]">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="p-4 hover:bg-[#2B3139]/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${ tx.type === 'deposit' ? 'bg-[#00FF7F]/10' : 'bg-[#F0B90B]/10' }`}>
                  {tx.type === 'deposit' ? (
                    <ArrowDownCircle className="w-5 h-5 text-[#00FF7F]" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-[#F0B90B]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-white">
                      {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} {tx.coin_symbol}
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(tx.status)}
                      <span className={`text-xs font-medium capitalize ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div className="text-gray-400">{tx.network}</div>
                    <div className="font-bold text-white">
                      {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.coin_symbol}
                    </div>
                  </div>

                  {tx.type === 'withdrawal' && tx.receive_amount && (
                    <div className="text-gray-400 mb-1">
                      Receive: {tx.receive_amount} {tx.coin_symbol}
                    </div>
                  )}

                  {tx.txid && (
                    <div className="text-gray-400 truncate mb-1">
                      TxID: {tx.txid}
                    </div>
                  )}

                  {tx.destination_address && (
                    <div className="text-gray-400 truncate mb-1">
                      To: {tx.destination_address}
                    </div>
                  )}

                  <div className="text-gray-400">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
