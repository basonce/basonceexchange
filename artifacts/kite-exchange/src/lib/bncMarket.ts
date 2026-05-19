// Deterministic BNC market data — every user on Earth sees the same numbers
// at the same UTC moment because everything is derived from Date.now() with
// pure math. No backend, no per-client randomness.
//
// Used by both:
//   - Mini App ticker / order book (MinerMiniAppPage.tsx)
//   - basonce.com BNC market banner (so the BUY click does not surprise the user)

const EPOCH = 1747526400; // 2025-05-18 UTC anchor

export interface BncMarket {
  price: number;
  change24h: number;
  volumeMillions: number;
  dir: 'up' | 'down' | 'flat';
}

// Smooth, naturally bounded price model.
// Center stays around ~$12 and very slowly rises via a sigmoid (no hard cap
// that would create jumps when an old client meets a fresh one).
function priceOnly(nowMs: number): number {
  const s = nowMs / 1000;
  const days = (s - EPOCH) / 86400;
  // Asymptotic upward drift: starts near $12, approaches ~$14 over months.
  const trend = 12.0 + 2.2 * (days / (days + 220));
  // Multi-scale oscillation that LOOKS lively but stays within tight range.
  const wave =
    Math.sin(s / 3600) * 0.18 + // ~hourly wave
    Math.sin(s / 720)  * 0.06 + // ~12-min wave
    Math.sin(s / 90)   * 0.02 + // ~1.5-min wave
    Math.sin(s / 11)   * 0.008; // micro wave for liveness
  return Math.max(0.10, trend + wave);
}

export function computeBncMarket(nowMs: number = Date.now()): BncMarket {
  const s = nowMs / 1000;
  const days = (s - EPOCH) / 86400;

  const price = priceOnly(nowMs);

  // 24h change %: slowly trending up + slow oscillation.
  const changeBase = 850 + days * 1.1;
  const changeWave = Math.sin(s / 1800) * 18 + Math.sin(s / 300) * 5;
  const change24h = Math.max(50, changeBase + changeWave);

  // Volume in millions USD — also smoothly oscillating.
  const volumeMillions = Math.max(80,
    155 + Math.sin(s / 1900) * 16 + Math.sin(s / 240) * 5
  );

  // Direction: compare to value ~2 seconds ago for stable up/down flicker.
  const prev = priceOnly(nowMs - 2000);
  const dir: 'up' | 'down' | 'flat' =
    price > prev + 0.0001 ? 'up' :
    price < prev - 0.0001 ? 'down' : 'flat';

  return { price, change24h, volumeMillions, dir };
}

// Deterministic pseudo-random in [0,1) seeded by integer n — same everywhere.
export function seededRand(n: number): number {
  const x = (Math.abs(Math.floor(n)) * 9301 + 49297) % 233280;
  return x / 233280;
}
