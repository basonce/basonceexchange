interface GeolocationData {
  ip: string;
  country_code: string;
  country_name: string;
  city: string;
  region: string;
  timezone: string;
}

class GeolocationService {
  private cache: Map<string, GeolocationData> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

  private async fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
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

  async getGeolocation(): Promise<Partial<GeolocationData>> {
    try {
      const cachedData = this.getCachedData();
      if (cachedData) return cachedData;

      const apis = [
        async (): Promise<GeolocationData> => {
          const res = await this.fetchWithTimeout('https://ip-api.com/json/?fields=query,countryCode,country,city,regionName,timezone');
          const d = await res.json();
          if (!d.countryCode || d.countryCode.length !== 2) throw new Error('invalid');
          return { ip: d.query || 'unknown', country_code: d.countryCode.toUpperCase(), country_name: d.country, city: d.city || 'Unknown', region: d.regionName || 'Unknown', timezone: d.timezone || 'UTC' };
        },
        async (): Promise<GeolocationData> => {
          const res = await this.fetchWithTimeout('https://ipwho.is/');
          const d = await res.json();
          if (!d.country_code || d.country_code.length !== 2) throw new Error('invalid');
          return { ip: d.ip || 'unknown', country_code: d.country_code.toUpperCase(), country_name: d.country, city: d.city || 'Unknown', region: d.region || 'Unknown', timezone: d.timezone || 'UTC' };
        },
        async (): Promise<GeolocationData> => {
          const res = await this.fetchWithTimeout('https://ipapi.co/json/');
          const d = await res.json();
          if (!d.country_code || d.country_code.length !== 2) throw new Error('invalid');
          return { ip: d.ip || 'unknown', country_code: d.country_code.toUpperCase(), country_name: d.country_name, city: d.city || 'Unknown', region: d.region || 'Unknown', timezone: d.timezone || 'UTC' };
        },
      ];

      for (const api of apis) {
        try {
          const geoData = await api();
          this.cacheData(geoData);
          return geoData;
        } catch {
          continue;
        }
      }

      return this.getFallbackData();
    } catch (error) {
      return this.getFallbackData();
    }
  }

  private getCachedData(): GeolocationData | null {
    const cached = localStorage.getItem('geo_cache');
    if (!cached) return null;

    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem('geo_cache');
    } catch {
      localStorage.removeItem('geo_cache');
    }
    return null;
  }

  private cacheData(data: GeolocationData): void {
    try {
      localStorage.setItem('geo_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache geolocation data:', error);
    }
  }

  private getFallbackData(): Partial<GeolocationData> {
    return {
      ip: 'unknown',
      country_code: 'XX',
      country_name: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    };
  }
}

export const geolocationService = new GeolocationService();
