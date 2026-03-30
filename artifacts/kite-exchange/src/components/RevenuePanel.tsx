import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Users, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RevenueSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  tx_count_today: number;
  tx_count_month: number;
}

interface TopTrader {
  user_id: string;
  email: string;
  volume: number;
  pnl: number;
  count: number;
}

export default function RevenuePanel() {
  const [rev, setRev] = useState<RevenueSummary | null>(null);
  const [traders, setTraders] = useState<TopTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'total'>('month');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      await Promise.all([loadRevenue(), loadTopTraders()]);
    } catch (e) {
      console.error('Revenue load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRevenue() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [todayRes, weekRes, monthRes, totalRes] = await Promise.all([
      supabase.from('transactions').select('amount').eq('type', 'trading_fee').gte('created_at', todayStart),
      supabase.from('transactions').select('amount').eq('type', 'trading_fee').gte('created_at', weekStart),
      supabase.from('transactions').select('amount').eq('type', 'trading_fee').gte('created_at', monthStart),
      supabase.from('transactions').select('amount').eq('type', 'trading_fee'),
    ]);

    const sum = (rows: any[]) => (rows || []).reduce((a, r) => a + Math.abs(Number(r.amount) || 0), 0);

    setRev({
      today: sum(todayRes.data || []),
      week: sum(weekRes.data || []),
      month: sum(monthRes.data || []),
      total: sum(totalRes.data || []),
      tx_count_today: (todayRes.data || []).length,
      tx_count_month: (monthRes.data || []).length,
    });
  }

  async function loadTopTraders() {
    const { data } = await supabase
      .from('futures_positions')
      .select('user_id, pnl, size, leverage, user_profiles(email)')
      .order('pnl', { ascending: false })
      .limit(50);

    if (!data) return;

    const map: Record<string, { email: string; pnl: number; volume: number; count: number }> = {};
    for (const row of data) {
      const uid = row.user_id;
      if (!uid) continue;
      const email = (row.user_profiles as any)?.email || '';
      const pnl = Number(row.pnl) || 0;
      const vol = Math.abs(Number(row.size) || 0) * Math.abs(Number(row.leverage) || 1);
      if (!map[uid]) map[uid] = { email, pnl: 0, volume: 0, count: 0 };
      map[uid].pnl += pnl;
      map[uid].volume += vol;
      map[uid].count += 1;
    }

    const list = Object.entries(map).map(([user_id, v]) => ({ user_id, ...v }));
    list.sort((a, b) => b.volume - a.volume);
    setTraders(list.slice(0, 10));
  }

  function fmt(n: number) {
    if (!n) return '$0.00';
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  const cards = [
    { id: 'today' as const, label: 'Bugün', value: fmt(rev?.today || 0), sub: `${rev?.tx_count_today || 0} işlem`, color: 'text-green-600', border: 'border-green-200', bg: 'bg-green-50', icon: TrendingUp, iconColor: 'text-green-600' },
    { id: 'week' as const, label: 'Bu Hafta', value: fmt(rev?.week || 0), sub: 'Son 7 gün', color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', icon: TrendingUp, iconColor: 'text-blue-600' },
    { id: 'month' as const, label: 'Bu Ay', value: fmt(rev?.month || 0), sub: `${rev?.tx_count_month || 0} işlem`, color: 'text-yellow-600', border: 'border-yellow-200', bg: 'bg-yellow-50', icon: DollarSign, iconColor: 'text-yellow-600' },
    { id: 'total' as const, label: 'Tüm Zamanlar', value: fmt(rev?.total || 0), sub: 'Toplam komisyon', color: 'text-purple-600', border: 'border-purple-200', bg: 'bg-purple-50', icon: Award, iconColor: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gelir & Komisyon</h2>
          <p className="text-sm text-gray-500 mt-0.5">İşlem ücretlerinden elde edilen platform geliri</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          Komisyon verileri <span className="font-semibold">trading_fee</span> tipli işlemlerden hesaplanmaktadır.
          Futures işlem ücretleri kaydedilince burada otomatik görünür.
        </p>
      </div>

      {/* Revenue cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-2 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cards.map(c => {
            const Icon = c.icon;
            const isSelected = period === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setPeriod(c.id)}
                className={`bg-white rounded-xl p-4 shadow-sm border-2 text-left transition-all ${isSelected ? c.border + ' ' + c.bg : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-medium">{c.label}</span>
                  <Icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
                <div className="text-xs text-gray-400 mt-1">{c.sub}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Zero revenue hint */}
      {!loading && rev && rev.total === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-sm text-orange-700 font-medium">Henüz komisyon kaydı yok</p>
          <p className="text-xs text-orange-600 mt-1">Futures işlemleri gerçekleşince gelir burada görünecek</p>
        </div>
      )}

      {/* Top Traders */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="text-base font-bold text-gray-900">En Yüksek Hacimli Kullanıcılar</h3>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
                    <div className="h-2 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-5 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : traders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Henüz işlem geçmişi yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {traders.map((t, i) => {
              const rankColors = [
                { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
                { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
                { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
              ];
              const rank = rankColors[i] || { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };

              return (
                <div key={t.user_id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black flex-shrink-0 ${rank.bg} ${rank.text} ${rank.border}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.email || 'Kullanıcı'}</p>
                    <p className="text-xs text-gray-400">{t.count} pozisyon</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(t.volume)}</p>
                    <p className={`text-xs font-medium ${t.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)} P&L
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
