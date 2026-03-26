import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';

interface Props { onUnlock: () => void; }

export default function PinLock({ onUnlock }: Props) {
  const { settings } = useStore();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (lockTimer > 0) {
      const t = setTimeout(() => setLockTimer(t => t - 1), 1000);
      return () => clearTimeout(t);
    } else if (locked && lockTimer === 0) { setLocked(false); setAttempts(0); }
  }, [lockTimer, locked]);

  function press(digit: string) {
    if (locked || input.length >= 6) return;
    const next = input + digit;
    setInput(next);
    if (next.length === settings.pin.length) setTimeout(() => verify(next), 80);
  }

  function verify(val: string) {
    if (val === settings.pin) { setError(false); onUnlock(); return; }
    setError(true);
    setShake(true);
    setTimeout(() => { setShake(false); setInput(''); setError(false); }, 650);
    const n = attempts + 1;
    setAttempts(n);
    if (n >= 5) { setLocked(true); setLockTimer(30); setInput(''); }
  }

  function del() { if (!locked) { setInput(i => i.slice(0,-1)); setError(false); } }

  const pinLen = settings.pin.length;
  const KEYS = ['1','2','3','4','5','6','7','8','9'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#050505' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position:'absolute', top:'15%', left:'50%', transform:'translateX(-50%)', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(240,185,11,0.06) 0%, transparent 70%)', filter:'blur(40px)' }} />
      </div>

      <div className="flex flex-col items-center gap-8 px-8 relative z-10" style={{ maxWidth: 360, width: '100%' }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, rgba(240,185,11,0.2), rgba(240,185,11,0.05))', border: '1px solid rgba(240,185,11,0.3)', boxShadow: '0 0 40px rgba(240,185,11,0.15)' }}
          >
            🛡️
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-white tracking-tight">Admin Monitor</p>
            <p className="text-xs mt-1 font-medium tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>BASONCE/KITE EXCHANGE</p>
          </div>
        </div>

        {/* PIN dots */}
        <div
          className="flex gap-4"
          style={{ animation: shake ? 'shake 0.55s ease' : undefined }}
        >
          {Array.from({ length: pinLen }, (_, i) => (
            <div
              key={i}
              className="transition-all duration-150"
              style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < input.length ? (error ? '#FF4757' : '#F0B90B') : 'transparent',
                border: `2px solid ${i < input.length ? (error ? '#FF4757' : '#F0B90B') : 'rgba(255,255,255,0.2)'}`,
                boxShadow: i < input.length && !error ? '0 0 10px rgba(240,185,11,0.5)' : 'none',
                transform: i < input.length ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Status */}
        <div className="h-5 flex items-center justify-center">
          {locked ? (
            <p className="text-sm text-center font-medium" style={{ color: '#FF4757' }}>
              {lockTimer}s bekle — çok fazla deneme
            </p>
          ) : error ? (
            <p className="text-sm font-medium" style={{ color: '#FF4757' }}>Yanlış PIN</p>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>PIN'ini gir</p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {KEYS.map(k => (
            <button key={k} onClick={() => press(k)} disabled={locked}
              className="h-16 rounded-2xl text-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-25"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
              {k}
            </button>
          ))}
          <div />
          <button onClick={() => press('0')} disabled={locked}
            className="h-16 rounded-2xl text-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            0
          </button>
          <button onClick={del} disabled={locked}
            className="h-16 rounded-2xl text-xl text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            ⌫
          </button>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>Varsayılan PIN: 1332</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-9px)}
          30%{transform:translateX(9px)}
          45%{transform:translateX(-7px)}
          60%{transform:translateX(7px)}
          75%{transform:translateX(-4px)}
          90%{transform:translateX(4px)}
        }
      `}</style>
    </div>
  );
}
