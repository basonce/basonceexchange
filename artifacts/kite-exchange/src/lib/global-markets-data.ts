export type AssetCategory = 'metals' | 'energy' | 'agriculture' | 'stocks' | 'indices' | 'forex';

export interface GlobalAsset {
  symbol: string;
  name: string;
  displayName: string;
  category: AssetCategory;
  price: number;
  change24h: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: number;
  unit: string;
  currency: string;
  description: string;
  logoUrl?: string;
  flagUrl?: string;
  bgColor: string;
  textColor: string;
  exchange?: string;
  country?: string;
  spread: number;
  defaultLot?: string;
  pipValue?: number;
  contractSize?: number;
  marginRate?: string;
  sessionOpen?: string;
  sessionClose?: string;
  tags?: string[];
  isin?: string;
  sector?: string;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const CATEGORY_CONFIG: Record<AssetCategory, { label: string; color: string; bgColor: string }> = {
  metals:      { label: 'Metals',      color: '#F0B90B', bgColor: 'rgba(240,185,11,0.1)'  },
  energy:      { label: 'Energy',      color: '#F97316', bgColor: 'rgba(249,115,22,0.1)'  },
  agriculture: { label: 'Agriculture', color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)'   },
  stocks:      { label: 'Stocks',      color: '#60A5FA', bgColor: 'rgba(96,165,250,0.1)'  },
  indices:     { label: 'Indices',     color: '#A78BFA', bgColor: 'rgba(167,139,250,0.1)' },
  forex:       { label: 'Forex',       color: '#06B6D4', bgColor: 'rgba(6,182,212,0.1)'   },
};

// Kurumsal kalitede gercek logo ve flag URL'leri
const BASE_ASSETS: GlobalAsset[] = [

  // ═══════════════════════════════════════════════════════
  //  INDICES – Global endeksler
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'US30', displayName: 'US30', name: 'Dow Jones Industrial Average',
    category: 'indices',
    price: 43752.86, change24h: -897.40, changePercent: -2.01,
    high24h: 44650.22, low24h: 43212.10, volume: 450_000_000, unit: 'pts', currency: 'USD',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Dow_Jones_Logo.svg',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'NYSE', country: 'US',
    spread: 1.2, defaultLot: '1', marginRate: '0.5%', contractSize: 1, pipValue: 1,
    sessionOpen: '09:30', sessionClose: '16:00', tags: ['popular'],
    description: 'The Dow Jones Industrial Average tracks 30 major blue-chip companies listed on the NYSE and Nasdaq.',
  },
  {
    symbol: 'SPX500', displayName: 'S&P 500', name: 'S&P 500 Index',
    category: 'indices',
    price: 5893.12, change24h: -115.60, changePercent: -1.92,
    high24h: 6008.72, low24h: 5855.30, volume: 680_000_000, unit: 'pts', currency: 'USD',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/NYSE_MKT_logo.svg',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'CME', country: 'US',
    spread: 0.5, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:30', sessionClose: '16:00', tags: ['popular'],
    description: 'The S&P 500 is a market-capitalization-weighted index of 500 leading US publicly traded companies.',
  },
  {
    symbol: 'NAS100', displayName: 'NASDAQ 100', name: 'NASDAQ 100 Index',
    category: 'indices',
    price: 21354.40, change24h: -493.10, changePercent: -2.26,
    high24h: 21847.50, low24h: 21102.60, volume: 520_000_000, unit: 'pts', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/nas100.png',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'NASDAQ', country: 'US',
    spread: 1, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:30', sessionClose: '16:00', tags: ['popular', 'tech'],
    description: 'The NASDAQ 100 features 100 of the largest non-financial companies listed on the Nasdaq Stock Market.',
  },
  {
    symbol: 'GER40', displayName: 'DAX 40', name: 'DAX Performance Index',
    category: 'indices',
    price: 22881.30, change24h: -770.20, changePercent: -3.26,
    high24h: 23651.50, low24h: 22583.40, volume: 220_000_000, unit: 'pts', currency: 'EUR',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/DAX-logo.svg',
    flagUrl: 'https://flagcdn.com/w80/de.png',
    bgColor: '#1A1000', textColor: '#F0B90B', exchange: 'XETRA', country: 'DE',
    spread: 0.8, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:00', sessionClose: '17:30', tags: [],
    description: 'The DAX 40 is Germany\'s premier stock index tracking the 40 largest blue-chip companies on Frankfurt\'s XETRA exchange.',
  },
  {
    symbol: 'UK100', displayName: 'FTSE 100', name: 'FTSE 100 Index',
    category: 'indices',
    price: 8852.10, change24h: -176.30, changePercent: -1.95,
    high24h: 9028.40, low24h: 8783.60, volume: 180_000_000, unit: 'pts', currency: 'GBP',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/London_Stock_Exchange_Logo.svg',
    flagUrl: 'https://flagcdn.com/w80/gb.png',
    bgColor: '#12000A', textColor: '#E11D48', exchange: 'LSE', country: 'GB',
    spread: 1, defaultLot: '1', marginRate: '0.5%', sessionOpen: '08:00', sessionClose: '16:30', tags: [],
    description: 'The FTSE 100 represents 100 of the largest companies listed on the London Stock Exchange by market capitalisation.',
  },
  {
    symbol: 'JP225', displayName: 'NIKKEI 225', name: 'Nikkei 225',
    category: 'indices',
    price: 38244.10, change24h: -1563.50, changePercent: -3.93,
    high24h: 39807.60, low24h: 37858.30, volume: 290_000_000, unit: 'pts', currency: 'JPY',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Tokyo_Stock_Exchange_logo.svg',
    flagUrl: 'https://flagcdn.com/w80/jp.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'TSE', country: 'JP',
    spread: 4, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:00', sessionClose: '15:30', tags: [],
    description: 'The Nikkei 225 is Japan\'s leading stock market index, tracking 225 major companies listed on the Tokyo Stock Exchange.',
  },
  {
    symbol: 'FR40', displayName: 'CAC 40', name: 'CAC 40 Index',
    category: 'indices',
    price: 8023.80, change24h: -34.20, changePercent: -0.42,
    high24h: 8058.00, low24h: 7963.40, volume: 120_000_000, unit: 'pts', currency: 'EUR',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Euronext_logo.svg',
    flagUrl: 'https://flagcdn.com/w80/fr.png',
    bgColor: '#000D1A', textColor: '#3B82F6', exchange: 'EURONEXT', country: 'FR',
    spread: 1, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:00', sessionClose: '17:30', tags: [],
    description: 'The CAC 40 tracks the 40 largest market-cap companies listed on Euronext Paris.',
  },
  {
    symbol: 'EU50', displayName: 'EURO STOXX 50', name: 'Euro Stoxx 50 Index',
    category: 'indices',
    price: 5731.20, change24h: -57.40, changePercent: -0.99,
    high24h: 5788.60, low24h: 5703.10, volume: 200_000_000, unit: 'pts', currency: 'EUR',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Euronext_logo.svg',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    bgColor: '#000A1A', textColor: '#3B82F6', exchange: 'EUREX', country: 'EU',
    spread: 1, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:00', sessionClose: '17:30', tags: [],
    description: 'The Euro Stoxx 50 is Europe\'s leading blue-chip index comprising 50 supersector leaders from the Eurozone.',
  },
  {
    symbol: 'AUS200', displayName: 'ASX 200', name: 'S&P/ASX 200',
    category: 'indices',
    price: 8183.70, change24h: -88.10, changePercent: -1.07,
    high24h: 8271.80, low24h: 8123.40, volume: 95_000_000, unit: 'pts', currency: 'AUD',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/ASX_Logo.svg',
    flagUrl: 'https://flagcdn.com/w80/au.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'ASX', country: 'AU',
    spread: 1, defaultLot: '1', marginRate: '0.5%', sessionOpen: '10:00', sessionClose: '16:00', tags: [],
    description: 'The S&P/ASX 200 is Australia\'s benchmark equity index, tracking the 200 largest ASX-listed companies.',
  },
  {
    symbol: 'HK50', displayName: 'HANG SENG', name: 'Hang Seng Index',
    category: 'indices',
    price: 22453.60, change24h: -321.80, changePercent: -1.41,
    high24h: 22775.40, low24h: 22204.10, volume: 320_000_000, unit: 'pts', currency: 'HKD',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/HKEX_logo_2016.svg',
    flagUrl: 'https://flagcdn.com/w80/hk.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'HKEX', country: 'HK',
    spread: 5, defaultLot: '1', marginRate: '1%', sessionOpen: '09:30', sessionClose: '16:00', tags: [],
    description: 'The Hang Seng Index tracks the largest companies on the Hong Kong Stock Exchange.',
  },
  {
    symbol: 'CHINA50', displayName: 'CHINA A50', name: 'FTSE China A50 Index',
    category: 'indices',
    price: 13842.00, change24h: 215.40, changePercent: 1.58,
    high24h: 13895.30, low24h: 13626.60, volume: 280_000_000, unit: 'pts', currency: 'CNH',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Shanghai_Stock_Exchange_logo.svg',
    flagUrl: 'https://flagcdn.com/w80/cn.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'SSE', country: 'CN',
    spread: 10, defaultLot: '1', marginRate: '1%', sessionOpen: '09:30', sessionClose: '15:00', tags: [],
    description: 'The FTSE China A50 Index tracks the 50 largest A-share companies listed on the Shanghai and Shenzhen stock exchanges.',
  },
  {
    symbol: 'IT40', displayName: 'FTSE MIB', name: 'FTSE MIB Index',
    category: 'indices',
    price: 38124.00, change24h: -423.60, changePercent: -1.10,
    high24h: 38547.60, low24h: 37940.20, volume: 85_000_000, unit: 'pts', currency: 'EUR',
    flagUrl: 'https://flagcdn.com/w80/it.png',
    bgColor: '#000D1A', textColor: '#3B82F6', exchange: 'BORSA ITALIANA', country: 'IT',
    spread: 5, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:00', sessionClose: '17:25', tags: [],
    description: 'The FTSE MIB is the benchmark stock market index for Borsa Italiana, Italy\'s national stock exchange.',
  },
  {
    symbol: 'ES35', displayName: 'IBEX 35', name: 'IBEX 35 Index',
    category: 'indices',
    price: 13287.40, change24h: -98.60, changePercent: -0.74,
    high24h: 13386.00, low24h: 13214.80, volume: 72_000_000, unit: 'pts', currency: 'EUR',
    flagUrl: 'https://flagcdn.com/w80/es.png',
    bgColor: '#000D1A', textColor: '#3B82F6', exchange: 'BME', country: 'ES',
    spread: 5, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:00', sessionClose: '17:30', tags: [],
    description: 'The IBEX 35 is Spain\'s benchmark stock market index, comprising the 35 most liquid Spanish stocks.',
  },
  {
    symbol: 'RUS2000', displayName: 'RUSSELL 2000', name: 'Russell 2000 Index',
    category: 'indices',
    price: 2084.30, change24h: -42.70, changePercent: -2.01,
    high24h: 2127.00, low24h: 2071.60, volume: 310_000_000, unit: 'pts', currency: 'USD',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'NYSE', country: 'US',
    spread: 0.5, defaultLot: '1', marginRate: '0.5%', sessionOpen: '09:30', sessionClose: '16:00', tags: [],
    description: 'The Russell 2000 measures the performance of the 2,000 smallest companies in the Russell 3000 Index.',
  },
  {
    symbol: 'VIX', displayName: 'VIX', name: 'CBOE Volatility Index',
    category: 'indices',
    price: 24.85, change24h: 3.42, changePercent: 15.95,
    high24h: 26.10, low24h: 21.43, volume: 45_000_000, unit: 'pts', currency: 'USD',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Cboe_Global_Markets_Logo.svg',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'CBOE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '1%', tags: [],
    description: 'The VIX is Wall Street\'s "fear gauge", measuring the market\'s expectation of 30-day volatility derived from S&P 500 options.',
  },

  // ═══════════════════════════════════════════════════════
  //  FOREX – Major, Minor, Exotic pairs
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'EURUSD', displayName: 'EUR/USD', name: 'Euro / US Dollar',
    category: 'forex',
    price: 1.08462, change24h: 0.00954, changePercent: 0.89,
    high24h: 1.08724, low24h: 1.07510, volume: 5_000_000_000, unit: 'lot', currency: 'USD',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/80px-Flag_of_Europe.svg.png',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    bgColor: '#000A1A', textColor: '#3B82F6', exchange: 'OTC', country: 'EU',
    spread: 0.00012, defaultLot: '1', pipValue: 10, contractSize: 100000, marginRate: '3.33%', tags: ['major', 'popular'],
    description: 'EUR/USD is the world\'s most traded currency pair, representing the Eurozone versus the United States Dollar.',
  },
  {
    symbol: 'GBPUSD', displayName: 'GBP/USD', name: 'British Pound / US Dollar',
    category: 'forex',
    price: 1.29184, change24h: -0.01158, changePercent: -0.89,
    high24h: 1.30342, low24h: 1.28926, volume: 2_800_000_000, unit: 'lot', currency: 'USD',
    flagUrl: 'https://flagcdn.com/w80/gb.png',
    bgColor: '#12000A', textColor: '#E11D48', exchange: 'OTC', country: 'GB',
    spread: 0.00015, defaultLot: '1', pipValue: 10, contractSize: 100000, marginRate: '3.33%', tags: ['major', 'popular'],
    description: 'GBP/USD, known as "Cable", is one of the oldest and most actively traded currency pairs in the world.',
  },
  {
    symbol: 'USDJPY', displayName: 'USD/JPY', name: 'US Dollar / Japanese Yen',
    category: 'forex',
    price: 151.654, change24h: 1.324, changePercent: 0.88,
    high24h: 152.004, low24h: 150.330, volume: 3_500_000_000, unit: 'lot', currency: 'JPY',
    flagUrl: 'https://flagcdn.com/w80/jp.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'JP',
    spread: 0.01, defaultLot: '1', pipValue: 6.6, contractSize: 100000, marginRate: '3.33%', tags: ['major', 'popular'],
    description: 'USD/JPY reflects the US Dollar strength against the Japanese Yen and is a key indicator of Asian economic sentiment.',
  },
  {
    symbol: 'USDCHF', displayName: 'USD/CHF', name: 'US Dollar / Swiss Franc',
    category: 'forex',
    price: 0.90122, change24h: 0.00212, changePercent: 0.24,
    high24h: 0.90354, low24h: 0.89910, volume: 1_200_000_000, unit: 'lot', currency: 'CHF',
    flagUrl: 'https://flagcdn.com/w80/ch.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'CH',
    spread: 0.00015, defaultLot: '1', pipValue: 11, contractSize: 100000, marginRate: '3.33%', tags: ['major'],
    description: 'USD/CHF pairs the US Dollar with the Swiss Franc, a traditional safe-haven currency in times of global uncertainty.',
  },
  {
    symbol: 'AUDUSD', displayName: 'AUD/USD', name: 'Australian Dollar / US Dollar',
    category: 'forex',
    price: 0.63852, change24h: -0.00318, changePercent: -0.50,
    high24h: 0.64170, low24h: 0.63652, volume: 1_500_000_000, unit: 'lot', currency: 'USD',
    flagUrl: 'https://flagcdn.com/w80/au.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'OTC', country: 'AU',
    spread: 0.0001, defaultLot: '1', pipValue: 10, contractSize: 100000, marginRate: '3.33%', tags: ['major'],
    description: 'AUD/USD (Aussie) is heavily influenced by commodity prices, especially iron ore, and China\'s economic performance.',
  },
  {
    symbol: 'USDCAD', displayName: 'USD/CAD', name: 'US Dollar / Canadian Dollar',
    category: 'forex',
    price: 1.38954, change24h: 0.00322, changePercent: 0.23,
    high24h: 1.39204, low24h: 1.38632, volume: 1_200_000_000, unit: 'lot', currency: 'CAD',
    flagUrl: 'https://flagcdn.com/w80/ca.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'CA',
    spread: 0.0002, defaultLot: '1', pipValue: 7.2, contractSize: 100000, marginRate: '3.33%', tags: ['major'],
    description: 'USD/CAD (Loonie) is strongly correlated with crude oil prices due to Canada\'s significant petroleum exports.',
  },
  {
    symbol: 'NZDUSD', displayName: 'NZD/USD', name: 'New Zealand Dollar / US Dollar',
    category: 'forex',
    price: 0.58962, change24h: -0.00178, changePercent: -0.30,
    high24h: 0.59140, low24h: 0.58784, volume: 800_000_000, unit: 'lot', currency: 'USD',
    flagUrl: 'https://flagcdn.com/w80/nz.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'OTC', country: 'NZ',
    spread: 0.0002, defaultLot: '1', pipValue: 10, contractSize: 100000, marginRate: '3.33%', tags: ['major'],
    description: 'NZD/USD (Kiwi) reflects New Zealand\'s dairy and agricultural export-driven economy against the US Dollar.',
  },
  {
    symbol: 'EURGBP', displayName: 'EUR/GBP', name: 'Euro / British Pound',
    category: 'forex',
    price: 0.83982, change24h: 0.00142, changePercent: 0.17,
    high24h: 0.84124, low24h: 0.83842, volume: 900_000_000, unit: 'lot', currency: 'GBP',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    bgColor: '#000A1A', textColor: '#3B82F6', exchange: 'OTC', country: 'EU',
    spread: 0.0001, defaultLot: '1', pipValue: 12.9, contractSize: 100000, marginRate: '3.33%', tags: ['cross'],
    description: 'EUR/GBP is the most important intra-European cross, reflecting economic dynamics between the Eurozone and UK.',
  },
  {
    symbol: 'EURJPY', displayName: 'EUR/JPY', name: 'Euro / Japanese Yen',
    category: 'forex',
    price: 164.424, change24h: 0.984, changePercent: 0.60,
    high24h: 165.004, low24h: 163.440, volume: 1_100_000_000, unit: 'lot', currency: 'JPY',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    bgColor: '#000A1A', textColor: '#3B82F6', exchange: 'OTC', country: 'EU',
    spread: 0.015, defaultLot: '1', pipValue: 6.6, contractSize: 100000, marginRate: '3.33%', tags: ['cross', 'popular'],
    description: 'EUR/JPY combines Eurozone economic trends with Japanese monetary policy dynamics.',
  },
  {
    symbol: 'GBPJPY', displayName: 'GBP/JPY', name: 'British Pound / Japanese Yen',
    category: 'forex',
    price: 195.874, change24h: -0.418, changePercent: -0.21,
    high24h: 196.292, low24h: 195.456, volume: 980_000_000, unit: 'lot', currency: 'JPY',
    flagUrl: 'https://flagcdn.com/w80/gb.png',
    bgColor: '#12000A', textColor: '#E11D48', exchange: 'OTC', country: 'GB',
    spread: 0.02, defaultLot: '1', pipValue: 6.6, contractSize: 100000, marginRate: '3.33%', tags: ['cross'],
    description: 'GBP/JPY is known for extreme volatility and wide daily ranges, popular among experienced retail traders.',
  },
  {
    symbol: 'USDTRY', displayName: 'USD/TRY', name: 'US Dollar / Turkish Lira',
    category: 'forex',
    price: 38.254, change24h: 0.182, changePercent: 0.48,
    high24h: 38.424, low24h: 38.072, volume: 450_000_000, unit: 'lot', currency: 'TRY',
    flagUrl: 'https://flagcdn.com/w80/tr.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'TR',
    spread: 0.1, defaultLot: '0.1', pipValue: 0.26, contractSize: 100000, marginRate: '5%', tags: ['em'],
    description: 'USD/TRY reflects the US Dollar against the Turkish Lira, sensitive to TCMB policy and geopolitical events.',
  },
  {
    symbol: 'USDZAR', displayName: 'USD/ZAR', name: 'US Dollar / South African Rand',
    category: 'forex',
    price: 18.462, change24h: 0.124, changePercent: 0.68,
    high24h: 18.520, low24h: 18.338, volume: 280_000_000, unit: 'lot', currency: 'ZAR',
    flagUrl: 'https://flagcdn.com/w80/za.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'OTC', country: 'ZA',
    spread: 0.1, defaultLot: '0.1', marginRate: '5%', tags: ['em'],
    description: 'USD/ZAR is influenced by commodity prices (gold, platinum) and South African political risk.',
  },
  {
    symbol: 'USDMXN', displayName: 'USD/MXN', name: 'US Dollar / Mexican Peso',
    category: 'forex',
    price: 20.482, change24h: 0.224, changePercent: 1.10,
    high24h: 20.562, low24h: 20.258, volume: 650_000_000, unit: 'lot', currency: 'MXN',
    flagUrl: 'https://flagcdn.com/w80/mx.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'OTC', country: 'MX',
    spread: 0.05, defaultLot: '0.1', marginRate: '5%', tags: ['em'],
    description: 'USD/MXN is shaped by NAFTA/USMCA trade relations, Banxico policy, and US economic indicators.',
  },
  {
    symbol: 'EURCHF', displayName: 'EUR/CHF', name: 'Euro / Swiss Franc',
    category: 'forex',
    price: 0.94282, change24h: 0.00122, changePercent: 0.13,
    high24h: 0.94354, low24h: 0.94102, volume: 720_000_000, unit: 'lot', currency: 'CHF',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    bgColor: '#000A1A', textColor: '#3B82F6', exchange: 'OTC', country: 'EU',
    spread: 0.0002, defaultLot: '1', pipValue: 11, contractSize: 100000, marginRate: '3.33%', tags: ['cross'],
    description: 'EUR/CHF reflects the relationship between the Eurozone economy and Switzerland\'s safe-haven status.',
  },
  {
    symbol: 'GBPCHF', displayName: 'GBP/CHF', name: 'British Pound / Swiss Franc',
    category: 'forex',
    price: 1.16424, change24h: -0.00218, changePercent: -0.19,
    high24h: 1.16642, low24h: 1.16206, volume: 540_000_000, unit: 'lot', currency: 'CHF',
    flagUrl: 'https://flagcdn.com/w80/gb.png',
    bgColor: '#12000A', textColor: '#E11D48', exchange: 'OTC', country: 'GB',
    spread: 0.0003, defaultLot: '1', marginRate: '3.33%', tags: ['cross'],
    description: 'GBP/CHF combines UK economic performance with Switzerland\'s safe-haven currency dynamics.',
  },
  {
    symbol: 'AUDCAD', displayName: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar',
    category: 'forex',
    price: 0.89624, change24h: -0.00208, changePercent: -0.23,
    high24h: 0.89832, low24h: 0.89414, volume: 580_000_000, unit: 'lot', currency: 'CAD',
    flagUrl: 'https://flagcdn.com/w80/au.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'OTC', country: 'AU',
    spread: 0.0003, defaultLot: '1', pipValue: 7.2, contractSize: 100000, marginRate: '3.33%', tags: ['cross'],
    description: 'AUD/CAD is a commodity currency cross driven by energy and mineral exports from both economies.',
  },
  {
    symbol: 'EURCAD', displayName: 'EUR/CAD', name: 'Euro / Canadian Dollar',
    category: 'forex',
    price: 1.50824, change24h: 0.00612, changePercent: 0.41,
    high24h: 1.51212, low24h: 1.50212, volume: 480_000_000, unit: 'lot', currency: 'CAD',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    bgColor: '#000A1A', textColor: '#3B82F6', exchange: 'OTC', country: 'EU',
    spread: 0.0003, defaultLot: '1', marginRate: '3.33%', tags: ['cross'],
    description: 'EUR/CAD links Eurozone economic performance to Canada\'s commodity-driven economy.',
  },
  {
    symbol: 'AUDNZD', displayName: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar',
    category: 'forex',
    price: 1.08312, change24h: -0.00142, changePercent: -0.13,
    high24h: 1.08454, low24h: 1.08170, volume: 350_000_000, unit: 'lot', currency: 'NZD',
    flagUrl: 'https://flagcdn.com/w80/au.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'OTC', country: 'AU',
    spread: 0.0003, defaultLot: '1', marginRate: '3.33%', tags: ['cross'],
    description: 'AUD/NZD reflects the economic relationship between the two neighboring Pacific commodity exporters.',
  },
  {
    symbol: 'CADJPY', displayName: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen',
    category: 'forex',
    price: 109.124, change24h: 0.342, changePercent: 0.31,
    high24h: 109.456, low24h: 108.782, volume: 420_000_000, unit: 'lot', currency: 'JPY',
    flagUrl: 'https://flagcdn.com/w80/ca.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'CA',
    spread: 0.015, defaultLot: '1', marginRate: '3.33%', tags: ['cross'],
    description: 'CAD/JPY links oil-sensitive Canadian dollar with safe-haven Japanese yen dynamics.',
  },
  {
    symbol: 'USDHKD', displayName: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar',
    category: 'forex',
    price: 7.7842, change24h: 0.0012, changePercent: 0.02,
    high24h: 7.7860, low24h: 7.7830, volume: 620_000_000, unit: 'lot', currency: 'HKD',
    flagUrl: 'https://flagcdn.com/w80/hk.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'HK',
    spread: 0.0005, defaultLot: '1', marginRate: '3.33%', tags: [],
    description: 'USD/HKD is pegged to a narrow band of 7.75–7.85 by the Hong Kong Monetary Authority.',
  },
  {
    symbol: 'USDSGD', displayName: 'USD/SGD', name: 'US Dollar / Singapore Dollar',
    category: 'forex',
    price: 1.34240, change24h: 0.00420, changePercent: 0.31,
    high24h: 1.34660, low24h: 1.33820, volume: 520_000_000, unit: 'lot', currency: 'SGD',
    flagUrl: 'https://flagcdn.com/w80/sg.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'OTC', country: 'SG',
    spread: 0.0003, defaultLot: '1', marginRate: '3.33%', tags: ['asia'],
    description: 'USD/SGD reflects Singapore\'s role as a major Asian financial hub and trade center.',
  },

  // ═══════════════════════════════════════════════════════
  //  METALS – Precious & Industrial
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'XAUUSD', displayName: 'GOLD', name: 'Gold Spot XAU/USD',
    category: 'metals',
    price: 3182.60, change24h: 64.40, changePercent: 2.07,
    high24h: 3196.20, low24h: 3118.20, volume: 280_000_000, unit: 'oz', currency: 'USD',
    logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2099.png',
    bgColor: '#1A1200', textColor: '#F0B90B', exchange: 'COMEX', country: 'US',
    spread: 0.50, defaultLot: '1', pipValue: 1, contractSize: 100, marginRate: '0.5%', tags: ['popular', 'safe-haven'],
    description: 'Gold is the world\'s most recognized safe-haven asset and store of value, traded on the COMEX futures exchange.',
  },
  {
    symbol: 'XAGUSD', displayName: 'SILVER', name: 'Silver Spot XAG/USD',
    category: 'metals',
    price: 34.268, change24h: 0.858, changePercent: 2.57,
    high24h: 34.614, low24h: 33.410, volume: 120_000_000, unit: 'oz', currency: 'USD',
    logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2099.png',
    bgColor: '#141A1A', textColor: '#9CA3AF', exchange: 'COMEX', country: 'US',
    spread: 0.03, defaultLot: '1', pipValue: 50, contractSize: 5000, marginRate: '0.5%', tags: ['popular'],
    description: 'Silver is both a precious metal and key industrial commodity used in solar panels, electronics, and medical devices.',
  },
  {
    symbol: 'XPTUSD', displayName: 'PLATINUM', name: 'Platinum Spot XPT/USD',
    category: 'metals',
    price: 1052.40, change24h: 15.80, changePercent: 1.52,
    high24h: 1062.20, low24h: 1036.60, volume: 40_000_000, unit: 'oz', currency: 'USD',
    bgColor: '#141A1A', textColor: '#9CA3AF', exchange: 'NYMEX', country: 'US',
    spread: 2, defaultLot: '1', marginRate: '0.5%', tags: [],
    description: 'Platinum is a rare precious metal critical for autocatalysts, hydrogen fuel cells, and high-end jewelry.',
  },
  {
    symbol: 'XPDUSD', displayName: 'PALLADIUM', name: 'Palladium Spot XPD/USD',
    category: 'metals',
    price: 1022.00, change24h: -11.80, changePercent: -1.14,
    high24h: 1036.80, low24h: 1010.20, volume: 25_000_000, unit: 'oz', currency: 'USD',
    bgColor: '#1A0D00', textColor: '#F97316', exchange: 'NYMEX', country: 'US',
    spread: 5, defaultLot: '1', marginRate: '1%', tags: [],
    description: 'Palladium is a rare platinum-group metal primarily used in automotive catalytic converters.',
  },
  {
    symbol: 'COPPER', displayName: 'COPPER', name: 'HG Copper Futures',
    category: 'metals',
    price: 4.682, change24h: 0.072, changePercent: 1.56,
    high24h: 4.724, low24h: 4.610, volume: 95_000_000, unit: 'lbs', currency: 'USD',
    bgColor: '#1A0D00', textColor: '#F97316', exchange: 'COMEX', country: 'US',
    spread: 0.01, defaultLot: '1', marginRate: '1%', tags: ['industrial'],
    description: 'Copper is the most important industrial metal and a leading indicator of global economic health.',
  },
  {
    symbol: 'XRHRUSD', displayName: 'RHODIUM', name: 'Rhodium Spot',
    category: 'metals',
    price: 4750.00, change24h: 150.00, changePercent: 3.26,
    high24h: 4800.00, low24h: 4600.00, volume: 2_000_000, unit: 'oz', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/xrhrusd.jpg',
    bgColor: '#141A1A', textColor: '#9CA3AF', exchange: 'OTC', country: 'US',
    spread: 50, defaultLot: '0.01', marginRate: '1%', tags: [],
    description: 'Rhodium is the world\'s most expensive precious metal, used almost exclusively in catalytic converters.',
  },

  // ═══════════════════════════════════════════════════════
  //  ENERGY – Oil, Gas & Derivatives
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'BRENT', displayName: 'BRENT CRUDE', name: 'Brent Crude Oil ICE',
    category: 'energy',
    price: 76.42, change24h: 0.86, changePercent: 1.14,
    high24h: 77.12, low24h: 75.56, volume: 520_000_000, unit: 'bbl', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/brent.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'ICE', country: 'GB',
    spread: 0.03, defaultLot: '1', pipValue: 10, contractSize: 1000, marginRate: '1%', tags: ['popular'],
    description: 'Brent Crude is the world\'s benchmark for Atlantic basin oil, pricing about 2/3 of global oil supply.',
  },
  {
    symbol: 'USOIL', displayName: 'WTI CRUDE', name: 'WTI Crude Oil NYMEX',
    category: 'energy',
    price: 72.86, change24h: 0.72, changePercent: 1.00,
    high24h: 73.52, low24h: 72.14, volume: 480_000_000, unit: 'bbl', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/usoil.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'NYMEX', country: 'US',
    spread: 0.03, defaultLot: '1', pipValue: 10, contractSize: 1000, marginRate: '1%', tags: ['popular'],
    description: 'West Texas Intermediate is the primary US crude oil benchmark, pricing most North American oil contracts.',
  },
  {
    symbol: 'NATGAS', displayName: 'NAT. GAS', name: 'Natural Gas Henry Hub',
    category: 'energy',
    price: 3.824, change24h: 0.242, changePercent: 6.76,
    high24h: 3.904, low24h: 3.582, volume: 280_000_000, unit: 'MMBtu', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/natgas.png',
    bgColor: '#001A1A', textColor: '#06B6D4', exchange: 'NYMEX', country: 'US',
    spread: 0.003, defaultLot: '1', pipValue: 10, contractSize: 10000, marginRate: '1%', tags: [],
    description: 'Henry Hub Natural Gas is the primary US natural gas benchmark, used for electricity generation and heating.',
  },
  {
    symbol: 'GASOIL', displayName: 'GAS OIL', name: 'ICE Gas Oil Futures',
    category: 'energy',
    price: 652.50, change24h: 8.25, changePercent: 1.28,
    high24h: 658.75, low24h: 644.25, volume: 180_000_000, unit: 'MT', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/gasoil.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'ICE', country: 'GB',
    spread: 0.5, defaultLot: '1', marginRate: '1%', tags: [],
    description: 'ICE Gas Oil (Gasoil) is the European benchmark for diesel and heating oil products.',
  },
  {
    symbol: 'HEAT', displayName: 'HEATING OIL', name: 'NY Harbor ULSD Futures',
    category: 'energy',
    price: 2.382, change24h: 0.042, changePercent: 1.79,
    high24h: 2.414, low24h: 2.340, volume: 80_000_000, unit: 'gal', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/heat.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'NYMEX', country: 'US',
    spread: 0.005, defaultLot: '1', marginRate: '1%', tags: [],
    description: 'NY Harbor Ultra-Low Sulfur Diesel is the US benchmark for heating oil and diesel fuel contracts.',
  },
  {
    symbol: 'RBOB', displayName: 'GASOLINE', name: 'RBOB Gasoline Futures',
    category: 'energy',
    price: 2.252, change24h: 0.032, changePercent: 1.44,
    high24h: 2.284, low24h: 2.220, volume: 75_000_000, unit: 'gal', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/rbob.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'NYMEX', country: 'US',
    spread: 0.005, defaultLot: '1', marginRate: '1%', tags: [],
    description: 'RBOB Gasoline is the primary US motor gasoline futures contract traded on NYMEX.',
  },

  // ═══════════════════════════════════════════════════════
  //  US STOCKS – S&P 500 Blue Chips
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'AAPL', displayName: 'APPLE', name: 'Apple Inc.',
    category: 'stocks',
    price: 213.52, change24h: 3.22, changePercent: 1.53,
    high24h: 215.02, low24h: 210.30, volume: 85_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/apple.com/w/400/h/400',
    bgColor: '#141414', textColor: '#9CA3AF', exchange: 'NASDAQ', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US0378331005', tags: ['popular', 'tech'],
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, and wearables. Market cap ~$3.2T.',
  },
  {
    symbol: 'MSFT', displayName: 'MICROSOFT', name: 'Microsoft Corporation',
    category: 'stocks',
    price: 388.42, change24h: 5.22, changePercent: 1.36,
    high24h: 390.02, low24h: 383.20, volume: 65_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/microsoft.com/w/400/h/400',
    bgColor: '#000D1A', textColor: '#00A4EF', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US5949181045', tags: ['popular', 'tech'],
    description: 'Microsoft Corporation is the world\'s largest software company and a cloud computing leader through Azure. Market cap ~$2.9T.',
  },
  {
    symbol: 'NVDA', displayName: 'NVIDIA', name: 'NVIDIA Corporation',
    category: 'stocks',
    price: 118.62, change24h: 2.12, changePercent: 1.82,
    high24h: 120.02, low24h: 116.50, volume: 200_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/nvidia.com/w/400/h/400',
    bgColor: '#001A0D', textColor: '#76B900', exchange: 'NASDAQ', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'Semiconductors', isin: 'US67066G1040', tags: ['popular', 'ai', 'tech'],
    description: 'NVIDIA is the global leader in AI accelerator chips, graphics processors, and data center computing. Market cap ~$2.9T.',
  },
  {
    symbol: 'GOOGL', displayName: 'ALPHABET', name: 'Alphabet Inc.',
    category: 'stocks',
    price: 169.52, change24h: 2.32, changePercent: 1.39,
    high24h: 170.82, low24h: 167.20, volume: 40_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/google.com/w/400/h/400',
    bgColor: '#000D1A', textColor: '#4285F4', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US02079K3059', tags: ['popular', 'tech'],
    description: 'Alphabet Inc. is the parent company of Google, dominating search, digital advertising, cloud computing, and AI research.',
  },
  {
    symbol: 'AMZN', displayName: 'AMAZON', name: 'Amazon.com Inc.',
    category: 'stocks',
    price: 196.82, change24h: -1.38, changePercent: -0.70,
    high24h: 198.20, low24h: 195.52, volume: 75_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/amazon.com/w/400/h/400',
    bgColor: '#1A0E00', textColor: '#FF9900', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Consumer Discretionary', isin: 'US0231351067', tags: ['popular'],
    description: 'Amazon.com is the world\'s largest e-commerce company and cloud infrastructure provider through AWS.',
  },
  {
    symbol: 'META', displayName: 'META', name: 'Meta Platforms Inc.',
    category: 'stocks',
    price: 584.32, change24h: 8.72, changePercent: 1.51,
    high24h: 586.02, low24h: 575.60, volume: 50_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/meta.com/w/400/h/400',
    bgColor: '#000D1A', textColor: '#0668E1', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US30303M1027', tags: ['popular'],
    description: 'Meta Platforms operates Facebook, Instagram, WhatsApp and is the world\'s largest social media conglomerate.',
  },
  {
    symbol: 'TSLA', displayName: 'TESLA', name: 'Tesla Inc.',
    category: 'stocks',
    price: 248.76, change24h: -4.24, changePercent: -1.68,
    high24h: 253.00, low24h: 246.82, volume: 120_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/tesla.com/w/400/h/400',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Consumer Discretionary', isin: 'US88160R1014', tags: ['popular', 'ev'],
    description: 'Tesla Inc. designs, manufactures, and sells electric vehicles, energy storage, and solar products worldwide.',
  },
  {
    symbol: 'BRKB', displayName: 'BERKSHIRE', name: 'Berkshire Hathaway B',
    category: 'stocks',
    price: 464.22, change24h: 3.82, changePercent: 0.83,
    high24h: 465.52, low24h: 460.40, volume: 12_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/brkb.jpg',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US0846702076', tags: [],
    description: 'Berkshire Hathaway is Warren Buffett\'s multinational conglomerate holding company with over $1T in assets.',
  },
  {
    symbol: 'JPM', displayName: 'JP MORGAN', name: 'JPMorgan Chase & Co.',
    category: 'stocks',
    price: 245.82, change24h: -2.08, changePercent: -0.84,
    high24h: 247.90, low24h: 244.62, volume: 28_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/jpm.png',
    bgColor: '#000D1A', textColor: '#3B82F6', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US46625H1005', tags: ['banking'],
    description: 'JPMorgan Chase is the world\'s largest bank by market cap, offering investment banking, financial services, and retail banking.',
  },
  {
    symbol: 'V', displayName: 'VISA', name: 'Visa Inc.',
    category: 'stocks',
    price: 334.52, change24h: 2.82, changePercent: 0.85,
    high24h: 336.00, low24h: 331.70, volume: 18_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/v.png',
    bgColor: '#00051A', textColor: '#1A1F71', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US92826C8394', tags: [],
    description: 'Visa Inc. operates the world\'s largest retail electronic payments network with over 4 billion cards in circulation.',
  },
  {
    symbol: 'JNJ', displayName: 'JOHNSON & JOHNSON', name: 'Johnson & Johnson',
    category: 'stocks',
    price: 157.42, change24h: -0.82, changePercent: -0.52,
    high24h: 158.24, low24h: 156.60, volume: 10_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/jnj.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Healthcare', isin: 'US4781601046', tags: [],
    description: 'Johnson & Johnson is a global healthcare giant with pharmaceutical, medical devices, and consumer health products.',
  },
  {
    symbol: 'WMT', displayName: 'WALMART', name: 'Walmart Inc.',
    category: 'stocks',
    price: 98.84, change24h: 0.64, changePercent: 0.65,
    high24h: 99.48, low24h: 98.20, volume: 22_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/wmt.jpg',
    bgColor: '#001A2A', textColor: '#0071CE', exchange: 'NYSE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'Consumer Staples', isin: 'US9311421039', tags: [],
    description: 'Walmart is the world\'s largest retailer by revenue, operating over 10,500 stores across 20+ countries.',
  },
  {
    symbol: 'XOM', displayName: 'EXXONMOBIL', name: 'Exxon Mobil Corporation',
    category: 'stocks',
    price: 116.84, change24h: 0.94, changePercent: 0.81,
    high24h: 117.78, low24h: 115.90, volume: 30_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/xom.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Energy', isin: 'US30231G1022', tags: [],
    description: 'ExxonMobil is the world\'s largest publicly traded international oil and gas company by revenue.',
  },
  {
    symbol: 'BAC', displayName: 'BANK OF AMERICA', name: 'Bank of America Corp.',
    category: 'stocks',
    price: 44.82, change24h: -0.42, changePercent: -0.93,
    high24h: 45.24, low24h: 44.40, volume: 55_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/bac.png',
    bgColor: '#000D1A', textColor: '#E11D48', exchange: 'NYSE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US0605051046', tags: ['banking'],
    description: 'Bank of America is the second largest US bank, providing financial products and services to consumers, businesses, and governments.',
  },
  {
    symbol: 'KO', displayName: 'COCA-COLA', name: 'The Coca-Cola Company',
    category: 'stocks',
    price: 71.42, change24h: 0.22, changePercent: 0.31,
    high24h: 71.64, low24h: 71.20, volume: 12_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/ko.png',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'NYSE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'Consumer Staples', isin: 'US1912161007', tags: [],
    description: 'The Coca-Cola Company is the world\'s largest non-alcoholic beverage company with 200+ brands in 200+ countries.',
  },
  {
    symbol: 'PFE', displayName: 'PFIZER', name: 'Pfizer Inc.',
    category: 'stocks',
    price: 26.84, change24h: -0.22, changePercent: -0.81,
    high24h: 27.06, low24h: 26.62, volume: 38_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/pfe.png',
    bgColor: '#000D1A', textColor: '#0068A5', exchange: 'NYSE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'Healthcare', isin: 'US7170811035', tags: [],
    description: 'Pfizer Inc. is a global biopharmaceutical company developing medicines, vaccines, and consumer healthcare products.',
  },

  // ═══════════════════════════════════════════════════════
  //  EUROPEAN & GLOBAL STOCKS
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'SAP', displayName: 'SAP SE', name: 'SAP SE',
    category: 'stocks',
    price: 248.42, change24h: 2.22, changePercent: 0.90,
    high24h: 250.64, low24h: 246.20, volume: 5_000_000, unit: 'share', currency: 'EUR',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/sap.png',
    bgColor: '#1A0800', textColor: '#0070F2', exchange: 'XETRA', country: 'DE',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', tags: ['europe'],
    description: 'SAP SE is Europe\'s largest software company, a global leader in enterprise application software and cloud ERP.',
  },
  {
    symbol: 'ASML', displayName: 'ASML', name: 'ASML Holding NV',
    category: 'stocks',
    price: 678.42, change24h: 8.42, changePercent: 1.26,
    high24h: 686.84, low24h: 670.00, volume: 2_500_000, unit: 'share', currency: 'EUR',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/asml.svg',
    bgColor: '#0B1929', textColor: '#006DB6', exchange: 'EURONEXT', country: 'NL',
    spread: 0.5, defaultLot: '1', marginRate: '10%', sector: 'Semiconductors', tags: ['europe', 'tech'],
    description: 'ASML is the world\'s monopoly supplier of EUV lithography machines used to manufacture advanced semiconductors.',
  },
  {
    symbol: 'NESN', displayName: 'NESTLE', name: 'Nestlé S.A.',
    category: 'stocks',
    price: 89.24, change24h: -0.36, changePercent: -0.40,
    high24h: 89.60, low24h: 88.88, volume: 8_000_000, unit: 'share', currency: 'CHF',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/nesn.png',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'SIX', country: 'CH',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Consumer Staples', tags: ['europe'],
    description: 'Nestlé S.A. is the world\'s largest food & beverage company with brands including Nescafé, KitKat, and Purina.',
  },
  {
    symbol: 'LVMH', displayName: 'LVMH', name: 'LVMH Moët Hennessy',
    category: 'stocks',
    price: 584.60, change24h: 5.80, changePercent: 1.00,
    high24h: 590.40, low24h: 578.80, volume: 3_000_000, unit: 'share', currency: 'EUR',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/lvmh.png',
    bgColor: '#1A1000', textColor: '#D4AF37', exchange: 'EURONEXT', country: 'FR',
    spread: 0.5, defaultLot: '1', marginRate: '10%', sector: 'Consumer Discretionary', tags: ['europe', 'luxury'],
    description: 'LVMH is the world\'s largest luxury goods conglomerate, owning 75+ prestigious brands including Louis Vuitton and Dior.',
  },
  {
    symbol: 'TM', displayName: 'TOYOTA', name: 'Toyota Motor Corporation',
    category: 'stocks',
    price: 215.42, change24h: 1.82, changePercent: 0.85,
    high24h: 217.24, low24h: 213.60, volume: 4_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/tm.jpg',
    bgColor: '#1A0000', textColor: '#E11D48', exchange: 'NYSE', country: 'JP',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Consumer Discretionary', tags: ['asia'],
    description: 'Toyota Motor Corporation is the world\'s largest automaker, leading in hybrid and hydrogen vehicle technology.',
  },
  {
    symbol: 'TSM', displayName: 'TSMC', name: 'Taiwan Semiconductor Manufacturing',
    category: 'stocks',
    price: 184.62, change24h: 2.42, changePercent: 1.33,
    high24h: 187.04, low24h: 182.20, volume: 15_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/tsm.png',
    bgColor: '#0B1929', textColor: '#3B82F6', exchange: 'NYSE', country: 'TW',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Semiconductors', tags: ['asia', 'tech'],
    description: 'TSMC is the world\'s largest dedicated independent semiconductor foundry, manufacturing chips for Apple, NVIDIA, and AMD.',
  },
  {
    symbol: 'BABA', displayName: 'ALIBABA', name: 'Alibaba Group Holding',
    category: 'stocks',
    price: 118.42, change24h: 2.82, changePercent: 2.44,
    high24h: 121.24, low24h: 115.60, volume: 22_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/baba.jpg',
    bgColor: '#1A0800', textColor: '#FF6A00', exchange: 'NYSE', country: 'CN',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', tags: ['asia'],
    description: 'Alibaba Group is China\'s largest e-commerce and cloud computing company, operating Taobao, Tmall, and Aliyun.',
  },
  {
    symbol: 'NVO', displayName: 'NOVO NORDISK', name: 'Novo Nordisk A/S',
    category: 'stocks',
    price: 112.84, change24h: 1.24, changePercent: 1.11,
    high24h: 114.08, low24h: 111.60, volume: 9_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/nvo.jpg',
    bgColor: '#001A2A', textColor: '#0098C9', exchange: 'NYSE', country: 'DK',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Healthcare', tags: ['europe'],
    description: 'Novo Nordisk is the world leader in diabetes care and GLP-1 obesity treatments, including Ozempic and Wegovy.',
  },

  {
    symbol: 'NFLX', displayName: 'NETFLIX', name: 'Netflix Inc.',
    category: 'stocks',
    price: 953.20, change24h: 12.40, changePercent: 1.32,
    high24h: 958.80, low24h: 940.60, volume: 8_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/netflix.com/w/400/h/400',
    bgColor: '#1A0000', textColor: '#E50914', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Communication Services', isin: 'US64110L1061', tags: ['popular'],
    description: 'Netflix is the world\'s leading streaming entertainment service with over 300 million subscribers globally.',
  },
  {
    symbol: 'AMD', displayName: 'AMD', name: 'Advanced Micro Devices Inc.',
    category: 'stocks',
    price: 104.80, change24h: -1.60, changePercent: -1.50,
    high24h: 107.20, low24h: 103.60, volume: 48_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/amd.com/w/400/h/400',
    bgColor: '#1A0000', textColor: '#ED1C24', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US0079031078', tags: ['popular', 'semiconductor'],
    description: 'Advanced Micro Devices designs high-performance CPUs and GPUs for data centers, gaming, and embedded systems.',
  },
  {
    symbol: 'INTC', displayName: 'INTEL', name: 'Intel Corporation',
    category: 'stocks',
    price: 22.84, change24h: -0.32, changePercent: -1.38,
    high24h: 23.40, low24h: 22.60, volume: 62_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/intel.com/w/400/h/400',
    bgColor: '#00071A', textColor: '#0068B5', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US4581401001', tags: ['semiconductor'],
    description: 'Intel Corporation is the world\'s largest semiconductor company, designing and manufacturing microprocessors and related technologies.',
  },
  {
    symbol: 'PLTR', displayName: 'PALANTIR', name: 'Palantir Technologies Inc.',
    category: 'stocks',
    price: 89.42, change24h: 2.18, changePercent: 2.50,
    high24h: 90.80, low24h: 86.60, volume: 65_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/palantir.com/w/400/h/400',
    bgColor: '#000000', textColor: '#7EC8E3', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US69608A1088', tags: ['ai', 'popular'],
    description: 'Palantir Technologies provides data analytics and AI platforms for government agencies and commercial enterprises worldwide.',
  },
  {
    symbol: 'UBER', displayName: 'UBER', name: 'Uber Technologies Inc.',
    category: 'stocks',
    price: 72.30, change24h: 1.10, changePercent: 1.55,
    high24h: 73.80, low24h: 71.20, volume: 28_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/uber.com/w/400/h/400',
    bgColor: '#000000', textColor: '#FFFFFF', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US90353T1007', tags: ['popular'],
    description: 'Uber Technologies operates the world\'s largest ride-hailing and food delivery platform across 70+ countries.',
  },
  {
    symbol: 'COIN', displayName: 'COINBASE', name: 'Coinbase Global Inc.',
    category: 'stocks',
    price: 198.60, change24h: 4.80, changePercent: 2.48,
    high24h: 202.40, low24h: 193.80, volume: 18_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/coinbase.com/w/400/h/400',
    bgColor: '#000D1A', textColor: '#1652F0', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US19260Q1076', tags: ['crypto', 'popular'],
    description: 'Coinbase is the largest U.S. cryptocurrency exchange and is a primary gateway for institutional and retail crypto adoption.',
  },
  {
    symbol: 'MSTR', displayName: 'STRATEGY', name: 'Strategy Inc. (MicroStrategy)',
    category: 'stocks',
    price: 312.40, change24h: 8.60, changePercent: 2.83,
    high24h: 318.80, low24h: 302.20, volume: 22_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/strategy.com/w/400/h/400',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Technology', isin: 'US5949724083', tags: ['bitcoin', 'popular'],
    description: 'Strategy (formerly MicroStrategy) is the world\'s largest corporate Bitcoin holder with a treasury strategy built around BTC.',
  },
  {
    symbol: 'HOOD', displayName: 'ROBINHOOD', name: 'Robinhood Markets Inc.',
    category: 'stocks',
    price: 48.20, change24h: 1.20, changePercent: 2.55,
    high24h: 49.40, low24h: 46.80, volume: 32_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/robinhood.com/w/400/h/400',
    bgColor: '#001A00', textColor: '#00C805', exchange: 'NASDAQ', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US7707001027', tags: ['fintech'],
    description: 'Robinhood is a commission-free trading platform that democratized investing for millions of retail investors.',
  },
  {
    symbol: 'MA', displayName: 'MASTERCARD', name: 'Mastercard Incorporated',
    category: 'stocks',
    price: 548.60, change24h: 4.40, changePercent: 0.81,
    high24h: 552.20, low24h: 544.00, volume: 6_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/mastercard.com/w/400/h/400',
    bgColor: '#1A0800', textColor: '#F79E1B', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US57636Q1040', tags: ['payments'],
    description: 'Mastercard operates the world\'s second-largest payment network, processing billions of transactions in 210+ countries.',
  },
  {
    symbol: 'GS', displayName: 'GOLDMAN SACHS', name: 'The Goldman Sachs Group Inc.',
    category: 'stocks',
    price: 582.80, change24h: 3.20, changePercent: 0.55,
    high24h: 586.40, low24h: 578.20, volume: 5_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/goldmansachs.com/w/400/h/400',
    bgColor: '#001A15', textColor: '#00B4A0', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Financials', isin: 'US38141G1040', tags: ['banking'],
    description: 'Goldman Sachs is a leading global investment banking, securities and investment management firm.',
  },
  {
    symbol: 'SPOT', displayName: 'SPOTIFY', name: 'Spotify Technology S.A.',
    category: 'stocks',
    price: 672.40, change24h: 8.20, changePercent: 1.23,
    high24h: 678.00, low24h: 662.80, volume: 4_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/spotify.com/w/400/h/400',
    bgColor: '#001A08', textColor: '#1DB954', exchange: 'NYSE', country: 'SE',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Communication Services', isin: 'LU1778762911', tags: ['popular'],
    description: 'Spotify is the world\'s largest music streaming platform with over 600 million active users and 240 million subscribers.',
  },
  {
    symbol: 'SNAP', displayName: 'SNAPCHAT', name: 'Snap Inc.',
    category: 'stocks',
    price: 9.82, change24h: -0.18, changePercent: -1.80,
    high24h: 10.20, low24h: 9.68, volume: 38_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/snap.com/w/400/h/400',
    bgColor: '#1A1A00', textColor: '#FFFC00', exchange: 'NYSE', country: 'US',
    spread: 0.1, defaultLot: '1', marginRate: '10%', sector: 'Communication Services', isin: 'US83304A1060', tags: [],
    description: 'Snap Inc. operates Snapchat, a multimedia messaging app with augmented reality features popular among Gen Z.',
  },
  {
    symbol: 'ARKK', displayName: 'ARK INNOV.', name: 'ARK Innovation ETF',
    category: 'stocks',
    price: 52.40, change24h: 0.84, changePercent: 1.63,
    high24h: 53.20, low24h: 51.60, volume: 22_000_000, unit: 'share', currency: 'USD',
    logoUrl: 'https://cdn.brandfetch.io/ark-invest.com/w/400/h/400',
    bgColor: '#000814', textColor: '#7EC8E3', exchange: 'NYSE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '10%', sector: 'ETF', isin: 'US00214Q1040', tags: ['etf', 'tech'],
    description: 'ARK Innovation ETF is Cathie Wood\'s flagship fund investing in disruptive innovation across genomics, AI, and fintech.',
  },

  // ═══════════════════════════════════════════════════════
  //  AGRICULTURE – Soft & Grain Commodities
  // ═══════════════════════════════════════════════════════
  {
    symbol: 'WHEAT', displayName: 'WHEAT', name: 'CBOT Wheat Futures',
    category: 'agriculture',
    price: 558.50, change24h: 8.25, changePercent: 1.50,
    high24h: 562.00, low24h: 550.25, volume: 85_000_000, unit: 'bushel', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/wheat.jpg',
    bgColor: '#1A1000', textColor: '#F0B90B', exchange: 'CBOT', country: 'US',
    spread: 0.25, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'CBOT Wheat is the world benchmark for soft red winter wheat, a global food staple grown on every inhabited continent.',
  },
  {
    symbol: 'CORN', displayName: 'CORN', name: 'CBOT Corn Futures',
    category: 'agriculture',
    price: 482.75, change24h: 6.50, changePercent: 1.36,
    high24h: 485.50, low24h: 476.25, volume: 120_000_000, unit: 'bushel', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/corn.jpg',
    bgColor: '#1A1000', textColor: '#F0B90B', exchange: 'CBOT', country: 'US',
    spread: 0.25, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'CBOT Corn is the global benchmark for corn, the world\'s largest grain crop used in food, feed, and ethanol.',
  },
  {
    symbol: 'SOYBEAN', displayName: 'SOYBEANS', name: 'CBOT Soybean Futures',
    category: 'agriculture',
    price: 1048.50, change24h: 14.25, changePercent: 1.38,
    high24h: 1052.00, low24h: 1034.25, volume: 90_000_000, unit: 'bushel', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/soybean.jpg',
    bgColor: '#001A0D', textColor: '#22C55E', exchange: 'CBOT', country: 'US',
    spread: 0.50, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'CBOT Soybeans is the leading oilseed futures contract, critical for cooking oil, animal feed, and biodiesel production.',
  },
  {
    symbol: 'COFFEE', displayName: 'COFFEE', name: 'ICE Coffee C Arabica',
    category: 'agriculture',
    price: 395.80, change24h: 5.20, changePercent: 1.33,
    high24h: 398.00, low24h: 390.60, volume: 45_000_000, unit: 'lbs', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/coffee.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'ICE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'ICE Coffee C is the global benchmark for Arabica coffee beans, the world\'s most traded soft commodity after crude oil.',
  },
  {
    symbol: 'COTTON', displayName: 'COTTON', name: 'ICE Cotton No.2 Futures',
    category: 'agriculture',
    price: 68.50, change24h: 0.85, changePercent: 1.26,
    high24h: 69.10, low24h: 67.65, volume: 35_000_000, unit: 'lbs', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/cotton.jpg',
    bgColor: '#001A1A', textColor: '#06B6D4', exchange: 'ICE', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'ICE Cotton No.2 is the world benchmark for upland cotton, the most widely planted cotton variety globally.',
  },
  {
    symbol: 'SUGAR', displayName: 'SUGAR #11', name: 'ICE Sugar No.11 Futures',
    category: 'agriculture',
    price: 19.85, change24h: 0.28, changePercent: 1.43,
    high24h: 20.05, low24h: 19.57, volume: 65_000_000, unit: 'lbs', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/sugar.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'ICE', country: 'US',
    spread: 0.02, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'ICE Sugar No.11 is the world benchmark for raw cane sugar, a critical ingredient in food, beverages, and biofuels.',
  },
  {
    symbol: 'COCOA', displayName: 'COCOA', name: 'ICE Cocoa Futures',
    category: 'agriculture',
    price: 9420.00, change24h: 145.00, changePercent: 1.56,
    high24h: 9485.00, low24h: 9275.00, volume: 28_000_000, unit: 'MT', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/cocoa.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'ICE', country: 'US',
    spread: 5, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'ICE Cocoa is the primary benchmark for cocoa beans used in chocolate manufacturing, with Ghana and Ivory Coast dominating production.',
  },
  {
    symbol: 'OJ', displayName: 'ORANGE JUICE', name: 'FCOJ-A Orange Juice Futures',
    category: 'agriculture',
    price: 238.50, change24h: 3.20, changePercent: 1.36,
    high24h: 242.00, low24h: 235.30, volume: 12_000_000, unit: 'lbs', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/oj.jpg',
    bgColor: '#1A0800', textColor: '#F97316', exchange: 'ICE', country: 'US',
    spread: 0.25, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'FCOJ-A Orange Juice is the benchmark contract for frozen concentrated orange juice, sensitive to Florida and Brazil weather.',
  },
  {
    symbol: 'LUMBER', displayName: 'LUMBER', name: 'CME Lumber Futures',
    category: 'agriculture',
    price: 524.00, change24h: 8.40, changePercent: 1.63,
    high24h: 532.40, low24h: 515.60, volume: 8_000_000, unit: 'MBF', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/lumber.jpg',
    bgColor: '#1A1000', textColor: '#F0B90B', exchange: 'CME', country: 'US',
    spread: 1, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'CME Lumber futures reflect housing construction demand and forest industry conditions, sensitive to US mortgage rates.',
  },
  {
    symbol: 'LHOG', displayName: 'LEAN HOGS', name: 'CME Lean Hog Futures',
    category: 'agriculture',
    price: 92.425, change24h: 0.875, changePercent: 0.96,
    high24h: 93.30, low24h: 91.55, volume: 18_000_000, unit: 'lbs', currency: 'USD',
    bgColor: '#1A0D00', textColor: '#F97316', exchange: 'CME', country: 'US',
    spread: 0.025, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'CME Lean Hog futures are the benchmark for pork belly and processed pork product prices in North America.',
  },
  {
    symbol: 'FCATTLE', displayName: 'FEEDER CATTLE', name: 'CME Feeder Cattle Futures',
    category: 'agriculture',
    price: 283.20, change24h: 1.85, changePercent: 0.66,
    high24h: 285.05, low24h: 281.35, volume: 9_000_000, unit: 'lbs', currency: 'USD',
    logoUrl: 'https://mgfviqdxeupajntpylig.supabase.co/storage/v1/object/public/tradfi-logos/fcattle.jpg',
    bgColor: '#1A0D00', textColor: '#F97316', exchange: 'CME', country: 'US',
    spread: 0.05, defaultLot: '1', marginRate: '5%', tags: [],
    description: 'CME Feeder Cattle futures track prices for cattle going into feedlots, representing the beef supply chain.',
  },
];

export function getBaseAssets(): GlobalAsset[] {
  return BASE_ASSETS;
}

export async function getAssetsWithDbLogos(): Promise<GlobalAsset[]> {
  try {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.from('tradfi_logos').select('symbol, logo_url');
    if (!data || data.length === 0) return BASE_ASSETS;
    const logoMap: Record<string, string> = {};
    data.forEach((row: { symbol: string; logo_url: string }) => {
      if (row.logo_url) logoMap[row.symbol] = row.logo_url;
    });
    return BASE_ASSETS.map(a => ({
      ...a,
      logoUrl: logoMap[a.symbol] || a.logoUrl,
    }));
  } catch {
    return BASE_ASSETS;
  }
}

export function formatGlobalPrice(price: number, symbol: string): string {
  // Forex majors – 5 decimal places
  if (['EURUSD','GBPUSD','AUDUSD','NZDUSD','USDCHF','EURGBP','EURCHF','AUDCAD','EURCAD','AUDNZD','GBPCHF'].includes(symbol))
    return price.toFixed(5);
  // Forex JPY crosses – 3 decimal places
  if (['USDJPY','EURJPY','GBPJPY','CADJPY'].includes(symbol))
    return price.toFixed(3);
  // Forex EM – 3 decimal places
  if (['USDTRY','USDMXN','USDCAD','USDZAR','USDHKD','USDSGD'].includes(symbol))
    return price.toFixed(3);
  if (price >= 10_000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1_000)  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 100)    return price.toFixed(2);
  if (price >= 10)     return price.toFixed(2);
  if (price >= 1)      return price.toFixed(4);
  return price.toFixed(5);
}

export function generateSparkline(asset: GlobalAsset, points = 22): number[] {
  const seed = asset.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const vol = asset.category === 'forex' ? 0.0008 : asset.category === 'indices' ? 0.0015 : 0.014;
  const result: number[] = [];
  let p = asset.price * (1 - asset.changePercent / 100);
  for (let i = 0; i < points; i++) {
    const s = seed + i * 137;
    p = Math.max(p * 0.5, p + (seededRandom(s) - 0.49) * 2 * vol * p);
    result.push(p);
  }
  result.push(asset.price);
  return result;
}
