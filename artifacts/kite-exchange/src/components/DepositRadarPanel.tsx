import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, ExternalLink, Wallet, Bell, AlertTriangle } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

const ADMIN_UUID = '88292f59-898a-4fef-a1c8-8813d7b60b61';
const WORKER_BASE = (typeof window !== 'undefined' && /replit\.dev|localhost/.test(window.location.host))
  ? 'https://basonce.com/api'
  : '/api';

interface Deposit {
  id: string;
  user_id: string | null;
  wallet_address_id: string | null;
  tx_hash: string;
  network: string;
  currency: string;
  amount: number;
  from_address: string | null;
  to_address: string | null;
  status: string;
  created_at: string;
  credited_at: string | null;
  user_email?: string | null;
  user_name?: string | null;
  wallet_address?: string | null;
}

interface UserWallet {
  id: string;
  address: string;
  network: string;
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  user_email?: string | null;
  user_name?: string | null;
}

export default function DepositRadarPanel() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'credited' | 'ignored'>('new');
  const [network, setNetwork] = useState<'all' | 'BEP20' | 'TRC20'>('all');
  const [lastScan, setLastScan] = useState<{at: string; result: any} | null>(null);
  const [crediting, setCrediting] = useState<string | null>(null);
  const [view, setView] = useState<'deposits' | 'wallets'>('deposits');
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletQuery, setWalletQuery] = useState('');
  const [autoAssigning, setAutoAssigning] = useState(false);

  const loadWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const { data: wRaw, error } = await supabase
        .from('wallet_pool')
        .select('id,address,network,assigned_to_user_id,assigned_at')
        .eq('is_assigned', true)
        .order('assigned_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      const ws = (wRaw || []) as UserWallet[];
      const userIds = [...new Set(ws.map(w => w.assigned_to_user_id).filter(Boolean))] as string[];
      const usersRes = userIds.length
        ? await supabase.from('user_profiles').select('id,email,full_name').in('id', userIds)
        : { data: [] };
      const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
      setWallets(ws.map(w => ({
        ...w,
        user_email: w.assigned_to_user_id ? userMap.get(w.assigned_to_user_id)?.email : null,
        user_name: w.assigned_to_user_id ? userMap.get(w.assigned_to_user_id)?.full_name : null,
      })));
    } catch (e: any) {
      console.error('loadWallets', e);
      alert('Cüzdanlar yüklenemedi: ' + (e.message || e));
    } finally {
      setWalletsLoading(false);
    }
  }, []);

  const autoAssignAll = async () => {
    if (!confirm('Cüzdanı olmayan tüm üyelere BSC + TRC adresi atansın mı?')) return;
    setAutoAssigning(true);
    try {
      const user = await getCurrentUser();
      const r = await fetch(`${WORKER_BASE}/admin/auto-assign-wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requester-id': user?.id || '' },
        body: '{}',
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Atama başarısız');
      alert(`✓ ${data.assigned} üyeye cüzdan atandı (${data.failed} hata, toplam ${data.total} eksik üye).`);
      await loadWallets();
    } catch (e: any) {
      alert('Hata: ' + (e.message || e));
    } finally {
      setAutoAssigning(false);
    }
  };

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const { data: depsRaw, error } = await supabase
        .from('blockchain_deposits')
        .select('id,user_id,wallet_address_id,tx_hash,network,currency,amount,from_address,to_address,status,created_at,credited_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const deps = (depsRaw || []) as Deposit[];

      // Resolve user emails + wallet addresses (no FK joins to avoid cache issues)
      const userIds = [...new Set(deps.map(d => d.user_id).filter(Boolean))] as string[];
      const walletIds = [...new Set(deps.map(d => d.wallet_address_id).filter(Boolean))] as string[];

      const [usersRes, walletsRes] = await Promise.all([
        userIds.length
          ? supabase.from('user_profiles').select('id,email,full_name').in('id', userIds)
          : Promise.resolve({ data: [] }),
        walletIds.length
          ? supabase.from('wallet_pool').select('id,address').in('id', walletIds)
          : Promise.resolve({ data: [] }),
      ]);

      const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
      const walletMap = new Map((walletsRes.data || []).map((w: any) => [w.id, w]));

      const enriched = deps.map(d => ({
        ...d,
        user_email: d.user_id ? userMap.get(d.user_id)?.email : null,
        user_name: d.user_id ? userMap.get(d.user_id)?.full_name : null,
        wallet_address: d.wallet_address_id ? walletMap.get(d.wallet_address_id)?.address : d.to_address,
      }));
      setDeposits(enriched);
    } catch (e: any) {
      console.error('loadDeposits', e);
      alert('Kayıtları yükleyemedim: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeposits();
    // Realtime subscription
    const ch = supabase.channel('deposit-radar').on('postgres_changes', {
      event: '*', schema: 'public', table: 'blockchain_deposits',
    }, () => loadDeposits()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadDeposits]);

  const runScan = async () => {
    setScanning(true);
    try {
      const user = await getCurrentUser();
      const r = await fetch(`${WORKER_BASE}/scan-deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requester-id': user?.id || '' },
        body: '{}',
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || 'Tarama başarısız');
      setLastScan({ at: new Date().toISOString(), result: data });
      await loadDeposits();
      if (data.new_deposits > 0) {
        try { new Audio('data:audio/wav;base64,UklGRigBAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAP8A').play(); } catch {}
      }
    } catch (e: any) {
      alert('Tarama hatası: ' + (e.message || e));
    } finally {
      setScanning(false);
    }
  };

  const creditUser = async (d: Deposit) => {
    if (!d.user_id) {
      alert('Bu cüzdan henüz bir üyeye atanmamış. Önce üyeye atayın.');
      return;
    }
    if (!confirm(`${d.amount.toFixed(2)} USDT, ${d.user_email || d.user_id} hesabına eklensin mi?`)) return;
    setCrediting(d.id);
    try {
      // Read current USDT balance
      const { data: bal } = await supabase
        .from('user_balances')
        .select('balance').eq('user_id', d.user_id).eq('symbol', 'USDT').maybeSingle();
      const current = Number(bal?.balance || 0);
      const next = Number((current + d.amount).toFixed(4));

      let upd;
      if (bal) {
        upd = await supabase.from('user_balances').update({ balance: next }).eq('user_id', d.user_id).eq('symbol', 'USDT');
      } else {
        upd = await supabase.from('user_balances').insert({ user_id: d.user_id, symbol: 'USDT', balance: next });
      }
      if (upd.error) throw upd.error;

      // Mark deposit as credited
      const { error: dErr } = await supabase.from('blockchain_deposits').update({
        status: 'credited',
        credited_at: new Date().toISOString(),
      }).eq('id', d.id);
      if (dErr) throw dErr;

      await loadDeposits();
    } catch (e: any) {
      alert('Bakiye eklenemedi: ' + (e.message || e));
    } finally {
      setCrediting(null);
    }
  };

  const ignoreDep = async (d: Deposit) => {
    if (!confirm(`${d.amount.toFixed(2)} ${d.currency} işlemi yoksayılsın mı?`)) return;
    const { error } = await supabase.from('blockchain_deposits').update({ status: 'ignored' }).eq('id', d.id);
    if (error) alert('Hata: ' + error.message);
    else loadDeposits();
  };

  const filtered = deposits.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (network !== 'all' && d.network !== network) return false;
    return true;
  });

  const stats = {
    new: deposits.filter(d => d.status === 'new').length,
    credited: deposits.filter(d => d.status === 'credited').length,
    ignored: deposits.filter(d => d.status === 'ignored').length,
    totalUsdt: deposits.filter(d => d.status === 'new').reduce((s, d) => s + d.amount, 0),
  };

  const explorer = (d: Deposit) =>
    d.network === 'BEP20'
      ? `https://bscscan.com/tx/${d.tx_hash}`
      : `https://tronscan.org/#/transaction/${d.tx_hash}`;

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const ago = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s önce`;
    if (s < 3600) return `${Math.floor(s/60)}dk önce`;
    if (s < 86400) return `${Math.floor(s/3600)}sa önce`;
    return `${Math.floor(s/86400)}g önce`;
  };

  // Auto-load wallets when switching tabs
  useEffect(() => {
    if (view === 'wallets' && wallets.length === 0) loadWallets();
  }, [view, wallets.length, loadWallets]);

  const filteredWallets = wallets.filter(w => {
    if (network !== 'all' && w.network !== network) return false;
    if (walletQuery) {
      const q = walletQuery.toLowerCase();
      return (w.address?.toLowerCase().includes(q) || w.user_email?.toLowerCase().includes(q) || w.user_name?.toLowerCase().includes(q));
    }
    return true;
  });
  const walletStats = {
    total: wallets.length,
    bep20: wallets.filter(w => w.network === 'BEP20').length,
    trc20: wallets.filter(w => w.network === 'TRC20').length,
    users: new Set(wallets.map(w => w.assigned_to_user_id).filter(Boolean)).size,
  };
  const explorerWallet = (w: UserWallet) =>
    w.network === 'BEP20'
      ? `https://bscscan.com/address/${w.address}`
      : `https://tronscan.org/#/address/${w.address}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-4 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wallet className="w-6 h-6" />
              {stats.new > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">BSC & TRC-20 Para Radarı</h2>
              <p className="text-xs text-purple-200">Tüm üye cüzdanları tek panelden</p>
            </div>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-xl font-bold text-sm shadow-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Taranıyor...' : 'Tüm Cüzdanları Tara'}
          </button>
        </div>

        {/* View toggle */}
        <div className="flex bg-black/30 rounded-xl p-1 mb-3">
          <button
            onClick={() => setView('deposits')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${view === 'deposits' ? 'bg-yellow-500 text-black' : 'text-purple-200'}`}
          >
            💰 Para Akışı ({stats.new} yeni)
          </button>
          <button
            onClick={() => setView('wallets')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${view === 'wallets' ? 'bg-yellow-500 text-black' : 'text-purple-200'}`}
          >
            👛 Tüm Cüzdanlar ({walletStats.users || '...'})
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-[10px] text-purple-200">Yeni Gelen</div>
            <div className="text-lg font-black text-yellow-300">{stats.new}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-[10px] text-purple-200">Eklenmiş</div>
            <div className="text-lg font-black text-green-300">{stats.credited}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-[10px] text-purple-200">Yoksayılan</div>
            <div className="text-lg font-black text-gray-300">{stats.ignored}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-[10px] text-purple-200">Bekleyen $</div>
            <div className="text-lg font-black text-yellow-300">{fmt(stats.totalUsdt)}</div>
          </div>
        </div>

        {lastScan && (
          <div className="mt-3 text-[11px] text-purple-200 flex items-center gap-2">
            <Bell className="w-3 h-3" />
            Son tarama {ago(lastScan.at)}: {lastScan.result.scanned} cüzdan kontrol edildi,{' '}
            <span className="text-yellow-300 font-bold">{lastScan.result.new_deposits} yeni</span> bulundu
            {lastScan.result.errors > 0 && <span className="text-red-300">· {lastScan.result.errors} hata</span>}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['new', 'credited', 'ignored', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f ? 'bg-white shadow text-purple-700' : 'text-gray-600'
              }`}
            >
              {f === 'new' && `Yeni (${stats.new})`}
              {f === 'credited' && 'Eklenmiş'}
              {f === 'ignored' && 'Yoksayılan'}
              {f === 'all' && 'Tümü'}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['all', 'BEP20', 'TRC20'] as const).map(n => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                network === n ? 'bg-white shadow text-purple-700' : 'text-gray-600'
              }`}
            >
              {n === 'all' ? 'Tüm Ağlar' : n}
            </button>
          ))}
        </div>
        <button onClick={loadDeposits} disabled={loading} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Listeyi Yenile
        </button>
      </div>

      {/* WALLETS VIEW */}
      {view === 'wallets' && (
        <div className="space-y-3">
          {/* Wallet stats + actions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-purple-50 rounded-xl p-2 text-center">
                <div className="text-[10px] text-purple-600">Toplam Üye</div>
                <div className="text-xl font-black text-purple-700">{walletStats.users}</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-2 text-center">
                <div className="text-[10px] text-yellow-700">BSC (BEP20)</div>
                <div className="text-xl font-black text-yellow-700">{walletStats.bep20}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-2 text-center">
                <div className="text-[10px] text-red-700">TRON (TRC20)</div>
                <div className="text-xl font-black text-red-700">{walletStats.trc20}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={walletQuery}
                onChange={(e) => setWalletQuery(e.target.value)}
                placeholder="🔎 E-posta veya adres ara..."
                className="flex-1 min-w-[180px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <button onClick={loadWallets} disabled={walletsLoading} className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold">
                <RefreshCw className={`w-3 h-3 ${walletsLoading ? 'animate-spin' : ''}`} /> Yenile
              </button>
              <button onClick={autoAssignAll} disabled={autoAssigning} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold">
                {autoAssigning ? '...' : '+ Eksik Üyelere Cüzdan Ata'}
              </button>
            </div>
          </div>

          {/* Wallet list */}
          {filteredWallets.length === 0 && !walletsLoading && (
            <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {wallets.length === 0
                  ? 'Henüz hiç üye cüzdanı yok. "Eksik Üyelere Cüzdan Ata" tuşuna basın.'
                  : 'Bu filtrede sonuç yok.'}
              </p>
            </div>
          )}

          {/* Group by user */}
          {(() => {
            const byUser = new Map<string, UserWallet[]>();
            filteredWallets.forEach(w => {
              const k = w.assigned_to_user_id || 'unassigned';
              if (!byUser.has(k)) byUser.set(k, []);
              byUser.get(k)!.push(w);
            });
            return Array.from(byUser.entries()).slice(0, 300).map(([uid, ws]) => {
              const u = ws[0];
              return (
                <div key={uid} className="bg-white rounded-2xl p-3 shadow-sm border-l-4 border-purple-400">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      👤 {u.user_email || u.user_name || <span className="text-red-500">Atanmamış</span>}
                    </div>
                    {u.assigned_at && <span className="text-[10px] text-gray-400">{ago(u.assigned_at)}</span>}
                  </div>
                  <div className="space-y-1.5">
                    {ws.map(w => (
                      <div key={w.id} className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          w.network === 'BEP20' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>{w.network === 'BEP20' ? 'BSC' : 'TRON'}</span>
                        <code className="flex-1 truncate font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{w.address}</code>
                        <button
                          onClick={() => navigator.clipboard?.writeText(w.address)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-semibold"
                        >
                          📋
                        </button>
                        <a
                          href={explorerWallet(w)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-semibold whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {w.network === 'BEP20' ? 'BscScan' : 'TronScan'}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* DEPOSITS VIEW (existing) */}
      {view === 'deposits' && (<>

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {filter === 'new'
              ? 'Bekleyen yeni transfer yok. "Tüm Cüzdanları Tara" tuşuna basın.'
              : 'Bu filtrede kayıt yok.'}
          </p>
        </div>
      )}

      {/* Deposit cards */}
      <div className="space-y-2">
        {filtered.map(d => (
          <div key={d.id} className={`bg-white rounded-2xl p-3 shadow-sm border-l-4 ${
            d.status === 'new' ? 'border-yellow-500 bg-yellow-50' :
            d.status === 'credited' ? 'border-green-500' : 'border-gray-300'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    d.network === 'BEP20' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>{d.network}</span>
                  <span className="text-lg font-black text-green-600">+{fmt(d.amount)} {d.currency}</span>
                  {d.status === 'credited' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {d.status === 'ignored' && <XCircle className="w-4 h-4 text-gray-400" />}
                  <span className="text-[10px] text-gray-400 ml-auto">{ago(d.created_at)}</span>
                </div>

                <div className="text-xs text-gray-700 mb-1 truncate">
                  👤 <span className="font-semibold">
                    {d.user_email || d.user_name || <span className="text-red-500">⚠ ATANMAMIŞ CÜZDAN</span>}
                  </span>
                </div>

                <div className="text-[11px] text-gray-500 font-mono space-y-0.5">
                  <div className="truncate">📥 {d.wallet_address?.slice(0, 14)}...{d.wallet_address?.slice(-6)}</div>
                  <div className="truncate">📤 {d.from_address?.slice(0, 14)}...{d.from_address?.slice(-6)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {d.status === 'new' && (
                  <>
                    <button
                      onClick={() => creditUser(d)}
                      disabled={crediting === d.id || !d.user_id}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      {crediting === d.id ? '...' : '✓ Bakiyeye Ekle'}
                    </button>
                    <button onClick={() => ignoreDep(d)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-semibold">
                      Yoksay
                    </button>
                  </>
                )}
                <a href={explorer(d)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold">
                  <ExternalLink className="w-3 h-3" /> TX
                </a>
              </div>
            </div>
            {!d.user_id && d.status === 'new' && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-orange-700 bg-orange-50 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3" /> Bu cüzdan kimseye atanmamış. Önce "Cüzdan Havuzu" tabından üyeye atayın.
              </div>
            )}
          </div>
        ))}
      </div>
      </>)}
    </div>
  );
}
