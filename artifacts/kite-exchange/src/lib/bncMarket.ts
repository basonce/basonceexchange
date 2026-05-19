// Deterministic BNC market data — every user on Earth sees the same numbers
// at the same UTC moment because everything is derived from Date.now() with
// pure math. No backend, no per-client randomness.

export interface BncMarket {
  price: number;
  change24h: number;
  volumeMillions: number;
  dir: 'up' | 'down' | 'flat';
}

// Price model: lively oscillation between ~$8 and ~$15 with a 3-hour main cycle.
// Plus faster small waves so it feels "alive" / "kımıl kımıl".
function priceOnly(nowMs: number): number {
  const s = nowMs / 1000;
  const MAIN_PERIOD = 3 * 3600; // 3 hours
  const main = Math.sin((2 * Math.PI * s) / MAIN_PERIOD); // -1 .. +1
  // Center 11.5, amplitude 3.5  →  range 8 .. 15
  const base = 11.5 + 3.5 * main;
  // Lively micro waves so the price ticks every second or two.
  const micro =
    Math.sin(s / 41) * 0.18 +
    Math.sin(s / 11) * 0.08 +
    Math.sin(s / 3)  * 0.03;
  return Math.max(0.10, base + micro);
}

export function computeBncMarket(nowMs: number = Date.now()): BncMarket {
  const s = nowMs / 1000;
  const price = priceOnly(nowMs);

  // 24h change %: tied to where we are in the 3h cycle so it feels coherent
  // with the price action (high price → big +%).
  const MAIN_PERIOD = 3 * 3600;
  const main = Math.sin((2 * Math.PI * s) / MAIN_PERIOD); // -1..+1
  // Map -1..+1 → 320..1240, with a small drifting noise.
  const change24h = Math.max(
    50,
    780 + 460 * main + Math.sin(s / 53) * 22 + Math.sin(s / 7) * 6
  );

  // Volume in millions USD — also lively.
  const volumeMillions = Math.max(
    80,
    160 + Math.sin(s / 600) * 20 + Math.sin(s / 47) * 6
  );

  // Direction: compare to value ~1.2s ago for nice up/down flicker.
  const prev = priceOnly(nowMs - 1200);
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
