import { useState } from 'react';
import { useStore } from '../lib/store';
import { requestNotificationPermission } from '../lib/audio';
import { stopAlarm } from '../lib/audio';

export default function Settings() {
  const { settings, updateSettings } = useStore();
  const [pinMode, setPinMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [saved, setSaved] = useState(false);

  function save(patch: Partial<typeof settings>) {
    updateSettings(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function changePin() {
    if (newPin.length < 4) { setPinError('En az 4 hane'); return; }
    if (newPin !== confirmPin) { setPinError('PIN\'ler eşleşmiyor'); return; }
    updateSettings({ pin: newPin });
    setNewPin('');
    setConfirmPin('');
    setPinMode(false);
    setPinError('');
  }

  const notifStatus = 'Notification' in window ? Notification.permission : 'not-supported';

  return (
    <div className="flex flex-col pb-24">
      <div className="p-4 pt-6">
        <h1 className="text-lg font-bold text-white mb-6">Ayarlar</h1>

        {saved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 text-green-400 text-sm text-center">
            ✓ Kaydedildi
          </div>
        )}

        {/* Sound settings */}
        <Section title="🔊 Ses Ayarları">
          <Toggle
            label="Alarm Sesleri"
            desc="Yeni olay olduğunda ses çalsın"
            value={settings.alertSounds}
            onChange={v => save({ alertSounds: v })}
          />
          <Toggle
            label="Tüm Sesleri Kapat"
            desc="Geçici olarak tüm sesleri sustur"
            value={settings.muteAll}
            onChange={v => { save({ muteAll: v }); if (v) stopAlarm(); }}
          />
        </Section>

        {/* Mute hours */}
        <Section title="🌙 Sessiz Saatler">
          <p className="text-xs text-gray-500 mb-3">Bu saatler arasında ses ve bildirim çıkmaz</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Başlangıç</p>
              <input
                type="time"
                value={settings.muteFrom}
                onChange={e => save({ muteFrom: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Bitiş</p>
              <input
                type="time"
                value={settings.muteTo}
                onChange={e => save({ muteTo: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
            </div>
          </div>
        </Section>

        {/* Notification settings */}
        <Section title="🔔 Bildirimler">
          <Toggle
            label="Tarayıcı Bildirimleri"
            desc="Uygulama kapalıyken bildirim al"
            value={settings.browserNotifications}
            onChange={v => {
              save({ browserNotifications: v });
              if (v) requestNotificationPermission();
            }}
          />
          <div className={`flex items-center gap-2 p-3 rounded-xl text-xs mt-2 ${
            notifStatus === 'granted' ? 'bg-green-500/10 text-green-400' :
            notifStatus === 'denied' ? 'bg-red-500/10 text-red-400' :
            'bg-gray-500/10 text-gray-400'
          }`}>
            <span>{notifStatus === 'granted' ? '✓' : notifStatus === 'denied' ? '✗' : '○'}</span>
            <span>
              {notifStatus === 'granted' ? 'Bildirimler açık' :
               notifStatus === 'denied' ? 'Bildirimler engellendi (tarayıcı ayarlarından aç)' :
               notifStatus === 'not-supported' ? 'Desteklenmiyor' : 'İzin istenmemiş'}
            </span>
          </div>
          {notifStatus === 'default' && (
            <button
              onClick={requestNotificationPermission}
              className="w-full mt-2 py-2.5 bg-yellow-400 text-black text-sm font-medium rounded-xl"
            >
              Bildirim İzni Al
            </button>
          )}
        </Section>

        {/* Thresholds */}
        <Section title="💰 Alarm Eşikleri">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-300 mb-1">Yatırım Alarmı (USDT)</p>
              <p className="text-xs text-gray-500 mb-2">Bu miktarın üstündeki yatırımlarda alarm çal</p>
              <input
                type="number"
                value={settings.depositThreshold}
                onChange={e => save({ depositThreshold: Number(e.target.value) })}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                min={0}
              />
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-1">Büyük İşlem Alarmı (USDT)</p>
              <p className="text-xs text-gray-500 mb-2">Bu büyüklüğün üstündeki işlemler kritik alarm</p>
              <input
                type="number"
                value={settings.largeTradeThreshold}
                onChange={e => save({ largeTradeThreshold: Number(e.target.value) })}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                min={0}
              />
            </div>
          </div>
        </Section>

        {/* PIN change */}
        <Section title="🔐 Güvenlik">
          {!pinMode ? (
            <button
              onClick={() => setPinMode(true)}
              className="w-full py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white text-sm"
            >
              PIN'i Değiştir
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                maxLength={8}
                placeholder="Yeni PIN"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder-gray-600"
              />
              <input
                type="password"
                maxLength={8}
                placeholder="PIN'i Tekrarla"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder-gray-600"
              />
              {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setPinMode(false); setPinError(''); }} className="py-2.5 bg-white/5 rounded-xl text-gray-400 text-sm">İptal</button>
                <button onClick={changePin} className="py-2.5 bg-yellow-400 text-black text-sm font-medium rounded-xl">Kaydet</button>
              </div>
            </div>
          )}
        </Section>

        {/* App info */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs">Admin Monitor v1.0</p>
          <p className="text-gray-700 text-xs mt-0.5">BASONCE/KITE Exchange</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] rounded-2xl p-4 mb-3">
      <p className="text-xs text-gray-500 mb-3 font-medium">{title}</p>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ml-3 flex-none ${value ? 'bg-yellow-400' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
