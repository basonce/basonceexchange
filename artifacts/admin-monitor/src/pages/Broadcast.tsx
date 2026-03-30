import { useEffect, useState } from 'react';
import { Send, Megaphone, RefreshCw, X, Bell, Globe, Star } from 'lucide-react';
import { sendBroadcast, fetchBroadcastHistory, fetchBannerMessage, setBannerMessage } from '../lib/admin-api';

type Target = 'all' | 'active' | 'vip';
type BannerType = 'info' | 'warning' | 'success' | '';

function timeAgo(dt: string) {
  const d = Date.now() - new Date(dt).getTime();
  if (d < 3600000) return `${Math.floor(d/60000)} dk önce`;
  if (d < 86400000) return `${Math.floor(d/3600000)} sa önce`;
  return `${Math.floor(d/86400000)} gün önce`;
}

function fmt(n: number) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Broadcast() {
  const [tab, setTab] = useState<'push'|'banner'|'history'>('push');
  const [toast, setToast] = useState('');

  // Push form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<Target>('all');
  const [sending, setSending] = useState(false);

  // Banner
  const [banner, setBanner] = useState<{banner_message:string|null;banner_type:string|null}|null>(null);
  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerType, setBannerType] = useState<BannerType>('info');
  const [bannerSaving, setBannerSaving] = useState(false);

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'banner') loadBanner();
  }, [tab]);

  async function loadHistory() {
    setLoading(true);
    setHistory(await fetchBroadcastHistory(30));
    setLoading(false);
  }

  async function loadBanner() {
    const b = await fetchBannerMessage();
    setBanner(b);
    if (b?.banner_message) { setBannerMsg(b.banner_message); setBannerType((b.banner_type as BannerType)||'info'); }
  }

  async function doSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await sendBroadcast(title.trim(), body.trim(), target);
      showToast('✅ Bildirim gönderildi');
      setTitle(''); setBody('');
    } catch { showToast('❌ Hata oluştu'); }
    setSending(false);
  }

  async function doSetBanner() {
    setBannerSaving(true);
    try {
      await setBannerMessage(bannerMsg.trim(), bannerMsg.trim() ? bannerType : '');
      showToast(bannerMsg.trim() ? '✅ Banner yayınlandı' : '✅ Banner kaldırıldı');
      await loadBanner();
    } catch { showToast('❌ Hata oluştu'); }
    setBannerSaving(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const targets: { key: Target; label: string; desc: string; icon: typeof Bell; color: string }[] = [
    { key: 'all', label: 'Tüm Kullanıcılar', desc: 'Kayıtlı herkes', icon: Globe, color: '#3D7FFF' },
    { key: 'active', label: 'Aktif Kullanıcılar', desc: 'Son 7 gün aktif', icon: Bell, color: '#00DC82' },
    { key: 'vip', label: 'VIP Kullanıcılar', desc: 'Yüksek bakiyeli', icon: Star, color: '#F0B90B' },
  ];

  const bannerColors: Record<BannerType, string> = {
    info: '#3D7FFF', warning: '#F0B90B', success: '#00DC82', '': '#888',
  };

  return (
    <div className="flex flex-col pb-28">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
          {toast}
        </div>
      )}

      <div className="p-4 pt-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#FF9800', letterSpacing: '0.08em' }}>DUYURU MERKEZİ</p>
            <h1 className="text-2xl font-black text-white">Yayın</h1>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,152,0,0.12)', border: '1px solid rgba(255,152,0,0.25)' }}>
            <Megaphone size={22} color="#FF9800" />
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['push','🔔 Bildirim'],['banner','📢 Banner'],['history','📋 Geçmiş']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: tab===k ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab===k ? '#FF9800' : 'rgba(255,255,255,0.35)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Push Notification ── */}
        {tab === 'push' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)' }}>
              <p className="text-sm font-bold text-white mb-1">Push Bildirim Gönder</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Seçilen kullanıcı grubuna anlık push notification yolla
              </p>
            </div>

            {/* Target selection */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing:'0.06em' }}>HEDEF KİTLE</p>
              <div className="flex flex-col gap-2">
                {targets.map(t => (
                  <button key={t.key} onClick={() => setTarget(t.key)}
                    className="rounded-2xl p-3.5 flex items-center gap-3 text-left transition-all"
                    style={{
                      background: target===t.key ? `${t.color}12` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${target===t.key ? `${t.color}40` : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                      style={{ background: target===t.key ? `${t.color}20` : 'rgba(255,255,255,0.06)' }}>
                      <t.icon size={16} color={target===t.key ? t.color : 'rgba(255,255,255,0.35)'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: target===t.key ? t.color : 'rgba(255,255,255,0.7)' }}>{t.label}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.desc}</p>
                    </div>
                    {target===t.key && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: t.color }}>
                        <span className="text-black text-xs font-black">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Message form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>BİLDİRİM BAŞLIĞI</label>
                <input
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Örn: Yeni özellik yayında!"
                  maxLength={60}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                <p className="text-[10px] text-right mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{title.length}/60</p>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>MESAJ İÇERİĞİ</label>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Kullanıcılara iletmek istediğiniz mesaj…"
                  rows={3} maxLength={200}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                <p className="text-[10px] text-right mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{body.length}/200</p>
              </div>

              {/* Preview */}
              {(title || body) && (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing:'0.06em' }}>ÖNİZLEME</p>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none text-base"
                      style={{ background: 'rgba(240,185,11,0.2)' }}>🪁</div>
                    <div>
                      <p className="text-sm font-bold text-white">{title || 'Başlık…'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{body || 'Mesaj içeriği…'}</p>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={doSend} disabled={sending || !title.trim() || !body.trim()}
                className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                style={{ background: 'rgba(255,152,0,0.9)', color: 'black', opacity: sending || !title.trim() || !body.trim() ? 0.5 : 1 }}>
                <Send size={16} />
                {sending ? 'Gönderiliyor…' : `${targets.find(t=>t.key===target)?.label}'a Gönder`}
              </button>
            </div>
          </div>
        )}

        {/* ── Banner ── */}
        {tab === 'banner' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(61,127,255,0.06)', border: '1px solid rgba(61,127,255,0.15)' }}>
              <p className="text-sm font-bold text-white mb-1">Site Banner</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Borsada tüm sayfalarda görünen banner mesajı. Boş bırakırsan kaldırılır.
              </p>
            </div>

            {/* Current banner */}
            {banner?.banner_message && (
              <div className="rounded-2xl p-4" style={{
                background: `${bannerColors[(banner.banner_type as BannerType)||'']}15`,
                border: `1px solid ${bannerColors[(banner.banner_type as BannerType)||'']}35`,
              }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing:'0.06em' }}>MEVCUT BANNER</p>
                <p className="text-sm font-medium text-white">{banner.banner_message}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Tip: {banner.banner_type || 'info'}
                </p>
              </div>
            )}

            {/* Banner type */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>BANNER TİPİ</p>
              <div className="grid grid-cols-3 gap-2">
                {([['info','ℹ️ Bilgi','#3D7FFF'],['warning','⚠️ Uyarı','#F0B90B'],['success','✅ Başarı','#00DC82']] as const).map(([k,l,c]) => (
                  <button key={k} onClick={() => setBannerType(k)}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: bannerType===k ? `${c}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${bannerType===k ? `${c}40` : 'rgba(255,255,255,0.07)'}`, color: bannerType===k ? c : 'rgba(255,255,255,0.4)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Banner message */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>MESAJ (boş bırak = kaldır)</label>
              <textarea
                value={bannerMsg} onChange={e => setBannerMsg(e.target.value)}
                placeholder="Örn: Sistem bakımı 02:00-04:00 saatleri arasında yapılacaktır."
                rows={3} maxLength={150}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              />
            </div>

            {/* Preview */}
            {bannerMsg && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: `${bannerColors[bannerType]}15`, border: `1px solid ${bannerColors[bannerType]}35` }}>
                <span className="text-base">{bannerType==='info'?'ℹ️':bannerType==='warning'?'⚠️':'✅'}</span>
                <p className="text-sm text-white">{bannerMsg}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setBannerMsg(''); doSetBanner(); }} disabled={bannerSaving}
                className="py-3.5 rounded-xl text-sm font-bold transition-opacity"
                style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.25)', color: '#FF4757', opacity: bannerSaving ? 0.6 : 1 }}>
                Banner'ı Kaldır
              </button>
              <button onClick={doSetBanner} disabled={bannerSaving}
                className="py-3.5 rounded-xl text-sm font-bold text-black transition-opacity"
                style={{ background: bannerColors[bannerType], opacity: bannerSaving ? 0.6 : 1 }}>
                {bannerSaving ? 'Kaydediliyor…' : 'Yayınla'}
              </button>
            </div>
          </div>
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{history.length} kayıt</p>
              <button onClick={loadHistory} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.4)" />
              </button>
            </div>
            {loading ? Array.from({length:4}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-20" />) :
             history.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Henüz bildirim gönderilmedi</p>
              </div>
            ) : history.map((h: any) => (
              <div key={h.id} className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-white">{h.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-none"
                    style={{ background: h.target==='vip' ? 'rgba(240,185,11,0.15)' : h.target==='active' ? 'rgba(0,220,130,0.12)' : 'rgba(61,127,255,0.12)', color: h.target==='vip' ? '#F0B90B' : h.target==='active' ? '#00DC82' : '#3D7FFF' }}>
                    {h.target==='vip' ? '⭐ VIP' : h.target==='active' ? '✅ Aktif' : '🌍 Tümü'}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{h.body}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(h.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
