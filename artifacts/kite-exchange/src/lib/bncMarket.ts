// Deterministic BNC market data — every user on Earth sees the same numbers
// at the same UTC moment because everything is derived from Date.now() with
// pure math. No backend, no per-client randomness.

export interface BncMarket {
  price: number;
  change24h: number;
  volumeMillions: number;
  dir: 'up' | 'down' | 'flat';
}

// Price model: sawtooth from $0.01 → $2.37 over 12 hours, then snaps back.
// Plus faster small waves so it feels "alive" / "kımıl kımıl".
const PERIOD_S = 12 * 3600; // 12 hours
const PRICE_MIN = 0.01;
const PRICE_MAX = 2.37;

function priceOnly(nowMs: number): number {
  const s = nowMs / 1000;
  const t = (s % PERIOD_S) / PERIOD_S; // 0..1 sawtooth
  // Linear rise: $0.01 → $2.37
  const base = PRICE_MIN + (PRICE_MAX - PRICE_MIN) * t;
  // Lively micro waves scaled to ~2% of current base so they don't blow
  // up the price at the low end ($0.01) yet still feel alive at the top.
  const microPct =
    Math.sin(s / 37) * 0.018 +
    Math.sin(s / 9)  * 0.008 +
    Math.sin(s / 2)  * 0.003;
  return Math.max(0.001, base * (1 + microPct));
}

export function computeBncMarket(nowMs: number = Date.now()): BncMarket {
  const s = nowMs / 1000;
  const price = priceOnly(nowMs);

  // 24h change %: grows together with the sawtooth so it stays coherent
  // with the price (low price → small %, peak price → ~3000%).
  const t = (s % PERIOD_S) / PERIOD_S; // 0..1
  const change24h = Math.max(
    50,
    120 + 2880 * t + Math.sin(s / 47) * 35 + Math.sin(s / 5) * 9
  );

  // Volume in millions USD — also lively.
  const volumeMillions = Math.max(
    80,
    160 + Math.sin(s / 600) * 20 + Math.sin(s / 43) * 7
  );

  // Direction: compare to value ~0.8s ago for fast up/down flicker.
  // Use a relative tolerance (0.02%) since price can be as low as $0.01.
  const prev = priceOnly(nowMs - 800);
  const tol = Math.max(price, prev) * 0.0002;
  const dir: 'up' | 'down' | 'flat' =
    price > prev + tol ? 'up' :
    price < prev - tol ? 'down' : 'flat';

  return { price, change24h, volumeMillions, dir };
}

// Deterministic pseudo-random in [0,1) seeded by integer n.
export function seededRand(n: number): number {
  const x = (Math.abs(Math.floor(n)) * 9301 + 49297) % 233280;
  return x / 233280;
}
