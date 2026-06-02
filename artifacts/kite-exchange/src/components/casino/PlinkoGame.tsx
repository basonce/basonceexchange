import { useState, useRef, useEffect, useMemo, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Instances, Instance, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { casinoApi, type PlayResult, type PlinkoRisk } from '../../lib/casino-api';
import { GOLD, GREEN, RED, TEXT, SUB, BORDER, fmt, BetBar, playBtn } from './shared';

const PLINKO_TABLES: Record<PlinkoRisk, number[]> = {
  low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  med: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
};

const ROWS = 12;            // visual peg rows
const TOP = 3.4;
const BOT = -3.2;
const SPACING = 0.62;

type Refs = { prog: MutableRefObject<number>; bucketX: MutableRefObject<number>; active: MutableRefObject<boolean> };

function Pegs() {
  const pos = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let r = 1; r <= ROWS; r++) {
      const y = TOP - (r / ROWS) * (TOP - BOT) * 0.92;
      for (let i = 0; i <= r; i++) arr.push([(i - r / 2) * SPACING, y, 0]);
    }
    return arr;
  }, []);
  return (
    <Instances limit={200}>
      <sphereGeometry args={[0.09, 12, 12]} />
      <meshStandardMaterial color="#cfd8e3" metalness={0.3} roughness={0.4} emissive="#3a4350" emissiveIntensity={0.3} />
      {pos.map((p, i) => <Instance key={i} position={p} />)}
    </Instances>
  );
}

function Ball({ r }: { r: Refs }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    if (!r.active.current) { ref.current.visible = false; return; }
    ref.current.visible = true;
    const p = r.prog.current;
    const y = TOP - p * (TOP - BOT);
    const wob = Math.sin(p * ROWS * Math.PI) * 0.5 * (1 - p);
    ref.current.position.set(r.bucketX.current * p + wob, y, 0.2);
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.18, 20, 20]} />
      <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.6} metalness={0.6} roughness={0.2} />
    </mesh>
  );
}

function Scene({ r }: { r: Refs }) {
  return (
    <Canvas camera={{ position: [0, 0, 8.5], fov: 50 }} gl={{ alpha: true }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 5, 5]} intensity={1.2} />
      <pointLight position={[0, -3, 3]} intensity={0.7} color={GOLD} />
      <Pegs />
      <Ball r={r} />
      <Sparkles count={30} scale={9} size={2} speed={0.25} color="#ffffff" opacity={0.4} />
    </Canvas>
  );
}

function chipColor(m: number) {
  if (m >= 10) return RED;
  if (m >= 2) return '#FF9F0A';
  if (m >= 1) return GOLD;
  return '#3a4350';
}

export default function PlinkoGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [risk, setRisk] = useState<PlinkoRisk>('med');
  const [phase, setPhase] = useState<'idle' | 'drop' | 'done'>('idle');
  const [res, setRes] = useState<PlayResult | null>(null);
  const [winBucket, setWinBucket] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const prog = useRef(0); const bucketX = useRef(0); const active = useRef(false);
  const raf = useRef(0);
  const refs: Refs = { prog, bucketX, active };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const table = PLINKO_TABLES[risk];

  const drop = async () => {
    setErr(''); setRes(null); setWinBucket(null);
    let r: PlayResult;
    try { r = await casinoApi.playPlinko(parseFloat(bet) || 0, risk); }
    catch (e: any) { setErr(e.message || 'Hata'); return; }

    const bucket = r.outcome.bucket ?? 8;
    bucketX.current = (bucket - 8) * SPACING; // 17 buckets centred
    prog.current = 0; active.current = true;
    setPhase('drop');
    const start = performance.now(); const dur = 1700;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      prog.current = t * t * (3 - 2 * t); // smoothstep
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else { setWinBucket(bucket); setPhase('done'); setRes(r); onBalance(r.balance); }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const dropping = phase === 'drop';

  return (
    <div>
      <div style={{ height: 300, borderRadius: 16, marginBottom: 12, position: 'relative', overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 0%,#16263a 0%,#0b1320 70%)', border: `1px solid ${BORDER}` }}>
        <Scene r={refs} />
        {/* bucket chips */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 2 }}>
          {table.map((m, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: 800, padding: '4px 0', borderRadius: 5,
              background: winBucket === i ? chipColor(m) : `${chipColor(m)}33`,
              color: winBucket === i ? '#1A1200' : chipColor(m),
              border: `1px solid ${chipColor(m)}66`,
              transform: winBucket === i ? 'translateY(-3px) scale(1.08)' : 'none', transition: 'all .2s',
            }}>{m}×</div>
          ))}
        </div>
        {phase === 'done' && res && (
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', fontSize: 18, fontWeight: 900, color: res.won ? GREEN : RED }}>
            {res.outcome.multiplier}× · {res.won ? '+' : ''}{fmt(res.payout)} USDT
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['low', 'med', 'high'] as const).map((rk) => (
          <button key={rk} onClick={() => setRisk(rk)} disabled={dropping} style={{
            flex: 1, padding: '10px', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            border: `1px solid ${risk === rk ? GOLD : BORDER}`,
            background: risk === rk ? 'rgba(240,185,11,0.12)' : 'transparent',
            color: risk === rk ? GOLD : SUB,
          }}>{rk === 'low' ? 'Düşük' : rk === 'med' ? 'Orta' : 'Yüksek'}</button>
        ))}
      </div>

      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={dropping} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={drop} disabled={dropping} style={playBtn(!dropping)}>{dropping ? 'DÜŞÜYOR…' : '🎯 TOPU BIRAK'}</button>
    </div>
  );
}
