import { useState } from 'react';
import { Trash2, CheckCheck, Bell, BellOff } from 'lucide-react';
import { useStore, AlertCategory, AlertSeverity } from '../lib/store';
import { isMuted } from '../lib/store';
import { stopAlarm } from '../lib/audio';

const CAT_ICONS: Record<AlertCategory, string> = {
  user: '👤', finance: '💰', security: '🛡️', support: '💬', system: '⚙️', visitor: '👁️',
};
const CAT_LABELS: Record<AlertCategory, string> = {
  user: 'Üye', finance: 'Finans', security: 'Güvenlik', support: 'Destek', system: 'Sistem', visitor: 'Ziyaretçi',
};
const SEV_COLOR: Record<AlertSeverity, string> = {
  critical: '#FF4757', high: '#FF9800', medium: '#F0B90B', low: '#3D7FFF', info: '#888',
};
const SEV_BG: Record<AlertSeverity, string> = {
  critical: 'rgba(255,71,87,0.1)', high: 'rgba(255,152,0,0.1)', medium: 'rgba(240,185,11,0.08)', low: 'rgba(61,127,255,0.08)', info: 'rgba(136,136,136,0.06)',
};
const SEV_BORDER: Record<AlertSeverity, string> = {
  critical: 'rgba(255,71,87,0.3)', high: 'rgba(255,152,0,0.25)', medium: 'rgba(240,185,11,0.2)', low: 'rgba(61,127,255,0.2)', info: 'rgba(136,136,136,0.15)',
};
const SEV_LABEL: Record<AlertSeverity, string> = {
  critical: 'KRİTİK', high: 'YÜKSEK', medium: 'ORTA', low: 'DÜŞÜK', info: 'BİLGİ',
};
const SEV_ORDER: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export default function Alerts() {
  const { alerts, markRead, markAllRead, dismiss, clearAll, settings, updateSettings } = useStore();
  const [catFilter, setCatFilter] = useState<AlertCategory | 'all'>('all');
  const [sevFilter, setSevFilter] = useState<AlertSeverity | 'all'>('all');

  const muted = isMuted(settings);
  const unread = alerts.filter(a => !a.read && !a.dismissed).length;

  const visible = alerts
    .filter(a => !a.dismissed)
    .filter(a => catFilter === 'all' || a.category === catFilter)
    .filter(a => sevFilter === 'all' || a.severity === sevFilter)
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.ts - a.ts);

  function timeAgo(ts: number) {
    const d = Date.now() - ts;
    if (d < 60000) return 'Az önce';
    if (d < 3600000) return `${Math.floor(d/60000)} dk`;
    if (d < 86400000) return `${Math.floor(d/3600000)} sa`;
    return new Date(ts).toLocaleDateString('tr-TR');
  }

  // Banner "Aç" düğmesi: tüm mute kaynaklarını sıfırla
  function handleForceUnmute() {
    stopAlarm();
    updateSettings({ muteAll: false, muteFrom: '00:00', muteTo: '00:00' });
  }

  // Üstteki zil ikonu: sadece muteAll'u toggle et
  function handleBellToggle() {
    if (settings.muteAll) {
      updateSettings({ muteAll: false });
    } else {
      stopAlarm();
      updateSettings({ muteAll: true });
    }
  }

  return (
    <div className="flex flex-col pb-28">
      <div className="p-4 pt-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#FF4757', letterSpacing: '0.08em' }}>BİLDİRİM MERKEZİ</p>
            <h1 className="text-2xl font-black text-white">Alarmlar</h1>
            {unread > 0 && <p className="text-sm mt-0.5" style={{ color: '#FF4757' }}>{unread} okunmamış</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBellToggle}
              className="p-2.5 rounded-xl transition-colors"
              style={{ background: settings.muteAll ? 'rgba(255,71,87,0.15)' : 'rgba(255,255,255,0.06)', border: settings.muteAll ? '1px solid rgba(255,71,87,0.3)' : '1px solid transparent' }}
            >
              {settings.muteAll ? <BellOff size={16} color="#FF4757" /> : <Bell size={16} color="rgba(255,255,255,0.5)" />}
            </button>
            {unread > 0 && (
              <button onClick={markAllRead} className="px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
                <CheckCheck size={14} />
              </button>
            )}
            <button onClick={clearAll} className="px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(255,71,87,0.1)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.2)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Mute banner */}
        {muted && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)' }}>
            <BellOff size={16} color="#FF4757" />
            <p className="text-sm flex-1" style={{ color: '#FF4757' }}>Sesler susturuldu</p>
            <button
              onClick={handleForceUnmute}
              className="text-xs font-bold px-3 py-1.5 rounded-xl flex-none transition-all active:scale-95"
              style={{ background: '#FF4757', color: 'white' }}
            >
              Aç
            </button>
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'user', 'finance', 'security', 'support', 'system'] as const).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className="flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: catFilter === c ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === c ? 'rgba(240,185,11,0.3)' : 'rgba(255,255,255,0.07)'}`, color: catFilter === c ? '#F0B90B' : 'rgba(255,255,255,0.4)' }}>
              {c === 'all' ? 'Tümü' : `${CAT_ICONS[c]} ${CAT_LABELS[c]}`}
            </button>
          ))}
        </div>

        {/* Severity pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map(s => (
            <button key={s} onClick={() => setSevFilter(s)}
              className="flex-none px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: sevFilter === s && s !== 'all' ? `${SEV_COLOR[s]}22` : sevFilter === s ? 'rgba(255,255,255,0.1)' : 'transparent', color: s === 'all' ? (sevFilter === s ? 'white' : 'rgba(255,255,255,0.3)') : (sevFilter === s ? SEV_COLOR[s] : 'rgba(255,255,255,0.3)') }}>
              {s === 'all' ? 'Hepsi' : `● ${SEV_LABEL[s]}`}
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div className="flex flex-col gap-2.5">
          {visible.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
              <p className="text-3xl mb-3">✅</p>
              <p className="text-sm font-semibold" style={{ color: '#00DC82' }}>Temiz — alarm yok</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>İzleme aktif, bekleniyor…</p>
            </div>
          ) : visible.map(a => (
            <div
              key={a.id}
              onClick={() => markRead(a.id)}
              className="rounded-2xl p-4 transition-all cursor-pointer active:scale-[0.99]"
              style={{ background: SEV_BG[a.severity], border: `1px solid ${!a.read ? SEV_BORDER[a.severity] : 'rgba(255,255,255,0.06)'}` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-none" style={{ background: `${SEV_COLOR[a.severity]}20` }}>
                  {CAT_ICONS[a.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-bold ${a.read ? 'text-gray-300' : 'text-white'}`}>{a.title}</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${SEV_COLOR[a.severity]}22`, color: SEV_COLOR[a.severity] }}>
                        {SEV_LABEL[a.severity]}
                      </span>
                      {!a.read && <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: '#F0B90B' }} />}
                    </div>
                    <button onClick={e => { e.stopPropagation(); dismiss(a.id); }} className="flex-none p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      ×
                    </button>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{a.body}</p>
                  {a.meta && Object.keys(a.meta).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Object.entries(a.meta).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="text-[10px] px-2 py-0.5 rounded-lg font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                          {k}: {String(v).slice(0, 20)}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(a.ts)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
