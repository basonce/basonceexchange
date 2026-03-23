export type TradFiCategory = 'Gold' | 'Silver' | 'Platinum' | 'Palladium' | 'Stock' | 'Commodity' | 'Index' | 'Forex' | 'ETF' | 'Agriculture';

export interface TradFiAsset {
  symbol: string;
  displayName: string;
  category: TradFiCategory;
  basePrice: number;
  volatility: number;
  volume24hBase: number;
  logoUrl: string;
  bgColor?: string;
}

export const TRADFI_ASSETS: TradFiAsset[] = [
  // Metals
  { symbol: 'XAUUSDT',    displayName: 'XAU',    category: 'Gold',      basePrice: 5021.59,  volatility: 0.0004, volume24hBase: 139770000, logoUrl: 'https://assets.staticimg.com/cms/media/1lB3PkckFDyfxz6VudCEACBeRRBi6sQQ7DDjFFpvgUA.png' },
  { symbol: 'XAGUSDT',    displayName: 'XAG',    category: 'Silver',    basePrice: 80.68,    volatility: 0.0008, volume24hBase: 79730000,  logoUrl: 'https://assets.staticimg.com/cms/media/3uuqWjtaP8Cn1nBpIL_Q6tB7C6jP5Q4G0L6Z1Q6uOlg.png' },
  { symbol: 'XPTUSDT',    displayName: 'XPT',    category: 'Platinum',  basePrice: 2032.19,  volatility: 0.0006, volume24hBase: 1660000,   logoUrl: '' },
  { symbol: 'XPDUSDT',    displayName: 'XPD',    category: 'Palladium', basePrice: 1557.88,  volatility: 0.0007, volume24hBase: 1960000,   logoUrl: '' },
  { symbol: 'COPPERUSDT', displayName: 'COPPER', category: 'Palladium', basePrice: 5.679,    volatility: 0.0006, volume24hBase: 2760000,   logoUrl: '' },

  // Stocks
  { symbol: 'TSLAUSDT',   displayName: 'TSLA',   category: 'Stock',     basePrice: 242.00,   volatility: 0.0012, volume24hBase: 5090000,   logoUrl: 'https://assets.parqet.com/logos/symbol/TSLA?format=jpg' },
  { symbol: 'AAPLUSDT',   displayName: 'AAPL',   category: 'Stock',     basePrice: 213.00,   volatility: 0.0008, volume24hBase: 8430000,   logoUrl: 'https://assets.parqet.com/logos/symbol/AAPL?format=jpg' },
  { symbol: 'AMZNUSDT',   displayName: 'AMZN',   category: 'Stock',     basePrice: 197.00,   volatility: 0.001,  volume24hBase: 1020000,   logoUrl: 'https://assets.parqet.com/logos/symbol/AMZN?format=jpg' },
  { symbol: 'MSTRUSDT',   displayName: 'MSTR',   category: 'Stock',     basePrice: 302.00,   volatility: 0.0018, volume24hBase: 4360000,   logoUrl: 'https://assets.parqet.com/logos/symbol/MSTR?format=jpg' },
  { symbol: 'HOODUSDT',   displayName: 'HOOD',   category: 'Stock',     basePrice: 43.00,    volatility: 0.0015, volume24hBase: 1050000,   logoUrl: 'https://assets.parqet.com/logos/symbol/HOOD?format=jpg' },
  { symbol: 'INTCUSDT',   displayName: 'INTC',   category: 'Stock',     basePrice: 20.00,    volatility: 0.0012, volume24hBase: 446121,    logoUrl: 'https://assets.parqet.com/logos/symbol/INTC?format=jpg' },
  { symbol: 'CRCLUSDT',   displayName: 'CRCL',   category: 'Stock',     basePrice: 31.00,    volatility: 0.0012, volume24hBase: 4640000,   logoUrl: 'https://financialmodelingprep.com/image-stock/CRCL.png' },
  { symbol: 'COINUSDT',   displayName: 'COIN',   category: 'Stock',     basePrice: 198.00,   volatility: 0.0013, volume24hBase: 1460000,   logoUrl: 'https://assets.parqet.com/logos/symbol/COIN?format=jpg' },
  { symbol: 'PLTRUSDT',   displayName: 'PLTR',   category: 'Stock',     basePrice: 88.00,    volatility: 0.001,  volume24hBase: 787872,    logoUrl: 'https://assets.parqet.com/logos/symbol/PLTR?format=jpg' },
  { symbol: 'NVIDAUSDT',  displayName: 'NVDA',   category: 'Stock',     basePrice: 115.00,   volatility: 0.0012, volume24hBase: 12400000,  logoUrl: 'https://assets.parqet.com/logos/symbol/NVDA?format=jpg' },
  { symbol: 'GOOGLUSDT',  displayName: 'GOOGL',  category: 'Stock',     basePrice: 163.00,   volatility: 0.0009, volume24hBase: 6200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/GOOGL?format=jpg' },
  { symbol: 'METAUSDT',   displayName: 'META',   category: 'Stock',     basePrice: 570.00,   volatility: 0.001,  volume24hBase: 9800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/META?format=jpg' },
  { symbol: 'MSFTUSDT',   displayName: 'MSFT',   category: 'Stock',     basePrice: 388.00,   volatility: 0.0008, volume24hBase: 7100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/MSFT?format=jpg' },
  { symbol: 'AMDUSDT',    displayName: 'AMD',    category: 'Stock',     basePrice: 102.00,   volatility: 0.0014, volume24hBase: 6800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/AMD?format=jpg' },
  { symbol: 'NFLXUSDT',   displayName: 'NFLX',   category: 'Stock',     basePrice: 942.00,   volatility: 0.0011, volume24hBase: 3200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/NFLX?format=jpg' },
  { symbol: 'DISNUSDT',   displayName: 'DIS',    category: 'Stock',     basePrice: 96.00,    volatility: 0.001,  volume24hBase: 2100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/DIS?format=jpg' },
  { symbol: 'JPMUSDT',    displayName: 'JPM',    category: 'Stock',     basePrice: 238.00,   volatility: 0.0009, volume24hBase: 4500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/JPM?format=jpg' },
  { symbol: 'BACUSDT',    displayName: 'BAC',    category: 'Stock',     basePrice: 40.00,    volatility: 0.0010, volume24hBase: 3800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/BAC?format=jpg' },
  { symbol: 'GSUSDT',     displayName: 'GS',     category: 'Stock',     basePrice: 520.00,   volatility: 0.0009, volume24hBase: 1900000,   logoUrl: 'https://assets.parqet.com/logos/symbol/GS?format=jpg' },
  { symbol: 'BRKBUSDT',   displayName: 'BRK.B',  category: 'Stock',     basePrice: 454.00,   volatility: 0.0007, volume24hBase: 2300000,   logoUrl: 'https://assets.parqet.com/logos/symbol/BRK-B?format=jpg' },
  { symbol: 'VISAUSDT',   displayName: 'V',      category: 'Stock',     basePrice: 330.00,   volatility: 0.0008, volume24hBase: 2700000,   logoUrl: 'https://assets.parqet.com/logos/symbol/V?format=jpg' },
  { symbol: 'MAUSDT',     displayName: 'MA',     category: 'Stock',     basePrice: 536.00,   volatility: 0.0008, volume24hBase: 2100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/MA?format=jpg' },
  { symbol: 'UBERUSDT',   displayName: 'UBER',   category: 'Stock',     basePrice: 73.00,    volatility: 0.0013, volume24hBase: 3100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/UBER?format=jpg' },
  { symbol: 'SPOTUSDT',   displayName: 'SPOT',   category: 'Stock',     basePrice: 590.00,   volatility: 0.0012, volume24hBase: 1400000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SPOT?format=jpg' },
  { symbol: 'SNAPUSDT',   displayName: 'SNAP',   category: 'Stock',     basePrice: 4.65,     volatility: 0.0016, volume24hBase: 2800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SNAP?format=jpg' },
  { symbol: 'JNJUSDT',    displayName: 'JNJ',    category: 'Stock',     basePrice: 155.00,   volatility: 0.0007, volume24hBase: 3900000,   logoUrl: 'https://assets.parqet.com/logos/symbol/JNJ?format=jpg' },
  { symbol: 'WMTUSDT',    displayName: 'WMT',    category: 'Stock',     basePrice: 93.00,    volatility: 0.0007, volume24hBase: 4200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/WMT?format=jpg' },
  { symbol: 'XOMUSDT',    displayName: 'XOM',    category: 'Stock',     basePrice: 105.00,   volatility: 0.0009, volume24hBase: 5100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/XOM?format=jpg' },
  { symbol: 'KOUSDT',     displayName: 'KO',     category: 'Stock',     basePrice: 68.00,    volatility: 0.0006, volume24hBase: 3600000,   logoUrl: 'https://assets.parqet.com/logos/symbol/KO?format=jpg' },
  { symbol: 'PFEUSDT',    displayName: 'PFE',    category: 'Stock',     basePrice: 24.50,    volatility: 0.0009, volume24hBase: 4800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/PFE?format=jpg' },
  { symbol: 'SAPUSDT',    displayName: 'SAP',    category: 'Stock',     basePrice: 240.00,   volatility: 0.0008, volume24hBase: 2100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SAP?format=jpg' },
  { symbol: 'ASMUSDT',    displayName: 'ASML',   category: 'Stock',     basePrice: 690.00,   volatility: 0.0011, volume24hBase: 1800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/ASML?format=jpg' },
  { symbol: 'NESNUSDT',   displayName: 'NESN',   category: 'Stock',     basePrice: 76.00,    volatility: 0.0006, volume24hBase: 1500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/NSRGY?format=jpg' },
  { symbol: 'LVMHUSDT',   displayName: 'LVMH',   category: 'Stock',     basePrice: 570.00,   volatility: 0.001,  volume24hBase: 1200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/LVMHF?format=jpg' },
  { symbol: 'TMUSDT',     displayName: 'TM',     category: 'Stock',     basePrice: 175.00,   volatility: 0.0008, volume24hBase: 1900000,   logoUrl: 'https://assets.parqet.com/logos/symbol/TM?format=jpg' },
  { symbol: 'TSMUSDT',    displayName: 'TSM',    category: 'Stock',     basePrice: 162.00,   volatility: 0.001,  volume24hBase: 3400000,   logoUrl: 'https://assets.parqet.com/logos/symbol/TSM?format=jpg' },
  { symbol: 'BABAUSDT',   displayName: 'BABA',   category: 'Stock',     basePrice: 126.00,   volatility: 0.0014, volume24hBase: 4700000,   logoUrl: 'https://assets.parqet.com/logos/symbol/BABA?format=jpg' },
  { symbol: 'NVOUSDT',    displayName: 'NVO',    category: 'Stock',     basePrice: 72.00,    volatility: 0.001,  volume24hBase: 2200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/NVO?format=jpg' },

  // Commodities
  { symbol: 'WTIUSDT',    displayName: 'WTI',    category: 'Commodity', basePrice: 72.45,    volatility: 0.0009, volume24hBase: 28000000,  logoUrl: 'sprite:oil',    bgColor: '#1a0e00' },
  { symbol: 'BRENTUSDT',  displayName: 'BRENT',  category: 'Commodity', basePrice: 76.30,    volatility: 0.0009, volume24hBase: 32000000,  logoUrl: 'sprite:oil',    bgColor: '#1a1208' },
  { symbol: 'NATGASUSDT', displayName: 'NATGAS', category: 'Commodity', basePrice: 3.82,     volatility: 0.0015, volume24hBase: 8500000,   logoUrl: 'sprite:natgas', bgColor: '#0a1a2a' },
  { symbol: 'COFFEEUSDT', displayName: 'COFFEE', category: 'Commodity', basePrice: 342.50,   volatility: 0.0012, volume24hBase: 1200000,   logoUrl: 'sprite:coffee', bgColor: '#2a1004' },
  { symbol: 'COCOAUSDT',  displayName: 'COCOA',  category: 'Commodity', basePrice: 8920.00,  volatility: 0.0014, volume24hBase: 980000,    logoUrl: 'sprite:cocoa',  bgColor: '#1a0a04' },
  { symbol: 'SUGARUSDT',  displayName: 'SUGAR',  category: 'Commodity', basePrice: 19.85,    volatility: 0.0011, volume24hBase: 1500000,   logoUrl: 'sprite:sugar',  bgColor: '#1a1020' },
  { symbol: 'WHEATUSDT',  displayName: 'WHEAT',  category: 'Commodity', basePrice: 538.00,   volatility: 0.001,  volume24hBase: 1800000,   logoUrl: 'sprite:wheat',   bgColor: '#2a1a04' },
  { symbol: 'CORNUSDT',   displayName: 'CORN',   category: 'Commodity', basePrice: 446.00,   volatility: 0.001,  volume24hBase: 1600000,   logoUrl: 'sprite:corn',    bgColor: '#2a1a00' },
  { symbol: 'SOYUSDT',    displayName: 'SOYBEAN',category: 'Commodity', basePrice: 1042.00,  volatility: 0.0011, volume24hBase: 1300000,   logoUrl: 'sprite:soybean', bgColor: '#0a1a08' },

  // Agriculture
  { symbol: 'LUMBERUSDT', displayName: 'LUMBER',  category: 'Agriculture', basePrice: 562.00,  volatility: 0.0012, volume24hBase: 820000,    logoUrl: '', bgColor: '#7c3a0a' },
  { symbol: 'FCATTLEUSDT',displayName: 'FCATTLE', category: 'Agriculture', basePrice: 274.50,  volatility: 0.0009, volume24hBase: 590000,    logoUrl: '', bgColor: '#5c3a0a' },
  { symbol: 'LHOGUSDT',   displayName: 'LHOG',    category: 'Agriculture', basePrice: 86.50,   volatility: 0.001,  volume24hBase: 420000,    logoUrl: '', bgColor: '#8b3a3a' },

  // Indices
  { symbol: 'SP500USDT',  displayName: 'SPX',    category: 'Index',     basePrice: 5782.00,  volatility: 0.0005, volume24hBase: 95000000,  logoUrl: '/sp500_512.png',    bgColor: '#001a3a' },
  { symbol: 'NAS100USDT', displayName: 'NDX',    category: 'Index',     basePrice: 20480.00, volatility: 0.0006, volume24hBase: 78000000,  logoUrl: '/nasdaq_512.png',   bgColor: '#001a3a' },
  { symbol: 'DJIA30USDT', displayName: 'DJI',    category: 'Index',     basePrice: 43250.00, volatility: 0.0004, volume24hBase: 52000000,  logoUrl: '/dowjones_512.png', bgColor: '#001a3a' },
  { symbol: 'DAXUSDT',    displayName: 'DAX',    category: 'Index',     basePrice: 22185.00, volatility: 0.0005, volume24hBase: 18000000,  logoUrl: 'https://flagcdn.com/w80/de.png', bgColor: '#1a1a00' },
  { symbol: 'FTSE100USDT',displayName: 'FTSE',   category: 'Index',     basePrice: 8640.00,  volatility: 0.0004, volume24hBase: 14000000,  logoUrl: 'https://flagcdn.com/w80/gb.png', bgColor: '#1a001a' },
  { symbol: 'NI225USDT',  displayName: 'NKY',    category: 'Index',     basePrice: 38250.00, volatility: 0.0005, volume24hBase: 12000000,  logoUrl: 'https://flagcdn.com/w80/jp.png', bgColor: '#1a0000' },

  // Forex
  { symbol: 'EURUSDUSDT', displayName: 'EUR/USD', category: 'Forex',   basePrice: 1.0842,   volatility: 0.00025,volume24hBase: 180000000, logoUrl: 'https://flagcdn.com/w80/eu.png', bgColor: '#001a3a' },
  { symbol: 'GBPUSDUSDT', displayName: 'GBP/USD', category: 'Forex',   basePrice: 1.2715,   volatility: 0.0003, volume24hBase: 120000000, logoUrl: 'https://flagcdn.com/w80/gb.png', bgColor: '#1a001a' },
  { symbol: 'USDJPYUSDT', displayName: 'USD/JPY', category: 'Forex',   basePrice: 149.82,   volatility: 0.00025,volume24hBase: 150000000, logoUrl: 'https://flagcdn.com/w80/jp.png', bgColor: '#1a0000' },
  { symbol: 'USDTRYUSDT', displayName: 'USD/TRY', category: 'Forex',   basePrice: 36.45,    volatility: 0.0005, volume24hBase: 25000000,  logoUrl: 'https://flagcdn.com/w80/tr.png', bgColor: '#1a0a00' },
  { symbol: 'AUDUSDUSDT', displayName: 'AUD/USD', category: 'Forex',   basePrice: 0.6328,   volatility: 0.0003, volume24hBase: 65000000,  logoUrl: 'https://flagcdn.com/w80/au.png', bgColor: '#001a0a' },
  { symbol: 'USDCADUSDT', displayName: 'USD/CAD', category: 'Forex',   basePrice: 1.4385,   volatility: 0.00025,volume24hBase: 55000000,  logoUrl: 'https://flagcdn.com/w80/ca.png', bgColor: '#1a0000' },

  // ETFs
  { symbol: 'SPYUSDT',    displayName: 'SPY',    category: 'ETF',       basePrice: 578.40,   volatility: 0.0005, volume24hBase: 42000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/SPY?format=jpg' },
  { symbol: 'QQQUSDT',    displayName: 'QQQ',    category: 'ETF',       basePrice: 499.80,   volatility: 0.0006, volume24hBase: 38000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/QQQ?format=jpg' },
  { symbol: 'GLDUSDT',    displayName: 'GLD',    category: 'ETF',       basePrice: 241.50,   volatility: 0.0004, volume24hBase: 18000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/GLD?format=jpg', bgColor: '#1a1000' },
  { symbol: 'SLVUSDT',    displayName: 'SLV',    category: 'ETF',       basePrice: 28.75,    volatility: 0.0007, volume24hBase: 9500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SLV?format=jpg', bgColor: '#1a1a1a' },
  { symbol: 'ARKKUSDT',   displayName: 'ARKK',   category: 'ETF',       basePrice: 48.20,    volatility: 0.0013, volume24hBase: 5800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/ARKK?format=jpg' },
];

export const CATEGORY_STYLES: Record<TradFiCategory, { bg: string; text: string; label: string }> = {
  Gold:        { bg: 'bg-[#F0B90B]/20', text: 'text-[#F0B90B]', label: 'Gold'        },
  Silver:      { bg: 'bg-[#B7BDC6]/20', text: 'text-[#B7BDC6]', label: 'Silver'      },
  Platinum:    { bg: 'bg-[#7CB9E8]/20', text: 'text-[#7CB9E8]', label: 'Platinum'    },
  Palladium:   { bg: 'bg-[#CDA434]/20', text: 'text-[#CDA434]', label: 'Palladium'   },
  Stock:       { bg: 'bg-[#2ECC71]/20', text: 'text-[#2ECC71]', label: 'Stock'       },
  Commodity:   { bg: 'bg-[#F97316]/20', text: 'text-[#F97316]', label: 'Commodity'   },
  Index:       { bg: 'bg-[#3B82F6]/20', text: 'text-[#3B82F6]', label: 'Index'       },
  Forex:       { bg: 'bg-[#06B6D4]/20', text: 'text-[#06B6D4]', label: 'Forex'       },
  ETF:         { bg: 'bg-[#A855F7]/20', text: 'text-[#A855F7]', label: 'ETF'         },
  Agriculture: { bg: 'bg-[#84CC16]/20', text: 'text-[#84CC16]', label: 'Agriculture' },
};

export function getTradFiAsset(symbol: string): TradFiAsset | undefined {
  return TRADFI_ASSETS.find(a => a.symbol === symbol || a.displayName === symbol);
}

export function isTradFiSymbol(symbol: string): boolean {
  return TRADFI_ASSETS.some(a => a.symbol === symbol || a.displayName === symbol || `${symbol}USDT` === a.symbol);
}
