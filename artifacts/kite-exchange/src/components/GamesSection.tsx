import { useState, useEffect, useRef } from 'react';

/* ─── Types ─────────────────────────────────────────────── */
interface Odds { w1: number; x: number; w2: number }
interface HcOdds { h1: number; hx: number; h2: number; label1: string; label2: string }
interface TotalOdds { over: number; under: number; line: number }

interface Match {
  id: string;
  league: string;
  country: string;
  flag: string;
  homeTeam: string;
  awayTeam: string;
  homeBg: string;
  awayBg: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  half: number; // 1 or 2
  status: 'live' | 'finished';
  odds: Odds;
  hcOdds: HcOdds;
  totalOdds: TotalOdds;
  goalFlash: null | 'home' | 'away';
  flashTs: number;
  finishedAt: number | null;
}

/* ─── Data ───────────────────────────────────────────────── */
const LEAGUES = [
  { name: 'Uganda Premier League', country: 'Uganda', flag: '🇺🇬' },
  { name: 'Tanzania Ligi Kuu', country: 'Tanzania', flag: '🇹🇿' },
  { name: 'Ethiopian Premier League', country: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Ghana Premier League', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Kenya Premier League', country: 'Kenya', flag: '🇰🇪' },
  { name: 'Rwanda National League', country: 'Rwanda', flag: '🇷🇼' },
  { name: 'Zambia Super League', country: 'Zambia', flag: '🇿🇲' },
  { name: 'Senegal Ligue 1', country: 'Senegal', flag: '🇸🇳' },
  { name: 'Mozambique Liga', country: 'Mozambique', flag: '🇲🇿' },
  { name: 'Zimbabwe PSL', country: 'Zimbabwe', flag: '🇿🇼' },
];

const TEAMS: Record<string, string[]> = {
  Uganda:     ['Kampala FC','Victoria Bulls','Nile Stars','Gulu United','Pearl City','Entebbe Eagles'],
  Tanzania:   ['Dar Stars','Kilimanjaro SC','Zanzibar FC','Serengeti United','Mwanza City','Dodoma Red'],
  Ethiopia:   ['Addis Blue','Coffee FC','Rift Valley','Dire Dawa','Hawassa United','Gondar Lions'],
  Ghana:      ['Accra Hearts','Gold Stars','Kumasi Kings','Cape Heroes','Tamale Rovers','Takoradi SC'],
  Kenya:      ['Nairobi City','Rift Wanderers','Mombasa Marina','Lake Victoria','Kisumu Stars','Nakuru FC'],
  Rwanda:     ['Kigali FC','Volcano Stars','Muhazi United','Musanze Eagles','Huye Lions','Butare City'],
  Zambia:     ['Lusaka Dynamos','Copper Kings','Victoria Falls','Ndola United','Kitwe Rangers','Livingstone SC'],
  Senegal:    ['Dakar Warriors','Teranga Lions','Saint-Louis','Thiès City','Kaolack Stars','Ziguinchor FC'],
  Mozambique: ['Maputo City','Beira United','Nampula Stars','Tete FC','Pemba Rovers','Quelimane SC'],
  Zimbabwe:   ['Harare City','Bulawayo Stars','Mutare United','Kwekwe FC','Gweru Lions','Masvingo SC'],
};

const TEAM_COLORS = ['#1a56db','#e02424','#057a55','#9f1239','#7e3af2','#d97706','#0e9f6e','#be185d','#0284c7','#4f46e5'];

function r(min: number, max: number) { return Math.random() * (max - min) + min; }
function ri(min: number, max: number) { return Math.floor(r(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[ri(0, arr.length - 1)]; }
function pickTwo<T>(arr: T[]): [T, T] {
  const i = ri(0, arr.length - 1);
  let j = ri(0, arr.length - 1);
  while (j === i) j = ri(0, arr.length - 1);
  return [arr[i], arr[j]];
}

function makeOdds(): Odds {
  const base = r(1.1, 3.5);
  return { w1: +base.toFixed(2), x: +(r(2.5, 4.5)).toFixed(2), w2: +(r(1.1, 4.0)).toFixed(2) };
}
function makeHcOdds(hcSign: '+' | '-'): HcOdds {
  const line = (ri(0, 1) * 0.5 + 0.5);
  return {
    label1: `H1 (${hcSign}${line})`, h1: +(r(1.3, 2.8)).toFixed(2),
    hx: +(r(1.5, 3.0)).toFixed(2),
    label2: `H2 (${hcSign === '+' ? '-' : '+'}${line})`, h2: +(r(1.3, 2.8)).toFixed(2),
  };
}
function makeTotalOdds(): TotalOdds {
  const line = ri(1, 3) + 0.5;
  return { line, over: +(r(1.3, 2.5)).toFixed(2), under: +(r(1.3, 2.5)).toFixed(2) };
}

function makeMatch(id: string): Match {
  const league = pick(LEAGUES);
  const teams = TEAMS[league.country];
  const [ht, at] = pickTwo(teams);
  const minute = ri(5, 78);
  const half = minute > 45 ? 2 : 1;
  const maxG = Math.floor(minute / 22);
  return {
    id, league: league.name, country: league.country, flag: league.flag,
    homeTeam: ht, awayTeam: at,
    homeBg: pick(TEAM_COLORS), awayBg: pick(TEAM_COLORS),
    homeScore: ri(0, maxG), awayScore: ri(0, maxG),
    minute, half, status: 'live',
    odds: makeOdds(), hcOdds: makeHcOdds('+'), totalOdds: makeTotalOdds(),
    goalFlash: null, flashTs: 0, finishedAt: null,
  };
}

/* ─── Sub-components ─────────────────────────────────────── */
function TeamCircle({ color, abbr }: { color: string; abbr: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: `linear-gradient(135deg,${color}cc,${color}66)`,
      border: `2px solid ${color}99`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0,
      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    }}>
      {abbr}
    </div>
  );
}

function OddsBtn({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: active ? '#2a3a5a' : '#1C2128',
      border: `1px solid ${active ? '#3b82f6' : '#2B3139'}`,
      borderRadius: 4,
      padding: '3px 0',
      minWidth: 38,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: 9, color: '#848E9C', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700, marginTop: 1 }}>{value}</span>
    </div>
  );
}

/* Top horizontal card */
function MatchCard({ m }: { m: Match }) {
  const abbrevH = m.homeTeam.slice(0, 3).toUpperCase();
  const abbrevA = m.awayTeam.slice(0, 3).toUpperCase();
  const isFlashing = m.goalFlash && Date.now() - m.flashTs < 2000;

  return (
    <div style={{
      minWidth: 170, maxWidth: 170,
      background: isFlashing ? 'linear-gradient(145deg,#1a2a1a,#152115)' : 'linear-gradient(145deg,#161B22,#1C2128)',
      border: `1px solid ${isFlashing ? '#16a34a77' : '#2B3139'}`,
      borderRadius: 10,
      padding: '10px 10px 8px',
      flexShrink: 0,
      transition: 'border-color 0.3s, background 0.3s',
    }}>
      {/* Premature Victory badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>Premature Victory</span>
      </div>

      {/* League */}
      <p style={{ fontSize: 9, color: '#848E9C', marginBottom: 6 }}>{m.flag} {m.league}</p>

      {/* Teams + Score row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <TeamCircle color={m.homeBg} abbr={abbrevH} />
        {/* Live time badge */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <div style={{
            background: '#ef444433', border: '1px solid #ef444466',
            borderRadius: 4, padding: '2px 7px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" />
            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 800 }}>{m.minute}'</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: m.goalFlash === 'home' && isFlashing ? '#4ade80' : '#F0B90B', transition: 'color 0.3s' }}>{m.homeScore}</span>
            <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 700 }}>:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: m.goalFlash === 'away' && isFlashing ? '#4ade80' : '#F0B90B', transition: 'color 0.3s' }}>{m.awayScore}</span>
          </div>
        </div>
        <TeamCircle color={m.awayBg} abbr={abbrevA} />
      </div>

      {/* Team names */}
      <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginBottom: 8, lineHeight: 1.3 }}>
        {m.homeTeam} — {m.awayTeam}
      </p>

      {/* Odds row */}
      <div style={{ display: 'flex', gap: 4 }}>
        <OddsBtn label="W1" value={m.odds.w1} />
        <OddsBtn label="X" value={m.odds.x} />
        <OddsBtn label="W2" value={m.odds.w2} />
      </div>
    </div>
  );
}

/* List row */
function MatchRow({ m }: { m: Match }) {
  const isFlashing = m.goalFlash && Date.now() - m.flashTs < 2000;
  const halfLabel = m.half === 1 ? '1H' : '2H';

  return (
    <div style={{
      background: isFlashing ? '#0f1a0f' : 'transparent',
      borderBottom: '1px solid #1C2128',
      transition: 'background 0.3s',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 52 }}>
        {/* Minute + half */}
        <div style={{
          width: 38, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          borderRight: '1px solid #1C2128', flexShrink: 0, gap: 1,
        }}>
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 800 }}>{m.minute}'</span>
          <span style={{ fontSize: 9, color: '#4B5563', fontWeight: 600 }}>{halfLabel}</span>
        </div>

        {/* Teams + score */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '4px 8px',
          borderRight: '1px solid #1C2128', minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <TeamCircle color={m.homeBg} abbr={m.homeTeam.slice(0,2).toUpperCase()} />
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: isFlashing && m.goalFlash === 'home' ? '#4ade80' : '#e2e8f0',
              flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              transition: 'color 0.3s',
            }}>{m.homeTeam}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: m.goalFlash === 'home' && isFlashing ? '#4ade80' : '#F0B90B', minWidth: 14, textAlign: 'right', transition: 'color 0.3s' }}>{m.homeScore}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TeamCircle color={m.awayBg} abbr={m.awayTeam.slice(0,2).toUpperCase()} />
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: isFlashing && m.goalFlash === 'away' ? '#4ade80' : '#94a3b8',
              flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              transition: 'color 0.3s',
            }}>{m.awayTeam}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: m.goalFlash === 'away' && isFlashing ? '#4ade80' : '#F0B90B', minWidth: 14, textAlign: 'right', transition: 'color 0.3s' }}>{m.awayScore}</span>
          </div>
        </div>

        {/* RESULT odds */}
        <div style={{
          display: 'flex', gap: 2, alignItems: 'center',
          padding: '0 5px',
          borderRight: '1px solid #1C2128',
        }}>
          <OddsBtn label="W1" value={m.odds.w1} />
          <OddsBtn label="X" value={m.odds.x} />
          <OddsBtn label="W2" value={m.odds.w2} />
        </div>

        {/* HANDICAP (hidden on narrow) + TOTAL collapsed */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 6px',
          gap: 2,
        }}>
          <OddsBtn label={`O(${m.totalOdds.line})`} value={m.totalOdds.over} />
          <OddsBtn label={`U(${m.totalOdds.line})`} value={m.totalOdds.under} />
        </div>
      </div>

      {/* Goal flash banner */}
      {isFlashing && m.goalFlash && (
        <div style={{
          background: 'linear-gradient(90deg,#16a34a22,#16a34a44,#16a34a22)',
          padding: '3px 46px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 13 }}>⚽</span>
          <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800 }}>
            GOAL — {m.goalFlash === 'home' ? m.homeTeam : m.awayTeam}!
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function GamesSection() {
  const [matches, setMatches] = useState<Match[]>(() =>
    Array.from({ length: 10 }, (_, i) => makeMatch(`m${i}`))
  );
  const counter = useRef(100);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setMatches(prev => {
        let next = prev.map(m => {
          if (m.status === 'finished') return m;
          let mm = { ...m, minute: m.minute + 1, half: m.minute + 1 > 45 ? 2 : 1 };
          if (mm.minute >= 90) return { ...mm, status: 'finished' as const, finishedAt: now };

          if (!m.goalFlash || now - m.flashTs > 10000) {
            if (Math.random() < 0.08) {
              const side = Math.random() < 0.5 ? 'home' : 'away';
              mm = {
                ...mm,
                homeScore: side === 'home' ? mm.homeScore + 1 : mm.homeScore,
                awayScore: side === 'away' ? mm.awayScore + 1 : mm.awayScore,
                goalFlash: side as 'home' | 'away',
                flashTs: now,
              };
            }
          }
          return mm;
        });

        next = next.filter(m => !(m.status === 'finished' && m.finishedAt && now - m.finishedAt > 8000));
        while (next.length < 10) {
          counter.current++;
          next.push(makeMatch(`m${counter.current}`));
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(tick);
  }, []);

  const live = matches.filter(m => m.status === 'live');
  const finished = matches.filter(m => m.status === 'finished');

  // Group by league for list view
  const byLeague: Record<string, Match[]> = {};
  live.forEach(m => {
    if (!byLeague[m.league]) byLeague[m.league] = [];
    byLeague[m.league].push(m);
  });

  return (
    <div style={{ background: '#0B0E11', minHeight: '60vh', paddingBottom: 32 }}>
      {/* ── Header ── */}
      <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚽</span>
        <span style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 800 }}>Football</span>
        <span style={{ fontSize: 12, color: '#848E9C' }}>({live.length} matches)</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" />
          <span style={{ fontSize: 11, color: '#848E9C', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* ── Horizontal scroll cards ── */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '4px 12px 10px', scrollbarWidth: 'none' }}>
        {live.map(m => <MatchCard key={m.id} m={m} />)}
      </div>

      {/* ── Column headers ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#161A1F',
        borderTop: '1px solid #1C2128',
        borderBottom: '1px solid #1C2128',
        padding: '5px 0',
      }}>
        <div style={{ width: 38, flexShrink: 0 }} />
        <div style={{ flex: 1, paddingLeft: 8 }}>
          <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Match</span>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: '0 5px', width: 128 }}>
          <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1, textAlign: 'center' }}>RESULT ↓</span>
        </div>
        <div style={{ display: 'flex', padding: '0 6px', width: 88 }}>
          <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1, textAlign: 'center' }}>TOTAL</span>
        </div>
      </div>

      {/* ── Match list by league ── */}
      {Object.entries(byLeague).map(([league, ms]) => (
        <div key={league}>
          {/* League header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: '#12161B',
            borderBottom: '1px solid #1C2128',
          }}>
            <span style={{ fontSize: 13 }}>{ms[0].flag}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{ms[0].country}. {league}</span>
          </div>
          {ms.map(m => <MatchRow key={m.id} m={m} />)}
        </div>
      ))}

      {/* ── Finished ── */}
      {finished.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ padding: '5px 12px', background: '#12161B', borderBottom: '1px solid #1C2128' }}>
            <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
          </div>
          {finished.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              borderBottom: '1px solid #1C2128',
              opacity: 0.45,
            }}>
              <span style={{ fontSize: 11 }}>{m.flag}</span>
              <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{m.homeTeam}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#F0B90B' }}>{m.homeScore} – {m.awayScore}</span>
              <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, textAlign: 'right' }}>{m.awayTeam}</span>
              <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, marginLeft: 6 }}>FT</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 10, color: '#1C2128', marginTop: 20, padding: '0 16px' }}>
        Basonce Sports · Simulated Events · Entertainment only
      </p>
    </div>
  );
}
