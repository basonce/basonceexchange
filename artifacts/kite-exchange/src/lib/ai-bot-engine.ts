import { fetchBinanceKlines } from './binance';

export interface Indicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  ema20: number;
  ema50: number;
  volume24h: number;
  volumeChange: number;
}

export interface BotSignal {
  id?: string;
  symbol: string;
  signalType: 'LONG' | 'SHORT' | 'WAIT';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeframe: string;
  indicators: Indicators;
  reasoning: string;
  strategy: string;
  createdAt: Date;
}

export interface BotConfig {
  strategy: 'scalper' | 'swing' | 'conservative' | 'aggressive';
  riskLevel: 'low' | 'medium' | 'high';
  maxDailyLossPct: number;
  isActive: boolean;
  selectedCoins: string[];
  simBalance: number;
  leverage: number;
}

export interface BotPosition {
  id: string;
  userId: string;
  signalId?: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  sizeUsdt: number;
  leverage: number;
  status: 'open' | 'closed_tp' | 'closed_sl' | 'closed_manual';
  pnl: number;
  pnlPct: number;
  openedAt: Date;
  closedAt?: Date;
}

export interface BotStats {
  totalTrades: number;
  winningTrades: number;
  totalPnl: number;
  winRate: number;
  bestTradePct: number;
  worstTradePct: number;
  currentStreak: number;
}

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(prev);
  for (let i = period; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k);
    ema.push(prev);
  }
  return ema;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { macd: number; signal: number; hist: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, hist: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const macdSeries: number[] = [];
  const minLen = Math.min(ema12.length, ema26.length);
  for (let i = 0; i < minLen; i++) {
    macdSeries.push(ema12[ema12.length - minLen + i] - ema26[ema26.length - minLen + i]);
  }
  const signalArr = calcEMA(macdSeries, 9);
  const signal = signalArr[signalArr.length - 1];
  return { macd: macdLine, signal, hist: macdLine - signal };
}

function calcBollingerBands(closes: number[], period = 20, mult = 2): { upper: number; middle: number; lower: number } {
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0 };
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: middle + mult * std, middle, lower: middle - mult * std };
}

export async function generateSignal(symbol: string, strategy: string, timeframe = '15m'): Promise<BotSignal> {
  const limit = strategy === 'scalper' ? 60 : 100;
  const klines = await fetchBinanceKlines(symbol, timeframe, limit);

  if (klines.length < 30) {
    return {
      symbol,
      signalType: 'WAIT',
      confidence: 0,
      entryPrice: 0,
      targetPrice: 0,
      stopLoss: 0,
      timeframe,
      indicators: { rsi: 50, macd: 0, macdSignal: 0, macdHist: 0, bbUpper: 0, bbMiddle: 0, bbLower: 0, ema20: 0, ema50: 0, volume24h: 0, volumeChange: 0 },
      reasoning: 'Insufficient data',
      strategy,
      createdAt: new Date(),
    };
  }

  const closes = klines.map((k: any) => k.close);
  const volumes = klines.map((k: any) => k.volume);
  const currentPrice = closes[closes.length - 1];

  const rsi = calcRSI(closes);
  const { macd, signal: macdSignal, hist: macdHist } = calcMACD(closes);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calcBollingerBands(closes);
  const ema20Arr = calcEMA(closes, 20);
  const ema50Arr = calcEMA(closes, Math.min(50, closes.length - 1));
  const ema20 = ema20Arr[ema20Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];

  const avgVol = volumes.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10;
  const currentVol = volumes[volumes.length - 1];
  const volumeChange = avgVol > 0 ? ((currentVol - avgVol) / avgVol) * 100 : 0;

  let longScore = 0;
  let shortScore = 0;
  const reasons: string[] = [];

  if (rsi < 30) { longScore += 25; reasons.push('RSI oversold'); }
  else if (rsi > 70) { shortScore += 25; reasons.push('RSI overbought'); }
  else if (rsi < 45) { longScore += 10; }
  else if (rsi > 55) { shortScore += 10; }

  if (macdHist > 0 && macd > macdSignal) { longScore += 20; reasons.push('MACD bullish crossover'); }
  else if (macdHist < 0 && macd < macdSignal) { shortScore += 20; reasons.push('MACD bearish crossover'); }

  if (currentPrice < bbLower) { longScore += 20; reasons.push('Price below BB lower'); }
  else if (currentPrice > bbUpper) { shortScore += 20; reasons.push('Price above BB upper'); }
  else if (currentPrice < bbMiddle) { longScore += 8; }
  else { shortScore += 8; }

  if (ema20 > ema50) { longScore += 15; reasons.push('EMA20 > EMA50 uptrend'); }
  else { shortScore += 15; reasons.push('EMA20 < EMA50 downtrend'); }

  if (volumeChange > 30) {
    const dominant = longScore > shortScore ? 'long' : 'short';
    if (dominant === 'long') { longScore += 10; reasons.push('High volume bullish'); }
    else { shortScore += 10; reasons.push('High volume bearish'); }
  }

  const strategyMultipliers: Record<string, number> = {
    scalper: 0.8,
    swing: 1.0,
    conservative: 0.6,
    aggressive: 1.2,
  };
  const mult = strategyMultipliers[strategy] || 1;

  const totalScore = longScore + shortScore;
  let signalType: 'LONG' | 'SHORT' | 'WAIT' = 'WAIT';
  let confidence = 0;

  if (longScore > shortScore && longScore / totalScore > 0.55) {
    signalType = 'LONG';
    confidence = Math.min(95, Math.round((longScore / totalScore) * 100 * mult));
  } else if (shortScore > longScore && shortScore / totalScore > 0.55) {
    signalType = 'SHORT';
    confidence = Math.min(95, Math.round((shortScore / totalScore) * 100 * mult));
  }

  const tpMultiplier: Record<string, number> = {
    scalper: 0.008,
    conservative: 0.015,
    swing: 0.025,
    aggressive: 0.05,
  };
  const slMultiplier: Record<string, number> = {
    scalper: 0.005,
    conservative: 0.01,
    swing: 0.015,
    aggressive: 0.025,
  };

  const tpPct = tpMultiplier[strategy] || 0.025;
  const slPct = slMultiplier[strategy] || 0.015;

  const targetPrice = signalType === 'LONG'
    ? currentPrice * (1 + tpPct)
    : currentPrice * (1 - tpPct);
  const stopLoss = signalType === 'LONG'
    ? currentPrice * (1 - slPct)
    : currentPrice * (1 + slPct);

  return {
    symbol,
    signalType,
    confidence,
    entryPrice: currentPrice,
    targetPrice: signalType === 'WAIT' ? 0 : targetPrice,
    stopLoss: signalType === 'WAIT' ? 0 : stopLoss,
    timeframe,
    indicators: {
      rsi: Math.round(rsi * 10) / 10,
      macd: Math.round(macd * 10000) / 10000,
      macdSignal: Math.round(macdSignal * 10000) / 10000,
      macdHist: Math.round(macdHist * 10000) / 10000,
      bbUpper,
      bbMiddle,
      bbLower,
      ema20,
      ema50,
      volume24h: currentVol,
      volumeChange: Math.round(volumeChange * 10) / 10,
    },
    reasoning: reasons.length > 0 ? reasons.join(', ') : 'Mixed signals, waiting for clarity',
    strategy,
    createdAt: new Date(),
  };
}

export function getStrategyTimeframe(strategy: string): string {
  const map: Record<string, string> = {
    scalper: '5m',
    swing: '1h',
    conservative: '4h',
    aggressive: '15m',
  };
  return map[strategy] || '15m';
}

export function calcPositionSize(simBalance: number, riskLevel: string, leverage: number): number {
  const riskPct: Record<string, number> = {
    low: 0.05,
    medium: 0.10,
    high: 0.20,
  };
  const pct = riskPct[riskLevel] || 0.10;
  return Math.round(simBalance * pct * 100) / 100;
}

export function calcPnL(position: BotPosition, currentPrice: number): { pnl: number; pnlPct: number } {
  const priceDiff = position.side === 'LONG'
    ? (currentPrice - position.entryPrice) / position.entryPrice
    : (position.entryPrice - currentPrice) / position.entryPrice;
  const pnlPct = priceDiff * position.leverage * 100;
  const pnl = (position.sizeUsdt * pnlPct) / 100;
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
  };
}

export const STRATEGY_CONFIGS = {
  scalper: {
    label: 'Scalper',
    description: '1-5 min trades, high frequency, small profits',
    icon: 'Zap',
    color: '#F59E0B',
    timeframe: '5m',
    leverage: 10,
  },
  swing: {
    label: 'Swing Trader',
    description: '4-12h trades, medium frequency, solid targets',
    icon: 'TrendingUp',
    color: '#10B981',
    timeframe: '1h',
    leverage: 5,
  },
  conservative: {
    label: 'Conservative',
    description: 'Low risk, slow gains, capital preservation',
    icon: 'Shield',
    color: '#3B82F6',
    timeframe: '4h',
    leverage: 3,
  },
  aggressive: {
    label: 'Aggressive',
    description: 'High leverage, big wins and losses',
    icon: 'Flame',
    color: '#EF4444',
    timeframe: '15m',
    leverage: 20,
  },
};

export const TOP_BOT_COINS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', base: 'BTC' },
  { symbol: 'ETHUSDT', name: 'Ethereum', base: 'ETH' },
  { symbol: 'SOLUSDT', name: 'Solana', base: 'SOL' },
  { symbol: 'BNBUSDT', name: 'BNB', base: 'BNB' },
  { symbol: 'XRPUSDT', name: 'XRP', base: 'XRP' },
  { symbol: 'ADAUSDT', name: 'Cardano', base: 'ADA' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', base: 'DOGE' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', base: 'AVAX' },
  { symbol: 'LINKUSDT', name: 'Chainlink', base: 'LINK' },
  { symbol: 'DOTUSDT', name: 'Polkadot', base: 'DOT' },
];
