import { useState, useRef, useEffect, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';
import { casinoApi, type PlayResult } from '../../lib/casino-api';
import { GOLD, GREEN, RED, TEXT, SUB, BORDER, fmt, BetBar, playBtn } from './shared';

const TIERS = [0, 0.4, 1, 2, 5, 25, 150];

type Refs = { shake: MutableRefObject<number>; open: MutableRefObject<number>; done: MutableRefObject<boolean> };

function Chest({ r }: { r: Refs }) {
  const lid = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (body.current) {
      const s = r.shake.current;
      body.current.position.x = s > 0 ? Math.sin(t.current * 40) * 0.06 * s : 0;
      body.current.rotation.z = s > 0 ? Math.sin(t.current * 38) * 0.04 * s : 0;
    }
    if (lid.current) {
      const target = -Math.min(1, r.open.current) * 2.0;
      lid.current.rotation.x += (target - lid.current.rotation.x) * 0.18;
    }
  });
  return (
    <group scale={1.4}>
      <group ref={body}>
        {/* base */}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[1.7, 1, 1.2]} />
          <meshStandardMaterial color="#5a3a14" metalness={0.4} roughness={0.45} />
        </mesh>
        {/* gold trim */}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[1.78, 0.16, 1.28]} />
          <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.2} emissive={GOLD} emissiveIntensity={0.3} />
        </mesh>
        {/* lid hinged at back-top */}
        <group ref={lid} position={[0, 0.15, -0.6]}>
          <mesh position={[0, 0.18, 0.6]}>
            <boxGeometry args={[1.7, 0.5, 1.2]} />
            <meshStandardMaterial color="#6b4518" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.42, 0.6]}>
            <boxGeometry args={[1.78, 0.12, 1.28]} />
            <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.2} emissive={GOLD} emissiveIntensity={0.3} />
          </mesh>
        </group>
        {/* lock */}
        <mesh position={[0, -0.15, 0.62]}>
          <boxGeometry args={[0.28, 0.34, 0.08]} />
          <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.15} emissive={GOLD} emissiveIntensity={0.4} />
        </mesh>
      </group>
      {/* light beam + sparkles on open */}
      {r.done.current && (
        <>
          <pointLight position={[0, 1, 1]} intensity={3} color={GOLD} distance={6} />
          <Sparkles count={80} scale={3} size={10} speed={1.5} color={GOLD} position={[0, 1, 0]} />
        </>
      )}
    </group>
  );
}

function Scene({ r }: { r: Refs }) {
  return (
    <Canvas camera={{ position: [0, 0.6, 5], fov: 50 }} gl={{ alpha: true }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <pointLight position={[-3, 2, 3]} intensity={0.6} color="#8ab4ff" />
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.3}>
        <Chest r={r} />
      </Float>
      <Sparkles count={40} scale={10} size={2} speed={0.3} color="#ffffff" opacity={0.45} />
    </Canvas>
  );
}

export default function LootboxGame({ balance, onBalance }: { balance: number; onBalance: (n: number) => void }) {
  const [bet, setBet] = useState('1');
  const [phase, setPhase] = useState<'idle' | 'opening' | 'done'>('idle');
  const [res, setRes] = useState<PlayResult | null>(null);
  const [err, setErr] = useState('');

  const shake = useRef(0); const open = useRef(0); const done = useRef(false);
  const raf = useRef(0);
  const refs: Refs = { shake, open, done };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = async () => {
    setErr(''); setRes(null); done.current = false; open.current = 0;
    let r: PlayResult;
    try { r = await casinoApi.playLootbox(parseFloat(bet) || 0); }
    catch (e: any) { setErr(e.message || 'Hata'); return; }
    setPhase('opening');
    const t0 = performance.now();
    const tick = () => {
      const e = performance.now() - t0;
      if (e < 1100) { shake.current = Math.min(1, e / 600); raf.current = requestAnimationFrame(tick); }
      else {
        shake.current = 0; done.current = true;
        open.current = Math.min(1, (e - 1100) / 500);
        if (e < 1900) raf.current = requestAnimationFrame(tick);
        else { setPhase('done'); setRes(r); onBalance(r.balance); }
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const opening = phase === 'opening';
  const m = res?.outcome.multiplier ?? 0;

  return (
    <div>
      <div style={{ height: 300, borderRadius: 16, marginBottom: 12, position: 'relative', overflow: 'hidden', background: 'radial-gradient(120% 100% at 50% 30%,#241a3a 0%,#0d0a18 75%)', border: `1px solid ${BORDER}` }}>
        <Scene r={refs} />
        {phase === 'done' && res && (
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: res.won ? GOLD : RED, textShadow: `0 0 24px ${res.won ? GOLD : RED}` }}>{m}×</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: res.won ? GREEN : SUB, marginTop: 2 }}>
              {res.won ? `+${fmt(res.payout)} USDT` : (m > 0 ? `${fmt(res.payout)} USDT` : 'Boş çıktı')}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
        {TIERS.map((tt) => (
          <div key={tt} style={{
            flex: '1 0 13%', textAlign: 'center', fontSize: 11, fontWeight: 800, padding: '6px 0', borderRadius: 7,
            border: `1px solid ${tt >= 25 ? RED : tt >= 2 ? '#FF9F0A' : tt >= 1 ? GOLD : BORDER}`,
            color: tt >= 25 ? RED : tt >= 2 ? '#FF9F0A' : tt >= 1 ? GOLD : SUB,
          }}>{tt}×</div>
        ))}
      </div>

      <BetBar bet={bet} setBet={setBet} balance={balance} disabled={opening} />
      {err && <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <button onClick={start} disabled={opening} style={playBtn(!opening)}>{opening ? 'AÇILIYOR…' : '📦 KASAYI AÇ'}</button>
    </div>
  );
}
