import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { GOLD, BG, CARD, BORDER, TEXT, SUB, fmt } from './shared';
import KiteGame from './KiteGame';
import PlinkoGame from './PlinkoGame';
import LootboxGame from './LootboxGame';

type GameId = 'kite' | 'plinko' | 'lootbox';

const GAMES: { id: GameId; name: string; emoji: string; desc: string; color: string; gradient: string }[] = [
  { id: 'kite', name: 'Flying Kite', emoji: '🪁', desc: 'Multiplier climbs — cash out before it snaps!', color: GOLD, gradient: 'linear-gradient(135deg,#13314f,#1d4e6b)' },
  { id: 'plinko', name: 'Plinko 3D', emoji: '🎯', desc: 'Drop the ball, catch the multiplier', color: '#0ECB81', gradient: 'linear-gradient(135deg,#16263a,#0b1320)' },
  { id: 'lootbox', name: 'Open Case', emoji: '📦', desc: 'Open the gold case, win up to 150×', color: '#A855F7', gradient: 'linear-gradient(135deg,#241a3a,#0d0a18)' },
];

export default function Casino3D({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<GameId | null>(null);
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 9999, display: 'flex', flexDirection: 'column', color: TEXT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, background: CARD, position: 'sticky', top: 0, zIndex: 2 }}>
        {active && (
          <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: TEXT, fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>‹</button>
        )}
        <div style={{ fontWeight: 800, fontSize: 17, color: TEXT, flex: 1 }}>
          {active ? GAMES.find((g) => g.id === active)?.name : '🎮 Games'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: GOLD, background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '6px 12px' }}>
          {fmt(balance)} USDT
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: SUB, fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, maxWidth: 560, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: SUB, marginTop: 60 }}>Loading…</div>
        ) : !uid ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sign in to play</div>
            <div style={{ color: SUB, fontSize: 13 }}>Games are played with your real USDT balance. Please sign in to your account.</div>
          </div>
        ) : !active ? (
          <>
            <div style={{ fontSize: 13, color: SUB, marginBottom: 16, lineHeight: 1.5 }}>
              Play with real <b style={{ color: GOLD }}>USDT</b>. All outcomes are decided on the server — nobody can change the result (provably fair).
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {GAMES.map((g) => (
                <button key={g.id} onClick={() => setActive(g.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                  background: g.gradient, border: `1px solid ${g.color}55`, borderRadius: 18, padding: 18, cursor: 'pointer',
                  boxShadow: `0 8px 24px ${g.color}22`,
                }}>
                  <div style={{ fontSize: 40, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', borderRadius: 16, border: `1px solid ${g.color}66` }}>{g.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: '#fff' }}>{g.name}</div>
                    <div style={{ fontSize: 13, color: '#cfd8e3' }}>{g.desc}</div>
                  </div>
                  <div style={{ color: g.color, fontSize: 24 }}>›</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 20, fontSize: 11.5, color: SUB, textAlign: 'center', lineHeight: 1.6 }}>
              Min bet 0.1 · Max 1000 USDT · Wins/losses applied instantly to your USDT balance
            </div>
          </>
        ) : (
          <>
            {active === 'kite' && <KiteGame balance={balance} onBalance={setBalance} />}
            {active === 'plinko' && <PlinkoGame balance={balance} onBalance={setBalance} />}
            {active === 'lootbox' && <LootboxGame balance={balance} onBalance={setBalance} />}
          </>
        )}
      </div>
    </div>
  );
}
