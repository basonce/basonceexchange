import { useEffect, useMemo, useState } from 'react';
import {
  Copy, Users, DollarSign, TrendingUp, TrendingDown, Search, Pause, Edit2,
  Trash2, Plus, X, Save, RefreshCw, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CopyTrader {
  id: string;
  name: string;
  avatar_url: string | null;
  strategy_type: string | null;
  coin_symbol: string | null;
  follower_count: number | null;
  max_followers: number | null;
  pnl_30d: number | null;
  roi_30d: number | null;
  roi_7d: number | null;
  total_pnl: number | null;
  win_rate: number | null;
  runtime_days: number | null;
  is_active?: boolean | null;
}

interface UserCopy {
  id: string;
  user_id: string;
  trader_id: string;
  investment_amount: number;
  current_value: number | null;
  pnl: number | null;
  roi: number | null;
  status: string;
  created_at: string;
  copy_traders: CopyTrader | null;
}

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

const N = (v: any) => Number(v ?? 0);
const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function CopyTradingAdminPanel() {
  const [tab, setTab] = useState<'traders' | 'investments'>('traders');
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [copies, setCopies] = useState<UserCopy[]>([]);
  const [users, setUsers] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CopyTrader | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      supabase.from('copy_traders').select('*').order('follower_count', { ascending: false }),
      supabase
        .from('user_copy_trades')
        .select('*, copy_traders(*)')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);
    setTraders((tRes.data as any) || []);
    const cs = (cRes.data as any) || [];
    setCopies(cs);

    const uids = Array.from(new Set(cs.map((c: UserCopy) => c.user_id).filter(Boolean)));
    if (uids.length) {
      const { data: ups } = await supabase
        .from('user_profiles')
        .select('id,email,full_name')
        .in('id', uids);
      const m: Record<string, UserRow> = {};
      (ups || []).forEach((u: any) => { m[u.id] = u; });
      setUsers(m);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Aggregates per trader
  const stats = useMemo(() => {
    const m: Record<string, { investors: number; totalInvested: number; totalPnL: number }> = {};
    copies.forEach(c => {
      if (c.status !== 'active') return;
      const id = c.trader_id;
      if (!m[id]) m[id] = { investors: 0, totalInvested: 0, totalPnL: 0 };
      m[id].investors += 1;
      m[id].totalInvested += N(c.investment_amount);
      m[id].totalPnL += N(c.pnl);
    });
    return m;
  }, [copies]);

  const totals = useMemo(() => {
    const active = copies.filter(c => c.status === 'active');
    return {
      activeCopies: active.length,
      uniqueUsers: new Set(active.map(c => c.user_id)).size,
      totalInvested: active.reduce((s, c) => s + N(c.investment_amount), 0),
      totalPnL: active.reduce((s, c) => s + N(c.pnl), 0),
    };
  }, [copies]);

  const filteredTraders = traders.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCopies = copies.filter(c => {
    if (!search) return true;
    const u = users[c.user_id];
    const q = search.toLowerCase();
    return (
      u?.email?.toLowerCase().includes(q) ||
      u?.full_name?.toLowerCase().includes(q) ||
      c.copy_traders?.name?.toLowerCase().includes(q)
    );
  });

  async function saveTrader(t: CopyTrader) {
    const payload = {
      name: t.name,
      avatar_url: t.avatar_url,
      strategy_type: t.strategy_type,
      coin_symbol: t.coin_symbol,
      follower_count: N(t.follower_count),
      max_followers: N(t.max_followers),
      pnl_30d: N(t.pnl_30d),
      roi_30d: N(t.roi_30d),
      roi_7d: N(t.roi_7d),
      total_pnl: N(t.total_pnl),
      win_rate: N(t.win_rate),
      runtime_days: N(t.runtime_days),
    };
    if (t.id) {
      await supabase.from('copy_traders').update(payload).eq('id', t.id);
    } else {
      await supabase.from('copy_traders').insert(payload);
    }
    setEditing(null);
    setCreating(false);
    load();
  }

  async function deleteTrader(id: string) {
    if (!confirm('Bu trader silinsin mi? (Aktif kopyalar varsa kullanıcıları etkiler)')) return;
    await supabase.from('copy_traders').delete().eq('id', id);
    load();
  }

  async function stopCopy(id: string) {
    if (!confirm('Bu kullanıcının kopyalama işlemi durdurulsun mu?')) return;
    await supabase.from('user_copy_trades').update({ status: 'stopped' }).eq('id', id);
    load();
  }

  // ── Manual profit/loss intervention ───────────────────────────
  // Adjusts a user's copy trade by a delta amount (USD). Positive = profit,
  // negative = loss. Updates pnl, current_value and roi atomically so the
  // user immediately sees the new numbers in their app.
  async function applyIntervention(copy: UserCopy, deltaUsd: number) {
    const newPnl = N(copy.pnl) + deltaUsd;
    const newCurrent = N(copy.investment_amount) + newPnl;
    const newRoi = N(copy.investment_amount) > 0
      ? (newPnl / N(copy.investment_amount)) * 100
      : 0;
    await supabase
      .from('user_copy_trades')
      .update({ pnl: newPnl, current_value: newCurrent, roi: newRoi })
      .eq('id', copy.id);
    // Optimistic local update for instant feedback
    setCopies(prev => prev.map(c =>
      c.id === copy.id ? { ...c, pnl: newPnl, current_value: newCurrent, roi: newRoi } : c
    ));
  }

  async function setExactPnl(copy: UserCopy, newPnl: number) {
    const newCurrent = N(copy.investment_amount) + newPnl;
    const newRoi = N(copy.investment_amount) > 0
      ? (newPnl / N(copy.investment_amount)) * 100
      : 0;
    await supabase
      .from('user_copy_trades')
      .update({ pnl: newPnl, current_value: newCurrent, roi: newRoi })
      .eq('id', copy.id);
    setCopies(prev => prev.map(c =>
      c.id === copy.id ? { ...c, pnl: newPnl, current_value: newCurrent, roi: newRoi } : c
    ));
  }

  const [intervening, setIntervening] = useState<UserCopy | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">Copy Trading Yönetimi</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
          <button
            onClick={() => { setCreating(true); setEditing({
              id: '', name: '', avatar_url: '', strategy_type: 'Aggressive',
              coin_symbol: 'BTC', follower_count: 0, max_followers: 5000,
              pnl_30d: 0, roi_30d: 0, roi_7d: 0, total_pnl: 0,
              win_rate: 0, runtime_days: 0,
            }); }}
            className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-600"
          >
            <Plus className="w-4 h-4" /> Yeni Trader
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Aktif Yatırımcı" value={totals.uniqueUsers.toString()} color="blue" />
        <StatCard icon={<Copy className="w-5 h-5" />} label="Aktif Kopya" value={totals.activeCopies.toString()} color="purple" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Toplam Yatırım" value={fmt(totals.totalInvested)} color="green" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Toplam PnL" value={fmt(totals.totalPnL)} color={totals.totalPnL >= 0 ? 'green' : 'red'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 border-b border-gray-200">
        {[
          { id: 'traders' as const, label: `Trader'lar (${traders.length})` },
          { id: 'investments' as const, label: `Kullanıcı Yatırımları (${copies.filter(c => c.status === 'active').length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t.id ? 'border-yellow-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'traders' ? 'Trader ara...' : 'Kullanıcı veya trader ara...'}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Yükleniyor...</div>}

      {/* Traders list */}
      {!loading && tab === 'traders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Trader</th>
                  <th className="px-3 py-2 text-left">Strateji</th>
                  <th className="px-3 py-2 text-right">Aktif Yatırımcı</th>
                  <th className="px-3 py-2 text-right">Toplam Yatırım</th>
                  <th className="px-3 py-2 text-right">ROI 30g</th>
                  <th className="px-3 py-2 text-right">Win %</th>
                  <th className="px-3 py-2 text-right">Toplam PnL</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTraders.map(t => {
                  const s = stats[t.id] || { investors: 0, totalInvested: 0, totalPnL: 0 };
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {t.avatar_url ? (
                            <img src={t.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                              {t.name?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{t.name}</div>
                            <div className="text-xs text-gray-500">{t.coin_symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{t.strategy_type || '-'}</td>
                      <td className="px-3 py-2 text-right font-semibold">{s.investors}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600">{fmt(s.totalInvested)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${N(t.roi_30d) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {N(t.roi_30d).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">{N(t.win_rate).toFixed(0)}%</td>
                      <td className={`px-3 py-2 text-right font-semibold ${s.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(s.totalPnL)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditing(t)}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTrader(t.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTraders.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Trader bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investments list */}
      {!loading && tab === 'investments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Kullanıcı</th>
                  <th className="px-3 py-2 text-left">Trader</th>
                  <th className="px-3 py-2 text-right">Yatırım</th>
                  <th className="px-3 py-2 text-right">Şu Anki</th>
                  <th className="px-3 py-2 text-right">PnL</th>
                  <th className="px-3 py-2 text-right">ROI</th>
                  <th className="px-3 py-2 text-center">Durum</th>
                  <th className="px-3 py-2 text-left">Tarih</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCopies.map(c => {
                  const u = users[c.user_id];
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 ${c.status !== 'active' ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{u?.full_name || u?.email?.split('@')[0] || 'Bilinmeyen'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[160px]">{u?.email}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {c.copy_traders?.avatar_url && (
                            <img src={c.copy_traders.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <span className="font-medium">{c.copy_traders?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(N(c.investment_amount))}</td>
                      <td className="px-3 py-2 text-right">{fmt(N(c.current_value))}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${N(c.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(N(c.pnl))}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${N(c.roi) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {N(c.roi).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {c.status === 'active' && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => applyIntervention(c, Math.max(N(c.investment_amount) * 0.05, 5))}
                              className="px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-green-700 text-xs font-bold"
                              title="+%5 Kar Ver"
                            >
                              +5%
                            </button>
                            <button
                              onClick={() => applyIntervention(c, -Math.max(N(c.investment_amount) * 0.05, 5))}
                              className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700 text-xs font-bold"
                              title="-%5 Zarar Ver"
                            >
                              -5%
                            </button>
                            <button
                              onClick={() => setIntervening(c)}
                              className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600"
                              title="Müdahale Et"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => stopCopy(c.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-red-600"
                              title="Durdur"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredCopies.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Aktif yatırım yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create modal */}
      {editing && (
        <TraderEditor
          trader={editing}
          isNew={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={saveTrader}
        />
      )}

      {/* Intervention modal */}
      {intervening && (
        <InterventionModal
          copy={intervening}
          userName={users[intervening.user_id]?.full_name || users[intervening.user_id]?.email?.split('@')[0] || 'Kullanıcı'}
          onClose={() => setIntervening(null)}
          onDelta={async (delta) => { await applyIntervention(intervening, delta); }}
          onSetPnl={async (pnl) => { await setExactPnl(intervening, pnl); }}
        />
      )}
    </div>
  );
}

function InterventionModal({
  copy, userName, onClose, onDelta, onSetPnl,
}: {
  copy: UserCopy;
  userName: string;
  onClose: () => void;
  onDelta: (delta: number) => Promise<void>;
  onSetPnl: (pnl: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const invested = N(copy.investment_amount);
  const currentPnl = N(copy.pnl);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); }
    finally { setBusy(false); }
  }

  const presetPct = [
    { pct: 5, color: 'green' }, { pct: 10, color: 'green' },
    { pct: 25, color: 'green' }, { pct: 50, color: 'green' },
    { pct: -5, color: 'red' }, { pct: -10, color: 'red' },
    { pct: -25, color: 'red' }, { pct: -50, color: 'red' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" /> Müdahale: {userName}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current state */}
          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Yatırım</div>
              <div className="font-bold text-gray-900">{fmt(invested)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Şu Anki PnL</div>
              <div className={`font-bold ${currentPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(currentPnl)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Şu Anki Değer</div>
              <div className="font-bold text-gray-900">{fmt(invested + currentPnl)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">ROI</div>
              <div className={`font-bold ${currentPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {invested > 0 ? (currentPnl / invested * 100).toFixed(2) : '0'}%
              </div>
            </div>
          </div>

          {/* Quick preset percentages */}
          <div>
            <div className="text-xs font-bold text-gray-700 mb-2">Hızlı Yüzde Müdahale (yatırım üzerinden)</div>
            <div className="grid grid-cols-4 gap-2">
              {presetPct.map(p => (
                <button
                  key={p.pct}
                  disabled={busy}
                  onClick={() => run(() => onDelta(invested * p.pct / 100))}
                  className={`py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${
                    p.color === 'green'
                      ? 'bg-green-100 hover:bg-green-200 text-green-700'
                      : 'bg-red-100 hover:bg-red-200 text-red-700'
                  }`}
                >
                  {p.pct > 0 ? `+${p.pct}` : p.pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Custom USD amount */}
          <div>
            <div className="text-xs font-bold text-gray-700 mb-2">Özel Tutar ($)</div>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Örn: 50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button
                disabled={busy || !amount}
                onClick={() => run(() => onDelta(Math.abs(+amount)))}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                <TrendingUp className="w-4 h-4" /> +${amount || '0'} Kar Ver
              </button>
              <button
                disabled={busy || !amount}
                onClick={() => run(() => onDelta(-Math.abs(+amount)))}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                <TrendingDown className="w-4 h-4" /> -${amount || '0'} Zarar Ver
              </button>
            </div>
          </div>

          {/* Exact PnL set */}
          <div className="border-t pt-3">
            <div className="text-xs font-bold text-gray-700 mb-2">Doğrudan PnL Belirle</div>
            <div className="flex gap-2">
              <button
                disabled={busy || !amount}
                onClick={() => run(() => onSetPnl(+amount))}
                className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-bold disabled:opacity-50"
              >
                PnL = ${amount || '0'}
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => onSetPnl(0))}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };
  return (
    <div className={`rounded-xl p-3 border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function TraderEditor({
  trader, isNew, onClose, onSave,
}: { trader: CopyTrader; isNew: boolean; onClose: () => void; onSave: (t: CopyTrader) => void }) {
  const [t, setT] = useState<CopyTrader>(trader);
  const upd = (k: keyof CopyTrader, v: any) => setT({ ...t, [k]: v });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{isNew ? 'Yeni Trader' : `Düzenle: ${trader.name}`}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="İsim"><input value={t.name} onChange={e => upd('name', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Avatar URL"><input value={t.avatar_url || ''} onChange={e => upd('avatar_url', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Strateji">
              <select value={t.strategy_type || ''} onChange={e => upd('strategy_type', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option>Aggressive</option><option>Conservative</option><option>Balanced</option><option>Scalping</option><option>Swing</option>
              </select>
            </Field>
            <Field label="Coin"><input value={t.coin_symbol || ''} onChange={e => upd('coin_symbol', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Takipçi"><input type="number" value={t.follower_count ?? 0} onChange={e => upd('follower_count', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Max Takipçi"><input type="number" value={t.max_followers ?? 0} onChange={e => upd('max_followers', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="ROI 30g %"><input type="number" step="0.1" value={t.roi_30d ?? 0} onChange={e => upd('roi_30d', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="ROI 7g %"><input type="number" step="0.1" value={t.roi_7d ?? 0} onChange={e => upd('roi_7d', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Win Rate %"><input type="number" step="0.1" value={t.win_rate ?? 0} onChange={e => upd('win_rate', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Runtime (gün)"><input type="number" value={t.runtime_days ?? 0} onChange={e => upd('runtime_days', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="PnL 30g $"><input type="number" step="1" value={t.pnl_30d ?? 0} onChange={e => upd('pnl_30d', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Toplam PnL $"><input type="number" step="1" value={t.total_pnl ?? 0} onChange={e => upd('total_pnl', +e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
          </div>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">İptal</button>
          <button onClick={() => onSave(t)} className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-600">
            <Save className="w-4 h-4" /> Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  );
}
