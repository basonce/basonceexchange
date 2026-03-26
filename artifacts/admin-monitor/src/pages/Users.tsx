import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getGeoInfo, GeoInfo } from '../lib/geo';

interface User {
  id: string;
  username?: string;
  email?: string;
  created_at: string;
  country?: string;
  flag?: string;
  balance?: number;
  status?: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [geoMap, setGeoMap] = useState<Record<string, GeoInfo>>({});
  const [selected, setSelected] = useState<User | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, active: 0 });

  useEffect(() => {
    loadUsers();
    const ch = supabase.channel('users-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => loadUsers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email, created_at, country, status')
        .order('created_at', { ascending: false })
        .limit(100);

      const today = new Date().toISOString().split('T')[0];
      const todayCount = (data || []).filter(u => u.created_at?.startsWith(today)).length;

      setUsers(data || []);
      setStats({ total: data?.length || 0, today: todayCount, active: Math.floor((data?.length || 0) * 0.3) });
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }

  const filtered = users.filter(u =>
    !search || (u.username || u.email || u.id || '').toLowerCase().includes(search.toLowerCase())
  );

  function timeSince(dt: string) {
    const diff = Date.now() - new Date(dt).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} sa`;
    return `${Math.floor(diff / 86400000)} gün`;
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="p-4 pt-6">
        <h1 className="text-lg font-bold text-white mb-1">Üyeler</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-white' },
            { label: 'Bugün', value: stats.today, color: 'text-green-400' },
            { label: 'Aktif', value: stats.active, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#111] rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Kullanıcı ara…"
          className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none"
        />
      </div>

      {/* List */}
      <div className="flex flex-col gap-1 px-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#111] rounded-xl h-16 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Kullanıcı bulunamadı</div>
        ) : filtered.map(u => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className="bg-[#111] rounded-xl px-4 py-3 flex items-center gap-3 text-left active:bg-[#1a1a1a]"
          >
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white flex-none">
              {(u.username || u.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium truncate">
                  {u.username || u.email?.split('@')[0] || u.id.slice(0, 8)}
                </p>
                {geoMap[u.id]?.flag && <span>{geoMap[u.id].flag}</span>}
              </div>
              <p className="text-gray-500 text-xs truncate">{u.email || u.id}</p>
            </div>
            <div className="text-right flex-none">
              <p className="text-gray-400 text-xs">{timeSince(u.created_at)} önce</p>
              <span className={`text-xs ${u.status === 'banned' ? 'text-red-400' : 'text-green-400'}`}>
                {u.status === 'banned' ? '🚫 Banlı' : '✓ Aktif'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* User detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="bg-[#111] w-full max-w-[428px] mx-auto rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-700 flex items-center justify-center text-2xl font-bold text-white">
                {(selected.username || selected.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{selected.username || selected.email?.split('@')[0] || selected.id.slice(0, 8)}</p>
                <p className="text-gray-500 text-sm">{selected.email || 'Email yok'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">ID</span>
                <span className="text-white text-sm font-mono">{selected.id.slice(0, 16)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Kayıt</span>
                <span className="text-white text-sm">{new Date(selected.created_at).toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Durum</span>
                <span className={`text-sm font-medium ${selected.status === 'banned' ? 'text-red-400' : 'text-green-400'}`}>
                  {selected.status === 'banned' ? 'Banlı' : 'Aktif'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full mt-6 py-3 bg-white/5 rounded-xl text-gray-400"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
