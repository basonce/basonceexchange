import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchPendingWithdrawals, approveWithdrawal, rejectWithdrawal, fetchTransactions, manualDeposit, searchUsersByEmail } from '../lib/admin-api';

interface Withdrawal { id: string; amount: number; coin_symbol?: string; currency?: string; status: string; created_at: string; user_id: string; user_profiles?: { email: string; full_name: string }; }
interface Tx { id: string; type: string; symbol: string; amount: number; created_at: string; user_profiles?: { email: string }; notes?: string; }
interface User { id: string; email: string; full_name: string; is_active: boolean; }

export default function Finance() {
  const [tab, setTab] = useState<'pending' | 'txs' | 'deposit'>('pending');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Manual deposit form
  const [depForm, setDepForm] = useState({ email: '', amount: '', symbol: 'USDT', txHash: '' });
  const [depResults, setDepResults] = useState<User[]>([]);
  const [depTarget, setDepTarget] = useState<User | null>(null);
  const [depSaving, setDepSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [w, t] = await Promise.all([fetchPendingWithdrawals(), fetchTransactions(80)]);
    setWithdrawals(w);
    setTxs(t);
    setLoading(false);
  }

  async function doApprove(id: string) {
    setProcessing(id);
    try { await approveWithdrawal(id); showToast('✅ Onaylandı'); setWithdrawals(w => w.filter(x => x.id !== id)); }
    catch { showToast('❌ Hata'); }
    setProcessing(null);
  }

  async function doReject() {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    try { await rejectWithdrawal(rejectModal, rejectReason); showToast('🚫 Reddedildi'); setWithdrawals(w => w.filter(x => x.id !== rejectModal)); }
    catch { showToast('❌ Hata'); }
    setProcessing(null); setRejectModal(null); setRejectReason('');
  }

  async function doManualDeposit() {
    if (!depTarget || !depForm.amount) return;
    setDepSaving(true);
    try {
      await manualDeposit(depTarget.id, parseFloat(depForm.amount), depForm.symbol, depForm.txHash);
      showToast(`✅ ${depForm.amount} ${depForm.symbol} yatırıldı`);
      setDepForm({ email: '', amount: '', symbol: 'USDT', txHash: '' }); setDepTarget(null);
    } catch { showToast('❌ Hata'); }
    setDepSaving(false);
  }

  async function searchDep(email: string) {
    setDepForm(f => ({ ...f, email }));
    if (email.length >= 3) setDepResults(await searchUsersByEmail(email));
    else setDepResults([]);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function timeAgo(dt: string) {
    const d = Date.now() - new Date(dt).getTime();
    if (d < 3600000) return `${Math.floor(d/60000)} dk`;
    if (d < 86400000) return `${Math.floor(d/3600000)} sa`;
    return `${Math.floor(d/86400000)} gün`;
  }

  const pendingAmt = withdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const todayTxs = txs.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString());

  return (
    <div className="flex flex-col pb-28">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          {toast}
        </div>
      )}

      <div className="p-4 pt-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#00DC82', letterSpacing: '0.08em' }}>FİNANSAL YÖNETİM</p>
            <h1 className="text-2xl font-black text-white">Finans</h1>
          </div>
          <button onClick={load} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)' }}>
            <p className="text-xl font-bold" style={{ color: '#FF4757' }}>{withdrawals.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Bekleyen</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,71,87,0.05)', border: '1px solid rgba(255,71,87,0.1)' }}>
            <p className="text-lg font-bold" style={{ color: '#FF4757' }}>${pendingAmt.toFixed(0)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Toplam</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xl font-bold text-white">{todayTxs.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Bugün Tx</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['pending', 'Bekleyen Çekim'], ['txs', 'İşlem Geçmişi'], ['deposit', 'Manuel Yatırım']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: tab === k ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === k ? '#F0B90B' : 'rgba(255,255,255,0.35)' }}>
              {l} {k === 'pending' && withdrawals.length > 0 ? `(${withdrawals.length})` : ''}
            </button>
          ))}
        </div>

        {/* Pending withdrawals */}
        {tab === 'pending' && (
          <div className="flex flex-col gap-3">
            {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-24" />) :
             withdrawals.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm" style={{ color: '#00DC82' }}>Bekleyen çekim yok</p>
              </div>
            ) : withdrawals.map(w => (
              <div key={w.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {w.user_profiles?.email || w.user_id?.slice(0, 12) + '…'}
                    </p>
                    <p className="text-xl font-black text-white">
                      {Number(w.amount).toFixed(2)} <span style={{ color: '#F0B90B' }}>{w.coin_symbol || w.currency || 'USDT'}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={11} color="rgba(255,255,255,0.3)" />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(w.created_at)} önce</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: 'rgba(255,152,0,0.15)', color: '#FF9800' }}>Bekliyor</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => doApprove(w.id)}
                    disabled={!!processing}
                    className="py-3 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 transition-opacity"
                    style={{ background: '#00DC82', opacity: processing ? 0.6 : 1 }}
                  >
                    <Check size={15} /> Onayla
                  </button>
                  <button
                    onClick={() => { setRejectModal(w.id); setRejectReason(''); }}
                    disabled={!!processing}
                    className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                    style={{ background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', color: '#FF4757', opacity: processing ? 0.6 : 1 }}
                  >
                    <X size={15} /> Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction history */}
        {tab === 'txs' && (
          <div className="flex flex-col gap-2">
            {loading ? Array.from({length:5}).map((_,i)=><div key={i} className="skeleton rounded-xl h-14" />) :
             txs.map(t => {
               const isPlus = ['admin_credit','admin_send','deposit','referral_bonus'].includes(t.type);
               return (
                 <div key={t.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                   <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                     style={{ background: isPlus ? 'rgba(0,220,130,0.12)' : 'rgba(255,71,87,0.12)' }}>
                     {isPlus ? <TrendingUp size={16} color="#00DC82" /> : <TrendingDown size={16} color="#FF4757" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-white truncate">{t.type.replace(/_/g,' ')}</p>
                     <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.user_profiles?.email || t.notes || '—'}</p>
                   </div>
                   <div className="text-right flex-none">
                     <p className="text-sm font-bold" style={{ color: isPlus ? '#00DC82' : '#FF4757' }}>
                       {isPlus ? '+' : '-'}{Number(t.amount).toFixed(2)} {t.symbol}
                     </p>
                     <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(t.created_at)}</p>
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* Manual deposit */}
        {tab === 'deposit' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(61,127,255,0.06)', border: '1px solid rgba(61,127,255,0.15)' }}>
              <p className="text-sm font-bold text-white mb-1">Manuel Yatırım</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Onaylanan bir zincir işlemi sonrası kullanıcıya bakiye yatır</p>
            </div>
            {/* Email search */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Kullanıcı Email</label>
              <input value={depForm.email} onChange={e => searchDep(e.target.value)}
                placeholder="Email ara…" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
              {depResults.length > 0 && (
                <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {depResults.map(u => (
                    <button key={u.id} onClick={() => { setDepTarget(u); setDepResults([]); setDepForm(f => ({ ...f, email: u.email })); }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                        {(u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white">{u.full_name || u.email?.split('@')[0]}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {depTarget && (
                <div className="mt-2 rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(0,220,130,0.08)', border: '1px solid rgba(0,220,130,0.2)' }}>
                  <p className="text-sm font-medium text-white">{depTarget.email}</p>
                  <button onClick={() => setDepTarget(null)}><X size={14} color="#666" /></button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Miktar</label>
                <input type="number" value={depForm.amount} onChange={e => setDepForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Coin</label>
                <select value={depForm.symbol} onChange={e => setDepForm(f => ({ ...f, symbol: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  {['USDT','BTC','ETH','BNB','SOL'].map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">TX Hash</label>
              <input value={depForm.txHash} onChange={e => setDepForm(f => ({ ...f, txHash: e.target.value }))}
                placeholder="0x…" className="w-full rounded-xl px-4 py-3 text-white text-sm font-mono outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
            </div>
            <button onClick={doManualDeposit} disabled={depSaving || !depTarget}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black"
              style={{ background: '#3D7FFF', opacity: depSaving || !depTarget ? 0.5 : 1 }}>
              {depSaving ? 'Yatırılıyor…' : 'Yatırımı Onayla'}
            </button>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[150]" onClick={() => setRejectModal(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 slide-up"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,71,87,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-lg font-bold text-white mb-4">Reddetme Nedeni</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Neden reddediyorsunuz? (isteğe bağlı)"
              rows={3} className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setRejectModal(null)} className="py-3.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>İptal</button>
              <button onClick={doReject} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,71,87,0.2)', border: '1px solid rgba(255,71,87,0.4)', color: '#FF4757' }}>Reddet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
