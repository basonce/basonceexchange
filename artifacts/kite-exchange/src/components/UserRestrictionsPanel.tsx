import { useState, useEffect } from 'react';
import { Search, Lock, Unlock, Save, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchUserRestrictions, saveUserRestrictions } from '../lib/user-restrictions';
import type { UserRestrictions } from '../lib/user-restrictions';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_active?: boolean;
}

const DEFAULT: Omit<UserRestrictions, 'user_id'> = {
  pair_lock_enabled: false,
  allowed_pairs: [],
  withdrawal_asset: 'BTC',
  withdrawal_fee_usdt: 0,
};

const WITHDRAWAL_ASSETS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'USDT'];

const PAIR_GROUPS: { label: string; emoji: string; color: string; pairs: string[] }[] = [
  {
    label: 'Değerli Metaller',
    emoji: '🥇',
    color: '#F0B90B',
    pairs: ['XAU/BTC', 'XAG/BTC', 'XPT/BTC', 'XAU/USDT', 'XAG/USDT', 'XPT/USDT', 'XPD/USDT', 'COPPER/USDT'],
  },
  {
    label: 'Emtia',
    emoji: '🛢️',
    color: '#F97316',
    pairs: ['WTI/USDT', 'BRENT/USDT', 'NATGAS/USDT', 'COFFEE/USDT', 'COCOA/USDT', 'SUGAR/USDT', 'WHEAT/USDT', 'CORN/USDT', 'SOYBEAN/USDT'],
  },
  {
    label: 'Endeksler',
    emoji: '📈',
    color: '#3B82F6',
    pairs: ['SPX/USDT', 'NDX/USDT', 'DJI/USDT', 'DAX/USDT', 'FTSE/USDT', 'NKY/USDT'],
  },
  {
    label: 'Hisseler',
    emoji: '💹',
    color: '#2ECC71',
    pairs: ['TSLA/USDT', 'AAPL/USDT', 'NVDA/USDT', 'MSFT/USDT', 'AMZN/USDT', 'GOOGL/USDT', 'META/USDT', 'AMD/USDT', 'COIN/USDT', 'MSTR/USDT'],
  },
  {
    label: 'Kripto',
    emoji: '₿',
    color: '#A855F7',
    pairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ETH/BTC', 'BNB/BTC', 'SOL/BTC', 'XRP/BTC', 'ADA/BTC'],
  },
];

export default function UserRestrictionsPanel() {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<Omit<UserRestrictions, 'user_id'>>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoadingUsers(true);
    supabase
      .from('user_profiles')
      .select('id, email, full_name, is_active')
      .eq('is_admin', false)
      .order('email')
      .then(({ data }) => {
        setAllUsers(data || []);
        setLoadingUsers(false);
      });
  }, []);

  const filteredUsers = search.trim()
    ? allUsers.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : allUsers;

  async function selectUser(u: UserProfile) {
    setSelected(u);
    setLoading(true);
    try {
      const data = await fetchUserRestrictions(u.id);
      setForm(data ? {
        pair_lock_enabled: data.pair_lock_enabled,
        allowed_pairs: data.allowed_pairs,
        withdrawal_asset: data.withdrawal_asset,
        withdrawal_fee_usdt: data.withdrawal_fee_usdt,
      } : { ...DEFAULT });
    } catch {
      setForm({ ...DEFAULT });
    } finally {
      setLoading(false);
    }
  }

  function togglePair(pair: string) {
    setForm(f => ({
      ...f,
      allowed_pairs: f.allowed_pairs.includes(pair)
        ? f.allowed_pairs.filter(p => p !== pair)
        : [...f.allowed_pairs, pair],
    }));
  }

  function toggleGroup(label: string) {
    setOpenGroups(g => ({ ...g, [label]: !g[label] }));
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      await saveUserRestrictions({ user_id: selected.id, ...form });
      showToast('Kısıtlamalar kaydedildi ✓', true);
    } catch (e: any) {
      showToast('Hata: ' + (e?.message || 'Bilinmiyor'), false);
    } finally {
      setSaving(false);
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Detail view (user selected) ──────────────────────────────
  if (selected) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white pb-24">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold transition-all ${toast.ok ? 'bg-green-500/20 border border-green-500/40 text-green-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-10" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => { setSelected(null); setForm({ ...DEFAULT }); }} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: '#F0B90B' }}>
            {selected.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selected.email}</p>
            {selected.full_name && <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.full_name}</p>}
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Pair Lock */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Parite Kilidi</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Açılırsa yalnızca seçilen paritelerle işlem yapılabilir
                  </p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, pair_lock_enabled: !f.pair_lock_enabled }))}
                  className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ background: form.pair_lock_enabled ? '#EF4444' : 'rgba(255,255,255,0.12)' }}
                >
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: form.pair_lock_enabled ? '26px' : '2px' }} />
                </button>
              </div>

              {form.pair_lock_enabled ? (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#F87171' }}>
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    Kilitli — sadece seçilen pariteler aktif
                  </div>
                  {form.allowed_pairs.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {form.allowed_pairs.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.18)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: 'rgba(252,165,165,0.6)' }}>Henüz parite seçilmedi</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#4ADE80' }}>
                    <Unlock className="w-3.5 h-3.5 flex-shrink-0" />
                    Serbest — tüm pariteler açık
                  </div>
                  {form.allowed_pairs.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px]" style={{ color: 'rgba(74,222,128,0.55)' }}>
                        Kilit açıldığında kısıtlanacak pariteler ({form.allowed_pairs.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {form.allowed_pairs.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: 'rgba(74,222,128,0.7)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.pair_lock_enabled && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold pt-1" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                    İZİN VERİLEN PARİTELER ({form.allowed_pairs.length} seçili)
                  </p>
                  {PAIR_GROUPS.map(group => {
                    const isOpen = openGroups[group.label] !== false;
                    const selectedInGroup = group.pairs.filter(p => form.allowed_pairs.includes(p)).length;
                    return (
                      <div key={group.label} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                        <button
                          onClick={() => toggleGroup(group.label)}
                          className="w-full flex items-center justify-between px-3 py-2.5 transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                          <span className="text-[11px] font-bold" style={{ color: group.color }}>
                            {group.emoji} {group.label}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedInGroup > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${group.color}25`, color: group.color }}>
                                {selectedInGroup}
                              </span>
                            )}
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="flex flex-wrap gap-1.5 p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            {group.pairs.map(pair => {
                              const active = form.allowed_pairs.includes(pair);
                              return (
                                <button
                                  key={pair}
                                  onClick={() => togglePair(pair)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                                  style={{
                                    background: active ? `${group.color}22` : 'rgba(255,255,255,0.05)',
                                    border: active ? `1px solid ${group.color}55` : '1px solid rgba(255,255,255,0.08)',
                                    color: active ? group.color : 'rgba(255,255,255,0.4)',
                                  }}
                                >
                                  {pair}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {form.allowed_pairs.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', color: '#EAB308' }}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      En az bir parite seçilmeli
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Withdrawal Settings */}
            <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-white">Çekim Ayarları</p>

              <div>
                <p className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>ÇEKIM VARLIĞI</p>
                <div className="flex flex-wrap gap-2">
                  {WITHDRAWAL_ASSETS.map(asset => (
                    <button
                      key={asset}
                      onClick={() => setForm(f => ({ ...f, withdrawal_asset: asset }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: form.withdrawal_asset === asset ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.05)',
                        border: form.withdrawal_asset === asset ? '1px solid rgba(240,185,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: form.withdrawal_asset === asset ? '#F0B90B' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>USDT HİZMET ÜCRETİ</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.withdrawal_fee_usdt || ''}
                    onChange={e => setForm(f => ({ ...f, withdrawal_fee_usdt: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>USDT</span>
                </div>
                {form.withdrawal_fee_usdt > 0 && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Çekim başına {form.withdrawal_fee_usdt} USDT kesilir
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving || (form.pair_lock_enabled && form.allowed_pairs.length === 0)}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 24px rgba(239,68,68,0.3)' }}
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Kaydediliyor…' : 'Kısıtlamaları Kaydet'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── User list view ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Kullanıcı Kısıtlamaları</h2>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Kısıtlamak istediğin kullanıcıyı seç</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            placeholder="İsim veya e-posta filtrele…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          )}
        </div>

        {!loadingUsers && (
          <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {filteredUsers.length} kullanıcı
          </p>
        )}
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Kullanıcı bulunamadı</p>
          </div>
        ) : (
          <div>
            {filteredUsers.map((u, i) => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:opacity-70"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: '#F0B90B' }}>
                  {u.email[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.email}</p>
                  {u.full_name && (
                    <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.full_name}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                  <ChevronDown className="w-4 h-4 rotate-[-90deg]" style={{ color: 'rgba(255,255,255,0.25)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
