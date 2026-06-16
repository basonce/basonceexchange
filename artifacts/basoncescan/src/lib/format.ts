import { formatDistanceToNow } from 'date-fns';

export function formatAddress(address: string, length = 6): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
}

export function formatHash(hash: string, length = 10): string {
  if (!hash || hash.length < 14) return hash;
  return `${hash.substring(0, length)}...`;
}

export const BNC_PRICE = 2.43;

export function formatBNC(value: number, decimals = 4): string {
  if (value === 0) return '0 BNC';
  if (value < 0.00001) return '<0.00001 BNC';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 })} BNC`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Compact notation, e.g. 25.59B, 465.78M, 38.5K
export function formatCompact(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompactUSD(value: number, digits = 2): string {
  return `$${formatCompact(value, digits)}`;
}

export function formatUSD(value: number, digits = 0): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatAge(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true }).replace('about ', '').replace('less than a minute ago', 'just now');
}
