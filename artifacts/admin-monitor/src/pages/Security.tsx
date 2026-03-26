import { useState } from 'react';
import { useStore } from '../lib/store';

export default function Security() {
  const { alerts } = useStore();
  const [showAll, setShowAll] = useState(false);

  const secAlerts = alerts
    .filter(a => a.category === 'security' && !a.dismissed)
    .sort((a, b) => b.ts - a.ts);

  const criticals = secAlerts.filter(a => a.severity === 'critical');
  const highs = secAlerts.filter(a => a.severity === 'high');
  const displayed = showAll ? secAlerts : secAlerts.slice(0, 20);

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk`;
    return `${Math.floor(diff / 3600000)} sa`;
  }

  const threats = [
    { label: 'Kritik Tehdit', count: criticals.length, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Yüksek Risk', count: highs.length, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Toplam Olay', count: secAlerts.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="flex flex-col pb-24">
      <div className="p-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-lg font-bold text-white">Güvenlik</h1>
            <p className="text-xs text-gray-500">Gerçek zamanlı tehdit izleme</p>
          </div>
        </div>

        {/* Threat summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {threats.map(t => (
            <div key={t.label} className={`${t.bg} rounded-xl p-3 text-center`}>
              <p className={`text-xl font-bold ${t.color}`}>{t.count}</p>
              <p className="text-[10px] text-gray-500">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Security checklist */}
        <div className="bg-[#111] rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3">Güvenlik Kontrol Listesi</p>
          {[
            { label: 'Realtime İzleme', status: true },
            { label: 'Çekim İzleme', status: true },
            { label: 'Anormal Giriş Tespiti', status: true },
            { label: 'IP Takibi', status: true },
            { label: '2FA Zorunluluğu', status: false },
            { label: 'Otomatik IP Engelleme', status: false },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-gray-300">{item.label}</span>
              <span className={`text-xs font-medium ${item.status ? 'text-green-400' : 'text-gray-600'}`}>
                {item.status ? '✓ Aktif' : '○ Pasif'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security events */}
      <div className="px-4">
        <p className="text-xs text-gray-500 mb-2">Güvenlik Olayları</p>
        {displayed.length === 0 ? (
          <div className="text-center py-12 bg-[#111] rounded-2xl">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-400 text-sm">Güvenlik olayı yok</p>
          </div>
        ) : displayed.map(a => (
          <div key={a.id} className={`rounded-xl p-4 mb-2 border ${
            a.severity === 'critical' ? 'bg-red-500/5 border-red-500/30' :
            a.severity === 'high' ? 'bg-orange-500/5 border-orange-500/20' :
            'bg-[#111] border-white/5'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">
                {a.severity === 'critical' ? '🚨' : a.severity === 'high' ? '⚠️' : '🛡️'}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${
                  a.severity === 'critical' ? 'text-red-400' :
                  a.severity === 'high' ? 'text-orange-400' : 'text-white'
                }`}>{a.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{a.body}</p>
                {a.meta?.ip && (
                  <p className="text-gray-600 text-xs mt-1 font-mono">IP: {String(a.meta.ip)}</p>
                )}
                <p className="text-gray-600 text-xs mt-1">{timeAgo(a.ts)}</p>
              </div>
            </div>
          </div>
        ))}
        {secAlerts.length > 20 && !showAll && (
          <button onClick={() => setShowAll(true)} className="w-full py-3 text-yellow-400 text-sm">
            Tümünü Gör ({secAlerts.length})
          </button>
        )}
      </div>
    </div>
  );
}
