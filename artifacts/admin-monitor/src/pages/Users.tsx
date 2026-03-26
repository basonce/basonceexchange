import { useEffect, useState } from 'react';
import { Search, Plus, Send, UserX, UserCheck, RefreshCw, ChevronRight, X, Check } from 'lucide-react';
import { fetchUsers, fetchUserBalances, addBalance, sendCoins, toggleUserActive, searchUsersByEmail } from '../lib/admin-api';
import GlassCard from '../components/ui/GlassCard';

const SYMBOLS = ['USDT','BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','LINK','EQ','BNC'];

interface User { id: string; email: string; full_name: string; is_admin: boolean; is_active: boolean; created_at: string; }
interface Balance { id: string; user_id: string; symbol: string; balance: number; locked_balance: number; }

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [modal, setModal] = useState<'add' | 'send' | null>(null);
  const [form, setForm] = useState({ symbol: 'USDT', amount: '', notes: '' });
  const [sendForm, setSendForm] = useState({ toEmail: '', symbol: 'USDT', amount: '', notes: '' });
  const [sendResults, setSendResults] = useState<User[]>([]);
  const [sendTarget, setSendTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setUsers(await fetchUsers(150));
    setLoading(false);
  }

  async function selectUser(u: User) {
    setSelected(u);
    setBalanceLoading(true);
    setBalances(await fetchUserBalances(u.id));
    setBalanceLoading(false);
  }

  async function handleAddBalance() {
    if (!selected || !form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      await addBalance(selected.id, form.symbol, parseFloat(form.amount), form.notes);
      showToast(`✅ ${form.amount} ${form.symbol} eklendi`);
      setModal(null);
      setForm({ symbol: 'USDT', amount: '', notes: '' });
      setBalances(await fetchUserBalances(selected.id));
    } catch { showToast('❌ Hata oluştu'); }
    setSaving(false);
  }

  async function handleSend() {
    if (!sendTarget || !sendForm.amount || parseFloat(sendForm.amount) <= 0) return;
    setSaving(true);
    try {
      await sendCoins(true, sendTarget.id, sendForm.symbol, parseFloat(sendForm.amount), sendForm.notes);
      showToast(`✅ ${sendForm.amount} ${sendForm.symbol} gönderildi`);
      setModal(null);
      setSendForm({ toEmail: '', symbol: 'USDT', amount: '', notes: '' });
      setSendTarget(null);
    } catch { showToast('❌ Hata oluştu'); }
    setSaving(false);
  }

  async function handleToggleActive(u: User) {
    await toggleUserActive(u.id, !u.is_active);
    showToast(u.is_active ? '🔒 Hesap devre dışı bırakıldı' : '✅ Hesap aktif edildi');
    setSelected({ ...u, is_active: !u.is_active });
    setUsers(users.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function searchSend(email: string) {
    setSendForm(f => ({ ...f, toEmail: email }));
    if (email.length >= 3) setSendResults(await searchUsersByEmail(email));
    else setSendResults([]);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const filtered = users.filter(u =>
    !search ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const today = new Date().toISOString().split('T')[0];
  const todayUsers = users.filter(u => u.created_at?.startsWith(today)).length;

  return (
    <div className="flex flex-col pb-28">
      {/* Toast */}
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
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#3D7FFF', letterSpacing: '0.08em' }}>KULLANICI YÖNETİMİ</p>
            <h1 className="text-2xl font-black text-white">Üyeler</h1>
          </div>
          <button onClick={load} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Toplam', val: totalUsers, color: '#ffffff' },
            { label: 'Aktif', val: activeUsers, color: '#00DC82' },
            { label: 'Bugün', val: todayUsers, color: '#F0B90B' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick send */}
        <button
          onClick={() => { setModal('send'); setSendTarget(null); setSendForm({ toEmail: '', symbol: 'USDT', amount: '', notes: '' }); }}
          className="rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          style={{ background: 'rgba(240,185,11,0.07)', border: '1px solid rgba(240,185,11,0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.15)' }}>
            <Send size={18} color="#F0B90B" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Coin Gönder</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Herhangi bir kullanıcıya bakiye yolla</p>
          </div>
        </button>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" color="rgba(255,255,255,0.3)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Email veya isim ara…"
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* User list */}
        <div className="flex flex-col gap-2">
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton rounded-2xl h-16" />
          )) : filtered.map(u => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform w-full"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-none"
                style={{ background: u.is_admin ? 'rgba(240,185,11,0.2)' : 'rgba(255,255,255,0.08)', color: u.is_admin ? '#F0B90B' : 'rgba(255,255,255,0.7)' }}
              >
                {(u.full_name || u.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white truncate">{u.full_name || u.email?.split('@')[0] || 'Unknown'}</p>
                  {u.is_admin && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,185,11,0.2)', color: '#F0B90B' }}>ADMİN</span>}
                  {!u.is_active && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,71,87,0.2)', color: '#FF4757' }}>BANDI</span>}
                </div>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.email}</p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </button>
          ))}
        </div>
      </div>

      {/* User detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-[100]" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 slide-up"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }} />
            {/* User info */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(61,127,255,0.2)', color: '#3D7FFF' }}>
                {(selected.full_name || selected.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{selected.full_name || 'İsimsiz Kullanıcı'}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: selected.is_active ? 'rgba(0,220,130,0.15)' : 'rgba(255,71,87,0.15)', color: selected.is_active ? '#00DC82' : '#FF4757' }}>
                    {selected.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  {selected.is_admin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(240,185,11,0.15)', color: '#F0B90B' }}>Admin</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <ActionBtn icon={<Plus size={16} />} label="Bakiye Ekle" color="#00DC82" onClick={() => setModal('add')} />
              <ActionBtn icon={<Send size={16} />} label="Coin Gönder" color="#3D7FFF" onClick={() => { setModal('send'); setSendTarget(selected); setSendForm(f => ({ ...f, toEmail: selected.email })); }} />
              <ActionBtn icon={selected.is_active ? <UserX size={16} /> : <UserCheck size={16} />} label={selected.is_active ? 'Devre Dışı' : 'Aktif Et'} color={selected.is_active ? '#FF4757' : '#00DC82'} onClick={() => handleToggleActive(selected)} />
            </div>

            {/* Balances */}
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>BAKIYELER</p>
            {balanceLoading ? (
              <div className="skeleton rounded-xl h-12" />
            ) : balances.length === 0 ? (
              <p className="text-center py-4 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Bakiye bulunamadı</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {balances.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-sm font-semibold text-white">{b.symbol}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#F0B90B' }}>{parseFloat(String(b.balance)).toFixed(4)}</p>
                      {parseFloat(String(b.locked_balance)) > 0 && (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>🔒 {parseFloat(String(b.locked_balance)).toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Registration date */}
            <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Kayıt: {new Date(selected.created_at).toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
      )}

      {/* Add balance modal */}
      {modal === 'add' && (
        <ModalSheet title="Bakiye Ekle" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Coin</label>
              <select value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {SYMBOLS.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Miktar</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Not (isteğe bağlı)</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Açıklama…" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <button onClick={handleAddBalance} disabled={saving}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black transition-opacity" style={{ background: '#00DC82', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Ekleniyor…' : `${form.amount || '0'} ${form.symbol} Ekle`}
            </button>
          </div>
        </ModalSheet>
      )}

      {/* Send coins modal */}
      {modal === 'send' && (
        <ModalSheet title="Coin Gönder" onClose={() => { setModal(null); setSendTarget(null); }}>
          <div className="space-y-3">
            {!sendTarget ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Alıcı Email</label>
                <input value={sendForm.toEmail} onChange={e => searchSend(e.target.value)}
                  placeholder="Email ara…" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                {sendResults.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    {sendResults.map(u => (
                      <button key={u.id} onClick={() => { setSendTarget(u); setSendResults([]); }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-white">{u.full_name || u.email?.split('@')[0]}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(0,220,130,0.08)', border: '1px solid rgba(0,220,130,0.2)' }}>
                <div>
                  <p className="text-sm font-semibold text-white">{sendTarget.full_name || sendTarget.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{sendTarget.email}</p>
                </div>
                <button onClick={() => setSendTarget(null)} className="text-gray-500"><X size={16} /></button>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Coin</label>
              <select value={sendForm.symbol} onChange={e => setSendForm(f => ({ ...f, symbol: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {SYMBOLS.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Miktar</label>
              <input type="number" value={sendForm.amount} onChange={e => setSendForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <button onClick={handleSend} disabled={saving || !sendTarget}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black transition-opacity" style={{ background: '#3D7FFF', opacity: saving || !sendTarget ? 0.5 : 1 }}>
              {saving ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </div>
        </ModalSheet>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
      style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
      {icon}
      <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
    </button>
  );
}

function ModalSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 slide-up"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center justify-between mb-5">
          <p className="text-lg font-bold text-white">{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={16} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
