import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, Clock, TrendingDown, TrendingUp, Copy, ArrowDownLeft, BarChart2 } from 'lucide-react';
import { fetchWithdrawals, approveWithdrawal, rejectWithdrawal, fetchTransactions, manualDeposit, searchUsersByEmail, fetchIncomingFunds, creditIncomingFund, fetchRevenueSummary, fetchTopTraders } from '../lib/admin-api';
import { supabase } from '../lib/supabase';

type FinTab = 'withdrawals' | 'incoming' | 'history' | 'deposit' | 'revenue';

interface Withdrawal {
  id: string; coin_symbol?: string; currency?: string; amount: number; status: string;
  created_at: string; user_email?: string; destination_address?: string;
  network?: string; receive_amount?: number; txid?: string;
  user_profiles?: { email: string; full_name: string };
}
interface Tx { id: string; type: string; symbol: string; amount: number; created_at: string; user_profiles?: { email: string }; notes?: string; }
interface Fund { id: string; wallet_address?: string; token_symbol?: string; amount: number; amount_usd?: number; status?: string; tx_hash?: string; network?: string; created_at: string; user_profiles?: { email: string }; user_id?: string; is_notified?: boolean; }
interface User { id: string; email: string; full_name: string; is_active: boolean; }

function RevenuePane() {
  const [rev, setRev] = useState<any>(null);
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [r, t] = await Promise.all([fetchRevenueSummary(), fetchTopTraders(8)]);
    setRev(r); setTraders(t);
    setLoading(false);
  }

  function fmt(n: number) {
    if (!n) return '$0.00';
    if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  function fmtV(n: number) {
    if (!n) return '$0';
    if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4" style={{ background: 'rgba(0,220,130,0.06)', border: '1px solid rgba(0,220,130,0.15)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Komisyon & Gelir Takibi</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>İşlem ücretlerinden elde edilen gelir</p>
          </div>
          <button onClick={load} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
      </div>

      {/* Revenue cards */}
      {loading ? (
        Array.from({length:4}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-20" />)
      ) : rev && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Bugün', val: fmt(rev.today), sub: `${rev.tx_count_today} işlem`, color: '#00DC82', bg: 'rgba(0,220,130,0.07)' },
              { label: 'Bu Hafta', val: fmt(rev.week), sub: 'son 7 gün', color: '#3D7FFF', bg: 'rgba(61,127,255,0.07)' },
              { label: 'Bu Ay', val: fmt(rev.month), sub: `${rev.tx_count_month} işlem`, color: '#F0B90B', bg: 'rgba(240,185,11,0.07)' },
              { label: 'Toplam', val: fmt(rev.total), sub: 'tüm zamanlar', color: '#FF9800', bg: 'rgba(255,152,0,0.07)' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Info note */}
          {rev.total === 0 && (
            <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                💡 Komisyon verileri <span className="text-white">trading_fee</span> tipli işlemlerden hesaplanmaktadır.
                Futures işlemlerinde ücretler kaydedilince burada görünür.
              </p>
            </div>
          )}
        </>
      )}

      {/* Top traders */}
      {traders.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>EN YÜKSEK HACİMLİ KULLANICILAR</p>
          <div className="flex flex-col gap-2">
            {traders.map((t: any, i: number) => (
              <div key={t.user_id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-none"
                  style={{ background: i===0?'rgba(240,185,11,0.25)':i===1?'rgba(192,192,192,0.15)':i===2?'rgba(205,127,50,0.15)':'rgba(255,255,255,0.07)', color: i===0?'#F0B90B':i===1?'#C0C0C0':i===2?'#CD7F32':'rgba(255,255,255,0.5)' }}>
                  {i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.email?.split('@')[0]||'Kullanıcı'}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.count} pozisyon</p>
                </div>
                <div className="text-right flex-none">
                  <p className="text-sm font-bold" style={{ color: '#F0B90B' }}>{fmtV(t.volume)}</p>
                  <p className="text-xs" style={{ color: t.pnl>=0?'#00DC82':'#FF4757' }}>
                    {t.pnl>=0?'+':''}{fmtV(t.pnl)} P&L
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {traders.length === 0 && !loading && (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Henüz veri yok</p>
        </div>
      )}
    </div>
  );
}

export default function Finance() {
  const [tab, setTab] = useState<FinTab>('withdrawals');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [txidInput, setTxidInput] = useState('');
  const [wdStatus, setWdStatus] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  // Manual deposit
  const [depForm, setDepForm] = useState({ email: '', amount: '', symbol: 'USDT', txHash: '' });
  const [depResults, setDepResults] = useState<User[]>([]);
  const [depTarget, setDepTarget] = useState<User | null>(null);
  const [depSaving, setDepSaving] = useState(false);

  useEffect(() => { load(); }, [tab, wdStatus]);

  useEffect(() => {
    const ch = supabase.channel('finance_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_transactions' }, () => {
        if (tab === 'withdrawals') loadWithdrawals();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  async function load() {
    setLoading(true);
    if (tab === 'withdrawals') await loadWithdrawals();
    else if (tab === 'history') setTxs(await fetchTransactions(80));
    else if (tab === 'incoming') setFunds(await fetchIncomingFunds(60));
    setLoading(false);
  }

  async function loadWithdrawals() {
    setWithdrawals(await fetchWithdrawals(wdStatus));
  }

  async function doApprove(w: Withdrawal) {
    setProcessing(w.id);
    const res = await approveWithdrawal(w.id, txidInput || undefined);
    if (res.ok && res.needsSecondApproval) { showToast('👥 1. onay alındı — ikinci admin onayı gerekli'); await loadWithdrawals(); }
    else if (res.ok) { showToast('✅ Çekim onaylandı'); await loadWithdrawals(); }
    else showToast('❌ Hata: ' + (res.error || 'bilinmeyen'));
    setProcessing(null); setExpandedId(null); setTxidInput('');
  }

  async function doReject() {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    const res = await rejectWithdrawal(rejectModal, rejectNotes || 'Admin tarafından reddedildi');
    if (res.ok) { showToast('🚫 Reddedildi — bakiye iade edildi'); await loadWithdrawals(); }
    else showToast('❌ Hata: ' + (res.error || 'bilinmeyen'));
    setProcessing(null); setRejectModal(null); setRejectNotes('');
  }

  async function doCredit(f: Fund) {
    if (!f.user_id) { showToast('⚠️ Kullanıcı eşleştirilmemiş'); return; }
    setProcessing(f.id);
    await creditIncomingFund(f.id, f.user_id, f.amount, f.token_symbol || 'USDT');
    showToast('✅ Bakiye eklendi');
    setFunds(await fetchIncomingFunds(60));
    setProcessing(null);
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

  function copy(s: string) { navigator.clipboard.writeText(s).catch(() => {}); showToast('📋 Kopyalandı'); }

  function timeAgo(dt: string) {
    const d = Date.now() - new Date(dt).getTime();
    if (d < 3600000) return `${Math.floor(d/60000)} dk`;
    if (d < 86400000) return `${Math.floor(d/3600000)} sa`;
    return `${Math.floor(d/86400000)} gün`;
  }

  const pendingWds = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing' || w.status === 'hold');
  const pendingAmt = pendingWds.reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const unnotified = funds.filter(f => !f.is_notified && !f.user_id);

  return (
    <div className="flex flex-col pb-28">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
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
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)' }}>
            <p className="text-xl font-bold" style={{ color: '#FF4757' }}>{pendingWds.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Bekleyen</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)' }}>
            <p className="text-base font-bold" style={{ color: '#FF9800' }}>${pendingAmt.toFixed(0)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Toplam</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)' }}>
            <p className="text-xl font-bold" style={{ color: '#F0B90B' }}>{unnotified.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Eşleşmemiş</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {([['withdrawals','Çekim'],['incoming','Gelen'],['revenue','Gelir'],['history','Geçmiş'],['deposit','Yatır']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex-none px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: tab === k ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${tab===k?'rgba(240,185,11,0.3)':'rgba(255,255,255,0.07)'}`, color: tab === k ? '#F0B90B' : 'rgba(255,255,255,0.35)' }}>
              {l}
              {k === 'withdrawals' && pendingWds.length > 0 ? ` (${pendingWds.length})` : ''}
              {k === 'incoming' && unnotified.length > 0 ? ` (${unnotified.length})` : ''}
            </button>
          ))}
        </div>

        {/* ── Withdrawals ── */}
        {tab === 'withdrawals' && (
          <div className="flex flex-col gap-3">
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {(['pending','completed','rejected','all'] as const).map(s => (
                <button key={s} onClick={() => setWdStatus(s)}
                  className="flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: wdStatus === s ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${wdStatus === s ? 'rgba(240,185,11,0.3)' : 'rgba(255,255,255,0.07)'}`, color: wdStatus === s ? '#F0B90B' : 'rgba(255,255,255,0.4)' }}>
                  {s === 'pending' ? 'Bekleyen' : s === 'completed' ? 'Tamamlandı' : s === 'rejected' ? 'Reddedildi' : 'Tümü'}
                </button>
              ))}
            </div>

            {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-24" />) :
             withdrawals.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm" style={{ color: '#00DC82' }}>Bekleyen çekim yok</p>
              </div>
            ) : withdrawals.map(w => {
              const isExpanded = expandedId === w.id;
              const isPending = w.status === 'pending' || w.status === 'processing' || w.status === 'hold';
              return (
                <div key={w.id} className="rounded-2xl overflow-hidden" style={{
                  background: isPending ? 'rgba(255,71,87,0.05)' : w.status === 'completed' ? 'rgba(0,220,130,0.04)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPending ? 'rgba(255,71,87,0.2)' : w.status === 'completed' ? 'rgba(0,220,130,0.15)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : w.id)} className="w-full p-4 text-left">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {w.user_email || w.user_profiles?.email || 'Bilinmeyen'}
                        </p>
                        <p className="text-xl font-black text-white">
                          {Number(w.receive_amount || w.amount).toFixed(4)}{' '}
                          <span style={{ color: '#F0B90B' }}>{w.coin_symbol || w.currency || 'USDT'}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={11} color="rgba(255,255,255,0.3)" />
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(w.created_at)} önce</span>
                          {w.network && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>{w.network}</span>}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{
                        background: isPending ? 'rgba(255,152,0,0.15)' : w.status === 'completed' ? 'rgba(0,220,130,0.15)' : 'rgba(255,71,87,0.15)',
                        color: isPending ? '#FF9800' : w.status === 'completed' ? '#00DC82' : '#FF4757',
                      }}>
                        {isPending ? 'Bekliyor' : w.status === 'completed' ? 'Tamamlandı' : 'Reddedildi'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {w.destination_address && (
                        <div className="mt-3">
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Hedef Adres</p>
                          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-xs font-mono text-white flex-1 break-all">{w.destination_address}</p>
                            <button onClick={() => copy(w.destination_address!)}><Copy size={13} color="#F0B90B" /></button>
                          </div>
                        </div>
                      )}
                      {isPending && (
                        <>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>TX Hash (isteğe bağlı)</p>
                            <input value={txidInput} onChange={e => setTxidInput(e.target.value)}
                              placeholder="0x…" className="w-full rounded-xl px-3 py-2.5 text-xs font-mono text-white outline-none"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => doApprove(w)} disabled={!!processing}
                              className="py-3 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 transition-opacity"
                              style={{ background: '#00DC82', opacity: processing ? 0.6 : 1 }}>
                              <Check size={15} /> Onayla
                            </button>
                            <button onClick={() => { setRejectModal(w.id); setRejectNotes(''); }} disabled={!!processing}
                              className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                              style={{ background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', color: '#FF4757', opacity: processing ? 0.6 : 1 }}>
                              <X size={15} /> Reddet
                            </button>
                          </div>
                        </>
                      )}
                      {w.txid && (
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>TX Hash</p>
                          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(0,220,130,0.06)' }}>
                            <p className="text-xs font-mono text-green-400 flex-1 break-all">{w.txid}</p>
                            <button onClick={() => copy(w.txid!)}><Copy size={13} color="#00DC82" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Incoming Funds ── */}
        {tab === 'incoming' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)' }}>
              <ArrowDownLeft size={16} color="#FF9800" />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Zincirden gelen transferler. Eşleştirilmemiş işlemlere bakiye ekleyebilirsiniz.</p>
            </div>
            {loading ? Array.from({length:4}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-16" />) :
             funds.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Gelen fon kaydı yok</p>
              </div>
            ) : funds.map(f => (
              <div key={f.id} className="rounded-2xl p-4" style={{
                background: f.is_notified ? 'rgba(0,220,130,0.04)' : f.user_id ? 'rgba(255,255,255,0.04)' : 'rgba(255,152,0,0.05)',
                border: `1px solid ${f.is_notified ? 'rgba(0,220,130,0.12)' : f.user_id ? 'rgba(255,255,255,0.07)' : 'rgba(255,152,0,0.2)'}`,
              }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-base font-black text-white">
                      {Number(f.amount).toFixed(4)} <span style={{ color: '#F0B90B' }}>{f.token_symbol || 'USDT'}</span>
                      {f.amount_usd && <span className="text-xs font-normal ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>(${f.amount_usd.toFixed(2)})</span>}
                    </p>
                    {f.user_profiles?.email && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.user_profiles.email}</p>}
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.network} · {timeAgo(f.created_at)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                    background: f.is_notified ? 'rgba(0,220,130,0.15)' : f.user_id ? 'rgba(61,127,255,0.15)' : 'rgba(255,152,0,0.15)',
                    color: f.is_notified ? '#00DC82' : f.user_id ? '#3D7FFF' : '#FF9800',
                  }}>
                    {f.is_notified ? 'Yatırıldı' : f.user_id ? 'Eşleştirildi' : 'Bekliyor'}
                  </span>
                </div>
                {f.tx_hash && (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.tx_hash}</p>
                    <button onClick={() => copy(f.tx_hash!)}><Copy size={12} color="rgba(255,255,255,0.3)" /></button>
                  </div>
                )}
                {!f.is_notified && f.user_id && (
                  <button onClick={() => doCredit(f)} disabled={processing === f.id}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-opacity"
                    style={{ background: '#00DC82', color: 'black', opacity: processing === f.id ? 0.6 : 1 }}>
                    {processing === f.id ? 'Yatırılıyor…' : 'Bakiye Ekle'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Transaction history ── */}
        {tab === 'history' && (
          <div className="flex flex-col gap-2">
            {loading ? Array.from({length:6}).map((_,i)=><div key={i} className="skeleton rounded-xl h-14" />) :
             txs.map(t => {
               const isPlus = ['admin_credit','admin_send','deposit','referral_bonus'].includes(t.type);
               return (
                 <div key={t.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                   <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                     style={{ background: isPlus ? 'rgba(0,220,130,0.1)' : 'rgba(255,71,87,0.1)' }}>
                     {isPlus ? <TrendingUp size={15} color="#00DC82" /> : <TrendingDown size={15} color="#FF4757" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-white truncate">{t.type.replace(/_/g,' ')}</p>
                     <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.user_profiles?.email || t.notes || '—'}</p>
                   </div>
                   <div className="text-right flex-none">
                     <p className="text-sm font-bold" style={{ color: isPlus ? '#00DC82' : '#FF4757' }}>
                       {isPlus?'+':'-'}{Number(t.amount).toFixed(2)} {t.symbol}
                     </p>
                     <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(t.created_at)}</p>
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* ── Revenue ── */}
        {tab === 'revenue' && <RevenuePane />}

        {/* ── Manual deposit ── */}
        {tab === 'deposit' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(61,127,255,0.06)', border: '1px solid rgba(61,127,255,0.15)' }}>
              <p className="text-sm font-bold text-white mb-1">Manuel Yatırım</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Onaylanan zincir işlemi sonrası kullanıcıya bakiye yatır</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Kullanıcı Email</label>
              <input value={depForm.email} onChange={e => searchDep(e.target.value)} placeholder="Email ara…"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
              {depResults.length > 0 && (
                <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {depResults.map(u => (
                    <button key={u.id} onClick={() => { setDepTarget(u); setDepResults([]); setDepForm(f => ({ ...f, email: u.email })); }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        {(u.email||'?')[0].toUpperCase()}
                      </div>
                      <div><p className="text-sm text-white">{u.email}</p></div>
                    </button>
                  ))}
                </div>
              )}
              {depTarget && (
                <div className="mt-2 rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(0,220,130,0.07)', border: '1px solid rgba(0,220,130,0.2)' }}>
                  <p className="text-sm font-medium text-white">{depTarget.email}</p>
                  <button onClick={() => setDepTarget(null)}><X size={14} color="#555" /></button>
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
                placeholder="0x…" className="w-full rounded-xl px-4 py-3 text-white text-xs font-mono outline-none"
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
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
              placeholder="Neden reddediyorsunuz? (isteğe bağlı)" rows={3}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setRejectModal(null)} className="py-3.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>İptal</button>
              <button onClick={doReject} className="py-3.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,71,87,0.2)', border: '1px solid rgba(255,71,87,0.4)', color: '#FF4757' }}>Reddet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
