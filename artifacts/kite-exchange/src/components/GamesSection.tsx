import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { pickFreshMatchups, getLeague, ri, rf, type MatchTemplate } from '../lib/sportsData';

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
interface Odds { w1: number; x: number; w2: number }
interface TotalOdds { line: number; over: number; under: number }

interface LiveMatch {
  id: string;
  tmpl: MatchTemplate;
  homeScore: number;
  awayScore: number;
  minute: number;
  half: 1 | 2;
  status: 'live' | 'finished';
  odds: Odds;
  totalOdds: TotalOdds;
  goalFlash: null | 'home' | 'away';
  flashTs: number;
  finishedAt: number | null;
  halfTimeScore?: { h: number; a: number };
}

type BetType = 'W1' | 'X' | 'W2' | 'OVER' | 'UNDER';
interface BetSlipItem {
  matchId: string;
  betType: BetType;
  odds: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
}
interface PlacedBet extends BetSlipItem {
  id: string;
  amount: number;
  potentialWin: number;
  status: 'open' | 'won' | 'lost' | 'refunded';
  result?: string;
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function makeOdds(): Odds {
  return { w1: rf(1.25, 4.50), x: rf(2.80, 5.20), w2: rf(1.25, 4.50) };
}
function makeTotalOdds(): TotalOdds {
  const line = (ri(1, 3)) + 0.5;
  return { line, over: rf(1.40, 2.60), under: rf(1.40, 2.60) };
}
function buildMatch(tmpl: MatchTemplate, idx: number): LiveMatch {
  const minute = ri(4, 82);
  const maxG = Math.floor(minute / 24);
  return {
    id: `m_${idx}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tmpl,
    homeScore: ri(0, maxG),
    awayScore: ri(0, maxG),
    minute,
    half: minute > 45 ? 2 : 1,
    status: 'live',
    odds: makeOdds(),
    totalOdds: makeTotalOdds(),
    goalFlash: null,
    flashTs: 0,
    finishedAt: null,
  };
}

function betLabel(b: BetType, homeTeam: string, awayTeam: string): string {
  if (b === 'W1') return `1 (${homeTeam})`;
  if (b === 'W2') return `2 (${awayTeam})`;
  if (b === 'X') return 'Draw (X)';
  if (b === 'OVER') return 'Over';
  return 'Under';
}

/* ══════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════ */
function TeamBadge({ abbr, color, size = 28 }: { abbr: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${color}cc,${color}55)`,
      border: `1.5px solid ${color}88`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 28 ? 7 : 8, fontWeight: 900, color: '#fff', flexShrink: 0,
    }}>{abbr}</div>
  );
}

function OddPill({
  label, value, active, onClick,
}: { label: string; value: number; active?: boolean; onClick: () => void }) {
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
      <span style={{ fontSize: 12, color: active ? '#fff' : '#e2e8f0', fontWeight: 700 }}>{value}</span>
    </button>
  );
}

/* ── Big Team Logo ── */
function BigLogo({ abbr, color, size = 44 }: { abbr: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${color}ff, ${color}99)`,
      border: `2.5px solid rgba(255,255,255,0.18)`,
      boxShadow: `0 0 12px ${color}66, inset 0 1px 2px rgba(255,255,255,0.25)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 40 ? 10 : 8, fontWeight: 900, color: '#fff', flexShrink: 0,
      letterSpacing: '-0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.7)',
    }}>{abbr}</div>
  );
}

/* ── Horizontal match card (reference design) ── */
function TopCard({
  m, selectedBetMatchId, onSelect,
}: { m: LiveMatch; selectedBetMatchId: string | null; onSelect: (matchId: string, type: BetType, odds: number) => void }) {
  const lg = getLeague(m.tmpl.leagueId);
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const isFlashing = m.goalFlash && Date.now() - m.flashTs < 3000;
  const sel = selectedBetMatchId === m.id;

  return (
    <div
      onClick={() => onSelect(m.id, 'W1', m.odds.w1)}
      style={{
        minWidth: 190, maxWidth: 190, flexShrink: 0, cursor: 'pointer',
        background: isFlashing
          ? 'linear-gradient(160deg,#0a2416,#0f3320,#0a2416)'
          : 'linear-gradient(160deg,#0d2318,#163325,#0d2318)',
        border: `1.5px solid ${sel ? '#3b82f6' : isFlashing ? '#22c55e' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.3s, background 0.3s',
        boxShadow: sel ? '0 0 0 2px #3b82f644' : '0 2px 12px rgba(0,0,0,0.4)',
      }}
    >
      {/* Top green header */}
      <div style={{
        background: 'linear-gradient(90deg,rgba(22,163,74,0.25),rgba(22,163,74,0.1))',
        borderBottom: '1px solid rgba(22,163,74,0.2)',
        padding: '5px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
        <span style={{ fontSize: 9.5, color: '#86efac', fontWeight: 800, letterSpacing: '0.02em' }}>Premature Victory</span>
      </div>

      {/* League name */}
      <p style={{ fontSize: 9, color: '#6ee7b7', textAlign: 'center', margin: '5px 8px 0', fontWeight: 600, opacity: 0.8 }}>
        {lg?.flag} {lg?.country}, {lg?.name.split(' ').slice(0,2).join(' ')}
      </p>

      {/* Main: Logo | Info | Logo */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px 4px', gap: 0 }}>
        {/* Home logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 48 }}>
          <BigLogo abbr={ht.abbr} color={ht.color} size={44} />
        </div>

        {/* Center info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
          {/* Match name */}
          <p style={{
            fontSize: 9.5, color: '#e2e8f0', fontWeight: 700, textAlign: 'center', lineHeight: 1.3,
            overflow: 'hidden', width: '100%',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {ht.name} — {at.name}
          </p>
          {/* Live time */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
            background: 'rgba(239,68,68,0.15)', borderRadius: 4, padding: '2px 7px',
            border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" />
            <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 900 }}>{m.minute}'</span>
          </div>
          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <span style={{
              fontSize: 22, fontWeight: 900, lineHeight: 1,
              color: isFlashing && m.goalFlash === 'home' ? '#4ade80' : '#ffffff',
              transition: 'color 0.3s',
            }}>{m.homeScore}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>:</span>
            <span style={{
              fontSize: 22, fontWeight: 900, lineHeight: 1,
              color: isFlashing && m.goalFlash === 'away' ? '#4ade80' : '#ffffff',
              transition: 'color 0.3s',
            }}>{m.awayScore}</span>
          </div>
        </div>

        {/* Away logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 48 }}>
          <BigLogo abbr={at.abbr} color={at.color} size={44} />
        </div>
      </div>

      {/* Odds row */}
      <div style={{ display: 'flex', gap: 0, padding: '6px 8px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
        {[
          { label: 'W1', value: m.odds.w1, type: 'W1' as BetType },
          { label: 'X', value: m.odds.x, type: 'X' as BetType },
          { label: 'W2', value: m.odds.w2, type: 'W2' as BetType },
        ].map((o, i) => (
          <button
            key={o.label}
            onClick={e => { e.stopPropagation(); onSelect(m.id, o.type, o.value); }}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              background: sel && o.type === 'W1' ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.35)',
              border: `1px solid ${sel && o.type === 'W1' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: i === 0 ? '6px 0 0 6px' : i === 2 ? '0 6px 6px 0' : '0',
              borderLeft: i > 0 ? 'none' : undefined,
              padding: '4px 2px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{o.label}</span>
            <span style={{ fontSize: 13, color: '#F0B90B', fontWeight: 900 }}>{o.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── List row ── */
function MatchRow({
  m, activeBetMatchId, onSelectBet,
}: {
  m: LiveMatch;
  activeBetMatchId: string | null;
  onSelectBet: (matchId: string, type: BetType, odds: number) => void;
}) {
  const ht = m.tmpl.homeTeam;
  const at = m.tmpl.awayTeam;
  const isFlashing = m.goalFlash && Date.now() - m.flashTs < 3000;
  const halfLabel = m.half === 1 ? '1st' : '2nd';
  const sel = activeBetMatchId === m.id;

  return (
    <div style={{
      background: sel ? '#0d1f35' : isFlashing ? '#0b1a0b' : 'transparent',
      borderBottom: '1px solid #1C2128',
      transition: 'background 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Minute */}
        <div style={{
          width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', borderRight: '1px solid #1C2128', flexShrink: 0, gap: 1, paddingTop: 2,
        }}>
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 800 }}>{m.minute}'</span>
          <span style={{ fontSize: 8.5, color: '#374151', fontWeight: 700 }}>{halfLabel}</span>
        </div>

        {/* Teams */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '5px 7px', borderRight: '1px solid #1C2128', minWidth: 0, gap: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TeamBadge abbr={ht.abbr} color={ht.color} size={20} />
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: isFlashing && m.goalFlash === 'home' ? '#4ade80' : '#e2e8f0',
              flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              transition: 'color 0.3s',
            }}>{ht.name}</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: isFlashing && m.goalFlash === 'home' ? '#4ade80' : '#F0B90B', minWidth: 12, textAlign: 'right', transition: 'color 0.3s' }}>{m.homeScore}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TeamBadge abbr={at.abbr} color={at.color} size={20} />
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: isFlashing && m.goalFlash === 'away' ? '#4ade80' : '#94a3b8',
              flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              transition: 'color 0.3s',
            }}>{at.name}</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: isFlashing && m.goalFlash === 'away' ? '#4ade80' : '#F0B90B', minWidth: 12, textAlign: 'right', transition: 'color 0.3s' }}>{m.awayScore}</span>
          </div>
        </div>

        {/* RESULT odds */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', padding: '0 4px', borderRight: '1px solid #1C2128' }}>
          <OddPill label="W1" value={m.odds.w1} active={sel} onClick={() => onSelectBet(m.id, 'W1', m.odds.w1)} />
          <OddPill label="X" value={m.odds.x} onClick={() => onSelectBet(m.id, 'X', m.odds.x)} />
          <OddPill label="W2" value={m.odds.w2} onClick={() => onSelectBet(m.id, 'W2', m.odds.w2)} />
        </div>

        {/* TOTAL odds */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', padding: '0 4px' }}>
          <OddPill label={`O ${m.totalOdds.line}`} value={m.totalOdds.over} onClick={() => onSelectBet(m.id, 'OVER', m.totalOdds.over)} />
          <OddPill label={`U ${m.totalOdds.line}`} value={m.totalOdds.under} onClick={() => onSelectBet(m.id, 'UNDER', m.totalOdds.under)} />
        </div>
      </div>

      {/* Goal banner */}
      {isFlashing && m.goalFlash && (
        <div style={{
          background: 'linear-gradient(90deg,#052e16,#14532d,#052e16)',
          padding: '2px 44px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⚽</span>
          <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800 }}>
            GOAL — {m.goalFlash === 'home' ? ht.name : at.name} scores!
          </span>
        </div>
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
              {betLabel(item.betType, item.homeTeam, item.awayTeam)}
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
  if (!bets.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#4B5563' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
        <p style={{ fontSize: 13 }}>No bets placed yet</p>
        <p style={{ fontSize: 11, marginTop: 4 }}>Select a match and place your first bet</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bets.slice().reverse().map(bet => {
        const statusColor = bet.status === 'won' ? '#4ade80' : bet.status === 'lost' ? '#ef4444' : bet.status === 'refunded' ? '#F0B90B' : '#94a3b8';
        const statusLabel = bet.status === 'won' ? '✅ Won' : bet.status === 'lost' ? '❌ Lost' : bet.status === 'refunded' ? '↩ Refunded' : '🔄 Open';
        return (
          <div key={bet.id} style={{
            background: '#161B22', border: `1px solid ${bet.status === 'open' ? '#2B3139' : statusColor + '44'}`,
            borderRadius: 10, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#848E9C' }}>{bet.league}</span>
              <span style={{ fontSize: 10, color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
            </div>
            <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700, marginBottom: 5 }}>
              {bet.homeTeam} — {bet.awayTeam}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{betLabel(bet.betType, bet.homeTeam, bet.awayTeam)}</span>
                <span style={{ fontSize: 12, color: '#F0B90B', fontWeight: 700, marginLeft: 8 }}>× {bet.odds}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: '#848E9C' }}>Stake</p>
                <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>{bet.amount} USDT</p>
              </div>
            </div>
            {bet.status !== 'open' && (
              <div style={{
                marginTop: 6, padding: '5px 8px', borderRadius: 6,
                background: statusColor + '11', borderTop: `1px solid ${statusColor}33`,
              }}>
                <span style={{ fontSize: 11, color: statusColor, fontWeight: 700 }}>
                  {bet.status === 'won'
                    ? `+${bet.potentialWin.toFixed(2)} USDT`
                    : bet.status === 'lost'
                      ? `-${bet.amount} USDT`
                      : `Refund: ${bet.amount} USDT`}
                  {bet.result && ` · Final: ${bet.result}`}
                </span>
              </div>
            )}
          </div>
        );
      })}
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
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [balanceId, setBalanceId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'live' | 'bets'>('live');
  const [notification, setNotification] = useState<{ msg: string; type: 'win' | 'loss' | 'info' } | null>(null);
  const counter = useRef(200);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  /* Init matches */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const templates = pickFreshMatchups(30);
    setMatches(templates.map((t, i) => buildMatch(t, i)));
  }, []);

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
        let status: 'won' | 'lost' = 'lost';
        if ((bet.betType === 'W1' && finalResult === 'home') ||
            (bet.betType === 'W2' && finalResult === 'away') ||
            (bet.betType === 'X' && finalResult === 'draw') ||
            (bet.betType === 'OVER' && (m.homeScore + m.awayScore) > m.totalOdds.line) ||
            (bet.betType === 'UNDER' && (m.homeScore + m.awayScore) < m.totalOdds.line)) {
          status = 'won';
        }
        changed = true;
        if (status === 'won') {
          // Credit winnings to Supabase
          setUsdtBalance(b => {
            const newBal = b + bet.potentialWin;
            if (balanceId) {
              supabase.from('user_balances').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', balanceId);
            }
            return newBal;
          });
          notify(`🏆 Won! +${bet.potentialWin.toFixed(2)} USDT — ${bet.homeTeam} vs ${bet.awayTeam}`, 'win');
        } else {
          notify(`❌ Lost bet — ${bet.homeTeam} vs ${bet.awayTeam}`, 'loss');
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

          // 45→HT pause handled silently
          if (mm.minute >= 90) {
            const fin = { ...mm, status: 'finished' as const, finishedAt: now };
            finishing.push(fin);
            return fin;
          }

          // Goal logic (~7% per tick)
          if (Math.random() < 0.07) {
            const side = Math.random() < 0.52 ? 'home' : 'away';
            mm = {
              ...mm,
              homeScore: side === 'home' ? mm.homeScore + 1 : mm.homeScore,
              awayScore: side === 'away' ? mm.awayScore + 1 : mm.awayScore,
              goalFlash: side as 'home' | 'away',
              flashTs: now,
            };
          }
          return mm;
        });

        if (finishing.length) settleBets(finishing);

        // Remove finished after 10s, replace with fresh
        next = next.filter(m => !(m.status === 'finished' && m.finishedAt && now - m.finishedAt > 10000));
        const need = 30 - next.length;
        if (need > 0) {
          const fresh = pickFreshMatchups(need);
          fresh.forEach(t => {
            counter.current++;
            next.push(buildMatch(t, counter.current));
          });
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(tick);
  }, [settleBets]);

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
    setPlacedBets(prev => [...prev, placed]);
    setBetSlip(null);
    setActiveBetMatchId(null);
    notify(`Bet placed! ${amount} USDT on ${betLabel(betSlip.betType, betSlip.homeTeam, betSlip.awayTeam)} @ ${betSlip.odds}`, 'info');
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
      {activeView === 'bets' && <MyBets bets={placedBets} />}

      {/* ── LIVE VIEW ── */}
      {activeView === 'live' && (
        <>
          {/* Top horizontal cards */}
          <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '10px 12px 8px', scrollbarWidth: 'none' }}>
            {live.slice(0, 12).map(m => (
              <TopCard key={m.id} m={m} selectedBetMatchId={activeBetMatchId} onSelect={handleSelectBet} />
            ))}
          </div>

          {/* Column headers */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: '#12161B', borderTop: '1px solid #1C2128', borderBottom: '1px solid #1C2128',
            padding: '4px 0',
          }}>
            <div style={{ width: 36, flexShrink: 0 }} />
            <div style={{ flex: 1, paddingLeft: 7 }}>
              <span style={{ fontSize: 9.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Match</span>
            </div>
            <div style={{ padding: '0 4px', width: 140 }}>
              <span style={{ fontSize: 9.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', textAlign: 'center' }}>RESULT ↓</span>
            </div>
            <div style={{ padding: '0 4px', width: 96 }}>
              <span style={{ fontSize: 9.5, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', textAlign: 'center' }}>TOTAL</span>
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
                  <MatchRow key={m.id} m={m} activeBetMatchId={activeBetMatchId} onSelectBet={handleSelectBet} />
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
