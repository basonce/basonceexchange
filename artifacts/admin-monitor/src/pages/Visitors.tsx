import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { startVisitorAlarm, startNewUserAlarm, sendBrowserNotification } from '../lib/audio';

const PROD_ANON_URL = 'https://basoncecom.replit.app/api/anon-sessions';

interface AnonSession {
  visitor_id: string;
  session_id: string;
  current_page: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  last_active: string;
}

interface VisitorEvent {
  id: string;
  type: 'register' | 'login';
  email: string;
  full_name: string;
  ts: string;
  user_id: string;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'şimdi';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  return `${Math.floor(h / 24)}g`;
}

function isOnline(last_active: string) {
  return Date.now() - new Date(last_active).getTime() < 3 * 60 * 1000; // 3 min
}

function getFlag(country: string | null) {
  if (!country) return '🌐';
  const map: Record<string, string> = {
    'Türkiye': '🇹🇷', 'Turkey': '🇹🇷', 'United States': '🇺🇸', 'Germany': '🇩🇪',
    'United Kingdom': '🇬🇧', 'France': '🇫🇷', 'Netherlands': '🇳🇱', 'Russia': '🇷🇺',
    'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Kenya': '🇰🇪', 'South Africa': '🇿🇦',
  };
  return map[country] || '🌐';
}

function getDeviceIcon(device: string | null) {
  if (!device) return '💻';
  if (device === 'mobile') return '📱';
  if (device === 'tablet') return '📟';
  return '💻';
}

function getBrowserShort(browser: string | null) {
  if (!browser) return '';
  if (browser.toLowerCase().includes('chrome')) return 'Chrome';
  if (browser.toLowerCase().includes('firefox')) return 'Firefox';
  if (browser.toLowerCase().includes('safari')) return 'Safari';
  if (browser.toLowerCase().includes('opera')) return 'Opera';
  if (browser.toLowerCase().includes('edge')) return 'Edge';
  return browser;
}

export default function Visitors() {
  const [anonSessions, setAnonSessions] = useState<AnonSession[]>([]);
  const [memberEvents, setMemberEvents] = useState<VisitorEvent[]>([]);
  const [tab, setTab] = useState<'anon' | 'members'>('anon');
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const seenVisitors = useRef(new Set<string>());
  const isFirstLoad = useRef(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadAnon = useCallback(async () => {
    try {
      const res = await fetch(PROD_ANON_URL, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const data: AnonSession[] = await res.json();
      if (!Array.isArray(data)) return;

      // Detect new visitors
      if (!isFirstLoad.current) {
        for (const s of data) {
          if (!seenVisitors.current.has(s.visitor_id)) {
            // New visitor!
            if (alarmEnabled) {
              startVisitorAlarm();
              sendBrowserNotification(
                '👁️ Yeni Ziyaretçi',
                `${getFlag(s.country)} ${s.city || ''}${s.city ? ', ' : ''}${s.country || 'Bilinmiyor'} — ${s.browser || 'Tarayıcı'} / ${s.device_type || 'Cihaz'}`,
              );
            }
          }
        }
      }

      data.forEach(s => seenVisitors.current.add(s.visitor_id));
      isFirstLoad.current = false;

      data.sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());
      setAnonSessions(data);
    } catch {}
  }, [alarmEnabled]);

  async function loadMembers() {
    setMemberLoading(true);
    try {
      const [{ data: recent }, { data: logins }] = await Promise.all([
        supabase.from('user_profiles').select('id,email,full_name,created_at').order('created_at', { ascending: false }).limit(80),
        supabase.from('user_profiles').select('id,email,full_name,last_login_at,created_at').not('last_login_at', 'is', null).order('last_login_at', { ascending: false }).limit(80),
      ]);
      const evMap = new Map<string, VisitorEvent>();
      for (const r of recent || []) {
        evMap.set(`reg_${r.id}`, { id: `reg_${r.id}`, type: 'register', email: r.email || '', full_name: r.full_name || r.email || 'Üye', ts: r.created_at, user_id: r.id });
      }
      for (const r of logins || []) {
        if (!r.last_login_at) continue;
        evMap.set(`login_${r.id}`, { id: `login_${r.id}`, type: 'login', email: r.email || '', full_name: r.full_name || r.email || 'Üye', ts: r.last_login_at, user_id: r.id });
      }
      const sorted = Array.from(evMap.values()).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setMemberEvents(sorted);
    } catch {}
    setMemberLoading(false);
  }

  useEffect(() => {
    loadAnon();
    loadMembers();

    const pollInterval = setInterval(loadAnon, 3_000);

    channelRef.current = supabase.channel('admin_monitor_visitors_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, (p) => {
        const r = p.new as any;
        const ev: VisitorEvent = { id: `reg_${r.id}`, type: 'register', email: r.email || '', full_name: r.full_name || r.email || 'Yeni Üye', ts: r.created_at || new Date().toISOString(), user_id: r.id };
        setMemberEvents(prev => [ev, ...prev.slice(0, 199)]);
        if (alarmEnabled) startNewUserAlarm();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, (p) => {
        const r = p.new as any;
        const old = p.old as any;
        if (!r.last_login_at || old.last_login_at === r.last_login_at) return;
        const ev: VisitorEvent = { id: `login_${r.id}_${Date.now()}`, type: 'login', email: r.email || '', full_name: r.full_name || r.email || 'Üye', ts: r.last_login_at, user_id: r.id };
        setMemberEvents(prev => [ev, ...prev.slice(0, 199)]);
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [loadAnon]);

  const onlineCount = anonSessions.filter(s => isOnline(s.last_active)).length;

  return (
    <div className="flex flex-col pb-20" style={{ background: '#050505', minHeight: '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-safe" style={{ background: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-white font-black text-lg leading-none">👁️ Canlı İzleme</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {onlineCount > 0
                ? <><span className="text-[#0ECB81] font-bold">{onlineCount}</span> kişi şu an sitede</>
                : 'Anlık ziyaretçi izleme'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onlineCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full animate-pulse" style={{ background: 'rgba(14,203,129,0.15)', border: '1px solid rgba(14,203,129,0.4)' }}>
                <span className="w-2 h-2 rounded-full bg-[#0ECB81]" />
                <span className="text-[11px] font-black text-[#0ECB81]">{onlineCount} CANLI</span>
              </div>
            )}
            <button
              onClick={() => setAlarmEnabled(v => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all"
              style={{ background: alarmEnabled ? 'rgba(240,185,11,0.2)' : 'rgba(255,255,255,0.07)', border: alarmEnabled ? '1px solid rgba(240,185,11,0.4)' : '1px solid transparent' }}
              title={alarmEnabled ? 'Alarm açık — kapat' : 'Alarm kapalı — aç'}
            >
              {alarmEnabled ? '🔔' : '🔕'}
            </button>
            <button onClick={() => { loadAnon(); loadMembers(); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>
              🔄
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 pb-3">
          <button
            onClick={() => setTab('anon')}
            className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all"
            style={{ background: tab === 'anon' ? '#0ECB81' : 'rgba(255,255,255,0.05)', color: tab === 'anon' ? '#000' : 'rgba(255,255,255,0.4)' }}
          >
            👁️ Ziyaretçiler {anonSessions.length > 0 && <span className="ml-1 opacity-70">({anonSessions.length})</span>}
          </button>
          <button
            onClick={() => setTab('members')}
            className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all"
            style={{ background: tab === 'members' ? '#F0B90B' : 'rgba(255,255,255,0.05)', color: tab === 'members' ? '#000' : 'rgba(255,255,255,0.4)' }}
          >
            👤 Üyeler {memberEvents.length > 0 && <span className="ml-1 opacity-70">({memberEvents.length})</span>}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 space-y-2">
        {tab === 'anon' && (
          <>
            {anonSessions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">👁️</p>
                <p className="text-gray-500 font-semibold">Ziyaretçi bekleniyor...</p>
                <p className="text-gray-600 text-[11px] mt-1">Her 3 saniyede bir güncelleniyor</p>
              </div>
            ) : (
              anonSessions.map((s) => {
                const online = isOnline(s.last_active);
                const flag = getFlag(s.country);
                const loc = [s.city, s.country].filter(Boolean).join(', ') || 'Bilinmiyor';
                return (
                  <div
                    key={s.visitor_id}
                    className="rounded-2xl p-3.5 flex items-start gap-3"
                    style={{
                      background: online ? 'rgba(14,203,129,0.06)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${online ? 'rgba(14,203,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div className="flex-none mt-0.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: online ? 'rgba(14,203,129,0.15)' : 'rgba(255,255,255,0.07)' }}>
                        {getDeviceIcon(s.device_type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white text-[12px] font-bold">{s.visitor_id.slice(0, 8)}</span>
                        {online && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-[#0ECB81] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(14,203,129,0.15)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                            ÇEVRİMİÇİ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {getDeviceIcon(s.device_type)} {getBrowserShort(s.browser)}{s.os ? ` / ${s.os}` : ''}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {flag} {loc}
                      </div>
                      {s.ip_address && (
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {s.ip_address}
                        </div>
                      )}
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-[11px] font-bold" style={{ color: online ? '#0ECB81' : 'rgba(255,255,255,0.3)' }}>
                        {timeAgo(s.last_active)}
                      </div>
                      {s.current_page && (
                        <div className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                          {s.current_page}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === 'members' && (
          <>
            {memberLoading ? (
              <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
            ) : memberEvents.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">👤</p>
                <p className="text-gray-500">Henüz üye kaydı yok</p>
              </div>
            ) : (
              memberEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-2xl p-3.5 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-none"
                    style={{ background: ev.type === 'register' ? 'rgba(14,203,129,0.15)' : 'rgba(240,185,11,0.15)' }}>
                    {ev.type === 'register' ? '🆕' : '🔑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-[12px] font-bold truncate">{ev.full_name}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-none"
                        style={{ background: ev.type === 'register' ? 'rgba(14,203,129,0.2)' : 'rgba(240,185,11,0.2)', color: ev.type === 'register' ? '#0ECB81' : '#F0B90B' }}>
                        {ev.type === 'register' ? 'YENİ ÜYE' : 'GİRİŞ'}
                      </span>
                    </div>
                    <div className="text-gray-500 text-[11px] truncate">{ev.email}</div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[11px]" style={{ color: ev.type === 'register' ? '#0ECB81' : '#F0B90B' }}>{timeAgo(ev.ts)}</div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
