import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';

interface Props {
  onUnlock: () => void;
}

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
    } else if (locked && lockTimer === 0) {
      setLocked(false);
      setAttempts(0);
    }
  }, [lockTimer, locked]);

  function press(digit: string) {
    if (locked) return;
    if (input.length >= 6) return;
    const next = input + digit;
    setInput(next);
    if (next.length === settings.pin.length) {
      setTimeout(() => verify(next), 80);
    }
  }

  function verify(val: string) {
    if (val === settings.pin) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => { setShake(false); setInput(''); }, 600);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLocked(true);
        setLockTimer(30);
        setInput('');
      }
    }
  }

  function del() {
    setInput(i => i.slice(0, -1));
    setError(false);
  }

  const dots = Array.from({ length: settings.pin.length }, (_, i) => (
    <div
      key={i}
      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
        i < input.length
          ? error ? 'bg-red-500 border-red-500' : 'bg-yellow-400 border-yellow-400'
          : 'border-gray-600 bg-transparent'
      }`}
    />
  ));

  const keys = ['1','2','3','4','5','6','7','8','9'];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-8 px-8" style={{ maxWidth: 360 }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center text-3xl">
            🛡️
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">Admin Monitor</p>
            <p className="text-xs text-gray-500">BASONCE/KITE Exchange</p>
          </div>
        </div>

        {/* Dots */}
        <div className={`flex gap-4 ${shake ? 'animate-[wiggle_0.5s_ease]' : ''}`}
          style={{ animation: shake ? 'shake 0.5s ease' : undefined }}>
          {dots}
        </div>

        {/* Status */}
        {locked ? (
          <p className="text-red-400 text-sm text-center">
            Çok fazla yanlış deneme.<br />
            <span className="font-bold">{lockTimer}s</span> sonra tekrar dene.
          </p>
        ) : error ? (
          <p className="text-red-400 text-sm">Yanlış PIN</p>
        ) : (
          <p className="text-gray-500 text-sm">PIN'ini gir</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map(k => (
            <button
              key={k}
              onClick={() => press(k)}
              disabled={locked}
              className="h-16 rounded-2xl bg-gray-800 text-white text-2xl font-medium active:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              {k}
            </button>
          ))}
          <div /> {/* spacer */}
          <button
            onClick={() => press('0')}
            disabled={locked}
            className="h-16 rounded-2xl bg-gray-800 text-white text-2xl font-medium active:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            0
          </button>
          <button
            onClick={del}
            disabled={locked}
            className="h-16 rounded-2xl bg-gray-800 text-gray-300 text-xl flex items-center justify-center active:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            ⌫
          </button>
        </div>

        <p className="text-xs text-gray-600">Varsayılan PIN: 1332</p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
