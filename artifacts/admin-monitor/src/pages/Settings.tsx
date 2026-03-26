import { useState } from 'react';
import { Volume2, VolumeX, Bell, Shield, Zap } from 'lucide-react';
import { useStore } from '../lib/store';
import { requestNotificationPermission, stopAlarm, sounds } from '../lib/audio';
import { isMuted } from '../lib/store';

function Toggle({ on, onChange, label, sub, icon }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-3">
        {icon && <span>{icon}</span>}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className="relative transition-all flex-none"
        style={{ width: 48, height: 26 }}
      >
        <div className="absolute inset-0 rounded-full transition-colors" style={{ background: on ? '#F0B90B' : 'rgba(255,255,255,0.1)' }} />
        <div className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md" style={{ left: on ? 'calc(100% - 24px)' : 4, transform: 'translateX(0)' }} />
      </button>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        <span style={{ color: '#F0B90B' }}>{icon}</span>
        <p className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{title}</p>
      </div>
      <div className="px-4 pb-2">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings } = useStore();
  const [pinMode, setPinMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [saved, setSaved] = useState(false);

  const muted = isMuted(settings);

  function save(patch: Partial<typeof settings>) {
    updateSettings(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function changePin() {
    if (newPin.length < 4) { setPinErr('En az 4 hane girilmeli'); return; }
    if (newPin !== confirmPin) { setPinErr('PIN\'ler eşleşmiyor'); return; }
    save({ pin: newPin });
    setNewPin(''); setConfirmPin(''); setPinMode(false); setPinErr('');
  }

  function testSound() {
    try { sounds.deposit(); } catch {}
  }

  const notifStatus = 'Notification' in window ? Notification.permission : 'not-supported';

  return (
    <div className="flex flex-col pb-28">
      <div className="p-4 pt-6 flex flex-col gap-4">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#888', letterSpacing: '0.08em' }}>UYGULAMA AYARLARI</p>
          <h1 className="text-2xl font-black text-white">Ayarlar</h1>
        </div>

        {/* Saved toast */}
        {saved && (
          <div className="rounded-2xl px-4 py-3 text-sm font-medium text-center fade-in" style={{ background: 'rgba(0,220,130,0.1)', border: '1px solid rgba(0,220,130,0.2)', color: '#00DC82' }}>
            ✓ Kaydedildi
          </div>
        )}

        {/* Sound */}
        <Section title="SES" icon={<Volume2 size={15} />}>
          <Toggle on={settings.alertSounds} onChange={v => { save({ alertSounds: v }); if (!v) stopAlarm(); }}
            label="Alarm Sesleri" sub="Yeni olay geldiğinde sesli bildirim çal" />
          <Toggle on={!settings.muteAll} onChange={v => { save({ muteAll: !v }); if (!v) stopAlarm(); }}
            label="Sesler Aktif" sub="Kapatırsan tüm sesler durur — açınca tekrar çalar" />
          {/* Status chip */}
          <div className="pb-3 pt-1 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
              background: muted ? 'rgba(255,71,87,0.08)' : 'rgba(0,220,130,0.08)',
              border: `1px solid ${muted ? 'rgba(255,71,87,0.2)' : 'rgba(0,220,130,0.2)'}`,
            }}>
              {muted ? <VolumeX size={13} color="#FF4757" /> : <Volume2 size={13} color="#00DC82" />}
              <span className="text-xs font-semibold" style={{ color: muted ? '#FF4757' : '#00DC82' }}>
                {muted ? 'Sesler kapalı' : 'Sesler açık'}
              </span>
            </div>
            <button onClick={testSound} className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.15)', color: '#F0B90B' }}>
              <Zap size={12} /> Test
            </button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="BİLDİRİMLER" icon={<Bell size={15} />}>
          <Toggle on={settings.browserNotifications}
            onChange={v => { save({ browserNotifications: v }); if (v) requestNotificationPermission(); }}
            label="Push Bildirimleri" sub="Uygulama kapalıyken bildirim al" />
          <div className="py-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
              style={{ background: notifStatus === 'granted' ? 'rgba(0,220,130,0.08)' : notifStatus === 'denied' ? 'rgba(255,71,87,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${notifStatus === 'granted' ? 'rgba(0,220,130,0.2)' : notifStatus === 'denied' ? 'rgba(255,71,87,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
              <span style={{ color: notifStatus === 'granted' ? '#00DC82' : notifStatus === 'denied' ? '#FF4757' : '#888' }}>
                {notifStatus === 'granted' ? '✓' : notifStatus === 'denied' ? '✗' : '○'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {notifStatus === 'granted' ? 'Bildirimler aktif' : notifStatus === 'denied' ? 'Engellendi — tarayıcı ayarlarından aç' : notifStatus === 'not-supported' ? 'Desteklenmiyor' : 'İzin verilmedi'}
              </span>
              {notifStatus === 'default' && (
                <button onClick={requestNotificationPermission} className="ml-auto px-3 py-1.5 rounded-lg font-semibold" style={{ background: 'rgba(240,185,11,0.15)', color: '#F0B90B' }}>İzin Al</button>
              )}
            </div>
          </div>
        </Section>

        {/* Thresholds */}
        <Section title="ALARM EŞİKLERİ" icon={<Zap size={15} />}>
          <div className="space-y-4 py-2">
            {[
              { key: 'depositThreshold', label: 'Yatırım Alarmı', sub: 'Bu miktarın üstündeki yatırımlarda alarm çal (USDT)' },
              { key: 'largeTradeThreshold', label: 'Büyük İşlem Alarmı', sub: 'Bu büyüklüğün üstündeki işlemlerde alarm (USDT)' },
            ].map(({ key, label, sub }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <span className="text-xs font-bold" style={{ color: '#F0B90B' }}>${settings[key as 'depositThreshold' | 'largeTradeThreshold']}</span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
                <input type="range" min={0} max={10000} step={50}
                  value={settings[key as 'depositThreshold' | 'largeTradeThreshold']}
                  onChange={e => save({ [key]: Number(e.target.value) })}
                  className="w-full h-1 rounded-full outline-none appearance-none"
                  style={{ background: `linear-gradient(to right, #F0B90B ${settings[key as 'depositThreshold' | 'largeTradeThreshold'] / 100}%, rgba(255,255,255,0.1) ${settings[key as 'depositThreshold' | 'largeTradeThreshold'] / 100}%)` }} />
              </div>
            ))}
          </div>
        </Section>

        {/* PIN */}
        <Section title="GÜVENLİK" icon={<Shield size={15} />}>
          {!pinMode ? (
            <div className="py-3">
              <button onClick={() => setPinMode(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Shield size={14} /> PIN'i Değiştir
              </button>
            </div>
          ) : (
            <div className="py-3 space-y-3">
              {[
                { val: newPin, set: setNewPin, ph: 'Yeni PIN' },
                { val: confirmPin, set: setConfirmPin, ph: 'PIN Tekrar' },
              ].map(({ val, set, ph }) => (
                <input key={ph} type="password" maxLength={8} value={val}
                  onChange={e => set(e.target.value.replace(/\D/g, ''))}
                  placeholder={ph}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-gray-600"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
              ))}
              {pinErr && <p className="text-xs" style={{ color: '#FF4757' }}>{pinErr}</p>}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => { setPinMode(false); setPinErr(''); setNewPin(''); setConfirmPin(''); }}
                  className="py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>İptal</button>
                <button onClick={changePin} className="py-3 rounded-xl text-sm font-bold" style={{ background: '#F0B90B', color: 'black' }}>Kaydet</button>
              </div>
            </div>
          )}
        </Section>

        {/* App info */}
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.2)' }}>
            <span className="text-2xl">🛡️</span>
          </div>
          <p className="text-sm font-bold text-white">Admin Monitor</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>BASONCE/KITE Exchange · v2.0</p>
          <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Supabase Realtime · Tüm sesler Web Audio API
          </p>
        </div>
      </div>
    </div>
  );
}
