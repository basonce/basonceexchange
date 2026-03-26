export interface GeoInfo {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  region: string;
  flag: string;
  org: string;
  timezone: string;
  is_vpn?: boolean;
}

const cache = new Map<string, GeoInfo>();

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export async function getGeoInfo(ip?: string): Promise<GeoInfo> {
  const target = ip || '';
  if (cache.has(target)) return cache.get(target)!;
  try {
    const url = target ? `https://ipapi.co/${target}/json/` : 'https://ipapi.co/json/';
    const res = await fetch(url);
    const data = await res.json();
    const info: GeoInfo = {
      ip: data.ip || target || 'Unknown',
      country: data.country_name || 'Unknown',
      country_code: data.country_code || '??',
      city: data.city || 'Unknown',
      region: data.region || '',
      flag: getFlagEmoji(data.country_code || ''),
      org: data.org || data.asn || 'Unknown',
      timezone: data.timezone || '',
      is_vpn: (data.org || '').toLowerCase().includes('vpn') ||
               (data.org || '').toLowerCase().includes('proxy') ||
               (data.org || '').toLowerCase().includes('hosting'),
    };
    cache.set(target, info);
    return info;
  } catch {
    const fallback: GeoInfo = {
      ip: target || 'Unknown', country: 'Unknown', country_code: '??',
      city: 'Unknown', region: '', flag: '🌍', org: 'Unknown', timezone: '',
    };
    return fallback;
  }
}

export async function getMyGeoInfo(): Promise<GeoInfo> {
  return getGeoInfo();
}
