import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Crown, Plus, X, Edit3, Snowflake, CheckCircle, AlertTriangle,
  Clock, Calendar, DollarSign, User, RefreshCw, Search, ChevronDown, ChevronUp
} from 'lucide-react';

interface VipMembership {
  id: string;
  user_id: string;
  vip_level: number;
  price_usdt: number;
  starts_at: string;
  expires_at: string;
  duration_months: number;
  status: 'active' | 'frozen' | 'expired' | 'cancelled';
  freeze_reason?: string;
  admin_note?: string;
  payment_ref?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const VIP_COLORS: Record<number, { bg: string; text: string; label: string; emoji: string }> = {
  1:  { bg: '#CD7F32', text: '#fff', label: 'VIP I',  emoji: '🥉' },
  2:  { bg: '#A8A9AD', text: '#fff', label: 'VIP II', emoji: '🥈' },
  3:  { bg: '#FFD700', text: '#000', label: 'VIP III',emoji: '🥇' },
  4:  { bg: '#50C878', text: '#fff', label: 'VIP IV', emoji: '💚' },
  5:  { bg: '#E5E4E2', text: '#000', label: 'VIP V',  emoji: '💎' },
  6:  { bg: '#b9f2ff', text: '#000', label: 'VIP VI', emoji: '🔵' },
  7:  { bg: '#9B59B6', text: '#fff', label: 'VIP VII',emoji: '💜' },
  8:  { bg: '#E91E8C', text: '#fff', label: 'VIP VIII',emoji:'💗' },
  9:  { bg: '#FF4500', text: '#fff', label: 'VIP IX', emoji: '🔥' },
  10: { bg: 'linear-gradient(135deg,#FFD700,#FF4500)', text: '#fff', label: 'VIP X', emoji: '👑' },
};

function vipStyle(level: number) {
  return VIP_COLORS[level] || { bg: '#666', text: '#fff', label: `VIP ${level}`, emoji: '⭐' };
}

function daysLeft(expires_at: string) {
  const diff = new Date(expires_at).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface UserOption { id: string; email: string; full_name: string; }

export default function VipManagementPanel() {
  const [memberships, setMemberships] = useState<VipMembership[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<VipMembership | null>(null);
  const [freezeModal, setFreezeModal] = useState<VipMembership | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tableError, setTableError] = useState(false);

  const [form, setForm] = useState({
    user_id: '',
    vip_level: 3,
    price_usdt: 1000,
    starts_at: new Date().toISOString().slice(0, 10),
    duration_months: 24,
    admin_note: '',
    payment_ref: '',
  });

  useEffect(() => {
    load();
    loadUsers();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vip_memberships')
      .select('*')
      .order('created_at', { ascending: false });
    if (error?.code === '42P01') {
      setTableError(true);
    } else {
      setTableError(false);
      // Enrich with user data
      const mems = data || [];
      const userIds = [...new Set(mems.map((m: any) => m.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
        setMemberships(mems.map((m: any) => ({
          ...m,
          user_email: profileMap[m.user_id]?.email || '',
          user_name: profileMap[m.user_id]?.full_name || '',
        })));
      } else {
        setMemberships([]);
      }
    }
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .order('created_at', { ascending: false })
      .limit(200);
    setUsers(data || []);
  }

  async function saveVip() {
    const starts = new Date(form.starts_at);
    const expires = new Date(starts);
    expires.setMonth(expires.getMonth() + Number(form.duration_months));

    const payload = {
      user_id: form.user_id,
      vip_level: Number(form.vip_level),
      price_usdt: Number(form.price_usdt),
      starts_at: starts.toISOString(),
      expires_at: expires.toISOString(),
      duration_months: Number(form.duration_months),
      admin_note: form.admin_note,
      payment_ref: form.payment_ref,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    if (editItem) {
      await supabase.from('vip_memberships').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('vip_memberships').insert(payload);
    }

    // Also update user_level in user_profiles
    await supabase.from('user_profiles').update({ user_level: Number(form.vip_level) }).eq('id', form.user_id);

    setShowForm(false);
    setEditItem(null);
    load();
  }

  async function toggleFreeze(m: VipMembership) {
    if (m.status === 'frozen') {
      await supabase.from('vip_memberships').update({ status: 'active', freeze_reason: null, updated_at: new Date().toISOString() }).eq('id', m.id);
      await supabase.from('user_profiles').update({ is_active: true }).eq('id', m.user_id);
    } else {
      await supabase.from('vip_memberships').update({ status: 'frozen', freeze_reason: freezeReason || 'VIP aidat ödenmedi', updated_at: new Date().toISOString() }).eq('id', m.id);
      await supabase.from('user_profiles').update({ is_active: false }).eq('id', m.user_id);
    }
    setFreezeModal(null);
    setFreezeReason('');
    load();
  }

  async function cancelVip(m: VipMembership) {
    if (!confirm('Bu VIP üyeliği iptal edilsin mi?')) return;
    await supabase.from('vip_memberships').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', m.id);
    await supabase.from('user_profiles').update({ user_level: 0 }).eq('id', m.user_id);
    load();
  }

  function openEdit(m: VipMembership) {
    setForm({
      user_id: m.user_id,
      vip_level: m.vip_level,
      price_usdt: m.price_usdt,
      starts_at: m.starts_at.slice(0, 10),
      duration_months: m.duration_months,
      admin_note: m.admin_note || '',
      payment_ref: m.payment_ref || '',
    });
    setEditItem(m);
    setShowForm(true);
  }

  const filtered = memberships.filter(m =>
    m.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    m.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = memberships.filter(m => m.status === 'active').length;
  const frozenCount = memberships.filter(m => m.status === 'frozen').length;
  const expiringSoon = memberships.filter(m => m.status === 'active' && daysLeft(m.expires_at) <= 30).length;

  if (tableError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">👑 VIP Yönetimi</h2>
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-800 mb-2">Önce veritabanı tablosunu oluşturmanız gerekiyor</p>
              <p className="text-amber-700 text-sm mb-3">Supabase Dashboard → SQL Editor'e gidin ve aşağıdaki SQL'i çalıştırın:</p>
              <div className="bg-gray-900 rounded-xl p-4 text-xs text-green-400 font-mono overflow-auto max-h-64">
                {`CREATE TABLE IF NOT EXISTS vip_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vip_level int NOT NULL CHECK (vip_level BETWEEN 1 AND 10),
  price_usdt numeric(12,2) DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  duration_months int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','expired','cancelled')),
  freeze_reason text,
  admin_note text,
  payment_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE vip_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY vip_allow_all ON vip_memberships FOR ALL USING (true) WITH CHECK (true);`}
              </div>
              <button onClick={load} className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">
                SQL çalıştırdım, yenile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          👑 VIP Yönetimi
        </h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => { setEditItem(null); setForm({ user_id: '', vip_level: 3, price_usdt: 1000, starts_at: new Date().toISOString().slice(0, 10), duration_months: 24, admin_note: '', payment_ref: '' }); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F0B90B] text-black rounded-lg text-sm font-bold hover:bg-yellow-400"
          >
            <Plus className="w-4 h-4" /> Yeni VIP At
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <p className="text-2xl font-black text-green-600">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aktif VIP</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <p className="text-2xl font-black text-blue-600">{frozenCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Dondurulmuş</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
          <p className="text-2xl font-black text-amber-600">{expiringSoon}</p>
          <p className="text-xs text-gray-500 mt-0.5">30 Günde Bitiyor</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Üye ara..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-gray-200">
            Henüz VIP üye yok. "Yeni VIP At" ile başlayın.
          </div>
        ) : filtered.map(m => {
          const v = vipStyle(m.vip_level);
          const days = daysLeft(m.expires_at);
          const isExpanded = expandedId === m.id;
          return (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-none" style={{ background: v.bg.startsWith('linear') ? undefined : v.bg, backgroundImage: v.bg.startsWith('linear') ? v.bg : undefined }}>
                  {v.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm truncate">{m.user_name || m.user_email}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full flex-none" style={{ background: v.bg.startsWith('linear') ? '#FFD700' : v.bg, color: v.text }}>{v.label}</span>
                    {m.status === 'frozen' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-none">❄️ Donduruldu</span>}
                    {m.status === 'expired' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-none">Süresi Doldu</span>}
                    {m.status === 'active' && days <= 30 && days > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-none">⚠️ {days}g kaldı</span>}
                    {m.status === 'active' && days <= 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-none">Süresi Doldu</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                    <span>{fmtDate(m.starts_at)} → {fmtDate(m.expires_at)}</span>
                    <span className="font-semibold text-green-600">${m.price_usdt.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : m.id)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider">Başlangıç</p>
                      <p className="text-gray-800 font-bold">{fmtDate(m.starts_at)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider">Bitiş</p>
                      <p className="text-gray-800 font-bold">{fmtDate(m.expires_at)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider">Süre</p>
                      <p className="text-gray-800 font-bold">{m.duration_months} ay</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider">Kalan</p>
                      <p className={`font-black ${days > 30 ? 'text-green-600' : days > 0 ? 'text-amber-600' : 'text-red-600'}`}>{days > 0 ? `${days} gün` : 'Süresi doldu'}</p>
                    </div>
                  </div>
                  {m.admin_note && (
                    <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-800">
                      📝 {m.admin_note}
                    </div>
                  )}
                  {m.freeze_reason && (
                    <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-800">
                      ❄️ Dondurma sebebi: {m.freeze_reason}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => openEdit(m)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">
                      <Edit3 className="w-3 h-3" /> Düzenle
                    </button>
                    {m.status !== 'frozen' ? (
                      <button onClick={() => { setFreezeModal(m); setFreezeReason(''); }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200">
                        <Snowflake className="w-3 h-3" /> Dondur
                      </button>
                    ) : (
                      <button onClick={() => toggleFreeze(m)} className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200">
                        <CheckCircle className="w-3 h-3" /> Aç
                      </button>
                    )}
                    <button onClick={() => cancelVip(m)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">
                      <X className="w-3 h-3" /> İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                {editItem ? 'VIP Düzenle' : 'Yeni VIP At'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* User select */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kullanıcı</label>
                <select
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Kullanıcı seçin...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email} — {u.email}</option>
                  ))}
                </select>
              </div>

              {/* VIP Level */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">VIP Seviyesi</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(lvl => {
                    const v = vipStyle(lvl);
                    return (
                      <button
                        key={lvl}
                        onClick={() => setForm(f => ({ ...f, vip_level: lvl }))}
                        className={`py-2 rounded-xl text-sm font-black transition-all ${form.vip_level === lvl ? 'ring-2 ring-yellow-500 scale-105' : 'opacity-70'}`}
                        style={{ background: v.bg.startsWith('linear') ? undefined : v.bg, backgroundImage: v.bg.startsWith('linear') ? v.bg : undefined, color: v.text }}
                      >
                        {lvl === 10 ? '👑' : lvl}
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-sm font-black text-gray-700 mt-2">{vipStyle(form.vip_level).emoji} {vipStyle(form.vip_level).label} seçildi</p>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Aidat (USDT)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" value={form.price_usdt} onChange={e => setForm(f => ({ ...f, price_usdt: Number(e.target.value) }))}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
                    placeholder="1000" />
                </div>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Başlangıç Tarihi <span className="text-amber-600 font-normal">(geçmiş tarih girebilirsiniz)</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="date" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400" />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Süre</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[6, 12, 24, 36].map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, duration_months: m }))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${form.duration_months === m ? 'bg-[#F0B90B] text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {m < 12 ? `${m} ay` : `${m/12} yıl`}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" value={form.duration_months} onChange={e => setForm(f => ({ ...f, duration_months: Number(e.target.value) }))}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
                    placeholder="Ay olarak süre" />
                </div>
                {form.starts_at && form.duration_months > 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1 px-1">
                    ✅ Bitiş: {fmtDate(new Date(new Date(form.starts_at).setMonth(new Date(form.starts_at).getMonth() + Number(form.duration_months))).toISOString())}
                  </p>
                )}
              </div>

              {/* Admin note */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Admin Notu (isteğe bağlı)</label>
                <textarea value={form.admin_note} onChange={e => setForm(f => ({ ...f, admin_note: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400 resize-none"
                  rows={2} placeholder="Ödeme onaylandı, referans: TXH123..." />
              </div>

              <button
                onClick={saveVip}
                disabled={!form.user_id || !form.duration_months}
                className="w-full py-3 bg-[#F0B90B] text-black rounded-xl font-black text-sm hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editItem ? '✅ Güncelle' : `👑 ${vipStyle(form.vip_level).label} Ver`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Modal */}
      {freezeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFreezeModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Snowflake className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-black text-gray-900">Hesabı Dondur</h3>
              <p className="text-gray-500 text-sm mt-1">{freezeModal.user_name || freezeModal.user_email}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dondurma Sebebi</label>
              <textarea
                value={freezeReason} onChange={e => setFreezeReason(e.target.value)}
                placeholder="VIP aidat ödenmedi — 30 günlük süre doldu"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setFreezeModal(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">
                İptal
              </button>
              <button onClick={() => toggleFreeze(freezeModal)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700">
                ❄️ Dondur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
