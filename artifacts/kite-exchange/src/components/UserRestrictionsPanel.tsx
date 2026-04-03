import { useState, useEffect } from 'react';
import { Search, Lock, Unlock, Save, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_active?: boolean;
}

interface Restrictions {
  pair_lock_enabled: boolean;
  allowed_pairs: string[];
  withdrawal_asset: string;
  withdrawal_fee_usdt: number;
}

const DEFAULT: Restrictions = {
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
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<Restrictions>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id, email, full_name, is_active')
      .eq('is_admin', false)
      .order('email')
      .then(({ data }) => setAllUsers(data || []));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const q = search.toLowerCase();
    setResults(allUsers.filter(u => u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q)).slice(0, 8));
  }, [search, allUsers]);

  async function selectUser(u: UserProfile) {
    setSelected(u);
    setSearch('');
    setResults([]);
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_restrictions')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();
      setForm(data ? {
        pair_lock_enabled: data.pair_lock_enabled ?? false,
        allowed_pairs: data.allowed_pairs ?? [],
        withdrawal_asset: data.withdrawal_asset ?? 'BTC',
        withdrawal_fee_usdt: data.withdrawal_fee_usdt ?? 0,
      } : DEFAULT);
    } catch {
      setForm(DEFAULT);
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
      const payload = {
        user_id: selected.id,
        pair_lock_enabled: form.pair_lock_enabled,
        allowed_pairs: form.allowed_pairs,
        withdrawal_asset: form.withdrawal_asset,
        withdrawal_fee_usdt: form.withdrawal_fee_usdt,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('user_restrictions')
        .select('id')
        .eq('user_id', selected.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('user_restrictions').update(payload).eq('user_id', selected.id);
      } else {
        await supabase.from('user_restrictions').insert({ ...payload, created_at: new Date().toISOString() });
      }

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

  return (
    <div className="min-h-screen bg-[#0D1117] text-white pb-20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold transition-all ${toast.ok ? 'bg-green-500/20 border border-green-500/40 text-green-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Lock className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Kullanıcı Kısıtlamaları</h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>İşlem ve çekim kısıtlarını yönet</p>
          </div>
        </div>

        {/* User Search */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>KULLANICI SEÇ</p>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="E-posta ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {results.map((u, i) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: '#F0B90B' }}>
                    {u.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{u.email}</p>
                    {u.full_name && <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.full_name}</p>}
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </button>
              ))}
            </div>
          )}

          {/* Selected user chip */}
          {selected && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.25)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: '#F0B90B' }}>
                {selected.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{selected.email}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Seçili kullanıcı</p>
              </div>
              <button onClick={() => { setSelected(null); setForm(DEFAULT); }}>
                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          )}
        </div>

        {/* Restriction Controls — only shown when a user is selected */}
        {selected && !loading && (
          <>
            {/* Pair Lock */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Parite Kilidi</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Açılırsa kullanıcı yalnızca seçilen paritelerle işlem yapabilir
                  </p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, pair_lock_enabled: !f.pair_lock_enabled }))}
                  className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ background: form.pair_lock_enabled ? '#EF4444' : 'rgba(255,255,255,0.12)' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: form.pair_lock_enabled ? '26px' : '2px' }}
                  />
                </button>
              </div>

              {/* Status badge */}
              {form.pair_lock_enabled ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>
                  <Lock className="w-3.5 h-3.5" />
                  Kilitli — sadece seçilen pariteler aktif
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80' }}>
                  <Unlock className="w-3.5 h-3.5" />
                  Serbest — tüm pariteler açık
                </div>
              )}

              {/* Pair groups */}
              {form.pair_lock_enabled && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold pt-1" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                    İZİN VERİLEN PARİTELER ({form.allowed_pairs.length} seçili)
                  </p>
                  {PAIR_GROUPS.map(group => {
                    const isOpen = openGroups[group.label] !== false; // default open
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

              {/* Withdrawal asset */}
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
                <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Kullanıcı yalnızca bu varlıkla çekim yapabilir
                </p>
              </div>

              {/* USDT fee */}
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
                    Çekim başına {form.withdrawal_fee_usdt} USDT bakiyeden kesilir
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={save}
              disabled={saving || (form.pair_lock_enabled && form.allowed_pairs.length === 0)}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                boxShadow: '0 4px 24px rgba(239,68,68,0.3)',
              }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Kaydediliyor…' : 'Kısıtlamaları Kaydet'}
            </button>
          </>
        )}

        {selected && loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        )}

        {!selected && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">Kullanıcı Seçilmedi</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Kısıtlama uygulamak için yukarıdan<br />bir kullanıcı ara ve seç
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
