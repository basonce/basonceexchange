// Deterministic BNC market data — every user on Earth sees the same numbers
// at the same UTC moment because everything is derived from Date.now() with
// pure math. No backend, no per-client randomness.
//
// Used by both:
//   - Mini App ticker / order book (MinerMiniAppPage.tsx)
//   - basonce.com BNC market card (so the BUY click does not surprise the user)

const EPOCH = 1747526400; // 2025-05-18 UTC anchor

export interface BncMarket {
  price: number;
  change24h: number;
  volumeMillions: number;
  dir: 'up' | 'down' | 'flat';
}

export function computeBncMarket(nowMs: number = Date.now()): BncMarket {
  const s = nowMs / 1000;
  const t = s - EPOCH;

  // Long-term upward drift — slowly rising base over days for "growth" feel.
  // Capped so it doesn't fly off forever.
  const drift = Math.min(6.5, t / 86400 * 0.045);

  // Multi-period oscillation for natural-looking ticker movement.
  const w1 = Math.sin(s / 41) * 0.18;
  const w2 = Math.sin(s / 17) * 0.06;
  const w3 = Math.sin(s / 7)  * 0.025;
  const w4 = Math.sin(s / 113) * 0.32;

  const price = Math.max(0.10, 7.85 + drift + w1 + w2 + w3 + w4);

  // 24h change %: slowly trending up + slow oscillation around the trend.
  const changeBase = 820 + Math.min(420, t / 3600 * 0.55);
  const changeWave = Math.sin(s / 53) * 12 + Math.sin(s / 19) * 4;
  const change24h = Math.max(50, changeBase + changeWave);

  // Volume in millions USD.
  const volumeMillions = Math.max(80, 148 + Math.sin(s / 73) * 14 + Math.sin(s / 23) * 5);

  // Direction: compare to value ~1 second ago.
  const prev = priceOnly(nowMs - 1000);
  const dir: 'up' | 'down' | 'flat' = price > prev + 0.0001 ? 'up' : price < prev - 0.0001 ? 'down' : 'flat';

  return { price, change24h, volumeMillions, dir };
}

function priceOnly(nowMs: number): number {
  const s = nowMs / 1000;
  const t = s - EPOCH;
  const drift = Math.min(6.5, t / 86400 * 0.045);
  return Math.max(0.10, 7.85 + drift
    + Math.sin(s / 41) * 0.18
    + Math.sin(s / 17) * 0.06
    + Math.sin(s / 7)  * 0.025
    + Math.sin(s / 113) * 0.32);
}

// Deterministic pseudo-random in [0,1) seeded by integer n — same everywhere.
export function seededRand(n: number): number {
  let x = (n * 9301 + 49297) % 233280;
  return x / 233280;
}
