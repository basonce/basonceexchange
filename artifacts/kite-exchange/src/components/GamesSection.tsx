import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { pickFreshMatchups, getLeague, ri, rf, ALL_MATCHUPS, type MatchTemplate } from '../lib/sportsData';

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
interface Odds { w1: number; x: number; w2: number }
interface TotalOdds { line: number; over: number; under: number }

interface AdminCtrl {
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  pinned: boolean;
}

type OddsDir = 'up' | 'down' | 'same';
interface OddsDirs { w1: OddsDir; x: OddsDir; w2: OddsDir }

/* Extended markets — 100+ options per match */
interface ExtMarket { label: string; odd: number; key: string }
interface MarketGroup { title: string; markets: ExtMarket[] }

interface GoalEvent { minute: number; side: 'home' | 'away'; score: string }

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
  // Line should always be above current total goals + 0.5 (meaningful bet)
  // but keep it natural-looking: jump in 0.5 steps
  const minLine = total + 0.5;
  const candidate = Math.ceil(minLine * 2) / 2; // round up to next 0.5
  return Math.max(candidate, baseLine);
}

function buildMatch(tmpl: MatchTemplate, idx: number): LiveMatch {
  const minute = ri(4, 82);
  const maxG = Math.floor(minute / 24);
  const hs = ri(0, maxG);
  const as_ = ri(0, maxG);
  const odds = makeOdds();
  const total = hs + as_;
  const totalOdds = makeTotalOdds();
  // Ensure the initial line is above current score
  totalOdds.line = dynamicOULine(total, totalOdds.line);
  // Synthesise fake historical goal events
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
  return {
    id: `m_${idx}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tmpl, homeScore: hs, awayScore: as_,
    minute, half: minute > 45 ? 2 : 1,
    status: 'live',
    odds,
    totalOdds,
    extMarkets: buildExtMarkets(hs, as_, odds.w1, odds.x, odds.w2),
    goalFlash: null, flashTs: 0, finishedAt: null,
    goalEvents,
  };
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
function TeamShield({ abbr, color, size = 32, logoUrl }: { abbr: string; color: string; size?: number; logoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (logoUrl && !imgFailed) {
    return (
      <div style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <img
          src={logoUrl}
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
          <TeamShield abbr={ht.abbr} color={ht.color} size={46} logoUrl={ht.logoUrl} />
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
          <TeamShield abbr={at.abbr} color={at.color} size={46} logoUrl={at.logoUrl} />
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
const FAKER_NAMES = [
  'James T.','Emma L.','Luca R.','Sofia B.','Marcus K.',
  'Olivia S.','Diego V.','Sarah J.','Ryan O.','Chloe W.',
  'Victor P.','Isabelle F.','Nathan G.','Zara H.','Lucas M.',
  'Elena D.','Kevin C.','Priya N.','Tyler B.','Hana S.',
  'Owen R.','Maya K.','Ethan L.','Lily P.','Noah W.',
];
/* Big-win amount: 70% normal (150-4500), 30% large (6000-48000) */
function fakeWinAmt(): number {
  if (Math.random() < 0.30) return +(rf(6000, 48000)).toFixed(2);
  return +(rf(150, 4500)).toFixed(2);
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
            <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 900 }}>+{f.amount.toFixed(2)} USDT</span>
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
  m, activeBetMatchId, expandedMatchId, onSelectBet, onToggleExpand, placedBets,
}: {
  m: LiveMatch;
  activeBetMatchId: string | null;
  expandedMatchId: string | null;
  onSelectBet: (matchId: string, type: BetType, odds: number) => void;
  onToggleExpand: (id: string) => void;
  placedBets: PlacedBet[];
}) {
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const now = Date.now();
  const isGoalFlash = !!(m.goalFlash && now - m.flashTs < 3500);
  const halfLabel = m.half === 1 ? '1st' : '2nd';
  const sel = activeBetMatchId === m.id;
  const expanded = expandedMatchId === m.id;
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
          <span style={{ fontSize: 9.5, color: '#93c5fd', fontWeight: 700 }}>KUPONUM VAR</span>
          <span style={{ marginLeft: 4, fontSize: 9, color: '#60a5fa' }}>
            {activeBet.betType === 'W1' ? `1 (${activeBet.homeTeam.split(' ')[0]})` :
             activeBet.betType === 'W2' ? `2 (${activeBet.awayTeam.split(' ')[0]})` :
             activeBet.betType === 'X' ? 'Beraberlik' :
             activeBet.betType === 'OVER' ? `Üst ${ln}` :
             activeBet.betType === 'UNDER' ? `Alt ${ln}` :
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
          <span style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 900, lineHeight: 1 }}>{m.minute}'</span>
          <span style={{ fontSize: 7.5, color: '#374151', fontWeight: 700 }}>{halfLabel}</span>
        </div>

        {/* Teams column — each row: [shield | name | score] perfect grid */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '4px 6px', borderRight: '1px solid #1C2128', gap: 3, minWidth: 0,
        }}>
          {/* Home row */}
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 16px', alignItems: 'center', gap: 4 }}>
            <TeamShield abbr={ht.abbr} color={ht.color} size={22} logoUrl={ht.logoUrl}/>
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
            <TeamShield abbr={at.abbr} color={at.color} size={22} logoUrl={at.logoUrl}/>
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

        {/* Total odds: A (Under) LEFT | Ü (Over) RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 4px' }}>
          <OddBtn label={`A ${ln}`} value={m.totalOdds.under} onClick={() => onSelectBet(m.id,'UNDER',m.totalOdds.under)}/>
          <OddBtn label={`Ü ${ln}`} value={m.totalOdds.over}  onClick={() => onSelectBet(m.id,'OVER', m.totalOdds.over)} />
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

      {/* ── More markets button ── */}
      <button
        onClick={() => onToggleExpand(m.id)}
        style={{
          width: '100%', background: expanded ? 'rgba(240,185,11,0.06)' : 'rgba(255,255,255,0.02)',
          border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 10, color: expanded ? '#F0B90B' : '#4B5563', fontWeight: 700 }}>
          {expanded ? '▲ Show less' : '▼ All markets'}
        </span>
      </button>

      {/* ── Expandable market panel ── */}
      {expanded && (
        <MarketPanel groups={m.extMarkets} matchId={m.id} onSelectBet={onSelectBet} />
      )}
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
  const potential = num > 0 ? (num * item.odds).toFixed(2) : '—';
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
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>{usdtBalance.toFixed(2)} USDT</span>
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
   MY BETS PANEL
══════════════════════════════════════════════════════════ */
function MyBets({ bets }: { bets: PlacedBet[] }) {
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
    { key: 'all',  label: 'Tümü',   count: bets.length },
    { key: 'open', label: 'Açık',   count: openCount   },
    { key: 'won',  label: 'Kazandı', count: wonCount    },
    { key: 'lost', label: 'Kaybetti', count: lostCount   },
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
              <span style={{ fontSize: 11, color: '#848E9C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Toplam Kâr/Zarar</span>
              <span style={{
                fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em',
                color: netPnl >= 0 ? '#0ECB81' : '#F6465D',
              }}>
                {netPnl >= 0 ? '+' : ''}{netPnl.toFixed(2)}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#848E9C', marginLeft: 4 }}>USDT</span>
              </span>
            </div>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              {[
                { label: 'Yatırılan', val: totalStaked.toFixed(2), color: '#C7CACD' },
                { label: 'Kazanılan', val: `+${totalWon.toFixed(2)}`,  color: '#0ECB81' },
                { label: 'Kaybedilen', val: `-${totalLost.toFixed(2)}`, color: '#F6465D' },
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
            {bets.length === 0 ? 'Henüz bahis yapılmadı' : 'Bu kategoride bahis yok'}
          </p>
        </div>
      )}

      {/* ═══ BET CARDS ═══ */}
      <div style={{ padding: '2px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(bet => {
          const isWon  = bet.status === 'won';
          const isLost = bet.status === 'lost';
          const isOpen = bet.status === 'open';

          /* ── per-status config ── */
          const cfg = isWon
            ? {
                headerBg:    '#0ECB81',
                headerText:  '#fff',
                icon:        '✓',
                label:       'WON',
                pnlColor:    '#fff',
                pnl:         `+${bet.potentialWin.toFixed(2)} USDT`,
                cardBorder:  '#0ECB8140',
                cardBg:      '#0B0E11',
                returnLabel: 'PROFIT',
                returnVal:   `+${bet.potentialWin.toFixed(2)}`,
                returnColor: '#0ECB81',
              }
            : isLost
            ? {
                headerBg:    '#F6465D',
                headerText:  '#fff',
                icon:        '✕',
                label:       'LOST',
                pnlColor:    '#fff',
                pnl:         `-${bet.amount.toFixed(2)} USDT`,
                cardBorder:  '#F6465D40',
                cardBg:      '#0B0E11',
                returnLabel: 'LOSS',
                returnVal:   `-${bet.amount.toFixed(2)}`,
                returnColor: '#F6465D',
              }
            : {
                headerBg:    '#1E3A5F',
                headerText:  '#60a5fa',
                icon:        '●',
                label:       'LIVE',
                pnlColor:    '#60a5fa',
                pnl:         `~${bet.potentialWin.toFixed(2)} USDT`,
                cardBorder:  '#3B82F640',
                cardBg:      '#0B0E11',
                returnLabel: 'POTENTIAL',
                returnVal:   `~${bet.potentialWin.toFixed(2)}`,
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
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: cfg.pnlColor, letterSpacing: '-0.01em' }}>
                  {cfg.pnl}
                </span>
              </div>

              {/* ── CARD BODY ── */}
              <div style={{ padding: '10px 14px 12px' }}>

                {/* League */}
                <div style={{ fontSize: 10, color: '#5E6673', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>
                  {bet.league}
                  {bet.result && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, color: '#848E9C',
                      background: '#1E2026', padding: '1px 7px', borderRadius: 4, border: '1px solid #2B3139',
                    }}>Final {bet.result}</span>
                  )}
                </div>

                {/* Teams */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center', gap: 8, marginBottom: 10,
                }}>
                  <span style={{ fontSize: 13, color: '#EAECEF', fontWeight: 700, lineHeight: 1.2 }}>{bet.homeTeam}</span>
                  <span style={{
                    fontSize: 10, color: '#848E9C', fontWeight: 700, padding: '2px 7px',
                    border: '1px solid #2B3139', borderRadius: 4,
                  }}>VS</span>
                  <span style={{ fontSize: 13, color: '#EAECEF', fontWeight: 700, textAlign: 'right', lineHeight: 1.2 }}>{bet.awayTeam}</span>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#1E2026', marginBottom: 10 }} />

                {/* Bet details row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#5E6673', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' }}>Selection</div>
                    <div style={{ fontSize: 11, color: '#EAECEF', fontWeight: 700, lineHeight: 1.3 }}>
                      {betLabel(bet.betType, bet.homeTeam, bet.awayTeam, bet.ouLine)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#5E6673', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' }}>Odds</div>
                    <div style={{ fontSize: 12, color: '#F0B90B', fontWeight: 900 }}>× {bet.odds}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#5E6673', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' }}>Stake</div>
                    <div style={{ fontSize: 11, color: '#848E9C', fontWeight: 700 }}>{bet.amount.toFixed(2)} USDT</div>
                  </div>
                </div>

                {/* Return bar — only for settled or highlighted for open */}
                <div style={{
                  marginTop: 10,
                  background: '#161A1E',
                  border: `1px solid ${cfg.cardBorder}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 10, color: '#848E9C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {cfg.returnLabel}
                  </span>
                  <span style={{ fontSize: 16, color: cfg.returnColor, fontWeight: 900, letterSpacing: '-0.02em' }}>
                    {cfg.returnVal}
                    <span style={{ fontSize: 10, color: '#5E6673', fontWeight: 600, marginLeft: 4 }}>USDT</span>
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
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function GamesSection() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [betSlip, setBetSlip] = useState<BetSlipItem | null>(null);
  const [activeBetMatchId, setActiveBetMatchId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
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
    return Array.from({ length: 16 }, (_, i) => ({
      name: FAKER_NAMES[i % FAKER_NAMES.length],
      amount: fakeWinAmt(),
      match: `${teamOpts[ri(0, teamOpts.length-1)]} vs ${teamOpts[ri(0, teamOpts.length-1)]}`,
      betDesc: descOpts[ri(0, descOpts.length-1)],
      ts: Date.now() - ri(0, 3600000),
    }));
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

  /* Init matches */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const templates = pickFreshMatchups(30);
    const initMatches = templates.map((t, i) => buildMatch(t, i));
    setMatches(initMatches);

    // Auto-refund any open bets whose match is no longer in the live list
    // (happens when user leaves the page and comes back)
    const liveIds = new Set(initMatches.map(m => m.id));
    setPlacedBets(prev => {
      const orphaned = prev.filter(b => b.status === 'open' && !liveIds.has(b.matchId));
      if (orphaned.length === 0) return prev;
      return prev.map(b => {
        if (b.status === 'open' && !liveIds.has(b.matchId)) {
          // Auto-refund via API
          fetch(`/api-server/api/sport-bets/${b.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'refunded' }),
          }).catch(() => {});
          return { ...b, status: 'refunded' as const, result: 'Maç bitti' };
        }
        return b;
      });
    });
  }, []);

  /* Poll admin match controls every 10s */
  useEffect(() => {
    async function fetchControls() {
      try {
        const res = await fetch('/api-server/api/admin/match-controls', { cache: 'no-store' });
        if (!res.ok) return;
        const data: Array<{ homeTeam: string; awayTeam: string; targetResult?: '1'|'X'|'2'; targetScore?: {h:number;a:number}; pinned: boolean }> = await res.json();
        const map = new Map<string, AdminCtrl>();
        for (const c of data) {
          map.set(`${c.homeTeam}:${c.awayTeam}`, { targetResult: c.targetResult, targetScore: c.targetScore, pinned: c.pinned });
        }
        controlsRef.current = map;

        setMatches(prev => {
          // Step 1: apply / remove adminCtrl on existing matches
          let next = prev.map(m => {
            const key = `${m.tmpl.homeTeam.name}:${m.tmpl.awayTeam.name}`;
            const ctrl = map.get(key);
            if (!ctrl) return m.adminCtrl ? { ...m, adminCtrl: undefined } : m;
            // If targetScore changed, snap score immediately
            const scoreSnap = ctrl.targetScore
              ? { homeScore: ctrl.targetScore.h, awayScore: ctrl.targetScore.a }
              : {};
            return { ...m, ...scoreSnap, adminCtrl: ctrl };
          });

          // Step 2: inject pinned matches not already in live list
          const liveKeys = new Set(next.filter(m => m.status === 'live').map(m => `${m.tmpl.homeTeam.name}:${m.tmpl.awayTeam.name}`));
          for (const [key, ctrl] of map.entries()) {
            if (!ctrl.pinned) continue;
            if (liveKeys.has(key)) continue;
            // Find template in ALL_MATCHUPS
            const tmpl = ALL_MATCHUPS.find(t => `${t.homeTeam.name}:${t.awayTeam.name}` === key);
            if (!tmpl) continue;
            counter.current++;
            const nm = buildMatch(tmpl, counter.current);
            // Snap to targetScore immediately if set
            const snapped: LiveMatch = ctrl.targetScore
              ? { ...nm, homeScore: ctrl.targetScore.h, awayScore: ctrl.targetScore.a, adminCtrl: ctrl }
              : { ...nm, adminCtrl: ctrl };
            next = [snapped, ...next];
          }

          // Step 3: pinned always at top
          next.sort((a, b) => {
            const ap = a.adminCtrl?.pinned ? 1 : 0;
            const bp = b.adminCtrl?.pinned ? 1 : 0;
            return bp - ap;
          });

          return next;
        });
      } catch {}
    }
    fetchControls();
    const iv = setInterval(fetchControls, 10000);
    return () => clearInterval(iv);
  }, []);

  /* Persist placedBets to localStorage whenever they change */
  useEffect(() => {
    try { localStorage.setItem('sport_placed_bets', JSON.stringify(placedBets)); } catch {}
  }, [placedBets]);

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
  const settleBets = useCallback((finished: LiveMatch[]) => {
    setPlacedBets(prev => {
      let changed = false;
      const updated = prev.map(bet => {
        if (bet.status !== 'open') return bet;
        const m = finished.find(f => f.id === bet.matchId);
        if (!m) return bet;

        const finalResult = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const totalGoals = m.homeScore + m.awayScore;

        // Extract base type (handles both 'OVER' and 'OVER_6.5' formats)
        const btParts = bet.betType.split('_');
        const btBase = btParts[0];
        // Use embedded line from betType key (e.g. OVER_6.5 → 6.5), or ouLine, or match line
        const btLine = btParts.length > 1 && !isNaN(parseFloat(btParts[1]))
          ? parseFloat(btParts[1])
          : (bet.ouLine ?? m.totalOdds.line);

        let status: 'won' | 'lost' | 'refunded' = 'lost';

        if (btBase === 'W1' && finalResult === 'home') status = 'won';
        else if (btBase === 'W2' && finalResult === 'away') status = 'won';
        else if (btBase === 'X' && finalResult === 'draw') status = 'won';
        else if (btBase === 'OVER' && totalGoals > btLine) status = 'won';
        else if (btBase === 'UNDER' && totalGoals < btLine) status = 'won';
        else if (['AH', 'HT', '2HT', 'HTFT', 'ES'].includes(btBase)) {
          // Complex markets: refund stake (can't evaluate without exact data)
          status = 'refunded';
        }

        changed = true;
        // Update status in API server
        fetch(`/api-server/api/sport-bets/${bet.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).catch(e => console.warn('[sport-bets] settle error', e.message));

        if (status === 'won') {
          setUsdtBalance(b => {
            const newBal = b + bet.potentialWin;
            if (balanceId) {
              supabase.from('user_balances').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', balanceId);
            }
            return newBal;
          });
          notify(`🏆 Kazandın! +${bet.potentialWin.toFixed(2)} USDT — ${bet.homeTeam} vs ${bet.awayTeam}`, 'win');
        } else if (status === 'refunded') {
          setUsdtBalance(b => {
            const newBal = b + bet.amount;
            if (balanceId) {
              supabase.from('user_balances').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', balanceId);
            }
            return newBal;
          });
          notify(`↩️ İade edildi — ${bet.homeTeam} vs ${bet.awayTeam}`, 'info');
        } else {
          notify(`❌ Bahis kaybedildi — ${bet.homeTeam} vs ${bet.awayTeam}`, 'loss');
        }
        return { ...bet, status, result: `${m.homeScore}–${m.awayScore}` };
      });
      return changed ? updated : prev;
    });
  }, [balanceId, notify]);

  /* Match tick — every 10s */
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setMatches(prev => {
        const finishing: LiveMatch[] = [];
        let next = prev.map(m => {
          if (m.status === 'finished') return m;
          let mm: LiveMatch = { ...m, minute: m.minute + 1, half: m.minute + 1 > 45 ? 2 : 1 };

          if (mm.minute >= 90) {
            const fin = { ...mm, status: 'finished' as const, finishedAt: now };
            finishing.push(fin);
            return fin;
          }

          // Goal logic (~7% per tick)
          let scoringSide: 'home' | 'away' | undefined;

          // ── Admin control steering ──────────────────────────
          const ctrl = mm.adminCtrl;
          if (ctrl) {
            const minsLeft = 90 - mm.minute;
            if (ctrl.targetScore !== undefined) {
              const ts = ctrl.targetScore;
              // Always snap to exact target score immediately
              mm = { ...mm, homeScore: ts.h, awayScore: ts.a };
            } else if (ctrl.targetResult && minsLeft <= 3) {
              // Result-only: force minimal score adjustment at end
              const h = mm.homeScore, a = mm.awayScore;
              if (ctrl.targetResult === '1' && h <= a) {
                mm = { ...mm, homeScore: a + 1, goalFlash: 'home', flashTs: now };
                scoringSide = 'home';
              } else if (ctrl.targetResult === '2' && a <= h) {
                mm = { ...mm, awayScore: h + 1, goalFlash: 'away', flashTs: now };
                scoringSide = 'away';
              } else if (ctrl.targetResult === 'X' && h !== a) {
                mm = { ...mm, awayScore: h };
              }
            }
          } else {
            // Normal random goal logic (~7% per tick)
            if (Math.random() < 0.07) {
              scoringSide = Math.random() < 0.52 ? 'home' : 'away';
              const newHome = scoringSide === 'home' ? mm.homeScore + 1 : mm.homeScore;
              const newAway = scoringSide === 'away' ? mm.awayScore + 1 : mm.awayScore;
              mm = { ...mm, homeScore: newHome, awayScore: newAway, goalFlash: scoringSide, flashTs: now };
            }
          }

          // Record goal event + update dynamic O/U line
          if (scoringSide) {
            const newTotal = mm.homeScore + mm.awayScore;
            const newLine = dynamicOULine(newTotal, mm.totalOdds.line);
            const newTotalOdds: TotalOdds = newLine !== mm.totalOdds.line
              ? { line: newLine, over: +(rf(1.55, 2.90)).toFixed(2), under: +(rf(1.55, 2.90)).toFixed(2) }
              : { ...mm.totalOdds, over: +(rf(1.55, 2.90)).toFixed(2), under: +(rf(1.55, 2.90)).toFixed(2) };
            const ev: GoalEvent = { minute: mm.minute, side: scoringSide, score: `${mm.homeScore}–${mm.awayScore}` };
            mm = { ...mm, totalOdds: newTotalOdds, goalEvents: [...(mm.goalEvents || []), ev] };
          }

          // Recalc result odds — big shift on goal, small drift every tick
          const newOdds = recalcOdds(mm.odds, mm.homeScore, mm.awayScore, mm.minute, !!scoringSide, scoringSide);
          const newOddsDir = calcOddsDir(mm.odds, newOdds);
          // Always rebuild extended markets so the panel reflects live state
          const newExtMarkets = buildExtMarkets(mm.homeScore, mm.awayScore, newOdds.w1, newOdds.x, newOdds.w2);
          mm = { ...mm, prevOdds: mm.odds, odds: newOdds, oddsDir: newOddsDir, extMarkets: newExtMarkets };

          return mm;
        });

        if (finishing.length) settleBets(finishing);

        next = next.filter(m => !(m.status === 'finished' && m.finishedAt && now - m.finishedAt > 10000));
        const need = 30 - next.length;
        if (need > 0) {
          // Collect all teams already in active matches so no team appears twice
          const busyTeams = new Set<string>(
            next
              .filter(m => m.status === 'live')
              .flatMap(m => [m.tmpl.homeTeam.name, m.tmpl.awayTeam.name])
          );
          const fresh = pickFreshMatchups(need, busyTeams);
          fresh.forEach(t => {
            counter.current++;
            const nm = buildMatch(t, counter.current);
            const key = `${t.homeTeam.name}:${t.awayTeam.name}`;
            const ctrl = controlsRef.current.get(key);
            next.push(ctrl ? { ...nm, adminCtrl: ctrl } : nm);
          });
        }
        // Pinned matches always appear at the top
        next.sort((a, b) => {
          const ap = a.adminCtrl?.pinned ? 1 : 0;
          const bp = b.adminCtrl?.pinned ? 1 : 0;
          return bp - ap;
        });
        return next;
      });
    }, 10000);
    return () => clearInterval(tick);
  }, [settleBets]);

  /* Winners feed — new entry every 15-28 seconds */
  useEffect(() => {
    const descOpts = ['Match Result 1','Match Result 2','Draw','Over 2.5','Under 2.5','Asian Handicap -1','Double Chance 1X','BTTS Yes','Correct Score 1-0','Half-Time 2','Corners O 9.5','Cards U 3.5'];
    const teamOpts = ['FC Rayon','Mtibwa Sugar','Elman FC','APR FC','Nkana FC','Singida Utd','Harare Rvr','Pamplemousses'];
    const iv = setInterval(() => {
      setWinnersFeeds(prev => {
        const next: WinnerFeed = {
          name: FAKER_NAMES[ri(0, FAKER_NAMES.length - 1)],
          amount: fakeWinAmt(),
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
    fetch('/api-server/api/sport-bets', {
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
    notify(`✅ Bahis kaydedildi! ${amount} USDT — ${betLabel(betSlip.betType, betSlip.homeTeam, betSlip.awayTeam, betSlip.ouLine)} @ ${betSlip.odds}`, 'info');
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
            <span style={{ marginLeft: 8, fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{usdtBalance.toFixed(2)} USDT</span>
          )}
        </div>
      </div>

      {/* ── Tabs: Live | My Bets ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1C2128', margin: '8px 12px 0' }}>
        {[
          { id: 'live', label: '🔴 Canlı Maçlar' },
          { id: 'bets', label: `📋 Bahislerim${openBets > 0 ? ` (${openBets})` : ''}` },
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
      {activeView === 'bets' && <MyBets bets={placedBets} />}

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
                  <MatchRow key={m.id} m={m} activeBetMatchId={activeBetMatchId} expandedMatchId={expandedMatchId} onSelectBet={handleSelectBet} onToggleExpand={handleToggleExpand} placedBets={placedBets} />
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
    </div>
  );
}
