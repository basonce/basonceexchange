export function getPriceDecimals(price: number): number {
  if (price >= 100) return 2;
  if (price >= 10) return 3;
  if (price >= 1) return 4;
  if (price >= 0.1) return 5;
  if (price >= 0.01) return 6;
  if (price >= 0.001) return 7;
  if (price >= 0.0001) return 8;
  return 10;
}

export function formatPrice(price: number): string {
  if (price === 0) return '0.00';
  return price.toFixed(getPriceDecimals(price));
}

export function formatUsd(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '$0.00';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Token amount: trims trailing zeros, keeps useful precision for small values.
export function formatAmount(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '0';
  const sign = amount < 0 ? '-' : '';
  const n = Math.abs(amount);
  if (n >= 1e9) return `${sign}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sign}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1) return `${sign}${trimZeros(n.toFixed(4))}`;
  if (n >= 0.0001) return `${sign}${trimZeros(n.toFixed(6))}`;
  if (n > 0) return `${sign}${trimZeros(n.toFixed(8))}`;
  return '0';
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

export function formatCompact(num: number): string {
  if (!isFinite(num) || isNaN(num)) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

export function shortAddress(addr: string, head = 6, tail = 6): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return '';
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDateTime(iso);
}
