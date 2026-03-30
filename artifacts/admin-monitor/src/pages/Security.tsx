import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { fetchBlockedIPs, blockIP, unblockIP } from '../lib/admin-api';
import { RefreshCw, ShieldOff, ShieldCheck, Plus, X } from 'lucide-react';

type SecTab = 'events' | 'ip';

function timeAgo(ts: number | string) {
  const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
  if (diff < 60000) return 'Az önce';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dk`;
  return `${Math.floor(diff / 3600000)} sa`;
}

function IPBlockPane() {
  const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [processing, setProcessing] = useState<string|null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setBlockedIPs(await fetchBlockedIPs());
    setLoading(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function doBlock() {
    if (!newIP.trim()) return;
    setSaving(true);
    try {
      await blockIP(newIP.trim(), reason.trim() || 'Admin tarafından engellendi');
      showToast(`🚫 ${newIP} engellendi`);
      setNewIP(''); setReason(''); setShowAdd(false);
      await load();
    } catch { showToast('❌ Hata oluştu'); }
    setSaving(false);
  }

  async function doUnblock(item: any) {
    setProcessing(item.id);
    await unblockIP(item.id);
    showToast('✅ Engel kaldırıldı');
    await load();
    setProcessing(null);
  }

  const active = blockedIPs.filter(i => i.is_active !== false);
  const inactive = blockedIPs.filter(i => i.is_active === false);

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
          {toast}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Aktif Engel', val: active.length, color: '#FF4757', bg: 'rgba(255,71,87,0.08)' },
          { label: 'Kaldırılan', val: inactive.length, color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' },
          { label: 'Toplam', val: blockedIPs.length, color: '#F0B90B', bg: 'rgba(240,185,11,0.08)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add IP button */}
      <button onClick={() => setShowAdd(!showAdd)}
        className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
        style={{ background: showAdd ? 'rgba(255,71,87,0.1)' : 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)', color: '#FF4757' }}>
        {showAdd ? <X size={16} /> : <Plus size={16} />}
        {showAdd ? 'İptal' : 'IP Engelle'}
      </button>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: 'rgba(255,71,87,0.05)', border: '1px solid rgba(255,71,87,0.2)' }}>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>IP ADRESİ</label>
            <input value={newIP} onChange={e => setNewIP(e.target.value)}
              placeholder="Örn: 192.168.1.1"
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>NEDEN (isteğe bağlı)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Spam, dolandırıcılık vb."
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
          </div>
          <button onClick={doBlock} disabled={saving || !newIP.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-black transition-opacity"
            style={{ background: '#FF4757', opacity: saving || !newIP.trim() ? 0.5 : 1 }}>
            {saving ? 'Engelleniyor…' : '🚫 Engelle'}
          </button>
        </div>
      )}

      {/* IP list */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Aktif engellemeler</p>
        <button onClick={load} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="skeleton rounded-xl h-16" />) :
       active.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm" style={{ color: '#00DC82' }}>Aktif IP engellemesi yok</p>
        </div>
      ) : active.map((item: any) => (
        <div key={item.id} className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(255,71,87,0.05)', border: '1px solid rgba(255,71,87,0.15)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
            style={{ background: 'rgba(255,71,87,0.15)' }}>
            <ShieldOff size={16} color="#FF4757" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white font-mono">{item.ip_address}</p>
            {item.reason && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.reason}</p>}
            {item.created_at && <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(item.created_at)} önce</p>}
          </div>
          <button onClick={() => doUnblock(item)} disabled={processing === item.id}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity"
            style={{ background: 'rgba(0,220,130,0.12)', border: '1px solid rgba(0,220,130,0.25)', color: '#00DC82', opacity: processing===item.id ? 0.5 : 1 }}>
            {processing===item.id ? '…' : 'Kaldır'}
          </button>
        </div>
      ))}

      {/* Recently unblocked */}
      {inactive.length > 0 && (
        <>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Kaldırılan engellemeler</p>
          {inactive.slice(0,3).map((item: any) => (
            <div key={item.id} className="rounded-xl px-4 py-3 flex items-center gap-3 opacity-40"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <ShieldCheck size={14} color="rgba(255,255,255,0.3)" />
              <p className="text-xs font-mono text-white">{item.ip_address}</p>
              <p className="text-[10px] ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.reason || '—'}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function Security() {
  const { alerts } = useStore();
  const [tab, setTab] = useState<SecTab>('events');
  const [showAll, setShowAll] = useState(false);

  const secAlerts = alerts
    .filter(a => a.category === 'security' && !a.dismissed)
    .sort((a, b) => b.ts - a.ts);

  const criticals = secAlerts.filter(a => a.severity === 'critical');
  const highs = secAlerts.filter(a => a.severity === 'high');
  const displayed = showAll ? secAlerts : secAlerts.slice(0, 20);

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

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['events','🛡️ Güvenlik Olayları'],['ip','🚫 IP Engelleme']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: tab===k ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab===k ? '#FF4757' : 'rgba(255,255,255,0.35)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Events tab */}
        {tab === 'events' && (
          <>
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

            {/* Security events */}
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
          </>
        )}

        {/* IP tab */}
        {tab === 'ip' && <IPBlockPane />}
      </div>
    </div>
  );
}
