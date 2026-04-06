import { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { fetchUserRestrictions, saveUserRestrictions } from '../lib/user-restrictions';
import {
  Plus, X, Edit3, Snowflake, CheckCircle, AlertTriangle,
  Clock, Calendar, DollarSign, RefreshCw, Search, ChevronDown, ChevronUp, Bell, BellOff
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

interface UserOption { id: string; email: string; full_name: string; user_level?: number; }

function VipBadge({ level, size = 'sm' }: { level: number; size?: 'sm' | 'lg' }) {
  const isSupreme = level === 10;
  const px = size === 'lg' ? 'px-5 py-2 text-base' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full font-black tracking-widest ${px} relative overflow-hidden select-none`}
      style={{
        background: isSupreme
          ? 'linear-gradient(135deg,#1a1100 0%,#2e1f00 25%,#1a1100 50%,#2e1f00 75%,#1a1100 100%)'
          : 'linear-gradient(135deg,#111 0%,#1e1800 40%,#111 100%)',
        border: `${isSupreme ? 1.5 : 1}px solid ${isSupreme ? '#f0b90b' : '#a07800'}`,
        boxShadow: isSupreme
          ? '0 0 6px rgba(240,185,11,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 0 4px rgba(240,185,11,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* metallic gradient text */}
      <span
        className="relative z-10"
        style={{
          background: isSupreme
            ? 'linear-gradient(180deg,#fff8c0 0%,#ffe033 18%,#f0b90b 38%,#b8780a 58%,#f0b90b 78%,#fff3a0 100%)'
            : 'linear-gradient(180deg,#ffe566 0%,#f0b90b 40%,#a06800 65%,#f0b90b 85%,#ffe566 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: isSupreme
            ? 'drop-shadow(0 0 5px rgba(255,210,0,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
            : 'drop-shadow(0 1px 1px rgba(0,0,0,0.7))',
          letterSpacing: '0.06em',
        }}
      >
        VIP {level}
      </span>
      {/* slow shimmer streak */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.18) 50%,transparent 100%)',
          backgroundSize: '200% 100%',
          animation: `vipShimmer ${isSupreme ? 2 : 3}s linear infinite`,
        }}
      />
    </span>
  );
}

function daysLeft(expires_at: string) {
  return Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86400000);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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
  const [creating, setCreating] = useState(false);
  const [createDone, setCreateDone] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [overdueStates, setOverdueStates] = useState<Record<string, boolean>>({});
  const [overdueLoading, setOverdueLoading] = useState<Record<string, boolean>>({});
  const [overdueAmounts, setOverdueAmounts] = useState<Record<string, string>>({});
  const [showVipUsers, setShowVipUsers] = useState(true);

  const [form, setForm] = useState({
    user_id: '', vip_level: 3, price_usdt: 1000,
    starts_at: new Date().toISOString().slice(0, 10),
    duration_months: 24, admin_note: '', payment_ref: '',
  });

  useEffect(() => { load(); loadUsers(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vip_memberships').select('*').order('created_at', { ascending: false });
    if (error?.code === '42P01') {
      setTableError(true);
    } else {
      setTableError(false);
      const mems = data || [];
      const userIds = [...new Set(mems.map((m: any) => m.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles').select('id, email, full_name').in('id', userIds);
        const pm = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
        setMemberships(mems.map((m: any) => ({
          ...m,
          user_email: pm[m.user_id]?.email || '',
          user_name: pm[m.user_id]?.full_name || '',
        })));
      } else {
        setMemberships([]);
      }
    }
    setLoading(false);
  }

  async function loadUsers() {
    try {
      const adminUser = await getCurrentUser();
      const adminId = adminUser?.id || '';
      const resp = await fetch('/api/admin/users', {
        headers: { 'x-requester-id': adminId }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          const mapped = data.map((u: any) => ({ id: u.id, email: u.email, full_name: u.full_name || '', user_level: u.user_level || 0 }));
          setUsers(mapped);
          loadOverdueStates(mapped);
          return;
        }
      }
    } catch {
      // fallback below
    }
    const { data } = await supabase
      .from('user_profiles').select('id, email, full_name').order('updated_at', { ascending: false }).limit(500);
    setUsers(data || []);
  }

  async function loadOverdueStates(vipUsers: UserOption[]) {
    const results: Record<string, boolean> = {};
    await Promise.all(
      vipUsers.filter(u => (u.user_level || 0) > 0).map(async u => {
        try {
          const r = await fetchUserRestrictions(u.id);
          results[u.id] = r?.vip_overdue_notice === true;
        } catch { results[u.id] = false; }
      })
    );
    setOverdueStates(results);
  }

  async function toggleOverdue(userId: string, currentState: boolean, amount?: number) {
    setOverdueLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const existing = await fetchUserRestrictions(userId);
      const base = existing || {
        user_id: userId, pair_lock_enabled: false, allowed_pairs: [],
        withdrawal_asset: 'BTC', withdrawal_fee_usdt: 0,
        usdt_frozen: false, withdrawal_frozen: false,
        campaigns_blocked: false, mining_blocked: false, trc20_address: '',
      };
      const newState = !currentState;
      await saveUserRestrictions({
        ...base,
        user_id: userId,
        vip_overdue_notice: newState,
        vip_overdue_amount: newState && amount ? amount : 0,
      });
      setOverdueStates(prev => ({ ...prev, [userId]: newState }));
    } catch (e) {
      alert('Kayıt hatası: ' + String(e));
    }
    setOverdueLoading(prev => ({ ...prev, [userId]: false }));
  }

  async function saveVip() {
    // Try vip_memberships table (may not exist — ignore errors)
    const starts = new Date(form.starts_at);
    const expires = new Date(starts);
    expires.setMonth(expires.getMonth() + Number(form.duration_months));
    const payload = {
      user_id: form.user_id, vip_level: Number(form.vip_level),
      price_usdt: Number(form.price_usdt),
      starts_at: starts.toISOString(), expires_at: expires.toISOString(),
      duration_months: Number(form.duration_months),
      admin_note: form.admin_note, payment_ref: form.payment_ref,
      status: 'active', updated_at: new Date().toISOString(),
    };
    if (editItem) {
      await supabase.from('vip_memberships').update(payload).eq('id', editItem.id).then(() => {});
    } else {
      await supabase.from('vip_memberships').insert(payload).then(() => {});
    }
    // Always update user_level via service-role API (bypasses RLS)
    try {
      const adminUser = await getCurrentUser();
      const adminId = adminUser?.id || '';
      await fetch('/api/admin/set-user-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requester-id': adminId },
        body: JSON.stringify({ userId: form.user_id, level: Number(form.vip_level) }),
      });
    } catch {
      // fallback: direct supabase
      await supabase.from('user_profiles').update({ user_level: Number(form.vip_level) }).eq('id', form.user_id);
    }
    setShowForm(false); setEditItem(null); load();
  }

  async function toggleFreeze(m: VipMembership) {
    if (m.status === 'frozen') {
      await supabase.from('vip_memberships').update({ status: 'active', freeze_reason: null, updated_at: new Date().toISOString() }).eq('id', m.id);
      await supabase.from('user_profiles').update({ is_active: true }).eq('id', m.user_id);
    } else {
      await supabase.from('vip_memberships').update({ status: 'frozen', freeze_reason: freezeReason || 'VIP aidat ödenmedi', updated_at: new Date().toISOString() }).eq('id', m.id);
      await supabase.from('user_profiles').update({ is_active: false }).eq('id', m.user_id);
    }
    setFreezeModal(null); setFreezeReason(''); load();
  }

  async function cancelVip(m: VipMembership) {
    if (!confirm('Bu VIP üyeliği iptal edilsin mi?')) return;
    await supabase.from('vip_memberships').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', m.id);
    await supabase.from('user_profiles').update({ user_level: 0 }).eq('id', m.user_id);
    load();
  }

  function openEdit(m: VipMembership) {
    setForm({ user_id: m.user_id, vip_level: m.vip_level, price_usdt: m.price_usdt, starts_at: m.starts_at.slice(0, 10), duration_months: m.duration_months, admin_note: m.admin_note || '', payment_ref: m.payment_ref || '' });
    setEditItem(m); setShowForm(true);
  }

  const filtered = memberships.filter(m =>
    m.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    m.user_name?.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount  = memberships.filter(m => m.status === 'active').length;
  const frozenCount  = memberships.filter(m => m.status === 'frozen').length;
  const expiringSoon = memberships.filter(m => m.status === 'active' && daysLeft(m.expires_at) <= 30).length;

  const CREATE_SQL = `CREATE TABLE IF NOT EXISTS vip_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vip_level int NOT NULL CHECK (vip_level BETWEEN 1 AND 10),
  price_usdt numeric(12,2) DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  duration_months int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','frozen','expired','cancelled')),
  freeze_reason text,
  admin_note text,
  payment_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE vip_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY vip_allow_all ON vip_memberships FOR ALL USING (true) WITH CHECK (true);`;

  if (tableError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-black text-gray-900">VIP Yönetimi</h2>
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-none" />
            <div>
              <p className="font-black text-red-800">Veritabanı tablosu eksik</p>
              <p className="text-red-600 text-sm mt-0.5">Supabase Dashboard → SQL Editor'e girin ve aşağıdaki kodu çalıştırın:</p>
            </div>
          </div>
          <div className="bg-gray-950 rounded-xl p-4 text-xs text-emerald-400 font-mono overflow-auto select-all" style={{ userSelect: 'all' }}>
            {CREATE_SQL}
          </div>
          <div className="flex gap-3">
            <a
              href="https://supabase.com/dashboard/project/jfjjymprvjfltpvmfptj/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-black text-center hover:bg-red-700"
            >
              Supabase SQL Editor'u Ac
            </a>
            <button
              onClick={async () => { setCreating(true); await load(); setCreating(false); setCreateDone(true); }}
              className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-xl text-sm font-bold hover:bg-gray-300"
            >
              {creating ? 'Kontrol ediliyor...' : 'SQL calistirdim, yenile'}
            </button>
          </div>
          {createDone && <p className="text-xs text-center text-gray-500">Hala hata aliyorsan SQL dogru calistirilmamis olabilir.</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes vipShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">VIP Yönetimi</h2>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => { setEditItem(null); setForm({ user_id: '', vip_level: 3, price_usdt: 1000, starts_at: new Date().toISOString().slice(0, 10), duration_months: 24, admin_note: '', payment_ref: '' }); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F0B90B] text-black rounded-lg text-sm font-black hover:bg-yellow-400"
            >
              <Plus className="w-4 h-4" /> Yeni VIP At
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl font-black text-green-600">{activeCount}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Aktif VIP</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl font-black text-blue-600">{frozenCount}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Dondurulmus</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl font-black text-amber-600">{expiringSoon}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">30 Gunde Bitiyor</p>
          </div>
        </div>

        {/* Aidat Uyarıları — VIP kullanıcılara uyarı gönder */}
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowVipUsers(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-50"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <span className="font-black text-gray-800 text-sm">Aidat Uyarıları</span>
              <span className="text-xs text-gray-500 font-normal">
                — VIP üyeye profilde ödeme uyarısı göster
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showVipUsers ? 'rotate-180' : ''}`} />
          </button>
          {showVipUsers && (
            <div className="divide-y divide-gray-100">
              {users.filter(u => (u.user_level || 0) > 0).length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">
                  Henüz VIP kullanıcı yok (user_level &gt; 0 olan kullanıcı bulunamadı)
                </div>
              ) : users.filter(u => (u.user_level || 0) > 0).map(u => {
                const isOverdue = overdueStates[u.id] ?? false;
                const isLoading = overdueLoading[u.id] ?? false;
                return (
                  <div key={u.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-none">
                          <span className="text-xs font-black text-amber-700">{u.user_level}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{u.full_name || u.email}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleOverdue(u.id, isOverdue, Number(overdueAmounts[u.id] || 0))}
                        disabled={isLoading || (!isOverdue && !Number(overdueAmounts[u.id]))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all flex-none ${
                          isOverdue
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40'
                        } ${isLoading ? 'opacity-50' : ''}`}
                      >
                        {isLoading ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : isOverdue ? (
                          <><BellOff className="w-3 h-3" /> Kaldır</>
                        ) : (
                          <><Bell className="w-3 h-3" /> Gönder</>
                        )}
                      </button>
                    </div>
                    {!isOverdue && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400 flex-none" />
                        <input
                          type="number"
                          placeholder="Aidat tutarı (USDT) örn: 2380"
                          value={overdueAmounts[u.id] || ''}
                          onChange={e => setOverdueAmounts(prev => ({ ...prev, [u.id]: e.target.value }))}
                          className="flex-1 text-xs py-1.5 px-2 rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400"
                          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                        />
                      </div>
                    )}
                    {isOverdue && (
                      <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Uyarı aktif — kullanıcı profilinde görünüyor
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Uye ara..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400" />
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Yukleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-gray-200">
              Henuz VIP uye yok. "Yeni VIP At" ile baslayin.
            </div>
          ) : filtered.map(m => {
            const days = daysLeft(m.expires_at);
            const isExpanded = expandedId === m.id;
            const isSupreme = m.vip_level === 10;
            return (
              <div key={m.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
                style={{ borderColor: isSupreme ? '#F59E0B' : '#e5e7eb' }}
              >
                {isSupreme && (
                  <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#7a5000,#f0b90b,#fff8c0,#f0b90b,#7a5000)' }} />
                )}
                <div className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-none relative overflow-hidden select-none"
                    style={{
                      background: m.vip_level === 10
                        ? 'linear-gradient(135deg,#1a1100,#2e1f00,#1a1100)'
                        : 'linear-gradient(135deg,#111,#1e1800,#111)',
                      border: `1.5px solid ${m.vip_level === 10 ? '#f0b90b' : '#a07800'}`,
                      boxShadow: m.vip_level === 10
                        ? '0 0 5px rgba(240,185,11,0.25)'
                        : '0 0 3px rgba(240,185,11,0.12)',
                    }}
                  >
                    <span style={{
                      background: 'linear-gradient(180deg,#fff8c0 0%,#ffe033 20%,#f0b90b 40%,#b8780a 60%,#f0b90b 80%,#fff3a0 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
                    }}>{m.vip_level}</span>
                    <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)', backgroundSize: '200% 100%', animation: 'vipShimmer 2.5s linear infinite' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm truncate">{m.user_name || m.user_email}</span>
                      <VipBadge level={m.vip_level} />
                      {m.status === 'frozen' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-none">Donduruldu</span>}
                      {m.status === 'expired' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-none">Suresi Doldu</span>}
                      {m.status === 'active' && days <= 30 && days > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-none">{days}g kaldi</span>}
                      {m.status === 'active' && days <= 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-none">Suresi Doldu</span>}
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
                      {[['Baslangic', fmtDate(m.starts_at)], ['Bitis', fmtDate(m.expires_at)], ['Sure', `${m.duration_months} ay`]].map(([k, v]) => (
                        <div key={k} className="bg-gray-50 rounded-lg p-2">
                          <p className="text-gray-400 font-semibold uppercase tracking-wider">{k}</p>
                          <p className="text-gray-800 font-bold">{v}</p>
                        </div>
                      ))}
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-400 font-semibold uppercase tracking-wider">Kalan</p>
                        <p className={`font-black ${days > 30 ? 'text-green-600' : days > 0 ? 'text-amber-600' : 'text-red-600'}`}>{days > 0 ? `${days} gun` : 'Suresi doldu'}</p>
                      </div>
                    </div>
                    {m.admin_note && <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-800">{m.admin_note}</div>}
                    {m.freeze_reason && <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-800">Dondurma: {m.freeze_reason}</div>}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openEdit(m)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">
                        <Edit3 className="w-3 h-3" /> Duzenle
                      </button>
                      {m.status !== 'frozen' ? (
                        <button onClick={() => { setFreezeModal(m); setFreezeReason(''); }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200">
                          <Snowflake className="w-3 h-3" /> Dondur
                        </button>
                      ) : (
                        <button onClick={() => toggleFreeze(m)} className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200">
                          <CheckCircle className="w-3 h-3" /> Ac
                        </button>
                      )}
                      <button onClick={() => cancelVip(m)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">
                        <X className="w-3 h-3" /> Iptal
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
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="font-black text-gray-900">{editItem ? 'VIP Duzenle' : 'Yeni VIP At'}</h3>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* User */}
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-1.5">Kullanici</label>
                  <input
                    type="text"
                    placeholder="Ara: isim veya email..."
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-yellow-400 mb-2"
                  />
                  <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-yellow-400">
                    <option value="">Kullanici secin...</option>
                    {users
                      .filter(u => !userFilter || `${u.full_name} ${u.email}`.toLowerCase().includes(userFilter.toLowerCase()))
                      .map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} — {u.email}</option>)}
                  </select>
                </div>

                {/* VIP Level grid */}
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-2">VIP Seviyesi</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5,6,7,8,9,10].map(lvl => {
                      const sel = form.vip_level === lvl;
                      const supreme = lvl === 10;
                      return (
                        <button key={lvl} onClick={() => setForm(f => ({ ...f, vip_level: lvl }))}
                          className={`py-2.5 rounded-xl font-black text-sm relative overflow-hidden transition-all select-none ${sel ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
                          style={{
                            background: supreme ? 'linear-gradient(135deg,#1a1100,#2e1f00,#1a1100)' : 'linear-gradient(135deg,#111,#1e1800,#111)',
                            border: `${sel ? 2 : 1}px solid ${supreme ? '#f0b90b' : '#a07800'}`,
                            boxShadow: sel ? (supreme ? '0 0 6px rgba(240,185,11,0.3)' : '0 0 4px rgba(240,185,11,0.2)') : undefined,
                          }}
                        >
                          <span style={{
                            background: 'linear-gradient(180deg,#fff8c0 0%,#ffe033 20%,#f0b90b 40%,#b8780a 60%,#f0b90b 80%,#fff3a0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
                          }}>{lvl}</span>
                          {sel && <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)', backgroundSize: '200% 100%', animation: `vipShimmer ${supreme ? 2 : 3}s linear infinite` }} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected VIP showcase */}
                  <div className="mt-3 flex items-center justify-center gap-3 py-3 rounded-xl border"
                    style={{ borderColor: '#d4a008', boxShadow: form.vip_level === 10 ? '0 0 8px rgba(240,185,11,0.3)' : '0 0 4px rgba(240,185,11,0.15)' }}>
                    <VipBadge level={form.vip_level} size="lg" />
                    <span className="font-black text-gray-700">secildi</span>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-1.5">Aidat (USDT)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={form.price_usdt} onChange={e => setForm(f => ({ ...f, price_usdt: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-yellow-400"
                      style={{ backgroundColor: '#0f172a', color: '#ffffff' }} placeholder="1000" />
                  </div>
                </div>

                {/* Start date */}
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-1.5">
                    Baslangic Tarihi <span className="text-amber-600 font-normal text-xs">(gecmis tarih girebilirsiniz)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="date" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-yellow-400"
                      style={{ backgroundColor: '#0f172a', color: '#ffffff', colorScheme: 'dark' }} />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-1.5">Sure</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[6, 12, 24, 36].map(mo => (
                      <button key={mo} onClick={() => setForm(f => ({ ...f, duration_months: mo }))}
                        className={`py-2 rounded-xl text-sm font-bold transition-all ${form.duration_months === mo ? 'bg-[#F0B90B] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {mo < 12 ? `${mo} ay` : `${mo/12} yil`}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={form.duration_months} onChange={e => setForm(f => ({ ...f, duration_months: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400" placeholder="Ay olarak sure" />
                  </div>
                  {form.starts_at && form.duration_months > 0 && (
                    <p className="text-xs text-green-600 font-semibold mt-1 px-1">
                      Bitis: {fmtDate(new Date(new Date(form.starts_at).setMonth(new Date(form.starts_at).getMonth() + Number(form.duration_months))).toISOString())}
                    </p>
                  )}
                </div>

                {/* Admin note */}
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-1.5">Admin Notu <span className="font-normal text-gray-500">(istege bagli)</span></label>
                  <textarea value={form.admin_note} onChange={e => setForm(f => ({ ...f, admin_note: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400 resize-none"
                    rows={2} placeholder="Odeme onaylandi, referans: TXH123..." />
                </div>

                <button onClick={saveVip} disabled={!form.user_id || !form.duration_months}
                  className="w-full py-3 bg-[#F0B90B] text-black font-black rounded-xl hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                  {editItem ? 'Guncelle' : 'VIP Olustur'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Freeze Modal */}
        {freezeModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setFreezeModal(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-gray-900">VIP Dondur</h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{freezeModal.user_name || freezeModal.user_email}</span> icin
                <VipBadge level={freezeModal.vip_level} /> uyeligi dondurulacak.
              </p>
              <textarea value={freezeReason} onChange={e => setFreezeReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                rows={2} placeholder="Dondurma sebebi (isteğe bağlı)..." />
              <div className="flex gap-3">
                <button onClick={() => setFreezeModal(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">Iptal</button>
                <button onClick={() => toggleFreeze(freezeModal)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 flex items-center justify-center gap-1.5">
                  <Snowflake className="w-4 h-4" /> Dondur
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
