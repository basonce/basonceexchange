import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

interface TxRow { id: string; type: 'deposit' | 'withdrawal'; amount: number; currency: string; user_id: string; status: string; created_at: string; }

export default function Finance() {
  const { alerts } = useStore();
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'deposit' | 'withdrawal' | 'pending'>('all');

  const finAlerts = alerts.filter(a => a.category === 'finance' && !a.dismissed).slice(0, 30);

  useEffect(() => {
    loadTxs();
  }, []);

  async function loadTxs() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, currency, user_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setTxs(data.map(d => ({ ...d, type: 'withdrawal' as const, currency: d.currency || 'USDT' })));
      }
    } catch {}
    setLoading(false);
  }

  const todayDeposits = finAlerts
    .filter(a => a.title.includes('Yatırıldı'))
    .reduce((s, a) => s + (Number(a.meta?.amount) || 0), 0);
  const todayWithdrawals = finAlerts
    .filter(a => a.title.includes('Çekildi') || a.title.includes('Çekim'))
    .reduce((s, a) => s + Math.abs(Number(a.meta?.amount) || 0), 0);
  const pending = txs.filter(t => t.status === 'pending').length;

  const filtered = tab === 'all' ? finAlerts
    : tab === 'deposit' ? finAlerts.filter(a => a.title.includes('Yatırıldı'))
    : tab === 'withdrawal' ? finAlerts.filter(a => a.title.includes('Çekim') || a.title.includes('Çekildi'))
    : finAlerts.filter(a => a.meta?.status === 'pending');

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} sa`;
    return new Date(ts).toLocaleString('tr-TR');
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="p-4 pt-6">
        <h1 className="text-lg font-bold text-white mb-4">Finans</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <p className="text-green-400 text-lg font-bold">${todayDeposits.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Yatırım</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3 text-center">
            <p className="text-red-400 text-lg font-bold">${todayWithdrawals.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Çekim</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${pending > 0 ? 'bg-yellow-500/10' : 'bg-[#111]'}`}>
            <p className={`text-lg font-bold ${pending > 0 ? 'text-yellow-400' : 'text-white'}`}>{pending}</p>
            <p className="text-xs text-gray-500">Bekleyen</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {([['all', 'Tümü'], ['deposit', '💚 Yatırım'], ['withdrawal', '🔴 Çekim'], ['pending', '⏳ Bekleyen']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-none px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                tab === k ? 'bg-yellow-400 text-black' : 'bg-[#111] text-gray-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list from alerts */}
      <div className="flex flex-col gap-2 px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">💰</p>
            <p className="text-gray-500">Henüz finansal işlem yok</p>
          </div>
        ) : filtered.map(a => {
          const isDeposit = a.title.includes('Yatırıldı') || a.title.includes('Yatır');
          const isWithdraw = a.title.includes('Çekim') || a.title.includes('Çekildi');
          const amount = Math.abs(Number(a.meta?.amount) || 0);
          return (
            <div key={a.id} className={`rounded-2xl p-4 border ${
              isDeposit ? 'bg-green-500/5 border-green-500/20' :
              isWithdraw ? 'bg-red-500/5 border-red-500/20' :
              'bg-[#111] border-white/5'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isDeposit ? '💚' : isWithdraw ? '🔴' : '📊'}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{a.title}</p>
                    <p className="text-gray-500 text-xs">{a.body}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{timeAgo(a.ts)}</p>
                  </div>
                </div>
                {amount > 0 && (
                  <p className={`text-sm font-bold ${isDeposit ? 'text-green-400' : 'text-red-400'}`}>
                    {isDeposit ? '+' : '-'}${amount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Pending withdrawals from DB */}
        {tab !== 'deposit' && txs.filter(t => t.status === 'pending').length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2 px-1">Veritabanından Bekleyen Çekimler</p>
            {txs.filter(t => t.status === 'pending').map(t => (
              <div key={t.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">${Number(t.amount).toFixed(2)} {t.currency}</p>
                    <p className="text-gray-500 text-xs">{new Date(t.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                  <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">Bekliyor</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
