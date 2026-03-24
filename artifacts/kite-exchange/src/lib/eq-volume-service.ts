// Central singleton for EQ/USDT 24h volume.
// Starts at $10M at UTC midnight, grows to $478.7M max by end of day, then resets.
// All pages (Home, Markets, Trade) must use this — never getMarketCap() — so the
// number is always identical everywhere at the same moment.

const MIN_VOL = 10_000_000;   // $10M at day start (reset)
const MAX_VOL = 478_700_000;  // $478.7M maximum

function compute(): number {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  ));
  const secondsElapsed = (now.getTime() - startOfDay.getTime()) / 1000;
  const progress = Math.min(1, secondsElapsed / (24 * 60 * 60)); // 0 → 1

  // Curved accumulation — grows faster mid-day, slows toward midnight
  const curved = 1 - Math.pow(1 - progress, 1.6);

  // Tiny time-based noise (changes every 5 min), completely independent of price
  const noiseSeed = Math.floor(secondsElapsed / 300);
  const noise = (Math.sin(noiseSeed * 3.71) * 0.5 + Math.cos(noiseSeed * 2.13) * 0.5) * 0.012;

  return Math.round(MIN_VOL + (MAX_VOL - MIN_VOL) * Math.min(1, Math.max(0, curved + noise)));
}

class EQVolumeService {
  private static instance: EQVolumeService;
  private _volume: number;
  private subscribers: Set<() => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this._volume = compute();
    // Refresh every 60 seconds — keeps all subscribers in sync
    this.intervalId = setInterval(() => {
      this._volume = compute();
      this.subscribers.forEach(cb => cb());
    }, 60_000);
  }

  static getInstance(): EQVolumeService {
    if (!EQVolumeService.instance) {
      EQVolumeService.instance = new EQVolumeService();
    }
    return EQVolumeService.instance;
  }

  get volume(): number {
    return this._volume;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

/** Returns the current EQ 24h volume — same value everywhere, always. */
export function getEQVolume(): number {
  return EQVolumeService.getInstance().volume;
}

/** Subscribe to volume updates (fires every ~60 s). Returns unsubscribe fn. */
export function subscribeEQVolume(cb: () => void): () => void {
  return EQVolumeService.getInstance().subscribe(cb);
}
