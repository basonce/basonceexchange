import { useEffect, useState } from 'react';
import { Search, Plus, Send, UserX, UserCheck, RefreshCw, ChevronRight, X, Lock, ShieldAlert, Gift } from 'lucide-react';
import { fetchUsers, fetchUserBalances, addBalance, sendCoins, toggleUserActive, searchUsersByEmail, fetchUserRestrictions, saveUserRestrictions, markAsBonus, fetchGlobalDefaults, saveGlobalDefaults, applyZeroFeeToLastN } from '../lib/admin-api';
import type { UserRestrictions, GlobalDefaults } from '../lib/admin-api';

const SYMBOLS = ['USDT','BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','LINK','EQ','BNC'];

const PAIR_GROUPS: { label: string; color: string; pairs: string[] }[] = [
  {
    label: '🥇 Değerli Metaller',
    color: '#F0B90B',
    pairs: ['XAU/USDT','XAG/USDT','XPT/USDT','XPD/USDT','COPPER/USDT'],
  },
  {
    label: '🛢️ Emtia',
    color: '#F97316',
    pairs: ['WTI/USDT','BRENT/USDT','NATGAS/USDT','COFFEE/USDT','COCOA/USDT','SUGAR/USDT','WHEAT/USDT','CORN/USDT','SOYBEAN/USDT'],
  },
  {
    label: '📈 Endeksler',
    color: '#3B82F6',
    pairs: ['SPX/USDT','NDX/USDT','DJI/USDT','DAX/USDT','FTSE/USDT','NKY/USDT'],
  },
  {
    label: '💹 Hisseler',
    color: '#2ECC71',
    pairs: ['TSLA/USDT','AAPL/USDT','NVDA/USDT','MSFT/USDT','AMZN/USDT','GOOGL/USDT','META/USDT','AMD/USDT','COIN/USDT','MSTR/USDT'],
  },
  {
    label: '₿ Kripto',
    color: '#F0B90B',
    pairs: ['BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','XRP/USDT','ADA/USDT','DOGE/USDT','AVAX/USDT','LINK/USDT'],
  },
];

interface User { id: string; email: string; full_name: string; is_admin?: boolean; is_active?: boolean; created_at?: string; }
interface Balance { id: string; user_id: string; symbol: string; balance: number; locked_balance: number; }

type DetailTab = 'balances' | 'restrictions';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('balances');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [modal, setModal] = useState<'add' | 'send' | 'mark_bonus' | null>(null);
  const [form, setForm] = useState({ symbol: 'USDT', amount: '', notes: '', isBonus: false, bonusUsd: '' });
  const [bonusForm, setBonusForm] = useState({ symbol: 'EQ', usdValue: '', notes: '' });
  const [sendForm, setSendForm] = useState({ toEmail: '', symbol: 'USDT', amount: '', notes: '' });
  const [sendResults, setSendResults] = useState<User[]>([]);
  const [sendTarget, setSendTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [restrictions, setRestrictions] = useState<UserRestrictions | null>(null);
  const [restrictionsLoading, setRestrictionsLoading] = useState(false);
  const [restrictionForm, setRestrictionForm] = useState<UserRestrictions>({
    user_id: '',
    pair_lock_enabled: false,
    allowed_pairs: [],
    withdrawal_asset: 'BTC',
    withdrawal_fee_usdt: 0,
    usdt_frozen: false,
    withdrawal_frozen: false,
    min_volume_usdt: 0,
    min_deposit_usdt: 0,
    zero_fee: false,
  });
  const [globalDefaults, setGlobalDefaults] = useState<GlobalDefaults>({});
  const [globalSaving, setGlobalSaving] = useState(false);
  const [applyingLastN, setApplyingLastN] = useState(false);
  const [quickVolumeInput, setQuickVolumeInput] = useState('');
  const [quickDepositInput, setQuickDepositInput] = useState('');
  const [restrictionSaving, setRestrictionSaving] = useState(false);
  const [restrictionError, setRestrictionError] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickFeeInput, setQuickFeeInput] = useState('');

  useEffect(() => { load(); loadGlobals(); }, []);

  async function load() {
    setLoading(true);
    setUsers(await fetchUsers(150));
    setLoading(false);
  }

  async function loadGlobals() {
    setGlobalDefaults(await fetchGlobalDefaults());
  }

  async function toggleGlobalZeroFee() {
    setGlobalSaving(true);
    const next = { ...globalDefaults, zero_fee_for_new_users: !globalDefaults.zero_fee_for_new_users };
    const r = await saveGlobalDefaults(next);
    if (r.ok) {
      setGlobalDefaults(next);
      showToast(next.zero_fee_for_new_users ? '✅ Yeni kullanıcılar artık %0 fee' : '✅ Yeni kullanıcılar normal fee\'ye döndü');
    } else {
      showToast('❌ Hata: ' + r.error);
    }
    setGlobalSaving(false);
  }

  async function handleApplyLastN(n: number) {
    if (!confirm(`Son ${n} kullanıcıya %0 fee uygulanacak. Onaylıyor musun?`)) return;
    setApplyingLastN(true);
    const r = await applyZeroFeeToLastN(n);
    if (r.ok) showToast(`✅ ${r.applied}/${n} kullanıcıya %0 fee uygulandı`);
    else showToast('❌ Hata: ' + r.error);
    setApplyingLastN(false);
    load();
  }

  async function selectUser(u: User) {
    setSelected(u);
    setDetailTab('balances');
    setBalanceLoading(true);
    setBalances(await fetchUserBalances(u.id));
    setBalanceLoading(false);
    loadRestrictions(u.id);
  }

  async function loadRestrictions(userId: string) {
    setRestrictionsLoading(true);
    setRestrictionError('');
    const r = await fetchUserRestrictions(userId);
    const defaults = {
      user_id: userId,
      pair_lock_enabled: false,
      allowed_pairs: [],
      withdrawal_asset: 'BTC',
      withdrawal_fee_usdt: 0,
      usdt_frozen: false,
      withdrawal_frozen: false,
      min_volume_usdt: 0,
      min_deposit_usdt: 0,
      zero_fee: false,
    };
    if (r) {
      const merged = { ...defaults, ...r };
      setRestrictions(merged);
      setRestrictionForm(merged);
      setQuickFeeInput(r.withdrawal_fee_usdt > 0 ? String(r.withdrawal_fee_usdt) : '');
      setQuickVolumeInput((r.min_volume_usdt ?? 0) > 0 ? String(r.min_volume_usdt) : '');
      setQuickDepositInput((r.min_deposit_usdt ?? 0) > 0 ? String(r.min_deposit_usdt) : '');
    } else {
      setRestrictions(null);
      setRestrictionForm(defaults);
      setQuickFeeInput('');
      setQuickVolumeInput('');
      setQuickDepositInput('');
    }
    setRestrictionsLoading(false);
  }

  async function quickSaveField(patch: Partial<UserRestrictions>) {
    if (!selected) return;
    setQuickSaving(true);
    const existing = restrictionForm.user_id === selected.id ? restrictionForm : null;
    const base: UserRestrictions = {
      pair_lock_enabled: existing?.pair_lock_enabled ?? false,
      allowed_pairs: existing?.allowed_pairs ?? [],
      withdrawal_asset: existing?.withdrawal_asset ?? 'BTC',
      withdrawal_fee_usdt: existing?.withdrawal_fee_usdt ?? 0,
      usdt_frozen: existing?.usdt_frozen ?? false,
      withdrawal_frozen: existing?.withdrawal_frozen ?? false,
      min_volume_usdt: existing?.min_volume_usdt ?? 0,
      min_deposit_usdt: existing?.min_deposit_usdt ?? 0,
      zero_fee: existing?.zero_fee ?? false,
      custom_trade_fee_pct: existing?.custom_trade_fee_pct ?? 0,
      ...patch,
      user_id: selected.id,
    };
    const result = await saveUserRestrictions(base);
    if (result.ok) {
      setRestrictionForm(base);
      setRestrictions(base);
      showToast('✅ Kaydedildi');
    } else {
      showToast('❌ Hata: ' + result.error);
    }
    setQuickSaving(false);
  }

  async function handleAddBalance() {
    if (!selected || !form.amount || parseFloat(form.amount) <= 0) return;
    if (form.isBonus && form.symbol !== 'USDT' && (!form.bonusUsd || parseFloat(form.bonusUsd) <= 0)) {
      showToast('❌ Bonus için USD değerini gir');
      return;
    }
    setSaving(true);
    try {
      const bonusUsd = form.isBonus
        ? (form.symbol === 'USDT' ? parseFloat(form.amount) : parseFloat(form.bonusUsd))
        : undefined;
      await addBalance(selected.id, form.symbol, parseFloat(form.amount), form.notes, form.isBonus, bonusUsd);
      showToast(`✅ ${form.amount} ${form.symbol}${form.isBonus ? ' BONUS' : ''} eklendi`);
      setModal(null);
      setForm({ symbol: 'USDT', amount: '', notes: '', isBonus: false, bonusUsd: '' });
      setBalances(await fetchUserBalances(selected.id));
    } catch { showToast('❌ Hata oluştu'); }
    setSaving(false);
  }

  async function handleSend() {
    if (!sendTarget || !sendForm.amount || parseFloat(sendForm.amount) <= 0) return;
    if (form.isBonus && sendForm.symbol !== 'USDT' && (!form.bonusUsd || parseFloat(form.bonusUsd) <= 0)) {
      showToast('❌ Bonus için USD değerini gir');
      return;
    }
    setSaving(true);
    try {
      const bonusUsd = form.isBonus
        ? (sendForm.symbol === 'USDT' ? parseFloat(sendForm.amount) : parseFloat(form.bonusUsd))
        : undefined;
      await sendCoins(true, sendTarget.id, sendForm.symbol, parseFloat(sendForm.amount), sendForm.notes, form.isBonus, bonusUsd);
      showToast(`✅ ${sendForm.amount} ${sendForm.symbol}${form.isBonus ? ' BONUS' : ''} gönderildi`);
      setModal(null);
      setSendForm({ toEmail: '', symbol: 'USDT', amount: '', notes: '' });
      setForm(f => ({ ...f, isBonus: false, bonusUsd: '' }));
      setSendTarget(null);
    } catch { showToast('❌ Hata oluştu'); }
    setSaving(false);
  }

  async function handleMarkBonus() {
    if (!selected || !bonusForm.usdValue || parseFloat(bonusForm.usdValue) <= 0) {
      showToast('❌ USD değeri girin');
      return;
    }
    setSaving(true);
    try {
      await markAsBonus(selected.id, bonusForm.symbol, parseFloat(bonusForm.usdValue), bonusForm.notes);
      showToast(`✅ $${bonusForm.usdValue} bonus olarak işaretlendi (5x işlem hacmi şartı aktif)`);
      setModal(null);
      setBonusForm({ symbol: 'EQ', usdValue: '', notes: '' });
    } catch (e: any) {
      showToast('❌ ' + (e?.message || 'Hata oluştu'));
    }
    setSaving(false);
  }

  async function handleToggleActive(u: User) {
    await toggleUserActive(u.id, !u.is_active);
    showToast(u.is_active ? '🔒 Hesap devre dışı bırakıldı' : '✅ Hesap aktif edildi');
    setSelected({ ...u, is_active: !u.is_active });
    setUsers(users.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleSaveRestrictions() {
    if (!selected) return;
    setRestrictionSaving(true);
    setRestrictionError('');
    const payload = { ...restrictionForm, user_id: selected.id };
    const result = await saveUserRestrictions(payload);
    if (result.ok) {
      showToast('✅ Kısıtlamalar kaydedildi');
      setRestrictions(payload);
    } else {
      const errMsg = result.error || 'Bilinmeyen hata';
      if (errMsg.includes('relation') && errMsg.includes('does not exist')) {
        setRestrictionError('Tablo bulunamadı. Supabase SQL Editor\'da migration SQL\'ini çalıştırmayı unutmayın.');
      } else {
        setRestrictionError(errMsg);
      }
    }
    setRestrictionSaving(false);
  }

  function togglePair(pair: string) {
    setRestrictionForm(f => {
      const pairs = f.allowed_pairs.includes(pair)
        ? f.allowed_pairs.filter(p => p !== pair)
        : [...f.allowed_pairs, pair];
      return { ...f, allowed_pairs: pairs };
    });
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
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          {toast}
        </div>
      )}

      <div className="p-4 pt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#3D7FFF', letterSpacing: '0.08em' }}>KULLANICI YÖNETİMİ</p>
            <h1 className="text-2xl font-black text-white">Üyeler</h1>
          </div>
          <button onClick={load} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

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
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 slide-up overflow-y-auto"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
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
              <ActionBtn icon={<Gift size={16} />} label="🎁 Bonus İşaretle" color="#F0B90B" onClick={() => setModal('mark_bonus')} />
              <ActionBtn icon={selected.is_active ? <UserX size={16} /> : <UserCheck size={16} />} label={selected.is_active ? 'Devre Dışı' : 'Aktif Et'} color={selected.is_active ? '#FF4757' : '#00DC82'} onClick={() => handleToggleActive(selected)} />
            </div>

            {/* ═══ QUICK ACTIONS ═══ */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[11px] font-bold mb-3 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Hızlı İşlemler</p>
              {restrictionsLoading ? (
                <div className="flex gap-2">
                  <div className="flex-1 h-16 rounded-xl skeleton" />
                  <div className="flex-1 h-16 rounded-xl skeleton" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Row 1: USDT Dondur + Çekim Dondur */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* USDT Dondur */}
                    <button
                      onClick={() => !quickSaving && quickSaveField({ usdt_frozen: !restrictionForm.usdt_frozen })}
                      className="rounded-xl p-3 flex items-center justify-between transition-all active:scale-95"
                      style={{
                        background: restrictionForm.usdt_frozen ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                        border: restrictionForm.usdt_frozen ? '1px solid rgba(59,130,246,0.45)' : '1px solid rgba(255,255,255,0.1)',
                        opacity: quickSaving ? 0.6 : 1,
                      }}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold" style={{ color: restrictionForm.usdt_frozen ? '#60a5fa' : 'rgba(255,255,255,0.7)' }}>🧊 USDT</p>
                        <p className="text-[10px] mt-0.5" style={{ color: restrictionForm.usdt_frozen ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.3)' }}>
                          {restrictionForm.usdt_frozen ? 'Donduruldu' : 'Dondur'}
                        </p>
                      </div>
                      <div className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
                        style={{ background: restrictionForm.usdt_frozen ? '#3b82f6' : 'rgba(255,255,255,0.15)' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: restrictionForm.usdt_frozen ? '18px' : '2px' }} />
                      </div>
                    </button>

                    {/* Çekim Dondur */}
                    <button
                      onClick={() => !quickSaving && quickSaveField({ withdrawal_frozen: !restrictionForm.withdrawal_frozen })}
                      className="rounded-xl p-3 flex items-center justify-between transition-all active:scale-95"
                      style={{
                        background: restrictionForm.withdrawal_frozen ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                        border: restrictionForm.withdrawal_frozen ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.1)',
                        opacity: quickSaving ? 0.6 : 1,
                      }}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold" style={{ color: restrictionForm.withdrawal_frozen ? '#f87171' : 'rgba(255,255,255,0.7)' }}>🚫 Çekim</p>
                        <p className="text-[10px] mt-0.5" style={{ color: restrictionForm.withdrawal_frozen ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.3)' }}>
                          {restrictionForm.withdrawal_frozen ? 'Donduruldu' : 'Dondur'}
                        </p>
                      </div>
                      <div className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
                        style={{ background: restrictionForm.withdrawal_frozen ? '#ef4444' : 'rgba(255,255,255,0.15)' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: restrictionForm.withdrawal_frozen ? '18px' : '2px' }} />
                      </div>
                    </button>
                  </div>

                  {/* Row 2: FEE input */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      💰 ÇEKİM FEE — Her çekimde USDT kesilir (BTC dahil tüm coinler)
                    </p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={quickFeeInput}
                        onChange={e => setQuickFeeInput(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                      />
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>USDT</span>
                      <button
                        onClick={() => {
                          const fee = parseFloat(quickFeeInput) || 0;
                          quickSaveField({ withdrawal_fee_usdt: fee });
                          if (fee === 0) setQuickFeeInput('');
                        }}
                        disabled={quickSaving}
                        className="px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                        style={{ background: '#F0B90B', color: '#000', opacity: quickSaving ? 0.6 : 1 }}
                      >
                        {quickSaving ? '...' : 'Kaydet'}
                      </button>
                    </div>
                    {restrictionForm.withdrawal_fee_usdt > 0 && (
                      <p className="text-[10px] mt-1.5 font-semibold" style={{ color: '#F0B90B' }}>
                        ✓ Aktif fee: {restrictionForm.withdrawal_fee_usdt} USDT/çekim
                      </p>
                    )}
                  </div>

                  {/* Row 3: Bonus unlock thresholds (volume + deposit) */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: 'rgba(216,180,254,0.9)' }}>
                      🎁 BONUS ÇEKİM KİLİDİ — Bu eşikler dolmadan bonus fonlar çekilemez
                    </p>

                    {/* Volume threshold */}
                    <div className="flex gap-2 items-center mb-2">
                      <span className="text-[10px] font-semibold w-16" style={{ color: 'rgba(216,180,254,0.7)' }}>📊 Hacim</span>
                      <input
                        type="number"
                        value={quickVolumeInput}
                        onChange={e => setQuickVolumeInput(e.target.value)}
                        placeholder="25000"
                        min="0"
                        className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ border: '1px solid rgba(168,85,247,0.35)' }}
                      />
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>USDT</span>
                    </div>

                    {/* Deposit threshold */}
                    <div className="flex gap-2 items-center mb-2">
                      <span className="text-[10px] font-semibold w-16" style={{ color: 'rgba(216,180,254,0.7)' }}>💰 Yatırım</span>
                      <input
                        type="number"
                        value={quickDepositInput}
                        onChange={e => setQuickDepositInput(e.target.value)}
                        placeholder="200"
                        min="0"
                        className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ border: '1px solid rgba(168,85,247,0.35)' }}
                      />
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>USDT</span>
                    </div>

                    <button
                      onClick={() => {
                        const vol = parseFloat(quickVolumeInput) || 0;
                        const dep = parseFloat(quickDepositInput) || 0;
                        quickSaveField({ min_volume_usdt: vol, min_deposit_usdt: dep });
                      }}
                      disabled={quickSaving}
                      className="w-full py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                      style={{ background: '#a855f7', color: '#fff', opacity: quickSaving ? 0.6 : 1 }}
                    >
                      {quickSaving ? '...' : '💾 Kilit Limitlerini Kaydet'}
                    </button>

                    {((restrictionForm.min_volume_usdt ?? 0) > 0 || (restrictionForm.min_deposit_usdt ?? 0) > 0) && (
                      <p className="text-[10px] mt-1.5 font-semibold" style={{ color: '#c4b5fd' }}>
                        ✓ Aktif kilit:
                        {(restrictionForm.min_volume_usdt ?? 0) > 0 && ` ${restrictionForm.min_volume_usdt!.toLocaleString()} USDT hacim`}
                        {(restrictionForm.min_volume_usdt ?? 0) > 0 && (restrictionForm.min_deposit_usdt ?? 0) > 0 && ' VEYA'}
                        {(restrictionForm.min_deposit_usdt ?? 0) > 0 && ` ${restrictionForm.min_deposit_usdt!.toLocaleString()} USDT yatırım`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(['balances', 'restrictions'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: detailTab === tab ? 'rgba(61,127,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: detailTab === tab ? '#3D7FFF' : 'rgba(255,255,255,0.4)',
                    border: detailTab === tab ? '1px solid rgba(61,127,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {tab === 'balances' ? 'Bakiyeler' : 'Kısıtlamalar'}
                </button>
              ))}
            </div>

            {detailTab === 'balances' && (
              <>
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
                <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Kayıt: {selected.created_at ? new Date(selected.created_at).toLocaleString('tr-TR') : '—'}
                </p>
              </>
            )}

            {detailTab === 'restrictions' && (
              <div className="flex flex-col gap-4">
                {restrictionsLoading ? (
                  <div className="skeleton rounded-xl h-32" />
                ) : (
                  <>
                    {restrictionError && (
                      <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', color: '#FF4757' }}>
                        ⚠️ {restrictionError}
                      </div>
                    )}

                    {/* USDT Freeze Toggle — single button, freezes all USDT ops */}
                    <div className="rounded-2xl p-4" style={{
                      background: restrictionForm.usdt_frozen ? 'rgba(255,71,87,0.08)' : 'rgba(255,255,255,0.04)',
                      border: restrictionForm.usdt_frozen ? '1px solid rgba(255,71,87,0.35)' : '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🧊</span>
                          <span className="text-sm font-semibold text-white">USDT Kilidi</span>
                          {restrictionForm.usdt_frozen && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,71,87,0.2)', color: '#FF4757' }}>AKTİF</span>
                          )}
                        </div>
                        <button
                          onClick={() => setRestrictionForm(f => ({ ...f, usdt_frozen: !f.usdt_frozen }))}
                          className="w-11 h-6 rounded-full relative transition-colors"
                          style={{ background: restrictionForm.usdt_frozen ? '#FF4757' : 'rgba(255,255,255,0.12)' }}
                        >
                          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                            style={{ left: restrictionForm.usdt_frozen ? '22px' : '2px' }} />
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Açıldığında kullanıcının USDT bakiyesi tamamen dondurulur — spot alım-satım, çekim ve transfer dahil hiçbir yerde USDT kullanamaz.
                      </p>
                      {restrictionForm.usdt_frozen && (
                        <div className="mt-2 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(255,71,87,0.12)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.2)' }}>
                          🔒 Bu kullanıcının USDT işlemleri dondurulmuş
                        </div>
                      )}
                    </div>

                    {/* Pair Lock Toggle */}
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Lock size={15} color="#FF4757" />
                          <span className="text-sm font-semibold text-white">İşlem Kilidi</span>
                        </div>
                        <button
                          onClick={() => setRestrictionForm(f => ({ ...f, pair_lock_enabled: !f.pair_lock_enabled }))}
                          className="w-11 h-6 rounded-full relative transition-colors"
                          style={{ background: restrictionForm.pair_lock_enabled ? '#FF4757' : 'rgba(255,255,255,0.12)' }}
                        >
                          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                            style={{ left: restrictionForm.pair_lock_enabled ? '22px' : '2px' }} />
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Etkinleştirildiğinde kullanıcı yalnızca seçilen pariteler üzerinden işlem yapabilir. USDT satışı engellenir.
                      </p>

                      {restrictionForm.pair_lock_enabled && (
                        <div className="mt-3 space-y-3">
                          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>İZİN VERİLEN PARİTELER</p>
                          {PAIR_GROUPS.map(group => (
                            <div key={group.label}>
                              <p className="text-[10px] font-bold mb-1.5" style={{ color: group.color, letterSpacing: '0.05em' }}>{group.label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {group.pairs.map(pair => {
                                  const selected = restrictionForm.allowed_pairs.includes(pair);
                                  return (
                                    <button
                                      key={pair}
                                      onClick={() => togglePair(pair)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                                      style={{
                                        background: selected ? `${group.color}25` : 'rgba(255,255,255,0.05)',
                                        border: selected ? `1px solid ${group.color}60` : '1px solid rgba(255,255,255,0.08)',
                                        color: selected ? group.color : 'rgba(255,255,255,0.4)',
                                      }}
                                    >
                                      {pair}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {restrictionForm.allowed_pairs.length === 0 && (
                            <p className="text-xs" style={{ color: 'rgba(255,165,0,0.8)' }}>⚠️ En az bir parite seçin</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Withdrawal Settings */}
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert size={15} color="#F0B90B" />
                        <span className="text-sm font-semibold text-white">Çekim Ayarları</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Çekim Varlığı (Kilitli kullanıcılar için)</label>
                          <select
                            value={restrictionForm.withdrawal_asset}
                            onChange={e => setRestrictionForm(f => ({ ...f, withdrawal_asset: e.target.value }))}
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            {['BTC','ETH','BNB','USDT'].map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Özel USDT Çekim Ücreti</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={restrictionForm.withdrawal_fee_usdt}
                              onChange={e => setRestrictionForm(f => ({ ...f, withdrawal_fee_usdt: parseFloat(e.target.value) || 0 }))}
                              className="w-full rounded-xl px-3 py-2.5 pr-16 text-sm text-white outline-none"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>USDT</span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            0 = varsayılan ücret geçerli. Pozitif değer kullanıcı bu ücreti ödemeden çekim yapamaz.
                          </p>
                        </div>
                      </div>
                    </div>

                    {restrictions && (
                      <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(0,220,130,0.08)', border: '1px solid rgba(0,220,130,0.2)', color: 'rgba(0,220,130,0.8)' }}>
                        ✓ Kısıtlamalar aktif — USDT Kilidi: {restrictions.usdt_frozen ? '🔒 Açık' : 'Kapalı'} · Parite Kilidi: {restrictions.pair_lock_enabled ? 'Açık' : 'Kapalı'} · Çekim Fee: {restrictions.withdrawal_fee_usdt} USDT
                      </div>
                    )}

                    <button
                      onClick={handleSaveRestrictions}
                      disabled={restrictionSaving}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity"
                      style={{ background: '#F0B90B', color: '#000', opacity: restrictionSaving ? 0.6 : 1 }}
                    >
                      {restrictionSaving ? 'Kaydediliyor…' : 'Kısıtlamaları Kaydet'}
                    </button>
                  </>
                )}
              </div>
            )}
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

            <label className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
              style={{ background: form.isBonus ? 'rgba(240,185,11,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.isBonus ? 'rgba(240,185,11,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
              <input type="checkbox" checked={form.isBonus} onChange={e => setForm(f => ({ ...f, isBonus: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">🎁 Bonus olarak gönder</p>
                <p className="text-xs text-gray-400 mt-0.5">Kullanıcı çekemez. 5x işlem hacmi şartı aktif olur.</p>
              </div>
            </label>

            {form.isBonus && form.symbol !== 'USDT' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bonus USD değeri (zorunlu)</label>
                <input type="number" value={form.bonusUsd} onChange={e => setForm(f => ({ ...f, bonusUsd: e.target.value }))}
                  placeholder="örn. 250" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(240,185,11,0.3)' }} />
                <p className="text-xs text-gray-500 mt-1">Çekim için: ${(parseFloat(form.bonusUsd) || 0) * 5} işlem hacmi gerekir</p>
              </div>
            )}

            <button onClick={handleAddBalance} disabled={saving}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black transition-opacity" style={{ background: form.isBonus ? '#F0B90B' : '#00DC82', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Ekleniyor…' : `${form.amount || '0'} ${form.symbol}${form.isBonus ? ' BONUS' : ''} Ekle`}
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
            <label className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
              style={{ background: form.isBonus ? 'rgba(240,185,11,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.isBonus ? 'rgba(240,185,11,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
              <input type="checkbox" checked={form.isBonus} onChange={e => setForm(f => ({ ...f, isBonus: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">🎁 Bonus olarak gönder</p>
                <p className="text-xs text-gray-400 mt-0.5">Kullanıcı çekemez. 5x işlem hacmi şartı aktif olur.</p>
              </div>
            </label>

            {form.isBonus && sendForm.symbol !== 'USDT' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bonus USD değeri (zorunlu)</label>
                <input type="number" value={form.bonusUsd} onChange={e => setForm(f => ({ ...f, bonusUsd: e.target.value }))}
                  placeholder="örn. 250" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(240,185,11,0.3)' }} />
                <p className="text-xs text-gray-500 mt-1">Çekim için: ${(parseFloat(form.bonusUsd) || 0) * 5} işlem hacmi gerekir</p>
              </div>
            )}

            <button onClick={handleSend} disabled={saving || !sendTarget}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black transition-opacity" style={{ background: form.isBonus ? '#F0B90B' : '#3D7FFF', opacity: saving || !sendTarget ? 0.5 : 1 }}>
              {saving ? 'Gönderiliyor…' : (form.isBonus ? '🎁 Bonus Gönder' : 'Gönder')}
            </button>
          </div>
        </ModalSheet>
      )}

      {/* Mark existing balance as bonus */}
      {modal === 'mark_bonus' && selected && (
        <ModalSheet title="🎁 Mevcut Bakiyeyi Bonus İşaretle" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="rounded-xl p-3 text-xs text-yellow-200" style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.25)' }}>
              ⚠️ Bu işlem bakiyeyi <b>silmez</b> — sadece bonus olarak işaretler.
              Kullanıcı, girdiğin USD değerinin <b>5 katı</b> kadar işlem hacmi tamamlayana kadar çekim yapamaz.
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kullanıcı</p>
              <p className="text-sm text-white">{selected.email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Coin (referans)</label>
              <select value={bonusForm.symbol} onChange={e => setBonusForm(f => ({ ...f, symbol: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {SYMBOLS.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bonus USD değeri (örn. 100 EQ → 250)</label>
              <input type="number" value={bonusForm.usdValue} onChange={e => setBonusForm(f => ({ ...f, usdValue: e.target.value }))}
                placeholder="250" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(240,185,11,0.3)' }} />
              {parseFloat(bonusForm.usdValue) > 0 && (
                <p className="text-xs text-yellow-300 mt-1">→ Çekim için ${(parseFloat(bonusForm.usdValue) * 5).toFixed(2)} işlem hacmi gerekir</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Not (isteğe bağlı)</label>
              <input value={bonusForm.notes} onChange={e => setBonusForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="örn. Hoşgeldin bonusu" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <button onClick={handleMarkBonus} disabled={saving}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black transition-opacity" style={{ background: '#F0B90B', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Kaydediliyor…' : '🎁 Bonus Olarak İşaretle'}
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
