import { useState, useRef, useEffect, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Trail, Sparkles, Cloud, Clouds, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { casinoApi, type PlayResult } from '../../lib/casino-api';
import { GOLD, GREEN, RED, TEXT, SUB, BG, BORDER, fmt, BetBar, playBtn } from './shared';

/* ── kite diamond geometry (built once) ── */
function makeKiteGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.05);
  s.lineTo(0.62, 0.18);
  s.lineTo(0, -1.15);
  s.lineTo(-0.62, 0.18);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}
const KITE_GEO = makeKiteGeo();

type Refs = {
  prog: MutableRefObject<number>;     // 0..1 flight progress
  flying: MutableRefObject<boolean>;
  exploded: MutableRefObject<boolean>;
};

function Kite({ r }: { r: Refs }) {
  const grp = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    if (!grp.current) return;
    const p = r.prog.current;
    // path: sweeping arc from bottom-left up to top-right
    const x = -3.2 + p * 6.0;
    const y = -2.4 + Math.pow(p, 0.85) * 4.6;
    if (r.exploded.current) {
      grp.current.position.y -= dt * 4.5;        // tumble & fall
      grp.current.rotation.z += dt * 9;
      grp.current.scale.setScalar(Math.max(0, grp.current.scale.x - dt * 1.5));
    } else {
      grp.current.position.x += (x - grp.current.position.x) * 0.18;
      grp.current.position.y += (y - grp.current.position.y) * 0.18;
      grp.current.rotation.z = -0.5 + Math.sin(t.current * 3) * 0.12;
      grp.current.scale.setScalar(1);
    }
    // waving tail
    if (tail.current) {
      tail.current.children.forEach((c, i) => {
        c.position.x = Math.sin(t.current * 6 - i * 0.7) * 0.12;
      });
    }
  });

  return (
    <group ref={grp} position={[-3.2, -2.4, 0]}>
      <Trail width={2.4} length={7} color={new THREE.Color(GOLD)} attenuation={(w) => w * w}>
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={GOLD} />
        </mesh>
      </Trail>
      {/* kite body */}
      <mesh geometry={KITE_GEO}>
        <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.25} side={THREE.DoubleSide} emissive={GOLD} emissiveIntensity={0.18} />
      </mesh>
      {/* accent panels */}
      <mesh geometry={KITE_GEO} scale={0.5} position={[0, -0.05, 0.01]}>
        <meshStandardMaterial color={RED} side={THREE.DoubleSide} emissive={RED} emissiveIntensity={0.25} />
      </mesh>
      {/* spars */}
      <mesh position={[0, -0.05, 0.02]}><boxGeometry args={[0.04, 2.2, 0.04]} /><meshStandardMaterial color="#1A1200" /></mesh>
      <mesh position={[0, 0.18, 0.02]}><boxGeometry args={[1.25, 0.04, 0.04]} /><meshStandardMaterial color="#1A1200" /></mesh>
      {/* tail */}
      <group ref={tail} position={[0, -1.15, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[0, -i * 0.32 - 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.16, 0.16, 0.02]} />
            <meshStandardMaterial color={i % 2 ? RED : '#FFFFFF'} emissive={i % 2 ? RED : '#444'} emissiveIntensity={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Burst({ r, color }: { r: Refs; color: string }) {
  const [on, setOn] = useState(false);
  useFrame(() => { if (r.exploded.current !== on) setOn(r.exploded.current); });
  if (!on) return null;
  return <Sparkles count={60} scale={6} size={8} speed={2} color={color} noise={2} />;
}

function Scene({ r }: { r: Refs }) {
  return (
    <Canvas camera={{ position: [0, 0, 9], fov: 50 }} gl={{ alpha: true, antialias: true }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <Stars radius={40} depth={20} count={600} factor={3} fade speed={1} />
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} segments={20} bounds={[10, 3, 2]} volume={6} color="#9fb4c7" opacity={0.35} position={[-2, 2, -4]} />
        <Cloud seed={3} segments={18} bounds={[10, 3, 2]} volume={6} color="#c7d3df" opacity={0.3} position={[3, -1, -5]} />
      </Clouds>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.4}>
        <Kite r={r} />
      </Float>
      <Sparkles count={40} scale={12} size={2} speed={0.3} color="#ffffff" opacity={0.5} />
      <Burst r={r} color={RED} />
    </Canvas>
  );
}

export default function KiteGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [target, setTarget] = useState(2.0);
  const [phase, setPhase] = useState<'idle' | 'flying' | 'done'>('idle');
  const [mult, setMult] = useState(1);
  const [res, setRes] = useState<PlayResult | null>(null);
  const [err, setErr] = useState('');

  const prog = useRef(0);
  const flying = useRef(false);
  const exploded = useRef(false);
  const raf = useRef(0);
  const refs: Refs = { prog, flying, exploded };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const launch = async () => {
    setErr(''); setRes(null); setMult(1);
    prog.current = 0; exploded.current = false; flying.current = true;
    setPhase('flying');
    let r: PlayResult;
    try {
      r = await casinoApi.playCrash(parseFloat(bet) || 0, target);
    } catch (e: any) { flying.current = false; setPhase('idle'); setErr(e.message || 'Hata'); return; }

    const crash = r.outcome.crash || 1;
    const stopAt = r.won ? (r.outcome.cashout || crash) : crash;
    const start = performance.now();
    const dur = 700 + Math.min(4200, Math.log(Math.max(1.01, stopAt)) * 1900);

    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const cur = 1 + (stopAt - 1) * t;
      setMult(cur);
      prog.current = Math.min(1, Math.log(Math.max(1.01, cur)) / Math.log(Math.max(2, stopAt)));
      if (t < 1) { raf.current = requestAnimationFrame(tick); }
      else {
        flying.current = false;
        if (!r.won) exploded.current = true;
        setTimeout(() => { setPhase('done'); setRes(r); onBalance(r.balance); }, r.won ? 250 : 700);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const flyingNow = phase === 'flying';
  const hudColor = exploded.current ? RED : flyingNow ? (mult < 2 ? GOLD : mult < 10 ? '#FF9F0A' : RED) : (res?.won ? GREEN : TEXT);
  const potWin = (parseFloat(bet || '0') * target);

  return (
    <div>
      <div style={{
        height: 280, borderRadius: 16, marginBottom: 14, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg,#0a1a2e 0%,#13314f 45%,#1d4e6b 100%)',
        border: `1px solid ${BORDER}`,
      }}>
        <Scene r={refs} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: hudColor, textShadow: `0 0 24px ${hudColor}aa`, lineHeight: 1 }}>
            {mult.toFixed(2)}×
          </div>
          {flyingNow && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#cfe0ee' }}>
              Hedef <b style={{ color: GOLD }}>{target.toFixed(2)}×</b> · Olası kazanç <b style={{ color: GREEN }}>{fmt(potWin)}</b>
            </div>
          )}
          {phase === 'done' && res && (
            <div style={{ marginTop: 10, fontSize: 16, fontWeight: 900, color: res.won ? GREEN : RED }}>
              {res.won ? `ÇEKİLDİ · +${fmt(res.payout)} USDT` : `İP KOPTU · ${(res.outcome.crash || 1).toFixed(2)}×`}
            </div>
          )}
        </div>
      </div>

      {/* auto cashout target */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SUB, marginBottom: 6 }}>
          <span>Otomatik çekim çarpanı</span>
          <span style={{ color: GOLD, fontWeight: 800 }}>{target.toFixed(2)}×</span>
        </div>
        <input type="range" min={1.1} max={20} step={0.1} value={target} disabled={flyingNow}
          onChange={(e) => setTarget(Number(e.target.value))} style={{ width: '100%', accentColor: GOLD }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[1.5, 2, 3, 5, 10].map((v) => (
            <button key={v} onClick={() => setTarget(v)} disabled={flyingNow} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${target === v ? GOLD : BORDER}`,
              background: target === v ? 'rgba(240,185,11,0.12)' : 'transparent',
              color: target === v ? GOLD : SUB,
            }}>{v}×</button>
          ))}
        </div>
      </div>

      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={flyingNow} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={launch} disabled={flyingNow} style={playBtn(!flyingNow)}>
        {flyingNow ? 'UÇUYOR…' : '🪁 FIRLAT'}
      </button>
    </div>
  );
}
