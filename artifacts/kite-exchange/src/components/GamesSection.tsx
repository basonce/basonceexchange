import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { getLeague, ri, rf, LEAGUE_TEAMS, type MatchTemplate, type Team } from '../lib/sportsData';

/** Format a number with thousands separator + 2 decimal places. e.g. 16261406697.97 → "16,261,406,697.97" */
const fmt = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
interface Odds { w1: number; x: number; w2: number }
interface TotalOdds { line: number; over: number; under: number }

interface AdminCtrl {
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  targetTotal?: number;
  startedAt?: number;
  pinned: boolean;
  scheduledGoals?: Array<{ minute: number; side: 'home' | 'away' }>;
  scheduleKey?: string;
}

type OddsDir = 'up' | 'down' | 'same';
interface OddsDirs { w1: OddsDir; x: OddsDir; w2: OddsDir }

/* Extended markets — 100+ options per match */
interface ExtMarket { label: string; odd: number; key: string }
interface MarketGroup { title: string; markets: ExtMarket[] }

interface GoalEvent { minute: number; side: 'home' | 'away'; score: string }

interface MatchStats { shotsH: number; shotsA: number; cornersH: number; cornersA: number; possession: number }

interface LiveMatch {
  id: string;
  tmpl: MatchTemplate;
  homeScore: number;
  awayScore: number;
  minute: number;
  half: 1 | 2;
  status: 'live' | 'finished';
  odds: Odds;
  prevOdds?: Odds;
  oddsDir?: OddsDirs;
  totalOdds: TotalOdds;
  extMarkets: MarketGroup[];
  goalFlash: null | 'home' | 'away';
  flashTs: number;
  finishedAt: number | null;
  halfTimeScore?: { h: number; a: number };
  adminCtrl?: AdminCtrl;
  goalEvents: GoalEvent[];
  /* Clock / phase */
  phase: 'first_half' | 'ht_break' | 'second_half' | 'ft_stoppage';
  stoppageMin: number;   // extra minute counter (1..stoppageHT or 1..stoppageFT)
  stoppageHT: number;    // stoppage time at HT (assigned at min 45)
  stoppageFT: number;    // stoppage time at FT (assigned at min 90)
  htBreakLeft: number;   // ticks remaining in HT break
  /* Simulation chart */
  homeAttack: number[];  // attack intensity per minute (0–100) — max 90 entries
  awayAttack: number[];
  matchStats: MatchStats;
  /* Live pitch event */
  pitchEvent?: {
    type: 'attack' | 'dangerous_attack' | 'ball_play' | 'throw_in' | 'corner' | 'shot' | 'save' | 'foul' | 'offside';
    team: 'home' | 'away';
    ts: number;
  };
}

type BetType = string;
interface BetSlipItem {
  matchId: string;
  betType: BetType;
  odds: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  ouLine?: number;
}
interface PlacedBet extends BetSlipItem {
  id: string;
  amount: number;
  potentialWin: number;
  status: 'open' | 'won' | 'lost' | 'refunded';
  result?: string;
}

/* Winner ticker item */
interface WinnerFeed { name: string; amount: number; match: string; betDesc: string; ts: number }

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function makeOdds(): Odds {
  return { w1: rf(1.25, 4.50), x: rf(2.80, 5.20), w2: rf(1.25, 4.50) };
}

/**
 * CORRECT probability → odds conversion
 * diff > 0 = this team is LEADING (low odds)
 * diff < 0 = this team is LOSING  (high odds)
 * diff = 0 = tied                 (balanced odds)
 */
/* Ensure a float never shows as a round integer (e.g. 14 → 14.23) */
function oddVal(n: number): number {
  const base = Math.round(n * 100);
  const frac = base % 10 === 0 ? base + ri(2, 8) : base;
  return frac / 100;
}

function winOdds(diff: number, minsLeft: number): number {
  const tf = Math.max(0.10, minsLeft / 90); // time factor: 0→90
  if (diff === 0) {
    // Equal match — around 2.0-3.5 depending on time
    return oddVal(Math.max(1.55, Math.min(4.0, rf(1.75, 3.2) * Math.sqrt(tf) + rf(0.03, 0.18))));
  } else if (diff > 0) {
    // LEADING — high probability to win → LOW odds
    const prob = Math.min(0.97, 0.55 + diff * 0.16 * (1 / tf));
    return oddVal(Math.max(1.02, 1 / prob + rf(0.02, 0.12)));
  } else {
    // LOSING — low probability → capped realistic odds (max ~14)
    const absD = Math.abs(diff);
    const prob = Math.max(0.09, 0.45 - absD * 0.09 * (1 / tf));
    return oddVal(Math.min(13.95, 1 / prob + rf(0.05, 0.28)));
  }
}

function drawOdds(diff: number, minsLeft: number): number {
  const tf = Math.max(0.10, minsLeft / 90);
  if (diff === 0) return oddVal(Math.max(2.4, Math.min(5.5, rf(2.8, 4.2) * Math.sqrt(tf) + rf(0.03, 0.15))));
  const absD = Math.abs(diff);
  // Hard to draw when one team leads by multiple goals late
  const base = 4.5 + absD * 3.2 * (1 - tf * 0.6);
  return oddVal(Math.max(3.2, Math.min(9.75, base + rf(0.03, 0.35))));
}

function recalcOdds(prev: Odds, homeScore: number, awayScore: number, minute: number, isGoal: boolean, _?: 'home'|'away'): Odds {
  const minsLeft = Math.max(1, 90 - minute);
  const diff = homeScore - awayScore;
  if (isGoal) {
    return {
      w1: winOdds(diff, minsLeft),
      w2: winOdds(-diff, minsLeft),
      x:  drawOdds(diff, minsLeft),
    };
  }
  const d = 0.018;
  return {
    w1: oddVal(Math.max(1.02, Math.min(13.95, prev.w1 + rf(-d, d)))),
    w2: oddVal(Math.max(1.02, Math.min(13.95, prev.w2 + rf(-d, d)))),
    x:  oddVal(Math.max(1.5,  Math.min(9.75,  prev.x  + rf(-d*0.5, d*0.5)))),
  };
}

function calcOddsDir(prev: Odds | undefined, cur: Odds): OddsDirs {
  if (!prev) return { w1: 'same', x: 'same', w2: 'same' };
  const dir = (a: number, b: number): OddsDir => a > b + 0.005 ? 'up' : a < b - 0.005 ? 'down' : 'same';
  return { w1: dir(cur.w1, prev.w1), x: dir(cur.x, prev.x), w2: dir(cur.w2, prev.w2) };
}

function makeTotalOdds(): TotalOdds {
  const line = ri(1, 3) + 0.5;
  return { line, over: rf(1.45, 2.55), under: rf(1.45, 2.55) };
}

/* Build 100+ extended markets for a match */
function buildExtMarkets(hs: number, as_: number, w1: number, xo: number, w2: number): MarketGroup[] {
  const total = hs + as_;
  // Double Chance: 1X | 12 | X2
  const dc1x = +(1 / (1/w1 + 1/xo) * 1.05).toFixed(2);
  const dc12 = +(1 / (1/w1 + 1/w2) * 1.05).toFixed(2);
  const dcx2 = +(1 / (1/xo + 1/w2) * 1.05).toFixed(2);
  // BTTS
  const bttsY = +rf(1.55, 2.70).toFixed(2);
  const bttsN = +rf(1.45, 2.30).toFixed(2);
  // Asian Handicap lines
  const ahLines = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  const ahGroup: ExtMarket[] = ahLines.flatMap(l => [
    { label: `${l > 0 ? '+' : ''}${l} 1`, odd: +rf(1.65, 2.15).toFixed(2), key: `AH_H${l}` },
    { label: `${l > 0 ? '-' : l < 0 ? '+' : ''}${Math.abs(l)} 2`, odd: +rf(1.65, 2.15).toFixed(2), key: `AH_A${l}` },
  ]);
  // Multiple total goals lines
  const totLines = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];
  const totGroup: ExtMarket[] = totLines.flatMap(l => {
    const prob = 1 / (1 + Math.exp(-(total - l) * 0.8));
    const overO = +Math.max(1.05, Math.min(18, 1 / Math.max(0.05, prob) + rf(-0.08, 0.08))).toFixed(2);
    const underO = +Math.max(1.05, Math.min(18, 1 / Math.max(0.05, 1-prob) + rf(-0.08, 0.08))).toFixed(2);
    return [
      { label: `O ${l}`, odd: overO,  key: `OVER_${l}`  },
      { label: `U ${l}`, odd: underO, key: `UNDER_${l}` },
    ];
  });
  // Half-time result
  const ht: ExtMarket[] = [
    { label: '1st Half 1', odd: +rf(1.8, 3.5).toFixed(2),  key: 'HT1'  },
    { label: '1st Half X', odd: +rf(1.9, 3.2).toFixed(2),  key: 'HTX'  },
    { label: '1st Half 2', odd: +rf(1.8, 3.5).toFixed(2),  key: 'HT2'  },
    { label: '2nd Half 1', odd: +rf(1.7, 3.3).toFixed(2),  key: '2HT1' },
    { label: '2nd Half X', odd: +rf(1.8, 3.0).toFixed(2),  key: '2HTX' },
    { label: '2nd Half 2', odd: +rf(1.7, 3.3).toFixed(2),  key: '2HT2' },
  ];
  // HT / FT combos
  const htft: ExtMarket[] = ['1/1','1/X','1/2','X/1','X/X','X/2','2/1','2/X','2/2'].map(k => ({
    label: k, odd: +rf(2.2, 22).toFixed(2), key: `HTFT_${k}`,
  }));
  // Exact score
  const scores = ['0-0','1-0','0-1','1-1','2-0','0-2','2-1','1-2','2-2','3-0','0-3','3-1','1-3','3-2','2-3','4+'];
  const exactScore: ExtMarket[] = scores.map(s => ({
    label: s, odd: +rf(5, 28).toFixed(2), key: `ES_${s}`,
  }));
  // Corners
  const cLines = [7.5, 8.5, 9.5, 10.5, 11.5, 12.5];
  const corners: ExtMarket[] = cLines.flatMap(l => [
    { label: `Corners O ${l}`, odd: +rf(1.65, 2.30).toFixed(2), key: `COR_O_${l}` },
    { label: `Corners U ${l}`, odd: +rf(1.65, 2.30).toFixed(2), key: `COR_U_${l}` },
  ]);
  // Yellow cards
  const yLines = [2.5, 3.5, 4.5, 5.5];
  const cards: ExtMarket[] = yLines.flatMap(l => [
    { label: `Cards O ${l}`, odd: +rf(1.60, 2.20).toFixed(2), key: `CARD_O_${l}` },
    { label: `Cards U ${l}`, odd: +rf(1.60, 2.20).toFixed(2), key: `CARD_U_${l}` },
  ]);
  // Clean sheet
  const cs: ExtMarket[] = [
    { label: 'Home Clean Sheet - Yes', odd: +rf(1.75, 3.0).toFixed(2),  key: 'CS_H_Y' },
    { label: 'Home Clean Sheet - No',  odd: +rf(1.4, 2.0).toFixed(2),   key: 'CS_H_N' },
    { label: 'Away Clean Sheet - Yes', odd: +rf(1.75, 3.0).toFixed(2),  key: 'CS_A_Y' },
    { label: 'Away Clean Sheet - No',  odd: +rf(1.4, 2.0).toFixed(2),   key: 'CS_A_N' },
  ];
  // Win to nil
  const wtn: ExtMarket[] = [
    { label: 'Home Win to Nil', odd: +rf(2.2, 5.5).toFixed(2), key: 'WTN_H' },
    { label: 'Away Win to Nil', odd: +rf(2.2, 5.5).toFixed(2), key: 'WTN_A' },
  ];

  return [
    { title: 'Double Chance', markets: [
      { label: '1X', odd: Math.min(dc1x, 1.85), key: 'DC_1X' },
      { label: '12', odd: Math.min(dc12, 1.75), key: 'DC_12' },
      { label: 'X2', odd: Math.min(dcx2, 1.85), key: 'DC_X2' },
    ]},
    { title: 'Both Teams Score', markets: [
      { label: 'Yes', odd: bttsY, key: 'BTTS_Y' },
      { label: 'No',  odd: bttsN, key: 'BTTS_N' },
    ]},
    { title: 'Asian Handicap', markets: ahGroup },
    { title: 'Total Goals O/U', markets: totGroup },
    { title: 'Half-Time Result', markets: ht },
    { title: 'HT/FT', markets: htft },
    { title: 'Correct Score', markets: exactScore },
    { title: 'Corners', markets: corners },
    { title: 'Yellow Cards', markets: cards },
    { title: 'Clean Sheet', markets: [...cs, ...wtn] },
  ];
}

function dynamicOULine(total: number, baseLine: number): number {
  const minLine = total + 0.5;
  const candidate = Math.ceil(minLine * 2) / 2;
  return Math.max(candidate, baseLine);
}

/* Returns the O/U display line for a given target total goals */
function ouLineFromTarget(targetTot: number): number {
  return Math.max(0.5, targetTot - 0.5);
}

/**
 * Calculates Over/Under odds for admin-rigged matches.
 * Uses a simple probability model: each remaining minute has ~7% chance of a goal.
 * As goals accumulate or time runs out, odds tighten naturally.
 */
function adminTotalOdds(targetTot: number, currentTot: number, minute: number): TotalOdds {
  const line = ouLineFromTarget(targetTot);
  const remaining = targetTot - currentTot;  // goals still needed
  const minsLeft = Math.max(1, 90 - minute);

  if (remaining <= 0) {
    // Target already reached — over is a lock
    return { line, over: 1.01, under: 50.0 };
  }

  // Expected goals in remaining time at 7% per minute
  const expected = minsLeft * 0.07;
  const surplus = expected - remaining;          // positive = over likely, negative = unlikely
  const pOver = 1 / (1 + Math.exp(-surplus * 1.3));
  const overOdds  = Math.max(1.01, Math.min(9.5, 1 / Math.max(0.02, pOver)));
  const underOdds = Math.max(1.01, Math.min(50.0, 1 / Math.max(0.02, 1 - pOver)));

  return { line, over: +overOdds.toFixed(2), under: +underOdds.toFixed(2) };
}

/* Distributes goals across the remaining minutes for admin-controlled matches */
function generateScheduledGoals(
  target: { h: number; a: number },
  currentH: number,
  currentA: number,
  fromMinute: number,
): Array<{ minute: number; side: 'home' | 'away' }> {
  const homeNeeded = Math.max(0, target.h - currentH);
  const awayNeeded = Math.max(0, target.a - currentA);
  const total = homeNeeded + awayNeeded;
  if (total === 0) return [];

  const sides: Array<'home' | 'away'> = [
    ...Array(homeNeeded).fill('home' as const),
    ...Array(awayNeeded).fill('away' as const),
  ].sort(() => Math.random() - 0.5);

  const window = Math.max(total * 2, 88 - fromMinute);
  const interval = window / (total + 1);
  const used = new Set<number>();

  return sides.map((side, i) => {
    let min = Math.round(fromMinute + interval * (i + 1) + (Math.random() - 0.5) * interval * 0.7);
    min = Math.max(fromMinute + 1, Math.min(88, min));
    while (used.has(min) && min < 88) min++;
    used.add(min);
    return { minute: min, side };
  });
}

/* Returns formatted clock string */
function displayMinute(m: LiveMatch): string {
  if (m.phase === 'ht_break') return 'HT';
  if (m.phase === 'ft_stoppage') return `90+${m.stoppageMin}`;
  if (m.phase === 'first_half' && m.stoppageMin > 0) return `45+${m.stoppageMin}`;
  return `${m.minute}`;
}

/* Seed simulated stats at a given minute */
function seedStats(minute: number, hs: number, as_: number): MatchStats {
  const total = hs + as_;
  const shotsH = hs * ri(3, 5) + ri(0, Math.floor(minute / 15));
  const shotsA = as_ * ri(3, 5) + ri(0, Math.floor(minute / 15));
  const cornersH = hs * ri(1, 3) + ri(0, 3);
  const cornersA = as_ * ri(1, 3) + ri(0, 3);
  const possession = total === 0 ? ri(42, 58) : Math.min(75, Math.max(25, 50 + (hs - as_) * ri(3, 7)));
  return { shotsH, shotsA, cornersH, cornersA, possession };
}

/* Seed historical attack waves for an in-progress match */
function seedAttackWaves(minute: number, goalEvents: GoalEvent[]): { homeAttack: number[]; awayAttack: number[] } {
  const homeAttack: number[] = [];
  const awayAttack: number[] = [];
  for (let i = 0; i < minute; i++) {
    const goalAt = goalEvents.find(g => g.minute === i);
    if (goalAt) {
      homeAttack.push(goalAt.side === 'home' ? ri(75, 100) : ri(10, 25));
      awayAttack.push(goalAt.side === 'away' ? ri(75, 100) : ri(10, 25));
    } else {
      homeAttack.push(ri(20, 65));
      awayAttack.push(ri(20, 65));
    }
  }
  return { homeAttack, awayAttack };
}

function buildMatch(tmpl: MatchTemplate, idx: number): LiveMatch {
  const minute = ri(4, 82);
  const maxG = Math.floor(minute / 24);
  const hs = ri(0, maxG);
  const as_ = ri(0, maxG);
  const odds = makeOdds();
  const total = hs + as_;
  const totalOdds = makeTotalOdds();
  totalOdds.line = dynamicOULine(total, totalOdds.line);
  const goalEvents: GoalEvent[] = [];
  let fh = 0, fa = 0;
  for (let g = 0; g < total; g++) {
    const side = Math.random() < (hs / (total || 1)) ? 'home' : 'away';
    const m = ri(1, Math.min(minute - 1, 89));
    if (side === 'home') fh++;
    else fa++;
    goalEvents.push({ minute: m, side, score: `${fh}–${fa}` });
  }
  goalEvents.sort((a, b) => a.minute - b.minute);
  const phase: LiveMatch['phase'] = minute >= 45 ? 'second_half' : 'first_half';
  const { homeAttack, awayAttack } = seedAttackWaves(minute, goalEvents);
  return {
    id: `m_${idx}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tmpl, homeScore: hs, awayScore: as_,
    minute, half: minute > 45 ? 2 : 1,
    status: 'live', odds, totalOdds,
    extMarkets: buildExtMarkets(hs, as_, odds.w1, odds.x, odds.w2),
    goalFlash: null, flashTs: 0, finishedAt: null, goalEvents,
    phase, stoppageMin: 0, stoppageHT: 0, stoppageFT: 0, htBreakLeft: 0,
    homeAttack, awayAttack,
    matchStats: seedStats(minute, hs, as_),
  };
}

/** Generate a vibrant color from team name — consistent across renders */
function teamColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFF;
  const hue = h % 360;
  return `hsl(${hue}, 72%, 52%)`;
}

/** Direct URL to server-proxied team logo image (no CORS, server-cached, mobile-safe) */
function teamLogoImgUrl(name: string): string {
  return `/api/team-logo-img?name=${encodeURIComponent(name)}`;
}

/** Shield SVG fallback when logo fails to load */
function ShieldFallback({ name, size }: { name: string; size: number }) {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  const bg = teamColor(name);
  const s = size;
  const cx = s / 2;
  const shield = `M ${s*0.08},${s*0.06} L ${s*0.92},${s*0.06} L ${s*0.92},${s*0.62} Q ${s*0.92},${s*0.95} ${cx},${s*0.99} Q ${s*0.08},${s*0.95} ${s*0.08},${s*0.62} Z`;
  const darkBg = bg.replace('52%', '28%');
  const fz = initials.length > 2 ? s * 0.22 : s * 0.27;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`lg_${initials}_${s}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bg}/>
          <stop offset="100%" stopColor={darkBg}/>
        </linearGradient>
      </defs>
      <path d={shield} fill={`url(#lg_${initials}_${s})`} stroke={bg} strokeWidth="0.8" opacity="0.95"/>
      <text
        x={cx} y={s * 0.66}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fz} fontWeight="900" fill="white"
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.03em' }}
      >{initials}</text>
    </svg>
  );
}

/** Team logo — directly loads from server proxy (no async state, no CORS issues) */
function TeamLogo({ name, size = 36 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const bg = teamColor(name);

  if (failed) return <ShieldFallback name={name} size={size} />;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: '#1C2128', flexShrink: 0,
      boxShadow: `0 0 0 2px #0B0E11, 0 0 0 3px ${bg}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={teamLogoImgUrl(name)}
        alt={name}
        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function betLabel(b: BetType, homeTeam: string, awayTeam: string, ouLine?: number): string {
  if (b === 'W1') return `1 (${homeTeam})`;
  if (b === 'W2') return `2 (${awayTeam})`;
  if (b === 'X') return 'Draw (X)';
  if (b === 'OVER') return ouLine ? `Over ${ouLine}` : 'Over';
  if (b === 'UNDER') return ouLine ? `Under ${ouLine}` : 'Under';
  return b;
}

/* ══════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════ */

/* ── Color helpers ── */
function adjustHex(hex: string, amt: number): string {
  const h = hex.replace('#','');
  const r = Math.min(255, Math.max(0, parseInt(h.slice(0,2)||'88',16) + amt));
  const g = Math.min(255, Math.max(0, parseInt(h.slice(2,4)||'88',16) + amt));
  const b = Math.min(255, Math.max(0, parseInt(h.slice(4,6)||'88',16) + amt));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
function strHash(s: string): number {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h;
}

/* ── Real Football Club Crest ── */
function TeamShield({ abbr, color, size = 32, logoUrl, name }: { abbr: string; color: string; size?: number; logoUrl?: string; name?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Priority: explicit logoUrl prop → server-proxied by name → fallback SVG
  const imgSrc = logoUrl || (name ? teamLogoImgUrl(name) : null);

  if (imgSrc && !imgFailed) {
    return (
      <div style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <img
          src={imgSrc}
          alt={abbr}
          width={size - 4}
          height={size - 4}
          style={{ objectFit: 'contain', display: 'block' }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  const s = size;
  const cx = s / 2;

  // UEFA-style crest path: flat top, straight sides, rounded arch bottom to point
  const shield = `M ${s*0.08},${s*0.06} L ${s*0.92},${s*0.06} L ${s*0.92},${s*0.62} Q ${s*0.92},${s*0.95} ${cx},${s*0.99} Q ${s*0.08},${s*0.95} ${s*0.08},${s*0.62} Z`;

  const uid = `c_${abbr.replace(/\W/g,'_')}`;
  const hash = strHash(abbr);
  const pat = hash % 7;  // 7 unique patterns

  const c1 = color;
  const c2 = adjustHex(color, 55);   // lighter variant
  const c3 = adjustHex(color, -40);  // darker variant

  const fz = abbr.length > 3 ? s*0.19 : abbr.length > 2 ? s*0.23 : s*0.25;
  const ty = s * 0.63;

  // Pattern fills (clipped to shield)
  const patterns: Record<number, ReactNode> = {
    0: ( // Horizontal thirds: c3 | c1 | c3
      <>
        <rect x={s*0.08} y={s*0.06} width={s*0.84} height={s*0.31} fill={c3}/>
        <rect x={s*0.08} y={s*0.37} width={s*0.84} height={s*0.31} fill={c1}/>
        <rect x={s*0.08} y={s*0.68} width={s*0.84} height={s*0.35} fill={c3}/>
      </>
    ),
    1: ( // Diagonal split: top-left c1, bottom-right c2
      <>
        <rect x={0} y={0} width={s} height={s} fill={c2}/>
        <polygon points={`${s*0.08},${s*0.06} ${s*0.92},${s*0.06} ${s*0.08},${s*0.99}`} fill={c1}/>
      </>
    ),
    2: ( // Vertical halves: left c1, right c3
      <>
        <rect x={s*0.08} y={0} width={s*0.42} height={s} fill={c1}/>
        <rect x={s*0.50} y={0} width={s*0.42} height={s} fill={c3}/>
      </>
    ),
    3: ( // Quarters: TL+BR = c1, TR+BL = c2
      <>
        <rect x={0} y={0} width={s} height={s} fill={c1}/>
        <polygon points={`${cx},${s*0.06} ${s*0.92},${s*0.06} ${s*0.92},${cx} ${cx},${cx}`} fill={c2}/>
        <polygon points={`${s*0.08},${cx} ${cx},${cx} ${s*0.08},${s*0.99}`} fill={c2}/>
      </>
    ),
    4: ( // Stripes (3 vertical): c1 c2 c1
      <>
        <rect x={s*0.08} y={0} width={s*0.28} height={s} fill={c1}/>
        <rect x={s*0.36} y={0} width={s*0.28} height={s} fill={c2}/>
        <rect x={s*0.64} y={0} width={s*0.28} height={s} fill={c1}/>
      </>
    ),
    5: ( // Circle badge on solid: big circle c2 on c1 bg
      <>
        <rect x={0} y={0} width={s} height={s} fill={c3}/>
        <circle cx={cx} cy={s*0.42} r={s*0.28} fill={c1}/>
        <circle cx={cx} cy={s*0.42} r={s*0.22} fill={c3}/>
      </>
    ),
    6: ( // Cross/plus on solid
      <>
        <rect x={0} y={0} width={s} height={s} fill={c1}/>
        <rect x={cx-s*0.07} y={s*0.06} width={s*0.14} height={s*0.9} fill={c2} opacity={0.85}/>
        <rect x={s*0.08} y={s*0.3} width={s*0.84} height={s*0.15} fill={c2} opacity={0.85}/>
      </>
    ),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0, display:'block' }}>
      <defs>
        <clipPath id={`${uid}cp`}>
          <path d={shield}/>
        </clipPath>
        <linearGradient id={`${uid}gl`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.18"/>
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <path d={shield} fill="rgba(0,0,0,0.4)" transform={`translate(${s*0.04},${s*0.05})`}/>

      {/* Pattern (clipped) */}
      <g clipPath={`url(#${uid}cp)`}>
        {patterns[pat]}
      </g>

      {/* Gloss overlay */}
      <path d={shield} fill={`url(#${uid}gl)`}/>

      {/* Gold border */}
      <path d={shield} fill="none" stroke="rgba(240,185,11,0.55)" strokeWidth={s*0.035}/>
      {/* Inner white border */}
      <path d={shield} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={s*0.018}
        transform={`scale(0.88) translate(${s*0.068},${s*0.068})`}/>

      {/* Abbreviation shadow */}
      <text x={cx+s*0.015} y={ty+s*0.015} textAnchor="middle" fill="rgba(0,0,0,0.7)"
        fontSize={fz} fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif">{abbr}</text>
      {/* Abbreviation */}
      <text x={cx} y={ty} textAnchor="middle" fill="#ffffff"
        fontSize={fz} fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif"
        stroke="rgba(0,0,0,0.3)" strokeWidth={s*0.015} paintOrder="stroke">{abbr}</text>
    </svg>
  );
}

function OddPill({
  label, value, trend, active, onClick,
}: { label: string; value: number; trend?: OddsDir; active?: boolean; onClick: () => void }) {
  const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#ef4444' : '#F0B90B';
  const trendArrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : null;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 1,
        background: active ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : '#1C2128',
        border: `1px solid ${active ? '#3b82f6' : '#2B3139'}`,
        borderRadius: 5, padding: '3px 5px', minWidth: 40, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 9, color: active ? '#93c5fd' : '#848E9C', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 12, color: active ? '#fff' : trendColor, fontWeight: 700, transition: 'color 0.4s' }}>{value}</span>
        {trendArrow && !active && (
          <span style={{ fontSize: 7, color: trendColor, fontWeight: 900, lineHeight: 1, transition: 'color 0.4s' }}>{trendArrow}</span>
        )}
      </div>
    </button>
  );
}

/* ── Horizontal match card (original design) ── */
function TopCard({
  m, selectedBetMatchId, onSelect,
}: { m: LiveMatch; selectedBetMatchId: string | null; onSelect: (matchId: string, type: BetType, odds: number) => void }) {
  const lg = getLeague(m.tmpl.leagueId);
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const isFlashing = !!(m.goalFlash && Date.now() - m.flashTs < 3000);
  const sel = selectedBetMatchId === m.id;
  const od = m.oddsDir;

  const oddsRow = [
    { label: 'W1', value: m.odds.w1, type: 'W1' as BetType, trend: od?.w1 },
    { label: 'X',  value: m.odds.x,  type: 'X'  as BetType, trend: od?.x  },
    { label: 'W2', value: m.odds.w2, type: 'W2' as BetType, trend: od?.w2 },
  ];

  return (
    <div
      className="match-card"
      onClick={() => onSelect(m.id, 'W1', m.odds.w1)}
      style={{
        minWidth: 195, maxWidth: 195, flexShrink: 0, cursor: 'pointer',
        background: isFlashing
          ? 'linear-gradient(160deg,#0a2416,#0f3320,#0a2416)'
          : 'linear-gradient(160deg,#0d2318,#163325,#0d2318)',
        border: `1.5px solid ${sel ? '#3b82f6' : isFlashing ? '#22c55e' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 12, overflow: 'hidden',
        transition: 'border-color 0.3s, background 0.3s',
        boxShadow: sel ? '0 0 0 2px #3b82f644' : '0 2px 14px rgba(0,0,0,0.45)',
      }}
    >
      {/* Green header bar */}
      <div style={{
        background: 'linear-gradient(90deg,rgba(22,163,74,0.3),rgba(22,163,74,0.12),rgba(22,163,74,0.3))',
        borderBottom: '1px solid rgba(22,163,74,0.22)',
        padding: '5px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 7px #22c55e' }} />
        <span style={{ fontSize: 9.5, color: '#86efac', fontWeight: 800, letterSpacing: '0.03em' }}>Premature Victory</span>
      </div>

      {/* League */}
      <p style={{ fontSize: 9, color: '#6ee7b7aa', textAlign: 'center', margin: '5px 8px 0', fontWeight: 600 }}>
        {lg?.flag} {lg?.country}, {lg?.name.split(' ').slice(0,2).join(' ')}
      </p>

      {/* Logos + Score */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px 3px' }}>
        {/* Home shield */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 50 }}>
          <TeamShield abbr={ht.abbr} color={ht.color} size={46} logoUrl={ht.logoUrl} name={ht.name} />
          <span style={{ fontSize: 7.5, color: '#94a3b855', maxWidth: 50, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ht.name.split(' ')[0]}</span>
        </div>

        {/* Center */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'rgba(239,68,68,0.14)', borderRadius: 4, padding: '2px 6px',
            border: '1px solid rgba(239,68,68,0.28)',
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" />
            <span style={{ fontSize: 10, color: '#fca5a5', fontWeight: 900 }}>{m.minute}'</span>
          </div>
          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{
              fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              color: isFlashing && m.goalFlash === 'home' ? '#4ade80' : '#fff',
              transition: 'color 0.35s',
            }}>{m.homeScore}</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.22)' }}>:</span>
            <span style={{
              fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              color: isFlashing && m.goalFlash === 'away' ? '#4ade80' : '#fff',
              transition: 'color 0.35s',
            }}>{m.awayScore}</span>
          </div>
        </div>

        {/* Away shield */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 50 }}>
          <TeamShield abbr={at.abbr} color={at.color} size={46} logoUrl={at.logoUrl} name={at.name} />
          <span style={{ fontSize: 7.5, color: '#94a3b855', maxWidth: 50, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{at.name.split(' ')[0]}</span>
        </div>
      </div>

      {/* Match name line */}
      <p style={{
        fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center',
        margin: '1px 6px 4px', lineHeight: 1.3, overflow: 'hidden',
        whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>{ht.name} — {at.name}</p>

      {/* Odds row */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {oddsRow.map((o, i) => {
          const tColor = o.trend === 'up' ? '#4ade80' : o.trend === 'down' ? '#ef4444' : '#F0B90B';
          const tArrow = o.trend === 'up' ? '▲' : o.trend === 'down' ? '▼' : '';
          return (
            <button
              key={o.label}
              className="odd-btn-big"
              onClick={e => { e.stopPropagation(); onSelect(m.id, o.type, o.value); }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                background: sel ? 'rgba(59,130,246,0.18)' : 'rgba(0,0,0,0.28)',
                border: 'none',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                padding: '5px 2px 6px', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 1 }}>{o.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 13, color: sel ? '#93c5fd' : tColor, fontWeight: 900, transition: 'color 0.4s' }}>{o.value}</span>
                {tArrow && <span style={{ fontSize: 7, color: tColor, fontWeight: 900, transition: 'color 0.4s' }}>{tArrow}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Compact odds button for list rows ── */
function OddBtn({
  label, value, trend, active, small, onClick,
}: { label: string; value: number; trend?: OddsDir; active?: boolean; small?: boolean; onClick: () => void }) {
  const tc = trend === 'up' ? '#4ade80' : trend === 'down' ? '#ef4444' : '#F0B90B';
  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '';
  return (
    <button
      onClick={onClick}
      className={trend && trend !== 'same' ? 'odds-changed' : ''}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0, background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 4, padding: small ? '2px 3px' : '3px 4px',
        minWidth: small ? 36 : 42, cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <span style={{ fontSize: small ? 7.5 : 8.5, color: '#64748b', fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <span style={{ fontSize: small ? 11 : 13, color: active ? '#93c5fd' : tc, fontWeight: 900, lineHeight: 1.3, transition: 'color 0.4s' }}>{value}</span>
        {arrow && <span style={{ fontSize: 6.5, color: tc, fontWeight: 900 }}>{arrow}</span>}
      </div>
    </button>
  );
}

/* ── Winners ticker bar ── */
/* Low-tier names (~50) — West/East African */
const LOW_NAMES = [
  'Kwame A.','Fatima B.','Amadou C.','Chioma D.','Yusuf E.',
  'Zainab F.','Blessing G.','Tunde H.','Amara I.','Kofi J.',
  'Ngozi K.','Babatunde L.','Emeka M.','Chiamaka N.','Folake O.',
  'Adewale P.','Damilola R.','Rotimi S.','Bosede T.','Sola U.',
  'Femi V.','Kemi W.','Yemi X.','Gbenga Y.','Dapo Z.',
  'Kunle A.','Niyi B.','Segun C.','Wole D.','Tade E.',
  'Dele F.','Fola G.','Bayo H.','Titi I.','Yinka J.',
  'Lola K.','Simi L.','Nkem M.','Chidi N.','Ebuka O.',
  'Aisha P.','Taiwo Q.','Gbemi R.','Bunmi S.','Tosin T.',
  'Isioma U.','Adaeze V.','Morenike W.','Obiora X.','Uche Y.',
];
/* Mid-tier names (~50) — Latin / Southern European */
const MID_NAMES = [
  'Carlos M.','Ana F.','Pedro L.','Isabella C.','Rafael T.',
  'Gabrielle V.','Rodrigo B.','Camila S.','Felipe P.','Beatriz N.',
  'Lucas R.','Mariana K.','Thiago J.','Larissa H.','Gustavo G.',
  'Fernanda E.','Diego D.','Patricia C.','Bruno B.','Juliana A.',
  'Andrei O.','Alicia R.','Santiago G.','Valentina C.','Mateo H.',
  'Sofia L.','Nicolas D.','Emma F.','Alejandro K.','Paula T.',
  'Juan S.','Maria V.','Manuel B.','Lucia P.','Roberto E.',
  'Carmen J.','Francisco N.','Ana M.','Eduardo K.','Rosa L.',
  'Antonio F.','Elena B.','Miguel T.','Claudia S.','Alberto R.',
  'Mercedes P.','Jorge N.','Teresa M.','Rafael E.','Monica L.',
];
/* High-tier names (~50) — Anglo / Central-European / Aristocratic */
const HIGH_NAMES = [
  'Alexander V.','Victoria K.','Sebastian W.','Anastasia M.','Maximilian R.',
  'Katherine L.','Christopher T.','Elizabeth P.','Jonathan N.','Margaret H.',
  'Benjamin F.','Eleanor D.','Theodore G.','Frederick S.','Arabella C.',
  'Leonard J.','Rosalind K.','Reginald T.','Genevieve M.','Montgomery H.',
  'Evangeline W.','Cornelius R.','Seraphina L.','Bartholomew P.','Theodora N.',
  'Fitzgerald G.','Celestine B.','Wellington S.','Clarissa T.','Archibald K.',
  'Lavinia M.','Pemberton R.','Cordelia H.','Alistair W.','Araminta L.',
  'Desmond K.','Celestia M.','Rupert W.','Eugenia L.','Benedict T.',
  'Olympia R.','Crispin M.','Leopold H.','Isadora W.','Millicent T.',
  'Augustin P.','Francesca L.','Horatio M.','Cassandra R.','Beaumont S.',
];
/* Tiered winner: low 45%, mid 35%, high 20% — each uses its own name pool */
function fakeWinner(): { name: string; amount: number } {
  const r = Math.random();
  if (r < 0.45) {
    return { name: LOW_NAMES[ri(0, LOW_NAMES.length - 1)], amount: +(rf(150, 4500)).toFixed(2) };
  } else if (r < 0.80) {
    return { name: MID_NAMES[ri(0, MID_NAMES.length - 1)], amount: +(rf(5000, 45000)).toFixed(2) };
  } else {
    return { name: HIGH_NAMES[ri(0, HIGH_NAMES.length - 1)], amount: +(rf(60000, 1200000)).toFixed(2) };
  }
}
function WinnersTickerBar({ feeds }: { feeds: WinnerFeed[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let pos = 0; let af = 0;
    const step = () => {
      pos += 0.5;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      af = requestAnimationFrame(step);
    };
    af = requestAnimationFrame(step);
    return () => cancelAnimationFrame(af);
  }, [feeds]);
  return (
    <div style={{ background: '#060A0D', borderBottom: '1px solid #1C2128', overflow: 'hidden', position: 'relative' }}>
      <div ref={ref} style={{ display: 'flex', gap: 0, overflowX: 'hidden', whiteSpace: 'nowrap' }}>
        {[...feeds, ...feeds].map((f, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 18px 5px 10px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13 }}>🏆</span>
            <span style={{ fontSize: 10, color: '#F0B90B', fontWeight: 800 }}>{f.name}</span>
            <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 900 }}>+{fmt(f.amount)} USDT</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>· {f.betDesc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Expandable market panel ── */
function MarketPanel({
  groups, matchId, onSelectBet,
}: { groups: MarketGroup[] | undefined; matchId: string; onSelectBet: (matchId: string, type: BetType, odds: number) => void }) {
  const [activeGroup, setActiveGroup] = useState(0);
  if (!groups || groups.length === 0) return null;
  const group = groups[Math.min(activeGroup, groups.length - 1)];
  return (
    <div style={{ background: '#0A0E13', borderTop: '1px solid #1C2128' }}>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid #1C2128', scrollbarWidth: 'none' }}>
        {groups.map((g, i) => (
          <button key={i} onClick={() => setActiveGroup(i)} style={{
            flexShrink: 0, padding: '7px 11px', whiteSpace: 'nowrap', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 11, fontWeight: 700,
            color: activeGroup === i ? '#F0B90B' : '#6B7280',
            borderBottom: activeGroup === i ? '2px solid #F0B90B' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{g.title}</button>
        ))}
      </div>
      {/* Markets grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: '8px 8px 10px' }}>
        {group?.markets.map(mkt => (
          <button key={mkt.key}
            className="mkt-btn"
            onClick={() => onSelectBet(matchId, mkt.key, mkt.odd)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 5, padding: '5px 4px', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.2, textAlign: 'center' }}>{mkt.label}</span>
            <span style={{ fontSize: 13, color: '#F0B90B', fontWeight: 900 }}>{mkt.odd}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── List row — perfect grid alignment ── */
function MatchRow({
  m, activeBetMatchId, expandedMatchId, onSelectBet, onToggleExpand, onOpenSim, placedBets,
}: {
  m: LiveMatch;
  activeBetMatchId: string | null;
  expandedMatchId: string | null;
  onSelectBet: (matchId: string, type: BetType, odds: number) => void;
  onToggleExpand: (id: string) => void;
  onOpenSim: (id: string) => void;
  placedBets: PlacedBet[];
}) {
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const now = Date.now();
  const isGoalFlash = !!(m.goalFlash && now - m.flashTs < 3500);
  const clockStr = displayMinute(m);
  const isHT = m.phase === 'ht_break';
  const halfLabel = isHT ? 'HT' : m.half === 1 ? '1st' : '2nd';
  const sel = activeBetMatchId === m.id;
  const homeWin = m.homeScore > m.awayScore;
  const awayWin = m.awayScore > m.homeScore;
  const od = m.oddsDir;
  const ln = m.totalOdds.line;
  const activeBet = placedBets.find(b => b.matchId === m.id && b.status === 'open');

  return (
    <div
      className={isGoalFlash ? 'goal-ring' : ''}
      style={{
        borderTop: `1px solid ${isGoalFlash ? 'rgba(34,197,94,0.4)' : sel ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
        borderRight: `1px solid ${isGoalFlash ? 'rgba(34,197,94,0.4)' : sel ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
        borderLeft: `1px solid ${isGoalFlash ? 'rgba(34,197,94,0.4)' : sel ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
        borderBottom: '1px solid #1C2128',
        background: sel ? 'rgba(29,78,216,0.06)' : 'transparent',
        transition: 'background 0.3s',
      }}
    >
      {/* ── Active bet badge ── */}
      {activeBet && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px',
          background: 'linear-gradient(90deg,rgba(59,130,246,0.12),rgba(37,99,235,0.18))',
          borderBottom: '1px solid rgba(59,130,246,0.2)',
        }}>
          <span style={{ fontSize: 9.5 }}>🎟️</span>
          <span style={{ fontSize: 9.5, color: '#93c5fd', fontWeight: 700 }}>YOUR BET</span>
          <span style={{ marginLeft: 4, fontSize: 9, color: '#60a5fa' }}>
            {activeBet.betType === 'W1' ? `1 (${activeBet.homeTeam.split(' ')[0]})` :
             activeBet.betType === 'W2' ? `2 (${activeBet.awayTeam.split(' ')[0]})` :
             activeBet.betType === 'X' ? 'Draw' :
             activeBet.betType === 'OVER' ? `Over ${ln}` :
             activeBet.betType === 'UNDER' ? `Under ${ln}` :
             activeBet.betType}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#fbbf24', fontWeight: 900 }}>x{activeBet.odds}</span>
        </div>
      )}

      {/* ── Main grid: [time | teams | result-odds | total-odds] ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '34px 1fr 144px 90px',
        alignItems: 'stretch',
      }}>

        {/* Time column */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRight: '1px solid #1C2128', padding: '5px 0', gap: 1,
        }}>
          {m.adminCtrl?.pinned && <span style={{ fontSize: 8, lineHeight: 1 }}>📌</span>}
          <span style={{ fontSize: isHT ? 8.5 : 10.5, color: isHT ? '#fbbf24' : '#ef4444', fontWeight: 900, lineHeight: 1 }}>
            {isHT ? 'HT' : `${clockStr}'`}
          </span>
          {!isHT && <span style={{ fontSize: 7.5, color: '#374151', fontWeight: 700 }}>{halfLabel}</span>}
        </div>

        {/* Teams column — each row: [shield | name | score] perfect grid */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '4px 6px', borderRight: '1px solid #1C2128', gap: 3, minWidth: 0,
        }}>
          {/* Home row */}
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 16px', alignItems: 'center', gap: 4 }}>
            <TeamShield abbr={ht.abbr} color={ht.color} size={22} logoUrl={ht.logoUrl} name={ht.name}/>
            <span style={{
              fontSize: 11.5, fontWeight: homeWin ? 800 : 600,
              color: isGoalFlash && m.goalFlash === 'home' ? '#4ade80' : homeWin ? '#e2e8f0' : '#94a3b8',
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              transition: 'color 0.35s',
            }}>{ht.name}</span>
            <span style={{
              fontSize: 13, fontWeight: 900, textAlign: 'right',
              color: isGoalFlash && m.goalFlash === 'home' ? '#4ade80' : '#F0B90B',
              transition: 'color 0.35s',
            }}>{m.homeScore}</span>
          </div>
          {/* Away row */}
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 16px', alignItems: 'center', gap: 4 }}>
            <TeamShield abbr={at.abbr} color={at.color} size={22} logoUrl={at.logoUrl} name={at.name}/>
            <span style={{
              fontSize: 11.5, fontWeight: awayWin ? 800 : 600,
              color: isGoalFlash && m.goalFlash === 'away' ? '#4ade80' : awayWin ? '#e2e8f0' : '#94a3b8',
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              transition: 'color 0.35s',
            }}>{at.name}</span>
            <span style={{
              fontSize: 13, fontWeight: 900, textAlign: 'right',
              color: isGoalFlash && m.goalFlash === 'away' ? '#4ade80' : '#F0B90B',
              transition: 'color 0.35s',
            }}>{m.awayScore}</span>
          </div>
        </div>

        {/* Result odds: W1 | X | W2 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 4px', borderRight: '1px solid #1C2128' }}>
          <OddBtn label="W1" value={m.odds.w1} trend={od?.w1} active={sel} onClick={() => onSelectBet(m.id,'W1',m.odds.w1)}/>
          <OddBtn label="X"  value={m.odds.x}  trend={od?.x}             onClick={() => onSelectBet(m.id,'X', m.odds.x)} />
          <OddBtn label="W2" value={m.odds.w2} trend={od?.w2}            onClick={() => onSelectBet(m.id,'W2',m.odds.w2)}/>
        </div>

        {/* Total odds: U (Under) LEFT | O (Over) RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 4px' }}>
          <OddBtn label={`U ${ln}`} value={m.totalOdds.under} onClick={() => onSelectBet(m.id,'UNDER',m.totalOdds.under)}/>
          <OddBtn label={`O ${ln}`} value={m.totalOdds.over}  onClick={() => onSelectBet(m.id,'OVER', m.totalOdds.over)} />
        </div>

      </div>

      {/* ── Goal events timeline ── */}
      {m.goalEvents && m.goalEvents.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px 6px',
          padding: '4px 8px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.18)',
        }}>
          {m.goalEvents.map((ev, i) => (
            <span key={i} style={{
              fontSize: 9, color: ev.side === 'home' ? '#fbbf24' : '#94a3b8',
              display: 'flex', alignItems: 'center', gap: 2, fontVariantNumeric: 'tabular-nums',
            }}>
              <span>⚽</span>
              <span style={{ fontWeight: 700 }}>{ev.minute}'</span>
              <span style={{ color: 'rgba(148,163,184,0.55)' }}>({ev.score})</span>
              {i < m.goalEvents.length - 1 && <span style={{ color: '#1C2128', marginLeft: 2 }}>·</span>}
            </span>
          ))}
        </div>
      )}

      {/* ── Goal flash banner ── */}
      {isGoalFlash && m.goalFlash && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(90deg,rgba(5,46,22,0.9),rgba(20,83,45,0.95),rgba(5,46,22,0.9))',
          padding: '3px 12px',
          borderTop: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} className="animate-pulse"/>
          <span style={{ fontSize: 10.5, color: '#4ade80', fontWeight: 900 }}>
            ⚽ GOAL! {m.goalFlash === 'home' ? ht.name : at.name} — {m.homeScore}:{m.awayScore}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#6ee7b7' }}>Odds updated</span>
        </div>
      )}

      {/* ── All markets button → opens simulation modal ── */}
      <button
        onClick={() => onOpenSim(m.id)}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.02)',
          border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 11 }}>📊</span>
        <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 700 }}>All markets</span>
        <span style={{ fontSize: 8, color: '#374151' }}>+{((m.extMarkets ?? []).reduce((s,g) => s + g.markets.length, 0))} odds</span>
        <span style={{ marginLeft: 2, fontSize: 9, color: '#374151' }}>›</span>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BET SLIP MODAL
══════════════════════════════════════════════════════════ */
interface BetSlipProps {
  item: BetSlipItem;
  usdtBalance: number;
  onPlace: (amount: number) => void;
  onCancel: () => void;
}
function BetSlipModal({ item, usdtBalance, onPlace, onCancel }: BetSlipProps) {
  const [amount, setAmount] = useState('');
  const num = parseFloat(amount) || 0;
  const potential = num > 0 ? fmt(num * item.odds) : '—';
  const notEnough = num > usdtBalance;

  const presets = [5, 10, 25, 50, 100].filter(v => v <= usdtBalance + 0.01);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onCancel}>
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(180deg,#1C2128,#161B22)',
          borderRadius: '16px 16px 0 0',
          border: '1px solid #2B3139',
          padding: '20px 16px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 20, background: '#3b82f6', borderRadius: 2 }} />
            <span style={{ fontSize: 15, color: '#fff', fontWeight: 800 }}>Bet Slip</span>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#848E9C', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Match info */}
        <div style={{ background: '#0B0E11', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: '#848E9C', marginBottom: 3 }}>{item.league}</p>
          <p style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>
            {item.homeTeam} — {item.awayTeam}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {betLabel(item.betType, item.homeTeam, item.awayTeam, item.ouLine)}
            </span>
            <span style={{ fontSize: 16, color: '#F0B90B', fontWeight: 900 }}>× {item.odds}</span>
          </div>
        </div>

        {/* Balance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#848E9C' }}>Available Balance</span>
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>{fmt(usdtBalance)} USDT</span>
        </div>

        {/* Preset amounts */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {presets.map(v => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 6,
                background: num === v ? '#1d4ed8' : '#1C2128',
                border: `1px solid ${num === v ? '#3b82f6' : '#2B3139'}`,
                color: num === v ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >{v}</button>
          ))}
          <button
            onClick={() => setAmount(usdtBalance.toFixed(2))}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 6,
              background: '#1C2128', border: '1px solid #2B3139',
              color: '#F0B90B', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >MAX</button>
        </div>

        {/* Amount input */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount (USDT)"
            min={0.5}
            step={0.5}
            style={{
              width: '100%', padding: '10px 48px 10px 12px',
              background: '#0B0E11', border: `1.5px solid ${notEnough ? '#ef4444' : '#2B3139'}`,
              borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700,
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: '#848E9C', fontWeight: 700,
          }}>USDT</span>
        </div>

        {notEnough && (
          <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>Insufficient USDT balance</p>
        )}

        {/* Potential win */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#0B0E11', borderRadius: 8, padding: '8px 12px', marginBottom: 14,
        }}>
          <span style={{ fontSize: 12, color: '#848E9C' }}>Potential Win</span>
          <span style={{ fontSize: 16, color: '#4ade80', fontWeight: 900 }}>{potential} USDT</span>
        </div>

        {/* Place button */}
        <button
          disabled={num < 0.5 || notEnough}
          onClick={() => onPlace(num)}
          style={{
            width: '100%', padding: '13px 0',
            background: num >= 0.5 && !notEnough
              ? 'linear-gradient(135deg,#F0B90B,#f8c431)'
              : '#1C2128',
            border: 'none', borderRadius: 10, cursor: num >= 0.5 && !notEnough ? 'pointer' : 'not-allowed',
            color: num >= 0.5 && !notEnough ? '#0B0E11' : '#4B5563',
            fontSize: 15, fontWeight: 900,
            transition: 'all 0.2s',
          }}
        >
          {num >= 0.5 && !notEnough ? `Place Bet · ${num} USDT` : 'Enter Amount'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FOOTBALL PITCH LIVE VISUALIZATION (Mackolik-style)
══════════════════════════════════════════════════════════ */
const PITCH_EVENTS: Record<
  NonNullable<LiveMatch['pitchEvent']>['type'],
  { label: string; color: string; icon: string }
> = {
  attack:           { label: 'Attack',           color: '#f97316', icon: '→' },
  dangerous_attack: { label: 'Dangerous Attack', color: '#ef4444', icon: '⚡' },
  ball_play:        { label: 'Ball Play',         color: '#22c55e', icon: '⚽' },
  throw_in:         { label: 'Throw-in',          color: '#6b7280', icon: '↑' },
  corner:           { label: 'Corner',            color: '#eab308', icon: '↗' },
  shot:             { label: 'Shot',              color: '#dc2626', icon: '🎯' },
  save:             { label: 'Save',              color: '#3b82f6', icon: '🧤' },
  foul:             { label: 'Foul',              color: '#8b5cf6', icon: '⛔' },
  offside:          { label: 'Offside',           color: '#f59e0b', icon: '🚩' },
};

function FootballPitchViz({ match }: { match: LiveMatch }) {
  const ev   = match.pitchEvent;
  const meta = ev ? PITCH_EVENTS[ev.type] : null;
  const ak   = ev?.ts ?? 0;          // animation key — changes on each new event
  const isHome   = ev?.team === 'home';
  const homeName = match.tmpl.homeTeam.name;
  const awayName = match.tmpl.awayTeam.name;

  const W = 380, H = 220;
  const cx = W / 2, cy = H / 2;

  const arrowX1 = isHome ? cx - 80 : cx + 80;
  const arrowX2 = isHome ? cx + 40 : cx - 40;

  const hasBall  = ev?.type === 'ball_play';
  const hasArrow = ev && !['ball_play', 'save', 'foul', 'offside'].includes(ev.type);
  const hasDot   = ev && ['throw_in','corner','foul','offside','save'].includes(ev.type);
  const sideX    = isHome ? cx - 24 : cx + 24;
  const labelX   = isHome ? cx - 60 : cx + 60;
  const boxX     = isHome ? cx - 112 : cx + 12;

  return (
    <div style={{ width: '100%', borderRadius: 10, overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%' }}>
        <defs>
          <linearGradient id="pvGrass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#145a2e"/>
            <stop offset="50%"  stopColor="#166534"/>
            <stop offset="100%" stopColor="#145a2e"/>
          </linearGradient>
          <filter id="pvGlow">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <marker id={`pvArrow-${ak}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill={meta?.color ?? '#f97316'}/>
          </marker>
        </defs>

        {/* Grass */}
        <rect x="0" y="0" width={W} height={H} fill="url(#pvGrass)"/>
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={i*(W/6)} y="0" width={W/12} height={H} fill="rgba(0,0,0,0.05)"/>
        ))}

        {/* Lines */}
        <rect x="12" y="12" width={W-24} height={H-24} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"/>
        <line x1={cx} y1="12" x2={cx} y2={H-12} stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r="28" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r="2.5" fill="white"/>

        {/* Home penalty + goal */}
        <rect x="12" y={cy-30} width="42" height="60" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>
        <rect x="12" y={cy-16} width="16" height="32" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>
        <rect x="4"  y={cy-11} width="8"  height="22" fill="none" stroke="rgba(255,255,255,0.4)"  strokeWidth="1.2"/>

        {/* Away penalty + goal */}
        <rect x={W-54} y={cy-30} width="42" height="60" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>
        <rect x={W-28} y={cy-16} width="16" height="32" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>
        <rect x={W-12} y={cy-11} width="8"  height="22" fill="none" stroke="rgba(255,255,255,0.4)"  strokeWidth="1.2"/>

        {/* Corner arcs */}
        {[[12,12],[W-12,12],[12,H-12],[W-12,H-12]].map(([px,py],i) => {
          const sx = Math.sign(px - cx) * 6;
          const sy = Math.sign(py - cy) * 6;
          return <path key={i} d={`M ${px+sx} ${py} A 6 6 0 0 ${px<cx?1:0} ${px} ${py+sy}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"/>;
        })}

        {/* Flash overlay — re-mounts when ts changes */}
        {meta && <rect key={`pf-${ak}`} className="pv-flash" x="0" y="0" width={W} height={H} fill={meta.color}/>}

        {/* Arrow */}
        {hasArrow && meta && (
          <line
            key={`pa-${ak}`}
            className="pv-arrow"
            x1={arrowX1} y1={cy}
            x2={arrowX2} y2={cy}
            stroke={meta.color}
            strokeWidth="5.5"
            strokeLinecap="round"
            markerEnd={`url(#pvArrow-${ak})`}
            filter="url(#pvGlow)"
          />
        )}

        {/* Ball circle (ball_play) */}
        {hasBall && meta && (
          <g key={`pb-${ak}`} className="pv-ball">
            <circle cx={sideX} cy={cy} r="14" fill={meta.color} opacity="0.4"/>
            <text x={sideX} y={cy+5} textAnchor="middle" fontSize="14">⚽</text>
          </g>
        )}

        {/* Dot (throw_in / corner / etc) */}
        {hasDot && meta && (
          <g key={`pd-${ak}`} className="pv-ball">
            <circle cx={sideX} cy={cy} r="11" fill={meta.color} opacity="0.45"/>
            <text x={sideX} y={cy+5} textAnchor="middle" fontSize="12">{meta.icon}</text>
          </g>
        )}

        {/* Label box — slides in from team's side */}
        {meta && ev && (
          <g key={`pl-${ak}`} className={`${isHome ? 'pv-slide-l' : 'pv-slide-r'} pv-pulse`}>
            <rect x={boxX} y={cy-33} width="100" height="42" rx="6" fill={meta.color} opacity="0.93"/>
            <text x={labelX} y={cy-14} textAnchor="middle" fontSize="11" fontWeight="800" fill="white">
              {meta.icon} {meta.label}
            </text>
            <text x={labelX} y={cy+4} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.9)">
              {ev.team === 'home' ? homeName : awayName}
            </text>
          </g>
        )}
      </svg>

      {/* Score bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)', padding: '4px 14px',
      }}>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{homeName.slice(0,3).toUpperCase()}</span>
        <span style={{ color: '#facc15', fontSize: 12, fontWeight: 800 }}>{match.homeScore} – {match.awayScore}</span>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{awayName.slice(0,3).toUpperCase()}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MATCH SIMULATION MODAL — Binance-style live center
══════════════════════════════════════════════════════════ */
function AttackChart({ homeAttack, awayAttack, homeColor, awayColor, goalEvents }: {
  homeAttack: number[];
  awayAttack: number[];
  homeColor: string;
  awayColor: string;
  goalEvents: GoalEvent[];
}) {
  const W = 340, H = 90;
  const n = Math.max(homeAttack.length, awayAttack.length, 1);
  const xScale = (i: number) => (i / Math.max(n - 1, 1)) * W;
  const yScale = (v: number, flip?: boolean) => {
    const pct = v / 100;
    return flip ? H * 0.5 * pct : H * 0.5 - H * 0.5 * pct;
  };

  const buildPath = (vals: number[], flip?: boolean): string => {
    if (vals.length === 0) return '';
    const pts = vals.map((v, i) => `${xScale(i).toFixed(1)},${(flip ? H * 0.5 + yScale(v, true) : yScale(v)).toFixed(1)}`);
    return `M${pts[0]} L${pts.slice(1).join(' L')}`;
  };

  const buildArea = (vals: number[], flip?: boolean): string => {
    if (vals.length === 0) return '';
    const baseline = flip ? 0 : H * 0.5;
    const pts = vals.map((v, i) => `${xScale(i).toFixed(1)},${(flip ? H * 0.5 + yScale(v, true) : yScale(v)).toFixed(1)}`);
    return `M${xScale(0).toFixed(1)},${baseline.toFixed(1)} L${pts.join(' L')} L${xScale(vals.length - 1).toFixed(1)},${baseline.toFixed(1)} Z`;
  };

  const homeColor2 = homeColor.length === 7 ? homeColor : '#3b82f6';
  const awayColor2 = awayColor.length === 7 ? awayColor : '#ef4444';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="hAtk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={homeColor2} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={homeColor2} stopOpacity="0.04"/>
        </linearGradient>
        <linearGradient id="aAtk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={awayColor2} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={awayColor2} stopOpacity="0.04"/>
        </linearGradient>
      </defs>
      {/* Center divider */}
      <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      {/* Home (top area) */}
      {homeAttack.length > 1 && (
        <>
          <path d={buildArea(homeAttack)} fill="url(#hAtk)"/>
          <path d={buildPath(homeAttack)} fill="none" stroke={homeColor2} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </>
      )}
      {/* Away (bottom area, flipped) */}
      {awayAttack.length > 1 && (
        <>
          <path d={buildArea(awayAttack, true)} fill="url(#aAtk)"/>
          <path d={buildPath(awayAttack.map(v => v), true)} fill="none" stroke={awayColor2} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </>
      )}
      {/* Goal markers */}
      {goalEvents.map((ev, i) => {
        const total = Math.max(homeAttack.length, 1);
        const x = Math.min(W - 2, (ev.minute / 90) * W);
        const isHome = ev.side === 'home';
        return (
          <g key={i}>
            <line x1={x} y1={0} x2={x} y2={H} stroke={isHome ? homeColor2 : awayColor2} strokeWidth="1" strokeDasharray="3,2" opacity="0.7"/>
            <circle cx={x} cy={isHome ? H * 0.12 : H * 0.88} r="4" fill={isHome ? homeColor2 : awayColor2} opacity="0.9"/>
            <text x={x} y={isHome ? H * 0.12 - 7 : H * 0.88 + 13} textAnchor="middle" fontSize="7.5" fill={isHome ? homeColor2 : awayColor2} fontWeight="800">⚽</text>
          </g>
        );
      })}
    </svg>
  );
}

function StatBar({ label, homeVal, awayVal, homeColor, awayColor }: {
  label: string; homeVal: number; awayVal: number; homeColor: string; awayColor: string;
}) {
  const total = homeVal + awayVal || 1;
  const homePct = (homeVal / total) * 100;
  const awayPct = (awayVal / total) * 100;
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 800 }}>{homeVal}</span>
        <span style={{ fontSize: 9.5, color: '#6b7280', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 800 }}>{awayVal}</span>
      </div>
      <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
        <div style={{ width: `${homePct}%`, background: homeColor.length === 7 ? homeColor : '#3b82f6', borderRadius: '3px 0 0 3px', transition: 'width 0.5s' }}/>
        <div style={{ width: `${awayPct}%`, background: awayColor.length === 7 ? awayColor : '#ef4444', borderRadius: '0 3px 3px 0', transition: 'width 0.5s' }}/>
      </div>
    </div>
  );
}

function MatchSimModal({ m, onClose, onSelectBet, placedBets }: {
  m: LiveMatch;
  onClose: () => void;
  onSelectBet: (matchId: string, type: BetType, odds: number) => void;
  placedBets: PlacedBet[];
}) {
  const lg = getLeague(m.tmpl.leagueId);
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const isFlash = !!(m.goalFlash && Date.now() - m.flashTs < 3500);
  const clockStr = displayMinute(m);
  const homeWin = m.homeScore > m.awayScore;
  const awayWin = m.awayScore > m.homeScore;
  const [activeGroup, setActiveGroup] = useState(0);
  const group = m.extMarkets?.[Math.min(activeGroup, (m.extMarkets?.length ?? 1) - 1)];

  const poss = m.matchStats?.possession ?? 50;
  const st = m.matchStats ?? { shotsH: 0, shotsA: 0, cornersH: 0, cornersA: 0, possession: 50 };
  const ln = m.totalOdds.line;
  const activeBet = placedBets.find(b => b.matchId === m.id && b.status === 'open');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 10000,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 520, margin: '0 auto',
          background: '#0B0E11', minHeight: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px',
          background: 'linear-gradient(90deg,#0B0E11,#131920)',
          borderBottom: '1px solid #1C2128',
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#848E9C' }}>{lg?.flag} {lg?.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(239,68,68,0.14)', borderRadius: 5, padding: '3px 8px',
              border: '1px solid rgba(239,68,68,0.28)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse"/>
              <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 900 }}>
                {m.phase === 'ht_break' ? 'HT' : 'LIVE'}
              </span>
              <span style={{ fontSize: 13, color: '#f87171', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                {clockStr}{m.phase !== 'ht_break' ? "'" : ''}
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#848E9C', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* ── Score hero ── */}
        <div style={{
          padding: '20px 16px 14px',
          background: isFlash
            ? 'linear-gradient(180deg,rgba(5,46,22,0.6),#0B0E11)'
            : 'linear-gradient(180deg,#131920,#0B0E11)',
          borderBottom: '1px solid #1C2128',
          transition: 'background 0.5s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* Home */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
              <TeamShield abbr={ht.abbr} color={ht.color} size={52} logoUrl={ht.logoUrl} name={ht.name}/>
              <span style={{ fontSize: 12, color: homeWin ? '#e2e8f0' : '#6b7280', fontWeight: homeWin ? 800 : 600, textAlign: 'center', maxWidth: 90 }}>{ht.name}</span>
            </div>
            {/* Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 46, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  color: isFlash && m.goalFlash === 'home' ? '#4ade80' : homeWin ? '#F0B90B' : '#e2e8f0',
                  transition: 'color 0.35s',
                }}>{m.homeScore}</span>
                <span style={{ fontSize: 20, color: '#374151', fontWeight: 900 }}>:</span>
                <span style={{
                  fontSize: 46, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  color: isFlash && m.goalFlash === 'away' ? '#4ade80' : awayWin ? '#F0B90B' : '#e2e8f0',
                  transition: 'color 0.35s',
                }}>{m.awayScore}</span>
              </div>
              {m.halfTimeScore && m.phase === 'second_half' && (
                <span style={{ fontSize: 9, color: '#4b5563' }}>
                  HT {m.halfTimeScore.h}–{m.halfTimeScore.a}
                </span>
              )}
            </div>
            {/* Away */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
              <TeamShield abbr={at.abbr} color={at.color} size={52} logoUrl={at.logoUrl} name={at.name}/>
              <span style={{ fontSize: 12, color: awayWin ? '#e2e8f0' : '#6b7280', fontWeight: awayWin ? 800 : 600, textAlign: 'center', maxWidth: 90 }}>{at.name}</span>
            </div>
          </div>
          {/* Goal flash banner */}
          {isFlash && m.goalFlash && (
            <div style={{
              marginTop: 12, padding: '7px 12px',
              background: 'linear-gradient(90deg,rgba(5,46,22,0.9),rgba(20,83,45,0.95),rgba(5,46,22,0.9))',
              borderRadius: 8, border: '1px solid rgba(34,197,94,0.35)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 18 }}>⚽</span>
              <div>
                <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 900 }}>GOAL! </span>
                <span style={{ fontSize: 12, color: '#86efac', fontWeight: 700 }}>{m.goalFlash === 'home' ? ht.name : at.name}</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6ee7b7' }}>{m.homeScore}–{m.awayScore}</span>
            </div>
          )}
        </div>

        {/* ── Quick bet row ── */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid #1C2128', background: '#0D1117' }}>
          {[
            { label: 'W1', val: m.odds.w1, type: 'W1' as BetType },
            { label: 'X',  val: m.odds.x,  type: 'X'  as BetType },
            { label: 'W2', val: m.odds.w2, type: 'W2' as BetType },
            { label: `O ${ln}`, val: m.totalOdds.over,  type: 'OVER'  as BetType },
            { label: `U ${ln}`, val: m.totalOdds.under, type: 'UNDER' as BetType },
          ].map(o => (
            <button key={o.type}
              onClick={() => onSelectBet(m.id, o.type, o.val)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                background: '#1C2128', border: '1px solid #2B3139', borderRadius: 6,
                padding: '5px 2px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 8.5, color: '#848E9C', fontWeight: 600 }}>{o.label}</span>
              <span style={{ fontSize: 13, color: '#F0B90B', fontWeight: 900 }}>{o.val}</span>
            </button>
          ))}
        </div>

        {/* ── Attack chart ── */}
        <div style={{ padding: '12px 14px 4px', borderBottom: '1px solid #1C2128' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 9.5, color: '#848E9C', fontWeight: 700, letterSpacing: '0.05em' }}>MATCH INTENSITY</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 10, height: 3, borderRadius: 2, background: ht.color.length === 7 ? ht.color : '#3b82f6' }}/>
                <span style={{ fontSize: 8.5, color: '#848E9C' }}>{ht.abbr}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 10, height: 3, borderRadius: 2, background: at.color.length === 7 ? at.color : '#ef4444' }}/>
                <span style={{ fontSize: 8.5, color: '#848E9C' }}>{at.abbr}</span>
              </div>
            </div>
          </div>
          {/* Live pitch visualization */}
          <div style={{ marginBottom: 10 }}>
            <FootballPitchViz match={m} />
          </div>

          <div style={{ background: '#060A0D', borderRadius: 8, padding: '8px 6px' }}>
            <AttackChart
              homeAttack={m.homeAttack ?? []}
              awayAttack={m.awayAttack ?? []}
              homeColor={ht.color}
              awayColor={at.color}
              goalEvents={m.goalEvents ?? []}
            />
          </div>
          {/* Minute axis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            {['1', '15', '30', '45', '60', '75', '90'].map(t => (
              <span key={t} style={{ fontSize: 7.5, color: '#374151' }}>{t}'</span>
            ))}
          </div>
        </div>

        {/* ── Possession bar ── */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1C2128' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 800 }}>{poss}%</span>
            <span style={{ fontSize: 9.5, color: '#6b7280', fontWeight: 600 }}>Possession</span>
            <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 800 }}>{100 - poss}%</span>
          </div>
          <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
            <div style={{ width: `${poss}%`, background: ht.color.length === 7 ? ht.color : '#3b82f6', transition: 'width 0.5s' }}/>
            <div style={{ width: `${100 - poss}%`, background: at.color.length === 7 ? at.color : '#ef4444', transition: 'width 0.5s' }}/>
          </div>
          <div style={{ marginTop: 10 }}>
            <StatBar label="Shots" homeVal={st.shotsH} awayVal={st.shotsA} homeColor={ht.color} awayColor={at.color}/>
            <StatBar label="Corners" homeVal={st.cornersH} awayVal={st.cornersA} homeColor={ht.color} awayColor={at.color}/>
          </div>
        </div>

        {/* ── Goal events ── */}
        {m.goalEvents && m.goalEvents.length > 0 && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #1C2128', background: '#060A0D' }}>
            <span style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, letterSpacing: '0.05em' }}>GOALS</span>
            <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {m.goalEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#374151', fontWeight: 700, width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{ev.minute}'</span>
                  <span style={{ fontSize: 11 }}>⚽</span>
                  <span style={{ fontSize: 11, color: ev.side === 'home' ? (ht.color.length === 7 ? ht.color : '#60a5fa') : (at.color.length === 7 ? at.color : '#f87171'), fontWeight: 700 }}>
                    {ev.side === 'home' ? ht.name : at.name}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#374151' }}>({ev.score})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active bet badge ── */}
        {activeBet && (
          <div style={{
            margin: '8px 12px 0', padding: '8px 12px', borderRadius: 8,
            background: 'linear-gradient(90deg,rgba(59,130,246,0.14),rgba(37,99,235,0.22))',
            border: '1px solid rgba(59,130,246,0.28)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 13 }}>🎟️</span>
            <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700 }}>Active Bet</span>
            <span style={{ fontSize: 11, color: '#60a5fa' }}>
              {activeBet.betType === 'W1' ? `1 – ${activeBet.homeTeam}` :
               activeBet.betType === 'W2' ? `2 – ${activeBet.awayTeam}` :
               activeBet.betType === 'X' ? 'Draw' :
               activeBet.betType === 'OVER' ? `Over ${ln}` :
               activeBet.betType === 'UNDER' ? `Under ${ln}` :
               activeBet.betType}
            </span>
            <span style={{ marginLeft: 'auto', color: '#fbbf24', fontWeight: 900, fontSize: 13 }}>×{activeBet.odds}</span>
          </div>
        )}

        {/* ── Extended markets ── */}
        <div style={{ padding: '10px 0 0' }}>
          <div style={{ padding: '0 12px 6px' }}>
            <span style={{ fontSize: 9.5, color: '#848E9C', fontWeight: 700, letterSpacing: '0.05em' }}>ALL MARKETS</span>
          </div>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid #1C2128', scrollbarWidth: 'none' }}>
            {(m.extMarkets ?? []).map((g, i) => (
              <button key={i} onClick={() => setActiveGroup(i)} style={{
                flexShrink: 0, padding: '7px 11px', whiteSpace: 'nowrap', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: activeGroup === i ? '#F0B90B' : '#6B7280',
                borderBottom: activeGroup === i ? '2px solid #F0B90B' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>{g.title}</button>
            ))}
          </div>
          {/* Markets grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, padding: '10px 10px 24px' }}>
            {group?.markets.map(mkt => (
              <button key={mkt.key}
                onClick={() => onSelectBet(m.id, mkt.key, mkt.odd)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  background: '#131920', border: '1px solid #1C2128', borderRadius: 7,
                  padding: '7px 4px', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 9.5, color: '#848E9C', lineHeight: 1.2, textAlign: 'center' }}>{mkt.label}</span>
                <span style={{ fontSize: 14, color: '#F0B90B', fontWeight: 900 }}>{mkt.odd}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MY BETS PANEL
══════════════════════════════════════════════════════════ */
function MyBets({ bets, matches }: { bets: PlacedBet[]; matches: LiveMatch[] }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'won' | 'lost'>('all');

  const totalStaked = bets.reduce((s, b) => s + b.amount, 0);
  const totalWon    = bets.filter(b => b.status === 'won').reduce((s, b) => s + b.potentialWin, 0);
  const totalLost   = bets.filter(b => b.status === 'lost').reduce((s, b) => s + b.amount, 0);
  const netPnl      = totalWon - totalLost;
  const wonCount    = bets.filter(b => b.status === 'won').length;
  const lostCount   = bets.filter(b => b.status === 'lost').length;
  const openCount   = bets.filter(b => b.status === 'open').length;

  const filtered = bets.slice().reverse().filter(b =>
    filter === 'all' ? true : b.status === filter
  );

  const FILTERS: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all',  label: 'All',  count: bets.length },
    { key: 'open', label: 'Open', count: openCount   },
    { key: 'won',  label: 'Won',  count: wonCount    },
    { key: 'lost', label: 'Lost', count: lostCount   },
  ];

  const FILTER_COLOR: Record<string, string> = {
    all: '#F0B90B', open: '#3B82F6', won: '#0ECB81', lost: '#F6465D',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#0B0E11', minHeight: '100%' }}>

      {/* ═══ PnL SUMMARY ═══ */}
      {bets.length > 0 && (
        <div style={{ padding: '12px 14px 0' }}>
          <div style={{
            background: '#161A1E',
            border: '1px solid #2B3139',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid #2B3139',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#848E9C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total P&amp;L</span>
              <span style={{
                fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em',
                color: netPnl >= 0 ? '#0ECB81' : '#F6465D',
              }}>
                {netPnl >= 0 ? '+' : '-'}{fmt(Math.abs(netPnl))}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#848E9C', marginLeft: 4 }}>USDT</span>
              </span>
            </div>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              {[
                { label: 'Staked', val: fmt(totalStaked),            color: '#C7CACD' },
                { label: 'Won',    val: `+${fmt(totalWon)}`,        color: '#0ECB81' },
                { label: 'Lost',   val: `-${fmt(totalLost)}`,       color: '#F6465D' },
              ].map(({ label, val, color }, i) => (
                <div key={label} style={{
                  padding: '8px 0', textAlign: 'center',
                  borderRight: i < 2 ? '1px solid #2B3139' : 'none',
                }}>
                  <div style={{ fontSize: 9, color: '#848E9C', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: 12, color, fontWeight: 800 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ FILTER TABS ═══ */}
      <div style={{ display: 'flex', padding: '10px 14px 6px', gap: 8 }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          const col = FILTER_COLOR[f.key];
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 8,
              border: active ? `1px solid ${col}` : '1px solid #2B3139',
              background: active ? `${col}15` : '#161A1E',
              color: active ? col : '#5E6673',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span>{f.label}</span>
              {f.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 900,
                  color: active ? col : '#848E9C',
                }}>{f.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ EMPTY STATE ═══ */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>🎟️</div>
          <p style={{ fontSize: 14, color: '#4B5563', fontWeight: 600 }}>
            {bets.length === 0 ? 'No bets placed yet' : 'No bets in this category'}
          </p>
        </div>
      )}

      {/* ═══ BET CARDS ═══ */}
      <div style={{ padding: '2px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(bet => {
          const isWon  = bet.status === 'won';
          const isLost = bet.status === 'lost';
          const isOpen = bet.status === 'open';

          /* Find current match minute for open bets */
          const liveMatch = isOpen ? matches.find(m => m.id === bet.matchId) : undefined;
          const liveMinute = liveMatch ? liveMatch.minute : null;
          const liveHalf   = liveMatch ? liveMatch.half : null;

          /* ── per-status config ── */
          const cfg = isWon
            ? {
                headerBg:    '#0ECB81',
                headerText:  '#fff',
                icon:        '✓',
                label:       'WON',
                pnlColor:    '#fff',
                pnl:         `+${fmt(bet.potentialWin)} USDT`,
                cardBorder:  '#0ECB8140',
                cardBg:      '#0B0E11',
                returnLabel: 'PROFIT',
                returnVal:   `+${fmt(bet.potentialWin)}`,
                returnColor: '#0ECB81',
              }
            : isLost
            ? {
                headerBg:    '#F6465D',
                headerText:  '#fff',
                icon:        '✕',
                label:       'LOST',
                pnlColor:    '#fff',
                pnl:         `-${fmt(bet.amount)} USDT`,
                cardBorder:  '#F6465D40',
                cardBg:      '#0B0E11',
                returnLabel: 'LOSS',
                returnVal:   `-${fmt(bet.amount)}`,
                returnColor: '#F6465D',
              }
            : {
                headerBg:    '#1E3A5F',
                headerText:  '#60a5fa',
                icon:        '●',
                label:       'LIVE',
                pnlColor:    '#60a5fa',
                pnl:         `~${fmt(bet.potentialWin)} USDT`,
                cardBorder:  '#3B82F640',
                cardBg:      '#0B0E11',
                returnLabel: 'POTENTIAL',
                returnVal:   `~${fmt(bet.potentialWin)}`,
                returnColor: '#60a5fa',
              };

          return (
            <div key={bet.id} style={{
              border: `1px solid ${cfg.cardBorder}`,
              borderRadius: 12,
              overflow: 'hidden',
              background: cfg.cardBg,
            }}>

              {/* ── STATUS HEADER STRIP ── */}
              <div style={{
                background: cfg.headerBg,
                padding: '8px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: cfg.headerText, fontWeight: 900,
                  }}>{cfg.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: cfg.headerText, letterSpacing: '0.06em' }}>
                    {cfg.label}
                  </span>
                  {isOpen && liveMinute !== null && (
                    <span style={{
                      fontSize: 13, fontWeight: 900, color: '#fff',
                      background: '#ef4444',
                      padding: '2px 8px', borderRadius: 5,
                      letterSpacing: '0.02em',
                      boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                    }}>
                      {liveMinute}'{liveHalf === 2 ? ' 2Y' : ''}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: cfg.pnlColor, letterSpacing: '-0.01em' }}>
                  {cfg.pnl}
                </span>
              </div>

              {/* ── CARD BODY ── */}
              <div style={{ padding: '10px 14px 12px' }}>

                {/* League */}
                <div style={{ fontSize: 10, color: '#848E9C', fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em' }}>
                  {bet.league}
                  {bet.result && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, color: '#C7CACD',
                      background: '#1E2026', padding: '1px 7px', borderRadius: 4, border: '1px solid #2B3139',
                    }}>Final {bet.result}</span>
                  )}
                </div>

                {/* Teams with logos */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center', gap: 8, marginBottom: 12,
                }}>
                  {/* Home team */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo name={bet.homeTeam} size={34} />
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 800, lineHeight: 1.2 }}>{bet.homeTeam}</span>
                  </div>

                  {/* Score / VS badge */}
                  {isOpen && liveMatch ? (
                    <span style={{
                      fontSize: 15, color: '#fff', fontWeight: 900, padding: '4px 12px',
                      background: '#1a2a1a', border: '1px solid #22c55e',
                      borderRadius: 6, textAlign: 'center', letterSpacing: '0.05em',
                      lineHeight: 1.2, whiteSpace: 'nowrap',
                    }}>
                      {liveMatch.homeScore}–{liveMatch.awayScore}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11, color: '#C7CACD', fontWeight: 800, padding: '3px 8px',
                      border: '1px solid #3B4149', borderRadius: 5, background: '#1C2128',
                    }}>VS</span>
                  )}

                  {/* Away team */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 800, textAlign: 'right', lineHeight: 1.2 }}>{bet.awayTeam}</span>
                    <TeamLogo name={bet.awayTeam} size={34} />
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#2B3139', marginBottom: 10 }} />

                {/* Bet details row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#848E9C', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selection</div>
                    <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
                      {betLabel(bet.betType, bet.homeTeam, bet.awayTeam, bet.ouLine)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#848E9C', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Odds</div>
                    <div style={{ fontSize: 12, color: '#F0B90B', fontWeight: 900 }}>× {bet.odds}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#848E9C', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stake</div>
                    <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{fmt(bet.amount)} USDT</div>
                  </div>
                </div>

                {/* Return bar */}
                <div style={{
                  marginTop: 10,
                  background: '#161A1E',
                  border: `1px solid ${cfg.cardBorder}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 10, color: '#C7CACD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {cfg.returnLabel}
                  </span>
                  <span style={{ fontSize: 16, color: cfg.returnColor, fontWeight: 900, letterSpacing: '-0.02em' }}>
                    {cfg.returnVal}
                    <span style={{ fontSize: 10, color: '#EAECEF', fontWeight: 600, marginLeft: 4 }}>USDT</span>
                  </span>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SERVER SNAPSHOT TYPES (mirrors cf-worker /api/sport/snapshot)
══════════════════════════════════════════════════════════ */
interface ServerMatch {
  id: string;
  leagueId: string;
  homeTeam: string; homeAbbr: string;
  awayTeam: string; awayAbbr: string;
  startedAt: number;
  minute: number;
  phase: 'first_half' | 'ht_break' | 'second_half' | 'ft_stoppage' | 'finished';
  status: 'live' | 'finished';
  homeScore: number; awayScore: number;
  finishedAt: number | null;
  odds: { w1: number; x: number; w2: number };
  totalOdds: { line: number; over: number; under: number };
  goalEvents: GoalEvent[];
  pinned?: boolean;
  hasAdminCtrl?: boolean;
}

function getOrBuildTeam(name: string, abbr: string, leagueId: string): Team {
  const teams = LEAGUE_TEAMS[leagueId] || [];
  const found = teams.find(t => t.name === name);
  if (found) return found;
  return { name, abbr, color: '#1a56db' };
}

/** Convert a server snapshot match into a full LiveMatch, preserving cosmetic state from prev when possible */
function mergeServerMatch(srv: ServerMatch, prev?: LiveMatch): LiveMatch {
  const home = getOrBuildTeam(srv.homeTeam, srv.homeAbbr, srv.leagueId);
  const away = getOrBuildTeam(srv.awayTeam, srv.awayAbbr, srv.leagueId);
  const tmpl: MatchTemplate = { leagueId: srv.leagueId, homeTeam: home, awayTeam: away };

  const phase: LiveMatch['phase'] =
    srv.phase === 'finished' ? 'second_half' :
    srv.phase === 'first_half' ? 'first_half' :
    srv.phase === 'ht_break' ? 'ht_break' :
    srv.phase === 'second_half' ? 'second_half' : 'ft_stoppage';

  const goalChanged = !prev || prev.homeScore !== srv.homeScore || prev.awayScore !== srv.awayScore;
  const justScored: 'home' | 'away' | null =
    !prev ? null :
    srv.homeScore > prev.homeScore ? 'home' :
    srv.awayScore > prev.awayScore ? 'away' : null;

  const odds = srv.odds;
  const prevOdds = prev?.odds;
  const oddsDir: OddsDirs | undefined = prevOdds ? {
    w1: odds.w1 > prevOdds.w1 ? 'up' : odds.w1 < prevOdds.w1 ? 'down' : 'same',
    x:  odds.x  > prevOdds.x  ? 'up' : odds.x  < prevOdds.x  ? 'down' : 'same',
    w2: odds.w2 > prevOdds.w2 ? 'up' : odds.w2 < prevOdds.w2 ? 'down' : 'same',
  } : undefined;

  const extMarkets = (prev && !goalChanged && prev.extMarkets.length > 0)
    ? prev.extMarkets
    : buildExtMarkets(srv.homeScore, srv.awayScore, odds.w1, odds.x, odds.w2);

  const adminCtrl: AdminCtrl | undefined = srv.hasAdminCtrl
    ? { pinned: !!srv.pinned, startedAt: srv.startedAt }
    : undefined;

  return {
    id: srv.id,
    tmpl,
    homeScore: srv.homeScore,
    awayScore: srv.awayScore,
    minute: srv.minute,
    half: srv.minute > 45 ? 2 : 1,
    status: srv.status,
    odds,
    prevOdds,
    oddsDir,
    totalOdds: srv.totalOdds,
    extMarkets,
    goalFlash: justScored,
    flashTs: justScored ? Date.now() : (prev?.flashTs ?? 0),
    finishedAt: srv.finishedAt,
    halfTimeScore: prev?.halfTimeScore ?? (srv.minute >= 45 ? { h: srv.homeScore, a: srv.awayScore } : undefined),
    adminCtrl,
    goalEvents: srv.goalEvents,
    phase,
    stoppageMin: srv.phase === 'ft_stoppage' ? Math.max(1, srv.minute - 89) : 0,
    stoppageHT: 0,
    stoppageFT: srv.phase === 'ft_stoppage' ? 5 : 0,
    htBreakLeft: srv.phase === 'ht_break' ? 1 : 0,
    homeAttack: prev?.homeAttack ?? [],
    awayAttack: prev?.awayAttack ?? [],
    matchStats: prev?.matchStats ?? { shotsH: 0, shotsA: 0, cornersH: 0, cornersA: 0, possession: 50 },
    pitchEvent: prev?.pitchEvent,
  };
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   DESKTOP SPORTSBOOK — Binance-web style wide layout.
   Shares ALL data + betting logic with the mobile view (same
   matches, logos, scores, odds, coupons). Desktop design only.
══════════════════════════════════════════════════════════ */
function DeskOdd({ label, value, trend, active, onClick }: {
  label: string; value: number; trend?: OddsDir; active?: boolean; onClick: () => void;
}) {
  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '';
  const arrowColor = trend === 'up' ? '#0ECB81' : '#F6465D';
  return (
    <button
      onClick={onClick}
      className="odds-btn"
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2, padding: '9px 4px', borderRadius: 8, minWidth: 0,
        background: active ? 'rgba(240,185,11,0.14)' : '#11161d',
        border: `1px solid ${active ? '#F0B90B' : '#1f2630'}`,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 9.5, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 14, color: active ? '#F0B90B' : '#EAECEF', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(2)}
        {arrow && <span style={{ fontSize: 8, marginLeft: 3, color: arrowColor }}>{arrow}</span>}
      </span>
    </button>
  );
}

const DESK_GRID = '72px minmax(220px,1fr) 232px 232px 132px';

function DeskMatchRow({ m, activeBetMatchId, onSelectBet, onOpenSim, placedBets }: {
  m: LiveMatch;
  activeBetMatchId: string | null;
  onSelectBet: (matchId: string, type: BetType, odds: number) => void;
  onOpenSim: (id: string) => void;
  placedBets: PlacedBet[];
}) {
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const now = Date.now();
  const isGoalFlash = !!(m.goalFlash && now - m.flashTs < 3500);
  const isHT = m.phase === 'ht_break';
  const clockStr = displayMinute(m);
  const halfLabel = isHT ? 'HT' : m.half === 1 ? '1st' : '2nd';
  const sel = activeBetMatchId === m.id;
  const homeWin = m.homeScore > m.awayScore;
  const awayWin = m.awayScore > m.homeScore;
  const od = m.oddsDir;
  const ln = m.totalOdds.line;
  const marketCount = (m.extMarkets ?? []).reduce((s, g) => s + g.markets.length, 0);
  const activeBet = placedBets.find(b => b.matchId === m.id && b.status === 'open');

  return (
    <div
      className={isGoalFlash ? 'goal-ring' : ''}
      style={{
        display: 'grid',
        gridTemplateColumns: DESK_GRID,
        alignItems: 'center',
        borderBottom: '1px solid #161B22',
        borderLeft: `3px solid ${activeBet ? '#F0B90B' : isGoalFlash ? '#0ECB81' : 'transparent'}`,
        background: sel ? 'rgba(240,185,11,0.05)' : isGoalFlash ? 'rgba(14,203,129,0.05)' : 'transparent',
        transition: 'background 0.3s',
      }}
    >
      {/* Time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '10px 0', borderRight: '1px solid #161B22' }}>
        {m.adminCtrl?.pinned && <span style={{ fontSize: 8, lineHeight: 1 }}>📌</span>}
        <span style={{ fontSize: isHT ? 10 : 12, color: isHT ? '#F0B90B' : '#F6465D', fontWeight: 900, lineHeight: 1 }}>
          {isHT ? 'HT' : `${clockStr}'`}
        </span>
        {!isHT && <span style={{ fontSize: 8, color: '#4b5563', fontWeight: 700 }}>{halfLabel}</span>}
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '8px 14px', borderRight: '1px solid #161B22', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 22px', alignItems: 'center', gap: 8 }}>
          <TeamShield abbr={ht.abbr} color={ht.color} size={26} logoUrl={ht.logoUrl} name={ht.name} />
          <span style={{ fontSize: 13, fontWeight: homeWin ? 800 : 600, color: isGoalFlash && m.goalFlash === 'home' ? '#4ade80' : homeWin ? '#EAECEF' : '#aeb6c2', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ht.name}</span>
          <span style={{ fontSize: 15, fontWeight: 900, textAlign: 'center', color: isGoalFlash && m.goalFlash === 'home' ? '#4ade80' : '#F0B90B' }}>{m.homeScore}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 22px', alignItems: 'center', gap: 8 }}>
          <TeamShield abbr={at.abbr} color={at.color} size={26} logoUrl={at.logoUrl} name={at.name} />
          <span style={{ fontSize: 13, fontWeight: awayWin ? 800 : 600, color: isGoalFlash && m.goalFlash === 'away' ? '#4ade80' : awayWin ? '#EAECEF' : '#aeb6c2', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{at.name}</span>
          <span style={{ fontSize: 15, fontWeight: 900, textAlign: 'center', color: isGoalFlash && m.goalFlash === 'away' ? '#4ade80' : '#F0B90B' }}>{m.awayScore}</span>
        </div>
      </div>

      {/* 1X2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRight: '1px solid #161B22' }}>
        <DeskOdd label="1" value={m.odds.w1} trend={od?.w1} active={sel} onClick={() => onSelectBet(m.id, 'W1', m.odds.w1)} />
        <DeskOdd label="X" value={m.odds.x}  trend={od?.x}  onClick={() => onSelectBet(m.id, 'X',  m.odds.x)} />
        <DeskOdd label="2" value={m.odds.w2} trend={od?.w2} onClick={() => onSelectBet(m.id, 'W2', m.odds.w2)} />
      </div>

      {/* Total O/U */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRight: '1px solid #161B22' }}>
        <DeskOdd label={`Under ${ln}`} value={m.totalOdds.under} onClick={() => onSelectBet(m.id, 'UNDER', m.totalOdds.under)} />
        <DeskOdd label={`Over ${ln}`}  value={m.totalOdds.over}  onClick={() => onSelectBet(m.id, 'OVER',  m.totalOdds.over)} />
      </div>

      {/* Markets */}
      <button
        onClick={() => onOpenSim(m.id)}
        className="odds-btn"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
      >
        <span style={{ fontSize: 12, color: '#aeb6c2', fontWeight: 700 }}>+{marketCount}</span>
        <span style={{ fontSize: 9, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Markets ›</span>
      </button>
    </div>
  );
}

function DeskBetSlip({ item, usdtBalance, onPlace, onCancel }: BetSlipProps) {
  const [amount, setAmount] = useState('');
  const num = parseFloat(amount) || 0;
  const potential = num > 0 ? fmt(num * item.odds) : '—';
  const notEnough = num > usdtBalance;
  const presets = [5, 10, 25, 50, 100].filter(v => v <= usdtBalance + 0.01);

  return (
    <div style={{ background: 'linear-gradient(180deg,#161B22,#12161B)', border: '1px solid #2B3139', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 18, background: '#F0B90B', borderRadius: 2 }} />
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 800 }}>Bet Slip</span>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#848E9C', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ background: '#0B0E11', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
        <p style={{ fontSize: 10, color: '#848E9C', marginBottom: 3 }}>{item.league}</p>
        <p style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>{item.homeTeam} — {item.awayTeam}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{betLabel(item.betType, item.homeTeam, item.awayTeam, item.ouLine)}</span>
          <span style={{ fontSize: 16, color: '#F0B90B', fontWeight: 900 }}>× {item.odds}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#848E9C' }}>Available Balance</span>
        <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>{fmt(usdtBalance)} USDT</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {presets.map(v => (
          <button key={v} onClick={() => setAmount(String(v))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: num === v ? '#a87f08' : '#1C2128', border: `1px solid ${num === v ? '#F0B90B' : '#2B3139'}`, color: num === v ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{v}</button>
        ))}
        <button onClick={() => setAmount(usdtBalance.toFixed(2))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: '#1C2128', border: '1px solid #2B3139', color: '#F0B90B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>MAX</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount (USDT)" min={0.5} step={0.5}
          style={{ width: '100%', padding: '11px 48px 11px 12px', background: '#0B0E11', border: `1.5px solid ${notEnough ? '#ef4444' : '#2B3139'}`, borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, boxSizing: 'border-box', outline: 'none' }}
        />
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#848E9C', fontWeight: 700 }}>USDT</span>
      </div>

      {notEnough && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>Insufficient USDT balance</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0E11', borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: '#848E9C' }}>Potential Win</span>
        <span style={{ fontSize: 16, color: '#4ade80', fontWeight: 900 }}>{potential} USDT</span>
      </div>

      <button
        disabled={num < 0.5 || notEnough}
        onClick={() => onPlace(num)}
        style={{ width: '100%', padding: '13px 0', background: num >= 0.5 && !notEnough ? 'linear-gradient(135deg,#F0B90B,#f8c431)' : '#1C2128', border: 'none', borderRadius: 10, cursor: num >= 0.5 && !notEnough ? 'pointer' : 'not-allowed', color: num >= 0.5 && !notEnough ? '#0B0E11' : '#4B5563', fontSize: 15, fontWeight: 900, transition: 'all 0.2s' }}
      >
        {num >= 0.5 && !notEnough ? `Place Bet · ${num} USDT` : 'Enter Amount'}
      </button>
    </div>
  );
}

interface DesktopSportsbookProps {
  live: LiveMatch[];
  finished: LiveMatch[];
  byLeague: Record<string, LiveMatch[]>;
  matches: LiveMatch[];
  placedBets: PlacedBet[];
  openBets: number;
  usdtBalance: number;
  activeBetMatchId: string | null;
  activeView: 'live' | 'bets';
  setActiveView: (v: 'live' | 'bets') => void;
  winnersFeeds: WinnerFeed[];
  betSlip: BetSlipItem | null;
  onSelectBet: (matchId: string, type: BetType, odds: number) => void;
  onOpenSim: (id: string) => void;
  onPlaceBet: (amount: number) => void;
  onCancelBet: () => void;
}

function DesktopSportsbook(p: DesktopSportsbookProps) {
  const leagues = Object.entries(p.byLeague);

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 2px 14px' }}>
        <span style={{ fontSize: 20 }}>⚽</span>
        <span style={{ fontSize: 19, color: '#EAECEF', fontWeight: 800 }}>Football</span>
        <span style={{ fontSize: 13, color: '#848E9C' }}>{p.live.length} live</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {p.usdtBalance > 0 && (
            <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>{fmt(p.usdtBalance)} USDT</span>
          )}
          <div style={{ display: 'flex', background: '#11161d', border: '1px solid #1f2630', borderRadius: 10, padding: 3 }}>
            {([['live', '🔴 Live'], ['bets', `📋 My Bets${p.openBets > 0 ? ` (${p.openBets})` : ''}`]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => p.setActiveView(id)}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: p.activeView === id ? '#F0B90B' : 'transparent', color: p.activeView === id ? '#0B0E11' : '#aeb6c2', transition: 'all 0.15s' }}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Winners ticker */}
      <WinnersTickerBar feeds={p.winnersFeeds} />

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 348px', gap: 16, marginTop: 14, alignItems: 'start' }}>
        {/* Main */}
        <div style={{ minWidth: 0 }}>
          {p.activeView === 'bets' ? (
            <div style={{ border: '1px solid #1C2128', borderRadius: 12, overflow: 'hidden', background: '#0B0E11' }}>
              <MyBets bets={p.placedBets} matches={p.matches} />
            </div>
          ) : (
            <div style={{ border: '1px solid #1C2128', borderRadius: 12, overflow: 'hidden', background: '#0B0E11' }}>
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: DESK_GRID, background: '#11161d', borderBottom: '1px solid #1C2128' }}>
                <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 9.5, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
                <div style={{ padding: '8px 14px', fontSize: 9.5, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Match</div>
                <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 9.5, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Match Result</div>
                <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 9.5, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Goals</div>
                <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 9.5, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Markets</div>
              </div>

              {p.live.length === 0 && (
                <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>⚽</div>
                  <p style={{ fontSize: 13, color: '#aeb6c2', fontWeight: 700, marginBottom: 4 }}>No live matches right now</p>
                  <p style={{ fontSize: 11, color: '#5b6673' }}>The next round kicks off shortly — odds will appear here live.</p>
                </div>
              )}

              {leagues.map(([lid, ms]) => {
                const lg = getLeague(lid);
                return (
                  <div key={lid}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: '#0d1117', borderBottom: '1px solid #161B22' }}>
                      <span style={{ fontSize: 14 }}>{lg?.flag}</span>
                      <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 700 }}>
                        {lg?.country} · <span style={{ color: '#aeb6c2' }}>{lg?.name}</span>
                      </span>
                    </div>
                    {ms.map(m => (
                      <DeskMatchRow key={m.id} m={m} activeBetMatchId={p.activeBetMatchId} onSelectBet={p.onSelectBet} onOpenSim={p.onOpenSim} placedBets={p.placedBets} />
                    ))}
                  </div>
                );
              })}

              {p.finished.length > 0 && (
                <div>
                  <div style={{ padding: '7px 14px', background: '#0d1117', borderBottom: '1px solid #161B22', borderTop: '1px solid #161B22' }}>
                    <span style={{ fontSize: 10, color: '#5b6673', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
                  </div>
                  {p.finished.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #161B22', opacity: 0.45 }}>
                      <span style={{ fontSize: 12 }}>{getLeague(m.tmpl.leagueId)?.flag}</span>
                      <span style={{ fontSize: 12.5, color: '#aeb6c2', flex: 1 }}>{m.tmpl.homeTeam.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#F0B90B' }}>{m.homeScore} – {m.awayScore}</span>
                      <span style={{ fontSize: 12.5, color: '#aeb6c2', flex: 1, textAlign: 'right' }}>{m.tmpl.awayTeam.name}</span>
                      <span style={{ fontSize: 10, color: '#5b6673', fontWeight: 700 }}>FT</span>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ textAlign: 'center', fontSize: 10, color: '#1C2128', margin: '18px 0', padding: '0 16px' }}>
                Basonce Sports · 28 African Leagues · Simulated Events · Entertainment Only
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 16 }}>
          {p.betSlip ? (
            <DeskBetSlip
              key={`${p.betSlip.matchId}_${p.betSlip.betType}`}
              item={p.betSlip}
              usdtBalance={p.usdtBalance}
              onPlace={p.onPlaceBet}
              onCancel={p.onCancelBet}
            />
          ) : (
            <div style={{ background: 'linear-gradient(180deg,#161B22,#12161B)', border: '1px solid #2B3139', borderRadius: 14, padding: 20, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'flex-start' }}>
                <div style={{ width: 4, height: 18, background: '#2B3139', borderRadius: 2 }} />
                <span style={{ fontSize: 14, color: '#aeb6c2', fontWeight: 800 }}>Bet Slip</span>
              </div>
              <div style={{ fontSize: 30, margin: '12px 0 8px' }}>🎟️</div>
              <p style={{ fontSize: 12.5, color: '#aeb6c2', fontWeight: 700, marginBottom: 4 }}>Your bet slip is empty</p>
              <p style={{ fontSize: 11, color: '#5b6673', marginBottom: p.openBets > 0 ? 14 : 0 }}>Tap any odds to start building a bet.</p>
              {p.openBets > 0 && (
                <button
                  onClick={() => p.setActiveView('bets')}
                  style={{ width: '100%', padding: '10px 0', background: '#11161d', border: '1px solid #1f2630', borderRadius: 10, color: '#F0B90B', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}
                >View {p.openBets} open bet{p.openBets > 1 ? 's' : ''} →</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GamesSection({ variant = 'mobile' }: { variant?: 'mobile' | 'desktop' } = {}) {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [betSlip, setBetSlip] = useState<BetSlipItem | null>(null);
  const [activeBetMatchId, setActiveBetMatchId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [simMatchId, setSimMatchId] = useState<string | null>(null);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>(() => {
    try {
      const raw = localStorage.getItem('sport_placed_bets');
      if (!raw) return [];
      const parsed: PlacedBet[] = JSON.parse(raw);
      // Keep only bets from last 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return parsed.filter(b => {
        const ts = parseInt(b.id.split('_')[1] || '0', 10);
        return ts > cutoff;
      });
    } catch { return []; }
  });
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [balanceId, setBalanceId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'live' | 'bets'>('live');
  const [notification, setNotification] = useState<{ msg: string; type: 'win' | 'loss' | 'info' } | null>(null);
  const [winnersFeeds, setWinnersFeeds] = useState<WinnerFeed[]>(() => {
    const descOpts = ['Match Result 1','Match Result 2','Draw','Over 2.5','Under 2.5','Asian Handicap','Double Chance','BTTS Yes','Correct Score','Half-Time 1'];
    const teamOpts = ['FC Rayon','Mtibwa Sugar','Elman FC','APR FC','Nkana FC','Singida Utd','Harare Rvr','Pamplemousses'];
    return Array.from({ length: 16 }, () => {
      const w = fakeWinner();
      return {
        name: w.name,
        amount: w.amount,
        match: `${teamOpts[ri(0, teamOpts.length-1)]} vs ${teamOpts[ri(0, teamOpts.length-1)]}`,
        betDesc: descOpts[ri(0, descOpts.length-1)],
        ts: Date.now() - ri(0, 3600000),
      };
    });
  });
  const counter = useRef(200);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Map<string, AdminCtrl>>(new Map());

  /* Smooth continuous auto-scroll — pixel-by-pixel via RAF */
  useEffect(() => {
    const el = topScrollRef.current;
    if (!el) return;
    let rafId: number;
    let paused = false;
    const speed = 0.55; // px per frame (~33px/s at 60fps)

    const tick = () => {
      if (!paused && el) {
        el.scrollLeft += speed;
        // Seamless reset: when last card exits viewport, jump back to start
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const pause  = () => { paused = true;  };
    const resume = () => { paused = false; };

    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause,  { passive: true });
    el.addEventListener('touchend',   resume, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend',   resume);
    };
  }, []);

  /* ── SERVER SNAPSHOT POLLER ──────────────────────────────────
     Single source of truth: every 3s fetch /api/sport/snapshot.
     Worker generates matches deterministically from a 2-hour epoch
     and computes scores/odds from elapsed time. ALL devices see
     identical match list, identical scores, identical odds.
     Local localStorage cache removed. */
  useEffect(() => {
    let cancelled = false;
    let prevMatchesRef: LiveMatch[] = [];

    async function fetchSnapshot() {
      try {
        const res = await fetch(`/api/sport/snapshot?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { matches: ServerMatch[] };
        if (cancelled || !Array.isArray(data.matches)) return;

        setMatches(prev => {
          const prevById = new Map(prev.map(m => [m.id, m]));
          // Keep recently-finished local matches for ~10s so settlement UI doesn't flicker
          const stillFinishing = prev.filter(m =>
            m.status === 'finished' &&
            m.finishedAt && (Date.now() - m.finishedAt < 10000) &&
            !data.matches.some(s => s.id === m.id)
          );
          const merged = data.matches.map(srv => mergeServerMatch(srv, prevById.get(srv.id)));
          // Pinned admin matches first, then other admin, then rest
          merged.sort((a, b) => {
            const aS = a.adminCtrl?.pinned ? 2 : a.adminCtrl ? 1 : 0;
            const bS = b.adminCtrl?.pinned ? 2 : b.adminCtrl ? 1 : 0;
            return bS - aS;
          });
          prevMatchesRef = [...merged, ...stillFinishing];
          return prevMatchesRef;
        });

        // Populate controlsRef for any remaining downstream consumers
        const map = new Map<string, AdminCtrl>();
        for (const m of data.matches) {
          if (m.hasAdminCtrl) {
            map.set(`${m.homeTeam}:${m.awayTeam}`, { pinned: !!m.pinned, startedAt: m.startedAt });
          }
        }
        controlsRef.current = map;

        if (!initialized.current) {
          initialized.current = true;
          // Refund any open bets whose match is no longer in server snapshot
          const liveIds = new Set(data.matches.map(m => m.id));
          const finishedIds = new Set<string>();
          try {
            const fRaw = localStorage.getItem('sport_finished_matches');
            if (fRaw) for (const id of Object.keys(JSON.parse(fRaw) as Record<string, unknown>)) finishedIds.add(id);
          } catch {}
          setPlacedBets(prev => prev.map(b => {
            if (b.status === 'open' && !liveIds.has(b.matchId) && !finishedIds.has(b.matchId)) {
              fetch(`/api/sport-bets/${b.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'refunded' }),
              }).catch(() => {});
              return { ...b, status: 'refunded' as const, result: 'Match not found' };
            }
            return b;
          }));
        }
      } catch {}
    }

    fetchSnapshot();
    const iv = setInterval(fetchSnapshot, 3000);
    window.addEventListener('admin-control-updated', fetchSnapshot);
    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener('admin-control-updated', fetchSnapshot);
    };
  }, []);

  /* Persist placedBets to localStorage whenever they change */
  useEffect(() => {
    try { localStorage.setItem('sport_placed_bets', JSON.stringify(placedBets)); } catch {}
  }, [placedBets]);

  /* Persist live match state so refreshes restore the same matches */
  useEffect(() => {
    if (matches.length === 0) return;
    try {
      localStorage.setItem('sport_matches_v3', JSON.stringify({ ts: Date.now(), matches }));
    } catch {}
  }, [matches]);

  /* Load USDT balance */
  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();
      if (data) {
        setUsdtBalance(Number(data.balance) || 0);
        setBalanceId(data.id);
      }
    }
    load();
  }, []);

  const notify = useCallback((msg: string, type: 'win' | 'loss' | 'info' = 'info') => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification({ msg, type });
    notifTimer.current = setTimeout(() => setNotification(null), 4000);
  }, []);

  /* Settlement helper */
  /* ── Early settlement: Over/Under settled mid-match when condition already decided ── */
  const earlySettleOUBets = useCallback((liveMatches: LiveMatch[]) => {
    let earlyCredit = 0;
    const earlyWins: Array<{ win: number; home: string; away: string }> = [];

    setPlacedBets(prev => {
      let changed = false;
      const updated = prev.map(bet => {
        if (bet.status !== 'open') return bet;
        const m = liveMatches.find(lm => lm.id === bet.matchId && lm.status === 'live');
        if (!m) return bet;

        const btParts = bet.betType.split('_');
        const btBase = btParts[0];
        if (btBase !== 'OVER' && btBase !== 'UNDER') return bet;

        const btLine = btParts.length > 1 && !isNaN(parseFloat(btParts[1]))
          ? parseFloat(btParts[1])
          : (bet.ouLine ?? m.totalOdds.line);

        const totalGoals = m.homeScore + m.awayScore;

        if (btBase === 'OVER' && totalGoals > btLine) {
          changed = true;
          earlyCredit += bet.potentialWin;
          earlyWins.push({ win: bet.potentialWin, home: bet.homeTeam, away: bet.awayTeam });
          fetch(`/api/sport-bets/${bet.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'won' }),
          }).catch(() => {});
          return { ...bet, status: 'won' as const, result: `${m.homeScore}–${m.awayScore}` };
        }

        if (btBase === 'UNDER' && totalGoals >= btLine) {
          changed = true;
          fetch(`/api/sport-bets/${bet.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'lost' }),
          }).catch(() => {});
          notify(`❌ Bet lost — ${bet.homeTeam} vs ${bet.awayTeam}`, 'loss');
          return { ...bet, status: 'lost' as const, result: `${m.homeScore}–${m.awayScore}` };
        }

        return bet;
      });
      return changed ? updated : prev;
    });

    // Balance update OUTSIDE updater — single batched write
    if (earlyCredit > 0) {
      earlyWins.forEach(w => notify(`🏆 You won! +${fmt(w.win)} USDT — ${w.home} vs ${w.away}`, 'win'));
      setUsdtBalance(b => {
        const newBal = b + earlyCredit;
        const upd = supabase
          .from('user_balances')
          .update({ balance: newBal, updated_at: new Date().toISOString() });
        const q = balanceId
          ? upd.eq('id', balanceId)
          : upd.eq('user_id', userId ?? '').eq('symbol', 'USDT');
        q.then(({ error }) => {
          if (error) console.warn('[earlySettle] balance update error:', error.message);
        });
        return newBal;
      });
    }
  }, [balanceId, userId, notify]);

  const settleBets = useCallback((finished: LiveMatch[]) => {
    // Persist finished match IDs so cross-session orphan check never refunds settled bets
    try {
      const fRaw = localStorage.getItem('sport_finished_matches');
      const existing: Record<string, { homeScore: number; awayScore: number; finishedAt: number }> = fRaw ? JSON.parse(fRaw) : {};
      const cutoff = Date.now() - 24 * 3600 * 1000;
      for (const id of Object.keys(existing)) {
        if (existing[id].finishedAt < cutoff) delete existing[id];
      }
      for (const f of finished) {
        existing[f.id] = { homeScore: f.homeScore, awayScore: f.awayScore, finishedAt: Date.now() };
      }
      localStorage.setItem('sport_finished_matches', JSON.stringify(existing));
    } catch {}

    // ── Determine outcomes OUTSIDE the setPlacedBets updater ──────────────
    // We read placedBets via a snapshot approach: collect outcomes then apply.
    // This avoids calling setUsdtBalance inside a setPlacedBets updater (React anti-pattern).
    let creditTotal = 0;
    const outcomes: Map<string, { status: 'won' | 'lost' | 'refunded'; result: string; credit: number }> = new Map();

    // We need to read current placedBets — use a ref-like trick via setPlacedBets's functional form
    setPlacedBets(prev => {
      const updated = prev.map(bet => {
        if (bet.status !== 'open') return bet;
        const m = finished.find(f => f.id === bet.matchId);
        if (!m) return bet;

        const finalResult = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const totalGoals = m.homeScore + m.awayScore;
        const btParts = bet.betType.split('_');
        const btBase = btParts[0];
        const btLine = btParts.length > 1 && !isNaN(parseFloat(btParts[1]))
          ? parseFloat(btParts[1])
          : (bet.ouLine ?? m.totalOdds.line);

        let status: 'won' | 'lost' | 'refunded' = 'lost';
        if (btBase === 'W1' && finalResult === 'home') status = 'won';
        else if (btBase === 'W2' && finalResult === 'away') status = 'won';
        else if (btBase === 'X' && finalResult === 'draw') status = 'won';
        else if (btBase === 'OVER' && totalGoals > btLine) status = 'won';
        else if (btBase === 'UNDER' && totalGoals < btLine) status = 'won';
        else if (['AH', 'HT', '2HT', 'HTFT', 'ES'].includes(btBase)) status = 'refunded';

        const credit = status === 'won' ? bet.potentialWin : status === 'refunded' ? bet.amount : 0;
        outcomes.set(bet.id, { status, result: `${m.homeScore}–${m.awayScore}`, credit });
        creditTotal += credit;

        fetch(`/api/sport-bets/${bet.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).catch(() => {});

        return { ...bet, status, result: `${m.homeScore}–${m.awayScore}` };
      });
      return outcomes.size > 0 ? updated : prev;
    });

    // ── Single-batch balance credit + notifications ─────────────────────
    let lastWin = 0, lastRefund = 0, lostCount = 0;
    outcomes.forEach(({ status, credit }) => {
      if (status === 'won') lastWin = credit;
      else if (status === 'refunded') lastRefund = credit;
      else lostCount++;
    });
    if (lastWin > 0) notify(`🏆 You won! +${fmt(lastWin)} USDT`, 'win');
    if (lastRefund > 0) notify(`↩️ Stake refunded: +${fmt(lastRefund)} USDT`, 'info');
    if (lostCount > 0 && lastWin === 0) notify(`❌ Bet lost`, 'loss');

    if (creditTotal > 0) {
      setUsdtBalance(b => {
        const newBal = b + creditTotal;
        const upd = supabase
          .from('user_balances')
          .update({ balance: newBal, updated_at: new Date().toISOString() });
        const q = balanceId
          ? upd.eq('id', balanceId)
          : upd.eq('user_id', userId ?? '').eq('symbol', 'USDT');
        q.then(({ error }) => {
          if (error) console.warn('[settle] Supabase balance update error:', error.message);
        });
        return newBal;
      });
    }
  }, [balanceId, userId, notify]);

  /* Cosmetic tick — every 4s. Server controls scores/minute/odds; this only
     updates visual things: pitch event animation, attack waves, possession drift.
     Also detects matches that finished server-side and triggers settlement. */
  useEffect(() => {
    let lastSeenIds = new Set<string>();
    const tick = setInterval(() => {
      const now = Date.now();
      setMatches(prev => {
        // Detect newly-finished matches for bet settlement
        const finishing: LiveMatch[] = [];
        for (const m of prev) {
          if (m.status === 'finished' && !lastSeenIds.has(m.id)) finishing.push(m);
        }
        lastSeenIds = new Set(prev.map(m => m.id));

        const next = prev.map(m => {
          if (m.status === 'finished') return m;
          // Cosmetic-only updates
          const t: 'home' | 'away' = Math.random() < 0.52 ? 'home' : 'away';
          const hAtk = ri(20, 68);
          const aAtk = ri(20, 68);
          const newHA = [...(m.homeAttack ?? []), hAtk].slice(-90);
          const newAA = [...(m.awayAttack ?? []), aAtk].slice(-90);
          const cur = m.matchStats ?? { shotsH: 0, shotsA: 0, cornersH: 0, cornersA: 0, possession: 50 };
          const newStats: MatchStats = {
            shotsH: cur.shotsH + (Math.random() < 0.18 ? 1 : 0),
            shotsA: cur.shotsA + (Math.random() < 0.18 ? 1 : 0),
            cornersH: cur.cornersH + (Math.random() < 0.10 ? 1 : 0),
            cornersA: cur.cornersA + (Math.random() < 0.10 ? 1 : 0),
            possession: Math.min(78, Math.max(22, cur.possession + (Math.random() < 0.5 ? 1 : -1))),
          };
          const evTypes: NonNullable<LiveMatch['pitchEvent']>['type'][] =
            ['ball_play','attack','dangerous_attack','throw_in','corner','foul','offside','save','shot'];
          const pe = { type: evTypes[ri(0, evTypes.length - 1)], team: t, ts: now };
          return { ...m, homeAttack: newHA, awayAttack: newAA, matchStats: newStats, pitchEvent: pe };
        });

        if (finishing.length) settleBets(finishing);
        earlySettleOUBets(next.filter(m => m.status === 'live'));
        return next;
      });
    }, 4000);
    return () => clearInterval(tick);
  }, [settleBets, earlySettleOUBets]);

  /* DISABLED legacy local match-engine block removed (replaced by server snapshot).
     Helpers like generateScheduledGoals, adminTotalOdds, recalcOdds, calcOddsDir,
     buildExtMarkets, dynamicOULine, buildMatch are still used by the snapshot
     merger and other components, so they remain defined above. */
  /* Winners feed — new entry every 15-28 seconds */
  useEffect(() => {
    const descOpts = ['Match Result 1','Match Result 2','Draw','Over 2.5','Under 2.5','Asian Handicap -1','Double Chance 1X','BTTS Yes','Correct Score 1-0','Half-Time 2','Corners O 9.5','Cards U 3.5'];
    const teamOpts = ['FC Rayon','Mtibwa Sugar','Elman FC','APR FC','Nkana FC','Singida Utd','Harare Rvr','Pamplemousses'];
    const iv = setInterval(() => {
      setWinnersFeeds(prev => {
        const w = fakeWinner();
        const next: WinnerFeed = {
          name: w.name,
          amount: w.amount,
          match: `${teamOpts[ri(0, teamOpts.length-1)]} vs ${teamOpts[ri(0, teamOpts.length-1)]}`,
          betDesc: descOpts[ri(0, descOpts.length-1)],
          ts: Date.now(),
        };
        return [next, ...prev.slice(0, 19)];
      });
    }, ri(15000, 28000));
    return () => clearInterval(iv);
  }, []);

  /* Toggle expanded match markets */
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  }, []);

  /* Open sim modal */
  const handleOpenSim = useCallback((id: string) => {
    setSimMatchId(id);
  }, []);

  /* Select bet */
  const handleSelectBet = useCallback((matchId: string, type: BetType, odds: number) => {
    const m = matches.find(x => x.id === matchId);
    if (!m) return;
    const lg = getLeague(m.tmpl.leagueId);
    setActiveBetMatchId(matchId);
    setBetSlip({
      matchId,
      betType: type,
      odds,
      homeTeam: m.tmpl.homeTeam.name,
      awayTeam: m.tmpl.awayTeam.name,
      league: lg ? `${lg.flag} ${lg.name}` : '',
      ouLine: (type === 'OVER' || type === 'UNDER') ? m.totalOdds.line : undefined,
    });
  }, [matches]);

  /* Place bet */
  const handlePlaceBet = useCallback(async (amount: number) => {
    if (!betSlip || !userId) return;
    const newBal = usdtBalance - amount;
    if (newBal < 0) return;

    // Deduct from Supabase
    setUsdtBalance(newBal);
    if (balanceId) {
      await supabase.from('user_balances').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', balanceId);
    }

    const placed: PlacedBet = {
      ...betSlip,
      id: `bet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount,
      potentialWin: +(amount * betSlip.odds).toFixed(2),
      status: 'open',
    };

    // Report bet to API server for admin exposure tracking
    fetch('/api/sport-bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: placed.id,
        userId,
        matchId: placed.matchId,
        homeTeam: placed.homeTeam,
        awayTeam: placed.awayTeam,
        betType: placed.betType,
        odds: placed.odds,
        stake: amount,
        potentialWin: placed.potentialWin,
        ouLine: placed.ouLine ?? undefined,
      }),
    }).then(async r => {
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        console.error('[sport-bets] POST hata', r.status, txt);
      }
    }).catch(e => console.error('[sport-bets] ağ hatası', e.message));

    setPlacedBets(prev => [...prev, placed]);
    setBetSlip(null);
    setActiveBetMatchId(null);
    setActiveView('bets');
    notify(`Bet placed! ${amount} USDT on ${betLabel(betSlip.betType, betSlip.homeTeam, betSlip.awayTeam, betSlip.ouLine)} @ ${betSlip.odds}`, 'info');
  }, [betSlip, userId, usdtBalance, balanceId, notify]);

  /* Group by league */
  const live = matches.filter(m => m.status === 'live');
  const finished = matches.filter(m => m.status === 'finished');
  const byLeague: Record<string, LiveMatch[]> = {};
  live.forEach(m => {
    const lid = m.tmpl.leagueId;
    if (!byLeague[lid]) byLeague[lid] = [];
    byLeague[lid].push(m);
  });

  const openBets = placedBets.filter(b => b.status === 'open').length;

  /* ── DESKTOP-ONLY Binance-style sportsbook layout (shares all logic) ── */
  if (variant === 'desktop') {
    const simMatch = simMatchId ? matches.find(x => x.id === simMatchId) : null;
    return (
      <div style={{ position: 'relative', minHeight: '60vh', paddingBottom: 40 }}>
        <style>{`
          .odds-btn:hover { background:#161d26; border-color:#2b3441; }
          input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
          input[type=number] { -moz-appearance:textfield; }
        `}</style>

        {notification && (
          <div style={{
            position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
            background: notification.type === 'win' ? '#052e16' : notification.type === 'loss' ? '#1c0808' : '#1C2128',
            border: `1px solid ${notification.type === 'win' ? '#16a34a' : notification.type === 'loss' ? '#ef4444' : '#3b82f6'}`,
            borderRadius: 10, padding: '10px 16px', zIndex: 9998, maxWidth: 360,
            color: notification.type === 'win' ? '#4ade80' : notification.type === 'loss' ? '#f87171' : '#93c5fd',
            fontSize: 12, fontWeight: 700, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {notification.msg}
          </div>
        )}

        <DesktopSportsbook
          live={live} finished={finished} byLeague={byLeague} matches={matches}
          placedBets={placedBets} openBets={openBets} usdtBalance={usdtBalance}
          activeBetMatchId={activeBetMatchId} activeView={activeView} setActiveView={setActiveView}
          winnersFeeds={winnersFeeds} betSlip={betSlip}
          onSelectBet={handleSelectBet} onOpenSim={handleOpenSim}
          onPlaceBet={handlePlaceBet}
          onCancelBet={() => { setBetSlip(null); setActiveBetMatchId(null); }}
        />

        {simMatch && (
          <MatchSimModal
            m={simMatch}
            onClose={() => setSimMatchId(null)}
            onSelectBet={(mId, type, odds) => { setSimMatchId(null); handleSelectBet(mId, type, odds); }}
            placedBets={placedBets}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#0B0E11', minHeight: '60vh', paddingBottom: 40, position: 'relative' }}>
      {/* ── CSS ── */}
      <style>{`
        .odds-btn:hover { opacity:0.85; transform:scale(1.03); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
      `}</style>

      {/* ── Toast notification ── */}
      {notification && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'win' ? '#052e16' : notification.type === 'loss' ? '#1c0808' : '#1C2128',
          border: `1px solid ${notification.type === 'win' ? '#16a34a' : notification.type === 'loss' ? '#ef4444' : '#3b82f6'}`,
          borderRadius: 10, padding: '10px 16px', zIndex: 9998, maxWidth: 320,
          color: notification.type === 'win' ? '#4ade80' : notification.type === 'loss' ? '#f87171' : '#93c5fd',
          fontSize: 12, fontWeight: 700, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {notification.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: '10px 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚽</span>
        <span style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 800 }}>Football</span>
        <span style={{ fontSize: 11, color: '#848E9C' }}>({live.length} live)</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" />
          <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>LIVE</span>
          {usdtBalance > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{fmt(usdtBalance)} USDT</span>
          )}
        </div>
      </div>

      {/* ── Tabs: Live | My Bets ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1C2128', margin: '8px 12px 0' }}>
        {[
          { id: 'live', label: '🔴 Live Matches' },
          { id: 'bets', label: `📋 My Bets${openBets > 0 ? ` (${openBets})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as 'live' | 'bets')}
            style={{
              padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
              color: activeView === tab.id ? '#F0B90B' : '#848E9C',
              borderBottom: `2px solid ${activeView === tab.id ? '#F0B90B' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── MY BETS VIEW ── */}
      {activeView === 'bets' && <MyBets bets={placedBets} matches={matches} />}

      {/* ── LIVE VIEW ── */}
      {activeView === 'live' && (
        <>
          {/* Winners feed ticker */}
          <WinnersTickerBar feeds={winnersFeeds} />

          {/* Top horizontal cards — auto-scroll L→R */}
          <div
            ref={topScrollRef}
            style={{
              overflowX: 'auto', display: 'flex', gap: 8,
              padding: '10px 12px 8px', scrollbarWidth: 'none',
              cursor: 'grab',
            }}
          >
            {live.slice(0, 12).map(m => (
              <TopCard key={m.id} m={m} selectedBetMatchId={activeBetMatchId} onSelect={handleSelectBet} />
            ))}
          </div>

          {/* Column headers — exact grid match: 34px | 1fr | 126px | 82px */}
          <div style={{
            display: 'grid', gridTemplateColumns: '34px 1fr 126px 82px',
            background: '#12161B', borderTop: '1px solid #1C2128', borderBottom: '1px solid #1C2128',
            padding: '3px 0',
          }}>
            <div />
            <div style={{ paddingLeft: 7 }}>
              <span style={{ fontSize: 8.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Match</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 8.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>W1 · X · W2</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 8.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>A · Ü</span>
            </div>
          </div>

          {/* Matches grouped by league */}
          {Object.entries(byLeague).map(([lid, ms]) => {
            const lg = getLeague(lid);
            return (
              <div key={lid}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  background: '#0d1117', borderBottom: '1px solid #1C2128',
                }}>
                  <span style={{ fontSize: 12 }}>{lg?.flag}</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                    {lg?.country} · <span style={{ color: '#94a3b8' }}>{lg?.name}</span>
                  </span>
                </div>
                {ms.map(m => (
                  <MatchRow key={m.id} m={m} activeBetMatchId={activeBetMatchId} expandedMatchId={expandedMatchId} onSelectBet={handleSelectBet} onToggleExpand={handleToggleExpand} onOpenSim={handleOpenSim} placedBets={placedBets} />
                ))}
              </div>
            );
          })}

          {/* Finished */}
          {finished.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ padding: '5px 12px', background: '#0d1117', borderBottom: '1px solid #1C2128', borderTop: '1px solid #1C2128' }}>
                <span style={{ fontSize: 9.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
              </div>
              {finished.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderBottom: '1px solid #1C2128', opacity: 0.4,
                }}>
                  <span style={{ fontSize: 10 }}>{getLeague(m.tmpl.leagueId)?.flag}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>{m.tmpl.homeTeam.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#F0B90B' }}>{m.homeScore} – {m.awayScore}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', flex: 1, textAlign: 'right' }}>{m.tmpl.awayTeam.name}</span>
                  <span style={{ fontSize: 10, color: '#374151', fontWeight: 700 }}>FT</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 9.5, color: '#1C2128', marginTop: 24, padding: '0 16px' }}>
            Basonce Sports · 28 African Leagues · Simulated Events · Entertainment Only
          </p>
        </>
      )}

      {/* ── BET SLIP MODAL ── */}
      {betSlip && (
        <BetSlipModal
          item={betSlip}
          usdtBalance={usdtBalance}
          onPlace={handlePlaceBet}
          onCancel={() => { setBetSlip(null); setActiveBetMatchId(null); }}
        />
      )}

      {/* ── MATCH SIMULATION MODAL ── */}
      {simMatchId && (() => {
        const simMatch = matches.find(x => x.id === simMatchId);
        if (!simMatch) return null;
        return (
          <MatchSimModal
            m={simMatch}
            onClose={() => setSimMatchId(null)}
            onSelectBet={(mId, type, odds) => {
              setSimMatchId(null);
              handleSelectBet(mId, type, odds);
            }}
            placedBets={placedBets}
          />
        );
      })()}
    </div>
  );
}
