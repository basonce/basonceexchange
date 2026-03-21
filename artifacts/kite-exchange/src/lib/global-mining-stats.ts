// Global mining statistics that sync across all pages

interface MiningStats {
  activeMiners: number;
  hourlyEarnings: number;
  recentUpgrades: number;
  upgradesLast10Min: number;
  onlineCount: number;
  lastUpdate: number;
}

const STATS_KEY = 'mining_global_stats';
const UPDATE_INTERVAL = 4000; // 4 seconds

const DEFAULT_STATS: MiningStats = {
  activeMiners: 21453,
  hourlyEarnings: 645000,
  recentUpgrades: 5842,
  upgradesLast10Min: 18,
  onlineCount: 22786,
  lastUpdate: Date.now()
};

export class GlobalMiningStats {
  private static instance: GlobalMiningStats;
  private listeners: Set<(stats: MiningStats) => void> = new Set();
  private updateTimer?: NodeJS.Timeout;

  private constructor() {
    this.initializeStats();
    this.startUpdating();
  }

  static getInstance(): GlobalMiningStats {
    if (!GlobalMiningStats.instance) {
      GlobalMiningStats.instance = new GlobalMiningStats();
    }
    return GlobalMiningStats.instance;
  }

  private initializeStats() {
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) {
      this.saveStats(DEFAULT_STATS);
    }
  }

  private saveStats(stats: MiningStats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  getStats(): MiningStats {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_STATS;
      }
    }
    return DEFAULT_STATS;
  }

  private updateStats() {
    const current = this.getStats();

    const updated: MiningStats = {
      activeMiners: Math.max(16000, Math.min(29867,
        current.activeMiners + Math.floor(Math.random() * 400 - 200)
      )),
      hourlyEarnings: Math.max(500000, Math.min(900000,
        current.hourlyEarnings + Math.floor(Math.random() * 1200 - 400)
      )),
      recentUpgrades: Math.max(1376, Math.min(11854,
        current.recentUpgrades + Math.floor(Math.random() * 30 - 10)
      )),
      upgradesLast10Min: Math.floor(Math.random() * 25 + 8),
      onlineCount: Math.max(16000, Math.min(29867,
        current.onlineCount + Math.floor(Math.random() * 400 - 200)
      )),
      lastUpdate: Date.now()
    };

    this.saveStats(updated);
    this.notifyListeners(updated);
  }

  private startUpdating() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.updateStats();
    }, UPDATE_INTERVAL);
  }

  subscribe(callback: (stats: MiningStats) => void): () => void {
    this.listeners.add(callback);

    // Immediately call with current stats
    callback(this.getStats());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(stats: MiningStats) {
    this.listeners.forEach(callback => callback(stats));
  }

  destroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const globalMiningStats = GlobalMiningStats.getInstance();
