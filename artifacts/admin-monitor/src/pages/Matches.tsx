import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../lib/supabase';

const ADMIN_ID = '88292f59-898a-4fef-a1c8-8813d7b60b61';
const CTRL_BUCKET = 'sport-controls';
const CTRL_FILE = 'controls.json';
const CTRL_PUBLIC_URL = `https://jfjjymprvjfltpvmfptj.supabase.co/storage/v1/object/public/${CTRL_BUCKET}/${CTRL_FILE}`;

async function readStorageControls(): Promise<MatchControl[]> {
  try {
    const res = await fetch(`${CTRL_PUBLIC_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function writeStorageControls(controls: MatchControl[], adminId: string) {
  const res = await fetch('/api-server/api/sport/controls', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-requester-id': adminId },
    body: JSON.stringify(controls),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text);
  }
}

interface MatchControl {
  id: string;
  homeTeam: string;
  awayTeam: string;
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  pinned: boolean;
  createdAt: number;
}

const RESULT_LABELS: Record<string, string> = {
  '1': 'Home Win',
  'X': 'Draw',
  '2': 'Away Win',
};
const RESULT_COLORS: Record<string, string> = {
  '1': '#3B82F6',
  'X': '#0ECB81',
  '2': '#F6465D',
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

async function getAdminId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || ADMIN_ID;
  } catch { return ADMIN_ID; }
}

export default function Matches() {
  const [, nav] = useLocation();
  const [controls, setControls] = useState<MatchControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [mode, setMode] = useState<'result' | 'score'>('result');
  const [targetResult, setTargetResult] = useState<'1' | 'X' | '2'>('1');
  const [scoreH, setScoreH] = useState('2');
  const [scoreA, setScoreA] = useState('1');
  const [pinned, setPinned] = useState(false);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const ctrls = await readStorageControls();
      setControls(ctrls);
      setLastRefresh(Date.now());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => load(), 15000);
    return () => clearInterval(iv);
  }, [load]);

  async function handleSave() {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    setSaving(true);
    try {
      const existing = await readStorageControls();
      const matchKey = `${homeTeam.trim()}:${awayTeam.trim()}`;
      const now = Date.now();
      const prev = existing.find(c => `${c.homeTeam}:${c.awayTeam}` === matchKey);
      const h = parseInt(scoreH, 10), a = parseInt(scoreA, 10);
      const ctrl: MatchControl = {
        id: prev?.id || Math.random().toString(36).slice(2, 10),
        homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), pinned,
        targetResult: mode === 'result' ? targetResult : undefined,
        targetScore: mode === 'score' && !isNaN(h) && !isNaN(a) ? { h, a } : undefined,
        createdAt: prev?.createdAt || now,
      };
      await writeStorageControls([...existing.filter(c => `${c.homeTeam}:${c.awayTeam}` !== matchKey), ctrl], ADMIN_ID);
      setShowForm(false);
      setHomeTeam(''); setAwayTeam(''); setPinned(false); setMode('result');
      await load();
      showToast('Match control applied ✓', 'ok');
    } catch (e: any) { showToast('Error: ' + e.message, 'err'); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const existing = await readStorageControls();
      await writeStorageControls(existing.filter(c => c.id !== id), ADMIN_ID);
      await load();
      showToast('Control removed', 'ok');
    } catch {}
    setDeletingId(null);
  }

  const pinnedCount = controls.filter(c => c.pinned).length;
  const resultCount = controls.filter(c => c.targetResult).length;
  const scoreCount  = controls.filter(c => c.targetScore !== undefined).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0B0E11', color: '#EAECEF' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '9px 18px', borderRadius: 10, fontWeight: 700,
          fontSize: 13, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          background: toast.type === 'ok' ? '#0ECB81' : '#F6465D',
          color: '#fff', pointerEvents: 'none',
        }}>{toast.msg}</div>
      )}

      <div style={{ padding: '16px 16px 100px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <button onClick={() => nav('/')} style={{
              fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, padding: 0,
            }}>‹ Dashboard</button>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Match Controls</h1>
            <p style={{ fontSize: 12, color: '#848E9C', margin: 0, marginTop: 2 }}>
              {controls.length} active · auto-refresh every 15s
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => load(true)} disabled={refreshing} style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #2B3139',
              background: '#161A1E', color: '#848E9C', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: refreshing ? 0.5 : 1,
            }}>↻</button>
            <button onClick={() => setShowForm(v => !v)} style={{
              padding: '0 14px', height: 36, borderRadius: 10, cursor: 'pointer',
              fontWeight: 800, fontSize: 12,
              background: showForm ? '#F6465D18' : '#F0B90B18',
              border: `1px solid ${showForm ? '#F6465D50' : '#F0B90B50'}`,
              color: showForm ? '#F6465D' : '#F0B90B',
            }}>
              {showForm ? '✕ Cancel' : '+ Add Control'}
            </button>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total',    val: controls.length, color: '#F0B90B',  icon: '🎮' },
            { label: 'Pinned',   val: pinnedCount,      color: '#F0B90B',  icon: '📌' },
            { label: 'Result',   val: resultCount,      color: '#3B82F6',  icon: '🏆' },
            { label: 'Score',    val: scoreCount,       color: '#0ECB81',  icon: '⚽' },
          ].map(({ label, val, color, icon }) => (
            <div key={label} style={{
              background: '#161A1E', border: '1px solid #2B3139',
              borderRadius: 10, padding: '10px 0', textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, marginBottom: 3 }}>{icon}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: 9, color: '#5E6673', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── ADD FORM ── */}
        {showForm && (
          <div style={{
            background: '#161A1E', border: '1px solid #2B3139',
            borderRadius: 14, padding: '16px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#F0B90B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              New Match Control
            </p>

            {/* Team inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input
                value={homeTeam}
                onChange={e => setHomeTeam(e.target.value)}
                placeholder="Home Team — exact name (e.g. Kaizer Chiefs)"
                style={{
                  background: '#0B0E11', border: '1px solid #2B3139',
                  borderRadius: 10, padding: '10px 12px', color: '#EAECEF',
                  fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
              <input
                value={awayTeam}
                onChange={e => setAwayTeam(e.target.value)}
                placeholder="Away Team — exact name (e.g. Mamelodi Sundowns)"
                style={{
                  background: '#0B0E11', border: '1px solid #2B3139',
                  borderRadius: 10, padding: '10px 12px', color: '#EAECEF',
                  fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Mode picker */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {(['result', 'score'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '9px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  background: mode === m ? '#F0B90B18' : '#0B0E11',
                  border: `1px solid ${mode === m ? '#F0B90B60' : '#2B3139'}`,
                  color: mode === m ? '#F0B90B' : '#5E6673',
                }}>
                  {m === 'result' ? '🏆 Result (1 / X / 2)' : '⚽ Exact Score'}
                </button>
              ))}
            </div>

            {/* Result or Score input */}
            {mode === 'result' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {(['1', 'X', '2'] as const).map(r => (
                  <button key={r} onClick={() => setTargetResult(r)} style={{
                    padding: '12px', borderRadius: 10, cursor: 'pointer',
                    fontSize: 18, fontWeight: 900,
                    background: targetResult === r ? `${RESULT_COLORS[r]}20` : '#0B0E11',
                    border: `2px solid ${targetResult === r ? RESULT_COLORS[r] : '#2B3139'}`,
                    color: targetResult === r ? RESULT_COLORS[r] : '#5E6673',
                  }}>
                    {r}
                    <div style={{ fontSize: 9, fontWeight: 600, marginTop: 3, color: targetResult === r ? RESULT_COLORS[r] : '#5E6673' }}>
                      {RESULT_LABELS[r]}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <input
                  value={scoreH} onChange={e => setScoreH(e.target.value)}
                  type="number" min="0" max="9"
                  style={{
                    flex: 1, textAlign: 'center', background: '#0B0E11', border: '2px solid #3B82F6',
                    borderRadius: 10, padding: '14px', color: '#3B82F6', fontSize: 28, fontWeight: 900,
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 24, fontWeight: 900, color: '#5E6673' }}>–</span>
                <input
                  value={scoreA} onChange={e => setScoreA(e.target.value)}
                  type="number" min="0" max="9"
                  style={{
                    flex: 1, textAlign: 'center', background: '#0B0E11', border: '2px solid #F6465D',
                    borderRadius: 10, padding: '14px', color: '#F6465D', fontSize: 28, fontWeight: 900,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Pin toggle */}
            <button onClick={() => setPinned(v => !v)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: pinned ? '#F0B90B10' : '#0B0E11',
              border: `1px solid ${pinned ? '#F0B90B40' : '#2B3139'}`,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 18 }}>{pinned ? '📌' : '📍'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#EAECEF' }}>Pin to Top</div>
                <div style={{ fontSize: 11, color: '#5E6673' }}>This match will appear at the top of everyone's list</div>
              </div>
              <div style={{
                width: 40, height: 22, borderRadius: 11, padding: '2px',
                background: pinned ? '#F0B90B' : '#2B3139', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transform: pinned ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }} />
              </div>
            </button>

            {/* Info note */}
            <div style={{
              background: '#1E3A5F20', border: '1px solid #3B82F630',
              borderRadius: 10, padding: '10px 12px', marginBottom: 12,
            }}>
              <p style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, marginBottom: 3 }}>ℹ️ How it works</p>
              <p style={{ fontSize: 11, color: '#60a5faaa', lineHeight: 1.5 }}>
                Enter the exact team names as they appear in the game. When a match is generated between these two teams, the control activates automatically. Score is guided toward the target; locked in the final 3 minutes.
              </p>
            </div>

            <button onClick={handleSave} disabled={saving || !homeTeam.trim() || !awayTeam.trim()} style={{
              width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
              fontWeight: 900, fontSize: 14, border: 'none',
              background: saving || !homeTeam.trim() || !awayTeam.trim()
                ? '#2B3139'
                : 'linear-gradient(135deg, #F0B90B, #d97706)',
              color: saving || !homeTeam.trim() || !awayTeam.trim() ? '#5E6673' : '#000',
              transition: 'all 0.2s',
            }}>
              {saving ? 'Saving…' : '✓ Apply Control'}
            </button>
          </div>
        )}

        {/* ── CONTROLS LIST ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#5E6673' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
            <p style={{ fontSize: 13 }}>Loading…</p>
          </div>
        ) : controls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#EAECEF', marginBottom: 6 }}>No Active Controls</p>
            <p style={{ fontSize: 12, color: '#5E6673' }}>Use "+ Add Control" to steer a match result or score</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#5E6673', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Active Controls
              </p>
              <p style={{ fontSize: 10, color: '#5E6673' }}>
                Updated {Math.floor((Date.now() - lastRefresh) / 1000)}s ago
              </p>
            </div>
            {controls.map(ctrl => (
              <ControlCard
                key={ctrl.id}
                ctrl={ctrl}
                deleting={deletingId === ctrl.id}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ControlCard({ ctrl, deleting, onDelete }: {
  ctrl: MatchControl;
  deleting: boolean;
  onDelete: (id: string) => void;
}) {
  const hasScore = ctrl.targetScore !== undefined;

  const typeLabel = hasScore
    ? `⚽  ${ctrl.targetScore!.h} – ${ctrl.targetScore!.a}`
    : RESULT_LABELS[ctrl.targetResult || ''] || '—';

  const typeColor = hasScore
    ? '#F0B90B'
    : RESULT_COLORS[ctrl.targetResult || ''] || '#848E9C';

  const typeBg = hasScore ? '#F0B90B18' : `${typeColor}18`;

  return (
    <div style={{
      background: '#161A1E',
      border: `1px solid ${ctrl.pinned ? '#F0B90B40' : '#2B3139'}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Top bar — color indicator */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${typeColor}, transparent)` }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Row 1: status badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          {ctrl.pinned && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
              background: '#F0B90B20', color: '#F0B90B', border: '1px solid #F0B90B40',
              letterSpacing: '0.06em',
            }}>📌 PINNED</span>
          )}
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
            background: typeBg, color: typeColor, border: `1px solid ${typeColor}40`,
            letterSpacing: '0.04em',
          }}>
            {hasScore ? 'EXACT SCORE' : 'RESULT'}
          </span>
          <span style={{ fontSize: 10, color: '#5E6673', marginLeft: 'auto' }}>
            {timeAgo(ctrl.createdAt)}
          </span>
        </div>

        {/* Row 2: Teams */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#EAECEF', flex: 1 }}>{ctrl.homeTeam}</span>
          <span style={{
            fontSize: 9, color: '#5E6673', padding: '2px 6px',
            border: '1px solid #2B3139', borderRadius: 4, fontWeight: 700,
          }}>VS</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#EAECEF', flex: 1, textAlign: 'right' }}>{ctrl.awayTeam}</span>
        </div>

        {/* Row 3: Target + delete */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            background: '#0B0E11', border: `1px solid ${typeColor}40`,
            borderRadius: 8, padding: '7px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 9, color: '#5E6673', fontWeight: 600, textTransform: 'uppercase' }}>Target:</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: typeColor }}>{typeLabel}</span>
          </div>
          <button
            onClick={() => onDelete(ctrl.id)}
            disabled={deleting}
            style={{
              width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
              background: '#F6465D18', border: '1px solid #F6465D40', color: '#F6465D',
              fontWeight: 900, fontSize: 15, display: 'flex', alignItems: 'center',
              justifyContent: 'center', opacity: deleting ? 0.4 : 1, transition: 'opacity 0.2s',
            }}
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>
    </div>
  );
}
