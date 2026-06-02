import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { casinoApi, type PlayResult } from '../../lib/casino-api';

/* ════════════════════════ THEME ════════════════════════ */
const GOLD = '#F0B90B';
const BG = '#0B0E11';
const CARD = '#181A20';
const BORDER = '#2B3139';
const GREEN = '#0ECB81';
const RED = '#F6465D';
const TEXT = '#EAECEF';
const SUB = '#848E9C';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ════════════════════════ 3D: DICE ════════════════════════ */
function DiceMesh({ rolling, result }: { rolling: boolean; result: number | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const spin = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (rolling) {
      spin.current += dt;
      ref.current.rotation.x += dt * 8;
      ref.current.rotation.y += dt * 10;
      ref.current.position.y = Math.abs(Math.sin(spin.current * 6)) * 0.6;
    } else {
      ref.current.rotation.x += (0 - ref.current.rotation.x) * 0.1;
      ref.current.rotation.y += (0 - ref.current.rotation.y) * 0.1;
      ref.current.position.y += (0 - ref.current.position.y) * 0.1;
    }
  });
  const color = result == null ? GOLD : result === 1 ? GREEN : RED;
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.25} />
    </mesh>
  );
}

/* ════════════════════════ 3D: COIN ════════════════════════ */
function CoinMesh({ spinning, landOn }: { spinning: boolean; landOn: 'heads' | 'tails' | null }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (spinning) {
      ref.current.rotation.x += dt * 18;
    } else if (landOn) {
      const target = landOn === 'heads' ? 0 : Math.PI;
      ref.current.rotation.x += (target - (ref.current.rotation.x % (Math.PI * 2))) * 0.12;
    }
  });
  return (
    <mesh ref={ref} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[1.2, 1.2, 0.28, 48]} />
      <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} />
    </mesh>
  );
}

/* ════════════════════════ 3D: ROCKET ════════════════════════ */
function RocketMesh({ progress, exploded }: { progress: number; exploded: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const x = -2.4 + progress * 4.8;
    const y = -1.6 + progress * 3.2;
    ref.current.position.x += (x - ref.current.position.x) * 0.2;
    ref.current.position.y += (y - ref.current.position.y) * 0.2;
    ref.current.rotation.z = -Math.PI / 4;
    if (exploded) ref.current.rotation.z += dt * 12;
  });
  if (exploded) {
    return (
      <group ref={ref}>
        <mesh><sphereGeometry args={[0.7, 16, 16]} /><meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.8} /></mesh>
      </group>
    );
  }
  return (
    <group ref={ref}>
      <mesh><coneGeometry args={[0.35, 1.1, 16]} /><meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.3} /></mesh>
      <mesh position={[0, -0.75, 0]}><coneGeometry args={[0.28, 0.5, 16]} /><meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.6} /></mesh>
    </group>
  );
}

function Scene({ children }: { children: ReactNode }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={GOLD} />
      {children}
    </Canvas>
  );
}

/* ════════════════════════ SHARED UI ════════════════════════ */
function BetBar({
  bet, setBet, balance, disabled,
}: { bet: string; setBet: (v: string) => void; balance: number; disabled: boolean }) {
  const set = (fn: (n: number) => number) => {
    const cur = parseFloat(bet) || 0;
    setBet(String(Math.max(0.1, Math.round(fn(cur) * 100) / 100)));
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SUB, marginBottom: 6 }}>
        <span>Bahis (USDT)</span>
        <span>Bakiye: <b style={{ color: TEXT }}>{fmt(balance)}</b></span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={bet} disabled={disabled}
          onChange={(e) => setBet(e.target.value.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          style={{ flex: 1, background: '#0B0E11', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: '10px 12px', fontSize: 15, fontWeight: 700 }}
        />
        <button onClick={() => set((n) => n / 2)} disabled={disabled} style={miniBtn}>½</button>
        <button onClick={() => set((n) => n * 2)} disabled={disabled} style={miniBtn}>2×</button>
        <button onClick={() => setBet(String(Math.floor(balance * 100) / 100 || 0.1))} disabled={disabled} style={miniBtn}>Max</button>
      </div>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  background: BORDER, color: TEXT, border: 'none', borderRadius: 8,
  padding: '0 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const playBtn = (enabled: boolean): React.CSSProperties => ({
  width: '100%', background: enabled ? GOLD : '#5a4d12', color: '#1A1200',
  border: 'none', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 800,
  cursor: enabled ? 'pointer' : 'not-allowed', marginTop: 4,
});

function ResultToast({ r }: { r: PlayResult | null }) {
  if (!r) return null;
  return (
    <div style={{
      textAlign: 'center', padding: '10px', borderRadius: 10, marginTop: 12,
      background: r.won ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)',
      border: `1px solid ${r.won ? GREEN : RED}`,
      color: r.won ? GREEN : RED, fontWeight: 800, fontSize: 15,
    }}>
      {r.won ? `KAZANDIN +${fmt(r.payout)} USDT (${r.multiplier}×)` : `KAYBETTİN −${fmt(r.payout || 0) || ''}`}
      {!r.won && ' '}
    </div>
  );
}

/* ════════════════════════ DICE GAME ════════════════════════ */
function DiceGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [target, setTarget] = useState(50);
  const [dir, setDir] = useState<'over' | 'under'>('under');
  const [rolling, setRolling] = useState(false);
  const [res, setRes] = useState<PlayResult | null>(null);
  const [err, setErr] = useState('');

  const chance = dir === 'under' ? target : 100 - target;
  const mult = Math.floor((0.97 / (chance / 100)) * 100) / 100;

  const play = async () => {
    setErr(''); setRes(null); setRolling(true);
    try {
      const r = await casinoApi.playDice(parseFloat(bet) || 0, target, dir);
      setTimeout(() => { setRolling(false); setRes(r); onBalance(r.balance); }, 1100);
    } catch (e: any) { setRolling(false); setErr(e.message || 'Hata'); }
  };

  return (
    <div>
      <div style={{ height: 180, background: '#0B0E11', borderRadius: 12, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <Scene><DiceMesh rolling={rolling} result={res ? (res.won ? 1 : 0) : null} /></Scene>
        {res && !rolling && (
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', fontSize: 26, fontWeight: 900, color: res.won ? GREEN : RED }}>
            {res.outcome.roll?.toFixed(2)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['under', 'over'] as const).map((d) => (
          <button key={d} onClick={() => setDir(d)} style={{
            flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${dir === d ? GOLD : BORDER}`,
            background: dir === d ? 'rgba(240,185,11,0.12)' : 'transparent',
            color: dir === d ? GOLD : SUB,
          }}>{d === 'under' ? `Altında ▼ ${target}` : `Üstünde ▲ ${target}`}</button>
        ))}
      </div>
      <input type="range" min={2} max={98} value={target} onChange={(e) => setTarget(Number(e.target.value))}
        style={{ width: '100%', accentColor: GOLD, marginBottom: 6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SUB, marginBottom: 14 }}>
        <span>Kazanma şansı: <b style={{ color: TEXT }}>{chance}%</b></span>
        <span>Çarpan: <b style={{ color: GOLD }}>{mult}×</b></span>
      </div>

      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={rolling} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={play} disabled={rolling} style={playBtn(!rolling)}>{rolling ? 'Atılıyor…' : 'Zar At'}</button>
      <ResultToast r={!rolling ? res : null} />
    </div>
  );
}

/* ════════════════════════ COIN FLIP GAME ════════════════════════ */
function CoinGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState<PlayResult | null>(null);
  const [err, setErr] = useState('');

  const play = async () => {
    setErr(''); setRes(null); setSpinning(true);
    try {
      const r = await casinoApi.playCoin(parseFloat(bet) || 0, side);
      setTimeout(() => { setSpinning(false); setRes(r); onBalance(r.balance); }, 1400);
    } catch (e: any) { setSpinning(false); setErr(e.message || 'Hata'); }
  };

  return (
    <div>
      <div style={{ height: 180, background: '#0B0E11', borderRadius: 12, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <Scene><CoinMesh spinning={spinning} landOn={res && !spinning ? (res.outcome.result || null) : null} /></Scene>
        {res && !spinning && (
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', fontSize: 18, fontWeight: 900, color: res.won ? GREEN : RED }}>
            {res.outcome.result === 'heads' ? 'YAZI' : 'TURA'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['heads', 'tails'] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)} style={{
            flex: 1, padding: '14px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 15,
            border: `1px solid ${side === s ? GOLD : BORDER}`,
            background: side === s ? 'rgba(240,185,11,0.12)' : 'transparent',
            color: side === s ? GOLD : SUB,
          }}>{s === 'heads' ? '🪙 YAZI' : '🪙 TURA'}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: SUB, marginBottom: 14, textAlign: 'center' }}>Çarpan: <b style={{ color: GOLD }}>1.94×</b> · Kazanma şansı %50</div>
      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={spinning} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={play} disabled={spinning} style={playBtn(!spinning)}>{spinning ? 'Atılıyor…' : 'Parayı At'}</button>
      <ResultToast r={!spinning ? res : null} />
    </div>
  );
}

/* ════════════════════════ CRASH GAME ════════════════════════ */
function CrashGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [cashout, setCashout] = useState('2.00');
  const [running, setRunning] = useState(false);
  const [mult, setMult] = useState(1);
  const [res, setRes] = useState<PlayResult | null>(null);
  const [exploded, setExploded] = useState(false);
  const [err, setErr] = useState('');
  const raf = useRef<number>(0);

  const targetMult = parseFloat(cashout) || 1.01;

  const play = async () => {
    setErr(''); setRes(null); setExploded(false); setMult(1); setRunning(true);
    let result: PlayResult;
    try {
      result = await casinoApi.playCrash(parseFloat(bet) || 0, targetMult);
    } catch (e: any) { setRunning(false); setErr(e.message || 'Hata'); return; }

    const crashAt = result.outcome.crash || 1;
    const stopAt = result.won ? (result.outcome.cashout || crashAt) : crashAt;
    const start = performance.now();
    const dur = 600 + Math.min(2600, Math.log(stopAt) * 1400);
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const cur = 1 + (stopAt - 1) * t;
      setMult(cur);
      if (t < 1) { raf.current = requestAnimationFrame(tick); }
      else {
        if (!result.won) setExploded(true);
        setTimeout(() => { setRunning(false); setRes(result); onBalance(result.balance); }, 350);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const progress = Math.min(1, Math.log(mult) / Math.log(Math.max(2, (res?.outcome.crash || targetMult))));

  return (
    <div>
      <div style={{ height: 180, background: '#0B0E11', borderRadius: 12, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <Scene><RocketMesh progress={progress} exploded={exploded} /></Scene>
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', fontSize: 34, fontWeight: 900, color: exploded ? RED : (running ? GOLD : (res?.won ? GREEN : TEXT)) }}>
          {mult.toFixed(2)}×
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: SUB, marginBottom: 6 }}>Otomatik çekim çarpanı</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={cashout} disabled={running} inputMode="decimal"
            onChange={(e) => setCashout(e.target.value.replace(/[^0-9.]/g, ''))}
            style={{ flex: 1, background: '#0B0E11', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: '10px 12px', fontSize: 15, fontWeight: 700 }} />
          {['1.50', '2.00', '5.00'].map((v) => (
            <button key={v} onClick={() => setCashout(v)} disabled={running} style={miniBtn}>{v}×</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: SUB, marginTop: 6 }}>Kazanırsan <b style={{ color: GOLD }}>{(parseFloat(bet || '0') * targetMult).toFixed(2)} USDT</b> alırsın</div>
      </div>
      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={running} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={play} disabled={running} style={playBtn(!running)}>{running ? 'Uçuyor…' : 'Fırlat'}</button>
      <ResultToast r={!running ? res : null} />
    </div>
  );
}

/* ════════════════════════ HUB / SHELL ════════════════════════ */
const GAMES = [
  { id: 'dice', name: 'Zar', emoji: '🎲', desc: 'Altında / üstünde tahmin et', color: '#F0B90B' },
  { id: 'coin', name: 'Yazı Tura', emoji: '🪙', desc: '50/50 · 1.94× çarpan', color: '#0ECB81' },
  { id: 'crash', name: 'Crash', emoji: '🚀', desc: 'Patlamadan önce çek', color: '#F6465D' },
] as const;

export default function Casino3D({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<'dice' | 'coin' | 'crash' | null>(null);
  const [balance, setBalance] = useState(0);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalance = useCallback(async (id: string) => {
    const { data } = await supabase.from('user_balances').select('balance').eq('user_id', id).eq('symbol', 'USDT').limit(1);
    setBalance(data && data[0] ? Number(data[0].balance) : 0);
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (u?.id) { setUid(u.id); await loadBalance(u.id); }
      setLoading(false);
    })();
  }, [loadBalance]);

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, background: CARD, position: 'sticky', top: 0, zIndex: 2 }}>
      {active ? (
        <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: TEXT, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>‹</button>
      ) : null}
      <div style={{ fontWeight: 800, fontSize: 17, color: TEXT, flex: 1 }}>
        {active ? GAMES.find((g) => g.id === active)?.name : '🎮 BNC Games'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: GOLD, background: '#0B0E11', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '6px 12px' }}>
        {fmt(balance)} USDT
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: SUB, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 9999, display: 'flex', flexDirection: 'column', color: TEXT }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, maxWidth: 560, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: SUB, marginTop: 60 }}>Yükleniyor…</div>
        ) : !uid ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Oynamak için giriş yap</div>
            <div style={{ color: SUB, fontSize: 13 }}>Oyunlar gerçek USDT bakiyenle oynanır. Lütfen hesabına giriş yap.</div>
          </div>
        ) : !active ? (
          <>
            <div style={{ fontSize: 13, color: SUB, marginBottom: 14 }}>Gerçek USDT ile oyna. Tüm sonuçlar sunucuda belirlenir (adil oyun).</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {GAMES.map((g) => (
                <button key={g.id} onClick={() => setActive(g.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 34, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0E11', borderRadius: 12, border: `1px solid ${g.color}55` }}>{g.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{g.name}</div>
                    <div style={{ fontSize: 12.5, color: SUB }}>{g.desc}</div>
                  </div>
                  <div style={{ color: g.color, fontSize: 20 }}>›</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 11.5, color: SUB, textAlign: 'center', lineHeight: 1.5 }}>
              Min bahis 0.1 · Maks 1000 USDT · Ev avantajı %3
            </div>
          </>
        ) : (
          <>
            {active === 'dice' && <DiceGame balance={balance} onBalance={setBalance} />}
            {active === 'coin' && <CoinGame balance={balance} onBalance={setBalance} />}
            {active === 'crash' && <CrashGame balance={balance} onBalance={setBalance} />}
          </>
        )}
      </div>
    </div>
  );
}
