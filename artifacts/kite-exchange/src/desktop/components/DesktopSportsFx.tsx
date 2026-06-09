import { useEffect, useRef, useState, useCallback } from 'react';
import sfxGoalUrl from '@assets/generated_audio/sfx_goal.mp3';
import sfxWhistleUrl from '@assets/generated_audio/sfx_whistle.mp3';

/* ════════════════════════════════════════════════════════════
   DESKTOP-ONLY Sports broadcast FX layer.
   Reads the SAME /api/sport/snapshot the betting UI uses, plays a
   stadium roar when a real goal is scored and a referee whistle on
   (simulated) yellow cards, and renders a broadcast-style live score
   ticker + event banners. Never mounted on mobile — mobile is untouched.
══════════════════════════════════════════════════════════════ */

interface SnapMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbr?: string;
  awayAbbr?: string;
  leagueId?: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  phase: 'first_half' | 'ht_break' | 'second_half' | 'ft_stoppage' | 'finished';
  status: 'live' | 'finished';
}

type FxEvent =
  | { id: string; kind: 'goal'; team: string; opponent: string; score: string; side: 'home' | 'away' }
  | { id: string; kind: 'card'; team: string; opponent: string };

const LOGO = (name: string) => `/api/team-logo-img?name=${encodeURIComponent(name)}`;

function initials(name: string, abbr?: string) {
  if (abbr) return abbr.slice(0, 3).toUpperCase();
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

function TickerLogo({ name, abbr }: { name: string; abbr?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="w-6 h-6 rounded-full bg-[#2B3139] text-[#F0B90B] text-[9px] font-bold flex items-center justify-center shrink-0">
        {initials(name, abbr)}
      </span>
    );
  }
  return (
    <img
      src={LOGO(name)}
      alt=""
      onError={() => setFailed(true)}
      className="w-6 h-6 rounded-full object-contain bg-white/5 shrink-0"
    />
  );
}

export default function DesktopSportsFx() {
  const [matches, setMatches] = useState<SnapMatch[]>([]);
  const [events, setEvents] = useState<FxEvent[]>([]);
  const [muted, setMuted] = useState(false);

  const goalAudio = useRef<HTMLAudioElement | null>(null);
  const whistleAudio = useRef<HTMLAudioElement | null>(null);
  const scoresRef = useRef<Map<string, { h: number; a: number }>>(new Map());
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const firstSnapRef = useRef(true);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  /* preload + unlock audio on first user gesture (browser autoplay policy) */
  useEffect(() => {
    const g = new Audio(sfxGoalUrl); g.preload = 'auto'; g.volume = 0.7; goalAudio.current = g;
    const w = new Audio(sfxWhistleUrl); w.preload = 'auto'; w.volume = 0.55; whistleAudio.current = w;
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      [g, w].forEach((a) => {
        a.muted = true;
        a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
      });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback((ref: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (mutedRef.current || !ref.current) return;
    try { ref.current.currentTime = 0; ref.current.play().catch(() => {}); } catch { /* ignore */ }
  }, []);

  const pushEvent = useCallback((ev: FxEvent, ttl: number) => {
    setEvents((prev) => [...prev.slice(-3), ev]);
    setTimeout(() => setEvents((prev) => prev.filter((e) => e.id !== ev.id)), ttl);
  }, []);

  /* snapshot poller — goal detection + yellow-card simulation */
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/sport/snapshot?fx=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { matches: SnapMatch[] };
        if (cancelled || !Array.isArray(data.matches)) return;

        const live = data.matches.filter((m) => m.status === 'live');
        setMatches(live);

        const firstSnap = firstSnapRef.current;
        firstSnapRef.current = false;

        for (const m of data.matches) {
          const prev = scoresRef.current.get(m.id);
          scoresRef.current.set(m.id, { h: m.homeScore, a: m.awayScore });
          if (firstSnap || prev === undefined) continue;
          const homeScored = m.homeScore > prev.h;
          const awayScored = m.awayScore > prev.a;
          if (homeScored || awayScored) {
            const scorerSide: 'home' | 'away' = homeScored ? 'home' : 'away';
            play(goalAudio);
            pushEvent(
              {
                id: `g_${m.id}_${Date.now()}`,
                kind: 'goal',
                team: scorerSide === 'home' ? m.homeTeam : m.awayTeam,
                opponent: scorerSide === 'home' ? m.awayTeam : m.homeTeam,
                score: `${m.homeScore} - ${m.awayScore}`,
                side: scorerSide,
              },
              5200,
            );
          }
        }

        // Simulated yellow card: at most one per tick, only for in-play halves
        const inPlay = live.filter((m) => m.phase === 'first_half' || m.phase === 'second_half');
        if (!firstSnap && inPlay.length && Math.random() < 0.22) {
          const m = inPlay[Math.floor(Math.random() * inPlay.length)];
          const homeBooked = Math.random() < 0.5;
          play(whistleAudio);
          pushEvent(
            {
              id: `c_${m.id}_${Date.now()}`,
              kind: 'card',
              team: homeBooked ? m.homeTeam : m.awayTeam,
              opponent: homeBooked ? m.awayTeam : m.homeTeam,
            },
            3600,
          );
        }
      } catch { /* ignore */ }
    }
    tick();
    const iv = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [play, pushEvent]);

  const ticker = matches.length ? [...matches, ...matches] : [];

  return (
    <>
      {/* Live score ticker — always rendered as a broadcast bar */}
      <div className="relative overflow-hidden border-y border-[#2B3139] bg-black/40 backdrop-blur">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F0B90B] text-black font-bold text-xs uppercase tracking-wider shrink-0 z-10">
            <span className="w-2 h-2 rounded-full bg-[#F6465D] animate-pulse" />
            Live
          </div>
          <div className="overflow-hidden flex-1">
            {matches.length > 0 ? (
              <div ref={tickerRef} className="flex items-center gap-7 whitespace-nowrap fx-ticker-track py-2.5">
                {ticker.map((m, i) => (
                  <div key={`${m.id}_${i}`} className="flex items-center gap-2 text-sm">
                    <TickerLogo name={m.homeTeam} abbr={m.homeAbbr} />
                    <span className="text-[#EAECEF] font-medium max-w-[110px] truncate">{m.homeTeam}</span>
                    <span className="text-[#F0B90B] font-bold tabular-nums px-1.5">{m.homeScore} - {m.awayScore}</span>
                    <span className="text-[#EAECEF] font-medium max-w-[110px] truncate">{m.awayTeam}</span>
                    <TickerLogo name={m.awayTeam} abbr={m.awayAbbr} />
                    <span className="text-[10px] text-[#F6465D] font-semibold ml-1">
                      {m.phase === 'ht_break' ? 'HT' : `${m.minute}'`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2.5 px-4 text-[#848E9C] text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                Matches kicking off soon — sound on, every goal and card heard live.
              </div>
            )}
          </div>
          <button
            onClick={() => setMuted((v) => !v)}
            className="px-4 py-2.5 text-[#848E9C] hover:text-[#F0B90B] text-xs font-semibold shrink-0 border-l border-[#2B3139]"
            title={muted ? 'Unmute match sounds' : 'Mute match sounds'}
          >
            {muted ? '🔇 Sound off' : '🔊 Sound on'}
          </button>
        </div>
      </div>

      {/* Event banners */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-3 pointer-events-none">
        {events.map((ev) =>
          ev.kind === 'goal' ? (
            <div
              key={ev.id}
              className="fx-pop flex items-center gap-4 px-7 py-4 rounded-2xl border border-[#0ECB81]/50 bg-[#0B0E11]/95 shadow-2xl shadow-[#0ECB81]/20"
            >
              <span className="text-3xl">⚽</span>
              <div>
                <div className="text-[#0ECB81] font-extrabold text-lg tracking-wide uppercase">Goal!</div>
                <div className="text-[#EAECEF] text-sm font-semibold">{ev.team}</div>
                <div className="text-[#848E9C] text-xs">vs {ev.opponent} · {ev.score}</div>
              </div>
            </div>
          ) : (
            <div
              key={ev.id}
              className="fx-pop flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-[#F0B90B]/40 bg-[#0B0E11]/95 shadow-2xl"
            >
              <span className="inline-block w-5 h-7 rounded-sm bg-[#F0B90B] shadow" />
              <div>
                <div className="text-[#F0B90B] font-bold text-sm uppercase tracking-wide">Yellow Card</div>
                <div className="text-[#EAECEF] text-xs">{ev.team}</div>
              </div>
            </div>
          ),
        )}
      </div>
    </>
  );
}
