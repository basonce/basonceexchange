import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminWithdrawal {
  id: string;
  user_id: string;
  coin_symbol: string;
  network: string;
  amount: number;
  network_fee: number;
  receive_amount: number;
  destination_address: string;
  txid: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_email?: string | null;
}

const STATUS_TABS = ['pending', 'completed', 'rejected', 'all'] as const;
type StatusTab = typeof STATUS_TABS[number];

export default function WithdrawalApprovalPanel() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<StatusTab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [txidInput, setTxidInput] = useState<Record<string, string>>({});
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadWithdrawals();

    const channel = supabase
      .channel('admin_withdrawals_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_transactions' }, () => {
        loadWithdrawals();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [activeStatus]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('withdrawal_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (activeStatus === 'pending') {
        query = query.in('status', ['pending', 'processing', 'hold']);
      } else if (activeStatus !== 'all') {
        query = query.eq('status', activeStatus);
      }

      const { data, error } = await query;

      if (!error && data) {
        setWithdrawals(data as AdminWithdrawal[]);
        const pending = data.filter((w: AdminWithdrawal) => w.status === 'pending' || w.status === 'processing' || w.status === 'hold');
        setPendingCount(pending.length);
      } else if (error) {
        console.error('load withdrawals error:', error);
      }
    } catch (e) {
      console.error('load withdrawals error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (w: AdminWithdrawal) => {
    if (actionLoading) return;
    setActionLoading(w.id);
    try {
      const { error } = await supabase
        .from('withdrawal_transactions')
        .update({
          status: 'completed',
          txid: txidInput[w.id] || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', w.id);

      if (!error) {
        await loadWithdrawals();
        setExpandedId(null);
      } else {
        alert('Failed to approve: ' + error.message);
      }
    } catch (e) {
      alert('Error approving withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (w: AdminWithdrawal) => {
    if (actionLoading) return;
    const notes = rejectNotes[w.id] || 'Rejected by admin';
    setActionLoading(w.id);
    try {
      const { error } = await supabase
        .from('withdrawal_transactions')
        .update({
          status: 'rejected',
          admin_notes: notes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', w.id);

      if (!error) {
        const { data: bal } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', w.user_id)
          .eq('symbol', w.coin_symbol)
          .maybeSingle();

        if (bal) {
          const restored = parseFloat(bal.balance || '0') + w.amount;
          await supabase
            .from('user_balances')
            .update({ balance: restored.toString() })
            .eq('user_id', w.user_id)
            .eq('symbol', w.coin_symbol);
        }

        await loadWithdrawals();
        setExpandedId(null);
      } else {
        alert('Failed to reject: ' + error.message);
      }
    } catch (e) {
      alert('Error rejecting withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'text-green-600 bg-green-50';
    if (status === 'rejected') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">Withdrawal Requests</h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full animate-pulse">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          onClick={loadWithdrawals}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveStatus(tab); setExpandedId(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              activeStatus === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No {activeStatus === 'all' ? '' : activeStatus} withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map(w => (
            <div
              key={w.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(w.status)}`}>
                  {(w.status === 'pending' || w.status === 'hold' || w.status === 'processing') ? 'Processing' : w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {w.receive_amount.toFixed(4)} {w.coin_symbol}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    {w.user_id.slice(0, 12)}...
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDate(w.created_at)}</p>
                  {expandedId === w.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 ml-auto mt-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-auto mt-0.5" />
                  )}
                </div>
              </button>

              {expandedId === w.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Amount</p>
                      <p className="font-semibold text-gray-900">{w.amount.toFixed(4)} {w.coin_symbol}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Fee</p>
                      <p className="font-semibold text-gray-900">{w.network_fee.toFixed(4)} {w.coin_symbol}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Receive</p>
                      <p className="font-bold text-green-600">{w.receive_amount.toFixed(4)} {w.coin_symbol}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Network</p>
                      <p className="font-semibold text-gray-900 uppercase">{w.network}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">User ID</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-mono text-gray-700">{w.user_id}</p>
                      <button onClick={() => copyToClipboard(w.user_id)} className="p-1 hover:bg-gray-200 rounded">
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Destination Address</p>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                      <p className="text-xs font-mono text-gray-700 flex-1 break-all">{w.destination_address}</p>
                      <button
                        onClick={() => copyToClipboard(w.destination_address)}
                        className="shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {w.txid && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">TxID</p>
                      <p className="text-xs font-mono text-blue-600 break-all">{w.txid}</p>
                    </div>
                  )}

                  {w.admin_notes && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                      <p className="text-xs text-red-600">{w.admin_notes}</p>
                    </div>
                  )}

                  {w.reviewed_at && (
                    <p className="text-xs text-gray-400">Reviewed: {formatDate(w.reviewed_at)}</p>
                  )}

                  {(w.status === 'pending' || w.status === 'processing' || w.status === 'hold') && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">TxID (optional)</label>
                        <input
                          type="text"
                          value={txidInput[w.id] || ''}
                          onChange={(e) => setTxidInput(prev => ({ ...prev, [w.id]: e.target.value }))}
                          placeholder="Blockchain transaction hash..."
                          className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Reject reason (optional)</label>
                        <input
                          type="text"
                          value={rejectNotes[w.id] || ''}
                          onChange={(e) => setRejectNotes(prev => ({ ...prev, [w.id]: e.target.value }))}
                          placeholder="Reason for rejection..."
                          className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(w)}
                          disabled={actionLoading === w.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(w)}
                          disabled={actionLoading === w.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
