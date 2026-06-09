import { useEffect, useRef } from 'react';
import sfxGoalUrl from '@assets/generated_audio/sfx_goal.mp3';

/* ════════════════════════════════════════════════════════════
   DESKTOP-ONLY goal-sound engine.
   Reads the SAME /api/sport/snapshot the betting UI uses and plays a
   stadium roar when a real goal is scored. NO visible UI, NO ticker,
   NO banners, NO other sounds — just the goal sound.
   Never mounted on mobile — mobile is untouched.
══════════════════════════════════════════════════════════════ */

interface SnapMatch {
  id: string;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'finished';
}

export default function DesktopSportsFx() {
  const goalAudio = useRef<HTMLAudioElement | null>(null);
  const scoresRef = useRef<Map<string, { h: number; a: number }>>(new Map());
  const unlockedRef = useRef(false);
  const firstSnapRef = useRef(true);

  useEffect(() => {
    /* preload + unlock audio on first user gesture (browser autoplay policy) */
    const g = new Audio(sfxGoalUrl); g.preload = 'auto'; g.volume = 0.7; goalAudio.current = g;
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      g.muted = true;
      g.play().then(() => { g.pause(); g.currentTime = 0; g.muted = false; }).catch(() => { g.muted = false; });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    const playGoal = () => {
      if (!goalAudio.current) return;
      try { goalAudio.current.currentTime = 0; goalAudio.current.play().catch(() => {}); } catch { /* ignore */ }
    };

    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/sport/snapshot?fx=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { matches: SnapMatch[] };
        if (cancelled || !Array.isArray(data.matches)) return;

        const firstSnap = firstSnapRef.current;
        firstSnapRef.current = false;

        for (const m of data.matches) {
          const prev = scoresRef.current.get(m.id);
          scoresRef.current.set(m.id, { h: m.homeScore, a: m.awayScore });
          if (firstSnap || prev === undefined) continue;
          if (m.homeScore > prev.h || m.awayScore > prev.a) playGoal();
        }
      } catch { /* ignore */ }
    }
    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return null;
}
