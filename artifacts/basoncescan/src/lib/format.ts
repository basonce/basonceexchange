import { formatDistanceToNow } from 'date-fns';

export function formatAddress(address: string, length = 6): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
}

export function formatHash(hash: string, length = 10): string {
  if (!hash || hash.length < 14) return hash;
  return `${hash.substring(0, length)}...`;
}

export function formatBSO(value: number, decimals = 4): string {
  if (value === 0) return '0 BSO';
  if (value < 0.00001) return '<0.00001 BSO';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 })} BSO`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAge(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true }).replace('about ', '').replace('less than a minute ago', 'just now');
}
