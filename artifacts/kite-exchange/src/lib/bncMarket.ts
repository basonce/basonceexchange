// Deterministic BNC market data — every user on Earth sees the same numbers
// at the same UTC moment because everything is derived from Date.now() with
// pure math. No backend, no per-client randomness.

export interface BncMarket {
  price: number;
  change24h: number;
  volumeMillions: number;
  dir: 'up' | 'down' | 'flat';
}

// Price model: sawtooth from $1 → $14 over 4 hours, then snaps back to $1.
// Plus faster small waves so it feels "alive" / "kımıl kımıl".
const PERIOD_S = 4 * 3600; // 4 hours

function priceOnly(nowMs: number): number {
  const s = nowMs / 1000;
  const t = (s % PERIOD_S) / PERIOD_S; // 0..1 sawtooth
  // Linear rise: $1 → $14
  const base = 1 + 13 * t;
  // Lively micro waves so the price ticks every fraction of a second.
  const micro =
    Math.sin(s / 37) * 0.22 +
    Math.sin(s / 9)  * 0.10 +
    Math.sin(s / 2)  * 0.04;
  return Math.max(0.10, base + micro);
}

export function computeBncMarket(nowMs: number = Date.now()): BncMarket {
  const s = nowMs / 1000;
  const price = priceOnly(nowMs);

  // 24h change %: grows together with the sawtooth so it stays coherent
  // with the price (low price → small %, peak price → huge %).
  const t = (s % PERIOD_S) / PERIOD_S; // 0..1
  const change24h = Math.max(
    50,
    120 + 1180 * t + Math.sin(s / 47) * 28 + Math.sin(s / 5) * 7
  );

  // Volume in millions USD — also lively.
  const volumeMillions = Math.max(
    80,
    160 + Math.sin(s / 600) * 20 + Math.sin(s / 43) * 7
  );

  // Direction: compare to value ~0.8s ago for fast up/down flicker.
  const prev = priceOnly(nowMs - 800);
  const dir: 'up' | 'down' | 'flat' =
    price > prev + 0.0002 ? 'up' :
    price < prev - 0.0002 ? 'down' : 'flat';

  return { price, change24h, volumeMillions, dir };
}

// Deterministic pseudo-random in [0,1) seeded by integer n.
export function seededRand(n: number): number {
  const x = (Math.abs(Math.floor(n)) * 9301 + 49297) % 233280;
  return x / 233280;
}
