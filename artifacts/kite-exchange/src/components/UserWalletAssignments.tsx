import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, Copy, CheckCircle, Users, Wallet, AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight, Bell, X, UserPlus, Zap, CheckCircle2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserWalletRow {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  bep20_address: string | null;
  bep20_assigned_at: string | null;
  bep20_total_received: number;
  trc20_address: string | null;
  trc20_assigned_at: string | null;
  trc20_total_received: number;
}

interface Stats {
  totalUsersWithWallet: number;
  totalUsersWithout: number;
  bep20Assigned: number;
  trc20Assigned: number;
}

interface NewUserNotification {
  id: string;
  email: string;
  created_at: string;
}

type SortField = 'email' | 'created_at' | 'bep20_total_received' | 'trc20_total_received';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

function truncateAddress(addr: string | null, chars = 6): string {
  if (!addr) return '-';
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export default function UserWalletAssignments() {
  const [rows, setRows] = useState<UserWalletRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<UserWalletRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsersWithWallet: 0, totalUsersWithout: 0, bep20Assigned: 0, trc20Assigned: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'has_wallet' | 'no_wallet' | 'has_balance'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NewUserNotification[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignedSuccess, setAssignedSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ assigned: number; skipped: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
      audioRef.current = ctx;
    } catch {
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('admin_get_real_users_with_wallets');

      if (error) {
        console.error('admin_get_real_users_with_wallets error:', error);
        return;
      }

      const merged: UserWalletRow[] = (data || []).map((r: UserWalletRow) => ({
        user_id: r.user_id,
        email: r.email,
        full_name: r.full_name || '',
        created_at: r.created_at,
        bep20_address: r.bep20_address || null,
        bep20_assigned_at: r.bep20_assigned_at || null,
        bep20_total_received: parseFloat(String(r.bep20_total_received || '0')),
        trc20_address: r.trc20_address || null,
        trc20_assigned_at: r.trc20_assigned_at || null,
        trc20_total_received: parseFloat(String(r.trc20_total_received || '0')),
      }));

      setRows(merged);

      const withWallet = merged.filter(r => r.bep20_address || r.trc20_address).length;
      setStats({
        totalUsersWithWallet: withWallet,
        totalUsersWithout: merged.length - withWallet,
        bep20Assigned: merged.filter(r => r.bep20_address).length,
        trc20Assigned: merged.filter(r => r.trc20_address).length,
      });
    } catch (err) {
      console.error('UserWalletAssignments fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignWallet = useCallback(async (userId: string) => {
    setAssigningUserId(userId);
    setAssignedSuccess(null);
    setAssignError(null);
    try {
      const { data, error } = await supabase
        .rpc('admin_force_assign_wallet', { p_user_id: userId });

      if (error || !data?.success) {
        setAssignError(data?.error || error?.message || 'Assignment failed');
        setTimeout(() => setAssignError(null), 4000);
      } else if (data.already_had_wallet) {
        setAssignError('This user already has wallets assigned.');
        setTimeout(() => setAssignError(null), 3000);
      } else {
        setAssignedSuccess(userId);
        setTimeout(() => setAssignedSuccess(null), 3000);
        await fetchData();
      }
    } catch (err: any) {
      setAssignError(err?.message || 'Unexpected error');
      setTimeout(() => setAssignError(null), 4000);
    } finally {
      setAssigningUserId(null);
    }
  }, [fetchData]);

  const handleBulkAssign = useCallback(async () => {
    const noWalletUsers = rows.filter(r => !r.bep20_address && !r.trc20_address);
    if (noWalletUsers.length === 0) return;
    setBulkAssigning(true);
    setBulkResult(null);
    setAssignError(null);
    let assigned = 0;
    let skipped = 0;
    for (const user of noWalletUsers) {
      try {
        const { data } = await supabase.rpc('admin_force_assign_wallet', { p_user_id: user.user_id });
        if (data?.success && !data?.already_had_wallet) assigned++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    setBulkAssigning(false);
    setBulkResult({ assigned, skipped });
    setTimeout(() => setBulkResult(null), 6000);
    await fetchData();
  }, [rows, fetchData]);

  useEffect(() => {
    if (!isLive) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel('admin-new-users-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_profiles' },
        (payload) => {
          const newUser = payload.new as { id: string; email: string; created_at: string };
          const notif: NewUserNotification = {
            id: newUser.id,
            email: newUser.email,
            created_at: newUser.created_at,
          };
          setNotifications(prev => [notif, ...prev].slice(0, 10));
          playNotificationSound();
          fetchData();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isLive, fetchData, playNotificationSound]);

  useEffect(() => {
    let result = [...rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.email.toLowerCase().includes(q) ||
        (r.bep20_address || '').toLowerCase().includes(q) ||
        (r.trc20_address || '').toLowerCase().includes(q)
      );
    }

    if (filter === 'has_wallet') result = result.filter(r => r.bep20_address || r.trc20_address);
    if (filter === 'no_wallet') result = result.filter(r => !r.bep20_address && !r.trc20_address);
    if (filter === 'has_balance') result = result.filter(r => r.bep20_total_received > 0 || r.trc20_total_received > 0);

    result.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortField === 'email') { av = a.email; bv = b.email; }
      else if (sortField === 'created_at') { av = a.created_at; bv = b.created_at; }
      else if (sortField === 'bep20_total_received') { av = a.bep20_total_received; bv = b.bep20_total_received; }
      else if (sortField === 'trc20_total_received') { av = a.trc20_total_received; bv = b.trc20_total_received; }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredRows(result);
    setPage(0);
  }, [rows, search, filter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm animate-pulse-once"
            >
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800">Yeni Kullanici Kayit Oldu!</p>
                <p className="text-xs text-green-600 truncate">{notif.email}</p>
                <p className="text-xs text-green-500">{new Date(notif.created_at).toLocaleString('tr-TR')}</p>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="p-1.5 hover:bg-green-200 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-green-700" />
              </button>
            </div>
          ))}
        </div>
      )}

      {assignError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {assignError}
        </div>
      )}

      {bulkResult && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Toplu atama tamamlandi: <strong>{bulkResult.assigned} kullaniciya</strong> cüzdan atandi
          {bulkResult.skipped > 0 && <span className="text-gray-500">, {bulkResult.skipped} atlandi</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Kullanici Cüzdanlari</h2>
        <div className="flex items-center gap-2">
          {stats.totalUsersWithout > 0 && (
            <button
              onClick={handleBulkAssign}
              disabled={bulkAssigning}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {bulkAssigning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Shield className="w-3.5 h-3.5" />
              )}
              {bulkAssigning ? 'Ataniyor...' : `Tümüne Ata (${stats.totalUsersWithout})`}
            </button>
          )}
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isLive
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${isLive ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
            {isLive ? 'Canli Takip: Açik' : 'Canli Takip: Kapali'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Cüzdanli Kullanici</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsersWithWallet}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Cüzdansiz Kullanici</span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.totalUsersWithout}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">BEP20 Atanan</span>
            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">BNB</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.bep20Assigned}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">TRC20 Atanan</span>
            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">TRX</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.trc20Assigned}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="E-mail veya cüzdan adresi ile ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all', label: 'Tümü' },
              { key: 'has_wallet', label: 'Cüzdanli' },
              { key: 'no_wallet', label: 'Cüzdansiz' },
              { key: 'has_balance', label: 'Bakiye > 0' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Kayit bulunamadi</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      <button className="flex items-center gap-1 hover:text-gray-800" onClick={() => handleSort('email')}>
                        E-mail
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      BEP20 Adresi
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      <button className="flex items-center gap-1 hover:text-gray-800" onClick={() => handleSort('bep20_total_received')}>
                        BEP20 Alinan
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      TRC20 Adresi
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      <button className="flex items-center gap-1 hover:text-gray-800" onClick={() => handleSort('trc20_total_received')}>
                        TRC20 Alinan
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      <button className="flex items-center gap-1 hover:text-gray-800" onClick={() => handleSort('created_at')}>
                        Kayit Tarihi
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Islem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map(row => {
                    const hasWallet = row.bep20_address || row.trc20_address;
                    const isNew = notifications.some(n => n.id === row.user_id);
                    return (
                      <tr
                        key={row.user_id}
                        className={`hover:bg-gray-50 transition-colors ${!hasWallet ? 'bg-orange-50/40' : ''} ${isNew ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isNew ? 'bg-green-500' : 'bg-blue-600'}`}>
                              {isNew ? <UserPlus className="w-3.5 h-3.5" /> : row.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-gray-900 truncate max-w-[160px]" title={row.email}>{row.email}</p>
                                {isNew && (
                                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">YENI</span>
                                )}
                              </div>
                              {row.full_name && <p className="text-xs text-gray-400 truncate max-w-[160px]">{row.full_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.bep20_address ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                {truncateAddress(row.bep20_address)}
                              </span>
                              <button
                                onClick={() => copyToClipboard(row.bep20_address!, `bep20-${row.user_id}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Kopyala"
                              >
                                {copiedId === `bep20-${row.user_id}` ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-500 font-medium">Atanmamis</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${row.bep20_total_received > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {row.bep20_total_received > 0 ? `$${row.bep20_total_received.toFixed(2)}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.trc20_address ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                {truncateAddress(row.trc20_address, 5)}
                              </span>
                              <button
                                onClick={() => copyToClipboard(row.trc20_address!, `trc20-${row.user_id}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Kopyala"
                              >
                                {copiedId === `trc20-${row.user_id}` ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-500 font-medium">Atanmamis</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${row.trc20_total_received > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {row.trc20_total_received > 0 ? `$${row.trc20_total_received.toFixed(2)}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">
                          {(!row.bep20_address || !row.trc20_address) ? (
                            assignedSuccess === row.user_id ? (
                              <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                                <CheckCircle2 className="w-4 h-4" />
                                Atandi!
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAssignWallet(row.user_id)}
                                disabled={assigningUserId === row.user_id}
                                title="Bu kullaniciya cüzdan ata"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                              >
                                {assigningUserId === row.user_id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Zap className="w-3.5 h-3.5" />
                                )}
                                {assigningUserId === row.user_id ? 'Ataniyor...' : 'Cüzdan Ata'}
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Tamam
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  {filteredRows.length} kayitten {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} gösteriliyor
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-gray-700">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
