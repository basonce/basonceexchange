interface GeolocationResult {
  country_code: string;
  country_name: string;
}

const GEO_CACHE_KEY = 'geo_country_cache_v2';
const GEO_CACHE_TTL = 1000 * 60 * 30;

function getCachedCountry(): GeolocationResult | null {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > GEO_CACHE_TTL) {
      localStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedCountry(data: GeolocationResult): void {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function detectUserCountry(): Promise<GeolocationResult> {
  const cached = getCachedCountry();
  if (cached) return cached;

  const apis: Array<() => Promise<GeolocationResult>> = [
    async () => {
      const res = await fetchWithTimeout('https://ip-api.com/json/?fields=countryCode,country');
      const d = await res.json();
      if (!d.countryCode || d.countryCode.length !== 2) throw new Error('invalid');
      return { country_code: d.countryCode.toUpperCase(), country_name: d.country };
    },
    async () => {
      const res = await fetchWithTimeout('https://ipwho.is/');
      const d = await res.json();
      if (!d.country_code || d.country_code.length !== 2) throw new Error('invalid');
      return { country_code: d.country_code.toUpperCase(), country_name: d.country };
    },
    async () => {
      const res = await fetchWithTimeout('https://ipapi.co/json/');
      const d = await res.json();
      if (!d.country_code || d.country_code.length !== 2) throw new Error('invalid');
      return { country_code: d.country_code.toUpperCase(), country_name: d.country_name };
    },
    async () => {
      const res = await fetchWithTimeout('https://freeipapi.com/api/json');
      const d = await res.json();
      if (!d.countryCode || d.countryCode.length !== 2) throw new Error('invalid');
      return { country_code: d.countryCode.toUpperCase(), country_name: d.countryName };
    },
  ];

  for (const api of apis) {
    try {
      const result = await api();
      setCachedCountry(result);
      return result;
    } catch {
      continue;
    }
  }

  return { country_code: 'US', country_name: 'United States' };
}

export function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
