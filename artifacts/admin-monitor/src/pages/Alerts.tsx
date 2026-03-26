import { useState } from 'react';
import { useStore, AlertCategory, AlertSeverity } from '../lib/store';
import AlertBadge from '../components/AlertBadge';

const CAT_ICONS: Record<AlertCategory, string> = {
  user: '👤', finance: '💰', security: '🛡️', support: '💬', system: '⚙️', visitor: '👁️',
};
const CAT_LABELS: Record<AlertCategory, string> = {
  user: 'Üye', finance: 'Finans', security: 'Güvenlik', support: 'Destek', system: 'Sistem', visitor: 'Ziyaretçi',
};

const SEV_ORDER: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export default function Alerts() {
  const { alerts, markRead, markAllRead, dismiss, clearAll } = useStore();
  const [filter, setFilter] = useState<AlertCategory | 'all'>('all');
  const [sevFilter, setSevFilter] = useState<AlertSeverity | 'all'>('all');

  const visible = alerts
    .filter(a => !a.dismissed)
    .filter(a => filter === 'all' || a.category === filter)
    .filter(a => sevFilter === 'all' || a.severity === sevFilter)
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.ts - a.ts);

  const unread = alerts.filter(a => !a.read && !a.dismissed).length;

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} sa önce`;
    return new Date(ts).toLocaleDateString('tr-TR');
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <div>
          <h1 className="text-lg font-bold text-white">Alarmlar</h1>
          {unread > 0 && <p className="text-xs text-yellow-400">{unread} okunmamış</p>}
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-gray-400 bg-[#111] px-3 py-1.5 rounded-xl">
              Tümü oku
            </button>
          )}
          <button onClick={clearAll} className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl">
            Temizle
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {(['all', 'user', 'finance', 'security', 'support', 'system'] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`flex-none px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === c ? 'bg-yellow-400 text-black' : 'bg-[#111] text-gray-400'
            }`}
          >
            {c === 'all' ? 'Tümü' : `${CAT_ICONS[c]} ${CAT_LABELS[c]}`}
          </button>
        ))}
      </div>

      {/* Severity filter */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-3 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSevFilter(s)}
            className={`flex-none px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              sevFilter === s ? 'bg-white/10 text-white' : 'text-gray-600'
            }`}
          >
            {s === 'all' ? 'Hepsi' : s === 'critical' ? '🔴 Kritik' : s === 'high' ? '🟠 Yüksek' : s === 'medium' ? '🟡 Orta' : s === 'low' ? '🔵 Düşük' : '⚪ Bilgi'}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="flex flex-col gap-2 px-4">
        {visible.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-400">Alarm yok</p>
            <p className="text-gray-600 text-sm mt-1">Her şey normal</p>
          </div>
        ) : visible.map(alert => (
          <div
            key={alert.id}
            onClick={() => markRead(alert.id)}
            className={`rounded-2xl p-4 border transition-all ${
              !alert.read
                ? 'bg-[#151515] border-yellow-400/20'
                : 'bg-[#0f0f0f] border-white/5'
            } ${alert.severity === 'critical' ? 'border-red-500/30' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-xl mt-0.5">{CAT_ICONS[alert.category]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-sm font-semibold ${!alert.read ? 'text-white' : 'text-gray-300'}`}>
                      {alert.title}
                    </p>
                    <AlertBadge severity={alert.severity} />
                    {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                  </div>
                  <p className="text-gray-500 text-xs">{alert.body}</p>
                  {alert.meta && Object.keys(alert.meta).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(alert.meta).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="bg-white/5 text-gray-400 text-[10px] px-1.5 py-0.5 rounded">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 text-[11px] mt-2">{timeAgo(alert.ts)}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                className="text-gray-600 text-sm p-1 hover:text-gray-400"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
