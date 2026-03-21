import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExternalLink, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  tx_hash: string;
  network: string;
  currency: string;
  amount: number;
  status: string;
  confirmations: number;
  created_at: string;
  from_address: string;
  to_address: string;
}

export function BlockchainTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel('blockchain_transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blockchain_transactions'
      }, () => {
        loadTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('blockchain_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExplorerUrl = (network: string, txHash: string) => {
    const explorers: Record<string, string> = {
      'bsc_testnet': 'https://testnet.bscscan.com',
      'polygon_mumbai': 'https://mumbai.polygonscan.com',
      'bsc': 'https://bscscan.com',
      'polygon': 'https://polygonscan.com'
    };
    return `${explorers[network]}/tx/${txHash}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending':
      case 'confirming':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'text-green-400';
      case 'pending':
      case 'confirming':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredTransactions = transactions.filter(tx =>
    filter === 'all' || tx.type === filter
  );

  if (loading) {
    return (
      <div className="bg-[#181A20] rounded-xl p-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181A20] rounded-xl">
      <div className="p-4 border-gray-700">
        <h3 className="font-semibold text-white mb-4">Blockchain Transactions</h3>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ filter === 'all' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('deposit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ filter === 'deposit' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
          >
            Deposits
          </button>
          <button
            onClick={() => setFilter('withdrawal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ filter === 'withdrawal' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
          >
            Withdrawals
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">No blockchain transactions yet</div>
            <div className="text-gray-500">
              Your deposits and withdrawals will appear here
            </div>
          </div>
        ) : (
          <div className="divide-gray-700">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-[#2B3139] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {tx.type === 'deposit' ? (
                      <ArrowDownCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <ArrowUpCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-white capitalize">
                        {tx.type}
                      </div>
                      <div className={`font-semibold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.currency}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(tx.status)}
                      <span className={`text-sm ${getStatusColor(tx.status)} capitalize`}>
                        {tx.status}
                      </span>
                      {tx.confirmations > 0 && (
                        <span className="text-gray-500">
                          {tx.confirmations} confirmations
                        </span>
                      )}
                    </div>

                    <div className="text-gray-400 mb-2">
                      <div className="font-mono text-xs break-all">
                        {tx.tx_hash}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-gray-500">
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                      <a
                        href={getExplorerUrl(tx.network, tx.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-[#F0B90B]/80 text-xs transition-colors"
                      >
                        View on Explorer
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
