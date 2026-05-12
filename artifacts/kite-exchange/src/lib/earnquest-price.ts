// EQ — Platform Token: 12-hour scripted "rug & moon" drama.
// Deterministic cycle (driven by Date.now()) so every visitor sees the same
// phase at the same wall-clock moment. Repeats twice per day.
//
//  Phase DWELL (0   – 25%, 3 hours):  $0.01 @ -95%   PANIC PIT  (everyone sees the dump)
//  Phase CLIMB (25  – 100%, 9 hours): $0.01 → $1.31  ( -95% → +3000% )  slow eased moon
//  At t=1.0 the cycle resets back to the dwell.
//
// Price and change% are deterministic functions of time. Tiny ±0.4% noise
// is layered on top for "live" feel and clamped to the scripted envelope.

const CYCLE_MS  = 12 * 60 * 60 * 1000; // 12 hours
const TICK_MS   = 2000;
const DWELL_FRACTION = 0.42;           // first 42% of cycle (~5h) is dwell

// Anchor the dwell phase so it starts right now (deploy moment) → every visitor
// for the next 5 hours lands directly in the panic pit.
// Anchor = 2026-05-12 08:42:00 UTC (= 11:42 Turkey time, deploy moment).
const PHASE_ANCHOR_MS = Date.UTC(2026, 4, 12, 8, 42, 0);

const PRICE_BOTTOM = 0.01;
const PRICE_TOP    = 1.31;

const CHANGE_BOTTOM = -95;
const CHANGE_TOP    = 3000;

const VOL_BASE = 12_000_000;
const VOL_PEAK = 480_000_000;

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

interface Scripted { price: number; change: number; phase: 'dwell' | 'climb'; }

function scriptedState(now: number): Scripted {
  const elapsed = ((now - PHASE_ANCHOR_MS) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  const t = elapsed / CYCLE_MS; // 0..1

  if (t < DWELL_FRACTION) {
    // PANIC PIT — sit at the bottom so everyone who opens the app sees it.
    return { price: PRICE_BOTTOM, change: CHANGE_BOTTOM, phase: 'dwell' };
  }

  const k = (t - DWELL_FRACTION) / (1 - DWELL_FRACTION); // 0..1 across the climb
  const eased = easeInOutCubic(k);
  const price  = PRICE_BOTTOM  + (PRICE_TOP  - PRICE_BOTTOM)  * eased;
  const change = CHANGE_BOTTOM + (CHANGE_TOP - CHANGE_BOTTOM) * eased;
  return { price, change, phase: 'climb' };
}

class EarnQuestPriceManager {
  private static instance: EarnQuestPriceManager;

  private price: number   = PRICE_BOTTOM;
  private change: number  = CHANGE_BOTTOM;
  private high24h: number = PRICE_TOP;
  private low24h: number  = PRICE_BOTTOM;
  private volume: number  = VOL_BASE;

  private subscribers: Array<() => void> = [];
  private updateInterval: number | null  = null;

  private constructor() {
    this.tick();
    this.startWalk();
  }

  static getInstance(): EarnQuestPriceManager {
    if (!EarnQuestPriceManager.instance)
      EarnQuestPriceManager.instance = new EarnQuestPriceManager();
    return EarnQuestPriceManager.instance;
  }

  private tick() {
    const now = Date.now();
    const { price: basePrice, change: baseChange, phase } = scriptedState(now);

    // Per-tick noise: dwell phase = tiny twitch only (don't escape -95% optics);
    // climb phase = ±0.4% normally, ±1.4% pop occasionally.
    let noisePct: number;
    let pricePctNoise: number;
    if (phase === 'dwell') {
      noisePct      = 0.25 * (Math.random() * 2 - 1); // ±0.25 percentage points around -95
      pricePctNoise = 0.012 * (Math.random() * 2 - 1); // ±1.2% of $0.01
    } else {
      const popMag = Math.random() < 0.10 ? 0.014 : 0.004;
      noisePct      = baseChange * popMag * (Math.random() * 2 - 1);
      pricePctNoise = popMag * (Math.random() * 2 - 1);
    }

    const change = Math.max(CHANGE_BOTTOM, Math.min(CHANGE_TOP, baseChange + noisePct));
    const price  = Math.max(PRICE_BOTTOM * 0.95, Math.min(PRICE_TOP * 1.02, basePrice * (1 + pricePctNoise)));

    this.change = Math.round(change * 100) / 100;
    this.price  = Math.round(price * 100000) / 100000;

    // Volume: high during the panic pit (sell pressure), peaks during moon climb.
    const intensity = phase === 'dwell'
      ? 0.55 + Math.random() * 0.15
      : Math.min(1, (this.price - PRICE_BOTTOM) / (PRICE_TOP - PRICE_BOTTOM));
    this.volume = Math.round(VOL_BASE + (VOL_PEAK - VOL_BASE) * (0.25 + 0.75 * intensity));

    this.notifySubscribers();
  }

  private startWalk() {
    this.updateInterval = window.setInterval(() => this.tick(), TICK_MS);
  }

  getPrice(): number     { return this.price; }
  getChange(): number    { return this.change; }
  getHigh24h(): number   { return this.high24h; }
  getLow24h(): number    { return this.low24h; }
  getVolume(): number    { return this.volume; }
  getMarketCap(): number { return this.volume; }

  subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(x => x !== cb); };
  }
  private notifySubscribers() { this.subscribers.forEach(cb => cb()); }
  destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

export { EarnQuestPriceManager };
