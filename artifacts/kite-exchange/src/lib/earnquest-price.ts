// EQ — Platform Token: 6-hour scripted "rug to moon" drama.
// Deterministic cycle (driven by Date.now()) so every user sees the same phase
// at the same wall-clock moment. Repeats 4 times per day (6h period).
//
//  Phase A (0   – 20%, 72 min):  -50%  →  -95%   PANIC DUMP
//  Phase B (20  – 30%, 36 min):  -95%  →  -60%   BOTTOM BOUNCE
//  Phase C (30  – 75%, 162 min): -60%  → +1500%  CLIMB (eased)
//  Phase D (75  – 100%, 90 min): +1500% → +3000% MOON
//
// Displayed price = REF_PRICE * (1 + change/100). Reference price kept low so
// dip prices stay readable ($0.025) and moon top stays believable ($15.50).

const CYCLE_MS  = 6 * 60 * 60 * 1000; // 6 hours
const REF_PRICE = 0.50;               // "yesterday close" baseline
const TICK_MS   = 2000;

const PHASES = {
  A_END: 0.20, // dump complete
  B_END: 0.30, // bounce complete
  C_END: 0.75, // climb complete
  // D_END = 1.00 (moon top)
};

const CHANGE_DUMP_START = -50;
const CHANGE_DUMP_BOTTOM = -95;
const CHANGE_BOUNCE_TOP = -60;
const CHANGE_CLIMB_TOP = 1500;
const CHANGE_MOON_TOP = 3000;

const VOL_BASE = 12_000_000;
const VOL_PEAK = 480_000_000;

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

function scriptedChange(now: number): number {
  const t = (now % CYCLE_MS) / CYCLE_MS; // 0..1

  if (t < PHASES.A_END) {
    const k = t / PHASES.A_END;
    return CHANGE_DUMP_START + (CHANGE_DUMP_BOTTOM - CHANGE_DUMP_START) * k;
  }
  if (t < PHASES.B_END) {
    const k = (t - PHASES.A_END) / (PHASES.B_END - PHASES.A_END);
    return CHANGE_DUMP_BOTTOM + (CHANGE_BOUNCE_TOP - CHANGE_DUMP_BOTTOM) * k;
  }
  if (t < PHASES.C_END) {
    const k = (t - PHASES.B_END) / (PHASES.C_END - PHASES.B_END);
    return CHANGE_BOUNCE_TOP + (CHANGE_CLIMB_TOP - CHANGE_BOUNCE_TOP) * easeInOutCubic(k);
  }
  const k = (t - PHASES.C_END) / (1 - PHASES.C_END);
  return CHANGE_CLIMB_TOP + (CHANGE_MOON_TOP - CHANGE_CLIMB_TOP) * k;
}

class EarnQuestPriceManager {
  private static instance: EarnQuestPriceManager;

  private price: number   = REF_PRICE;
  private change: number  = 0;
  private high24h: number = REF_PRICE * (1 + CHANGE_MOON_TOP / 100);
  private low24h: number  = REF_PRICE * (1 + CHANGE_DUMP_BOTTOM / 100);
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
    const baseChange = scriptedChange(now);

    // Per-tick noise: ±0.4% normally, ±1.6% pop occasionally. Clamped so the
    // displayed change never escapes the scripted [-95, +3000] envelope.
    const noiseMag = Math.random() < 0.10 ? 0.016 : 0.004;
    const noisePct = baseChange * noiseMag * (Math.random() * 2 - 1);
    const change   = Math.max(CHANGE_DUMP_BOTTOM, Math.min(CHANGE_MOON_TOP, baseChange + noisePct));

    this.change = Math.round(change * 100) / 100;
    this.price  = Math.round(REF_PRICE * (1 + this.change / 100) * 100000) / 100000;

    // Volume tracks dramatic-ness: high during dump and moon, low during climb mid.
    const intensity = Math.min(1, Math.abs(this.change) / CHANGE_MOON_TOP);
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
