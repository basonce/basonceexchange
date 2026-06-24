// Deterministic BNC market data — mirrors the kite-exchange / Basonce Wallet
// engine exactly, so the explorer shows the SAME live BNC price and % as the
// exchange at the same UTC moment. Pure math from Date.now(), no backend.

export interface BncMarket {
  price: number;
  change24h: number;
  volumeMillions: number;
  dir: 'up' | 'down' | 'flat';
}

const PERIOD_S = 12 * 3600; // 12 hours
const PRICE_MIN = 0.01;
const PRICE_MAX = 2.37;

function priceOnly(nowMs: number): number {
  const s = nowMs / 1000;
  const t = (s % PERIOD_S) / PERIOD_S; // 0..1 sawtooth
  const base = PRICE_MIN + (PRICE_MAX - PRICE_MIN) * t;
  const microPct =
    Math.sin(s / 37) * 0.018 +
    Math.sin(s / 9) * 0.008 +
    Math.sin(s / 2) * 0.003;
  return Math.max(0.001, base * (1 + microPct));
}

export function computeBncMarket(nowMs: number = Date.now()): BncMarket {
  const s = nowMs / 1000;
  const price = priceOnly(nowMs);

  const t = (s % PERIOD_S) / PERIOD_S;
  const change24h = Math.max(
    50,
    120 + 2880 * t + Math.sin(s / 47) * 35 + Math.sin(s / 5) * 9
  );

  const volumeMillions = Math.max(
    80,
    160 + Math.sin(s / 600) * 20 + Math.sin(s / 43) * 7
  );

  const prev = priceOnly(nowMs - 800);
  const tol = Math.max(price, prev) * 0.0002;
  const dir: 'up' | 'down' | 'flat' =
    price > prev + tol ? 'up' :
    price < prev - tol ? 'down' : 'flat';

  return { price, change24h, volumeMillions, dir };
}

// Deterministic sparkline series ending "now" — for the mini price chart.
export function bncSparkline(points = 30, spanMs = 6 * 3600 * 1000, nowMs = Date.now()): number[] {
  const out: number[] = [];
  for (let i = points - 1; i >= 0; i--) {
    out.push(priceOnly(nowMs - (i / (points - 1)) * spanMs));
  }
  return out;
}
