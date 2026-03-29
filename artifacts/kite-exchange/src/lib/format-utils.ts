export function getPriceDecimals(price: number): number {
  if (price >= 10000)    return 2;
  if (price >= 100)      return 2;
  if (price >= 10)       return 3;
  if (price >= 1)        return 4;
  if (price >= 0.1)      return 5;
  if (price >= 0.01)     return 6;
  if (price >= 0.001)    return 7;
  if (price >= 0.0001)   return 8;
  if (price >= 0.00001)  return 9;
  if (price >= 0.000001) return 10;
  return 12;
}

export function formatPrice(price: number): string {
  if (price === 0) return '0.00';
  return price.toFixed(getPriceDecimals(price));
}

export function formatPriceWithSymbol(price: number): string {
  if (price === 0) return '$0.00';
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${formatPrice(price)}`;
}

export function formatAmount(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '0.00';
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9)  return `${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6)  return `${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3)  return `${(amount / 1e3).toFixed(2)}K`;
  if (amount >= 1)    return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(4);
  if (amount >= 0.0001) return amount.toFixed(6);
  if (amount >= 0.000001) return amount.toFixed(8);
  return amount.toFixed(10);
}

export function formatVolume(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

export function formatVolumeWithSymbol(num: number): string {
  if (!isFinite(num) || isNaN(num) || num === 0) return '$0.00';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}
