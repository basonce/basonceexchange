export interface FuturesPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  positionSize: number;
  margin: number;
  maintenanceMarginRate: number;
  marginMode?: 'cross' | 'isolated';
}

export function getMaintenanceMarginRate(positionSize: number, symbol: string, leverage?: number): number {
  const majorCoins = ['BTC', 'ETH'];
  const baseSymbol = symbol.replace('USDT', '');

  let mmr: number;

  if (majorCoins.includes(baseSymbol)) {
    if (positionSize < 50000) mmr = 0.004;
    else if (positionSize < 250000) mmr = 0.005;
    else if (positionSize < 1000000) mmr = 0.01;
    else if (positionSize < 10000000) mmr = 0.025;
    else mmr = 0.05;
  } else {
    if (positionSize < 5000) mmr = 0.01;
    else if (positionSize < 25000) mmr = 0.025;
    else if (positionSize < 100000) mmr = 0.05;
    else if (positionSize < 250000) mmr = 0.1;
    else mmr = 0.125;
  }

  if (leverage && leverage > 0) {
    const initialMarginRate = 1 / leverage;
    if (mmr >= initialMarginRate) {
      mmr = initialMarginRate * 0.5;
    }
  }

  return mmr;
}

export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: 'LONG' | 'SHORT',
  maintenanceMarginRate: number = 0.004,
  marginMode: 'cross' | 'isolated' = 'isolated',
  positionMargin?: number,
  walletBalance?: number
): number {
  if (!entryPrice || entryPrice <= 0 || !leverage || leverage <= 0) {
    return entryPrice * (side === 'LONG' ? 0.99 : 1.01);
  }

  let liquidationPrice: number;
  const initialMarginRate = 1 / leverage;

  if (side === 'LONG') {
    liquidationPrice = entryPrice * (1 - initialMarginRate + maintenanceMarginRate);
  } else {
    liquidationPrice = entryPrice * (1 + initialMarginRate - maintenanceMarginRate);
  }

  if (liquidationPrice <= 0 || isNaN(liquidationPrice) || !isFinite(liquidationPrice)) {
    return side === 'LONG' ? entryPrice * 0.99 : entryPrice * 1.01;
  }

  return liquidationPrice;
}

export function calculateMargin(positionSize: number, leverage: number): number {
  return positionSize / leverage;
}

export function calculateAvailableBalance(
  totalBalance: number,
  openPositions: FuturesPosition[]
): number {
  const totalMarginUsed = openPositions.reduce((sum, pos) => {
    return sum + (pos.margin || 0);
  }, 0);

  return totalBalance - totalMarginUsed;
}

export function calculateMarginRatio(
  markPrice: number,
  entryPrice: number,
  positionSize: number,
  margin: number,
  maintenanceMarginRate: number,
  side: 'LONG' | 'SHORT'
): number {
  if (!markPrice || markPrice <= 0 || !entryPrice || entryPrice <= 0) {
    return 0;
  }

  const quantity = positionSize / entryPrice;
  const unrealizedPnL = side === 'LONG'
    ? (markPrice - entryPrice) * quantity
    : (entryPrice - markPrice) * quantity;

  const maintenanceMargin = positionSize * maintenanceMarginRate;
  const marginBalance = margin + unrealizedPnL;

  if (marginBalance <= 0) {
    return 100;
  }

  const ratio = (maintenanceMargin / marginBalance) * 100;

  return Math.max(0, Math.min(ratio, 100));
}

export function calculateCrossMarginRatio(
  totalBalance: number,
  openPositions: FuturesPosition[],
  currentPrices: Record<string, number>
): number {
  let totalMaintenanceMargin = 0;
  let totalUnrealizedPnL = 0;

  openPositions.forEach(pos => {
    if (pos.marginMode === 'cross') {
      const positionSize = pos.margin * pos.leverage;
      const maintenanceMargin = positionSize * pos.maintenanceMarginRate;
      totalMaintenanceMargin += maintenanceMargin;

      const currentPrice = currentPrices[pos.symbol] || pos.entryPrice;
      const unrealizedPnL = calculateUnrealizedPNL(
        pos.side,
        pos.entryPrice,
        currentPrice,
        positionSize
      );
      totalUnrealizedPnL += unrealizedPnL;
    }
  });

  const marginBalance = totalBalance + totalUnrealizedPnL;

  if (totalMaintenanceMargin === 0) return 0;

  return (totalMaintenanceMargin / marginBalance) * 100;
}

export function calculateTradingFee(positionSize: number, isMaker: boolean = false): number {
  const makerFee = 0.0002;
  const takerFee = 0.0004;

  return positionSize * (isMaker ? makerFee : takerFee);
}

export function calculateUnrealizedPNL(
  side: 'LONG' | 'SHORT',
  entryPrice: number,
  markPrice: number,
  positionSize: number
): number {
  const quantity = positionSize / entryPrice;

  if (side === 'LONG') {
    return (markPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - markPrice) * quantity;
  }
}

export function calculateROI(pnl: number, margin: number): number {
  if (margin === 0) return 0;
  return (pnl / margin) * 100;
}

export function calculateFundingFee(
  positionSize: number,
  fundingRate: number
): number {
  return positionSize * fundingRate;
}

export function getFundingRate(symbol: string, isPremium: boolean = false): number {
  const baseRate = isPremium ? 0.0001 : 0.00005;

  return Math.random() > 0.5 ? baseRate : -baseRate;
}

export function getNextFundingTime(): Date {
  const now = new Date();
  const currentHour = now.getUTCHours();

  const fundingHours = [0, 8, 16];
  let nextFundingHour = fundingHours.find(h => h > currentHour);

  if (!nextFundingHour) {
    nextFundingHour = fundingHours[0];
    now.setUTCDate(now.getUTCDate() + 1);
  }

  now.setUTCHours(nextFundingHour, 0, 0, 0);
  return now;
}

export function getFundingCountdown(): string {
  const now = new Date();
  const nextFunding = getNextFundingTime();
  const diff = nextFunding.getTime() - now.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isPositionLiquidated(
  side: 'LONG' | 'SHORT',
  markPrice: number,
  liquidationPrice: number
): boolean {
  if (side === 'LONG') {
    return markPrice <= liquidationPrice;
  } else {
    return markPrice >= liquidationPrice;
  }
}

export function validatePosition(
  margin: number,
  walletBalance: number,
  minPositionSize: number = 10,
  marginMode: 'cross' | 'isolated' = 'isolated',
  availableBalance?: number
): { valid: boolean; error?: string } {
  const effectiveBalance = marginMode === 'cross'
    ? (availableBalance !== undefined ? availableBalance : walletBalance)
    : walletBalance;

  if (margin > effectiveBalance) {
    return {
      valid: false,
      error: marginMode === 'cross'
        ? 'Insufficient available balance'
        : 'Insufficient balance'
    };
  }

  if (margin < minPositionSize) {
    return { valid: false, error: `Minimum position size is ${minPositionSize} USDT` };
  }

  return { valid: true };
}

export function validateLeverage(
  leverage: number,
  symbol: string,
  marginMode: 'cross' | 'isolated'
): { valid: boolean; error?: string } {
  const maxLeverage = marginMode === 'cross' ? 20 : 125;

  if (leverage < 1) {
    return { valid: false, error: 'Minimum leverage is 1x' };
  }

  if (leverage > maxLeverage) {
    return {
      valid: false,
      error: `Maximum leverage for ${marginMode} mode is ${maxLeverage}x`
    };
  }

  return { valid: true };
}

export function canAddMargin(
  positionId: string,
  additionalMargin: number,
  availableBalance: number
): { valid: boolean; error?: string } {
  if (additionalMargin <= 0) {
    return { valid: false, error: 'Additional margin must be positive' };
  }

  if (additionalMargin > availableBalance) {
    return { valid: false, error: 'Insufficient available balance' };
  }

  return { valid: true };
}

export function canReduceMargin(
  currentMargin: number,
  reduceAmount: number,
  positionSize: number,
  maintenanceMarginRate: number,
  unrealizedPnL: number = 0
): { valid: boolean; error?: string } {
  if (reduceAmount <= 0) {
    return { valid: false, error: 'Reduce amount must be positive' };
  }

  const newMargin = currentMargin - reduceAmount;
  const maintenanceMargin = positionSize * maintenanceMarginRate;
  const marginBalance = newMargin + unrealizedPnL;

  if (marginBalance <= maintenanceMargin) {
    return {
      valid: false,
      error: `Insufficient margin. Minimum required: ${maintenanceMargin.toFixed(2)} USDT`
    };
  }

  return { valid: true };
}

export function calculateMaxPositionSize(
  availableBalance: number,
  leverage: number,
  entryPrice: number
): number {
  return availableBalance * leverage;
}

export function calculateBreakEvenPrice(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  openFee: number,
  positionSize: number
): number {
  const quantity = positionSize / entryPrice;
  const feePerUnit = (openFee + openFee) / quantity;

  if (side === 'LONG') {
    return entryPrice + feePerUnit;
  } else {
    return entryPrice - feePerUnit;
  }
}
