import { type ReactNode } from 'react';

export const GOLD = '#F0B90B';
export const BG = '#0B0E11';
export const CARD = '#181A20';
export const BORDER = '#2B3139';
export const GREEN = '#0ECB81';
export const RED = '#F6465D';
export const TEXT = '#EAECEF';
export const SUB = '#848E9C';

export const fmt = (n: number) =>
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const miniBtn: React.CSSProperties = {
  background: BORDER, color: TEXT, border: 'none', borderRadius: 8,
  padding: '0 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 40,
};

export const playBtn = (enabled: boolean, color = GOLD): React.CSSProperties => ({
  width: '100%', background: enabled ? color : '#3a3f48', color: enabled ? '#1A1200' : '#6b7280',
  border: 'none', borderRadius: 12, padding: '15px', fontSize: 17, fontWeight: 900,
  cursor: enabled ? 'pointer' : 'not-allowed', marginTop: 4, letterSpacing: 0.3,
  boxShadow: enabled ? `0 6px 20px ${color}44` : 'none', transition: 'transform .08s',
});

export function BetBar({
  bet, setBet, balance, disabled,
}: { bet: string; setBet: (v: string) => void; balance: number; disabled: boolean }) {
  const set = (fn: (n: number) => number) => {
    const cur = parseFloat(bet) || 0;
    setBet(String(Math.max(0.1, Math.round(fn(cur) * 100) / 100)));
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SUB, marginBottom: 6 }}>
        <span>Bet (USDT)</span>
        <span>Balance: <b style={{ color: TEXT }}>{fmt(balance)}</b></span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={bet} disabled={disabled}
          onChange={(e) => setBet(e.target.value.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: '12px 14px', fontSize: 16, fontWeight: 800, outline: 'none' }}
        />
        <button onClick={() => set((n) => n / 2)} disabled={disabled} style={miniBtn}>½</button>
        <button onClick={() => set((n) => n * 2)} disabled={disabled} style={miniBtn}>2×</button>
        <button onClick={() => setBet(String(Math.floor(balance * 100) / 100 || 0.1))} disabled={disabled} style={miniBtn}>Max</button>
      </div>
    </div>
  );
}

export function ResultToast({ won, payout, label }: { won: boolean; payout: number; label?: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '12px', borderRadius: 12, marginTop: 12,
      background: won ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.10)',
      border: `1px solid ${won ? GREEN : RED}`,
      color: won ? GREEN : RED, fontWeight: 900, fontSize: 16,
    }}>
      {label ?? (won ? `YOU WON +${fmt(payout)} USDT` : 'YOU LOST')}
    </div>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginTop: 12 }}>
      {children}
    </div>
  );
}
