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
  // Metals (fallback prices — real-time prices come from API server via Yahoo Finance)
  { symbol: 'XAUUSDT',    displayName: 'XAU',    category: 'Gold',      basePrice: 4400.00,  volatility: 0.0004, volume24hBase: 139770000, logoUrl: 'https://assets.staticimg.com/cms/media/1lB3PkckFDyfxz6VudCEACBeRRBi6sQQ7DDjFFpvgUA.png' },
  { symbol: 'XAGUSDT',    displayName: 'XAG',    category: 'Silver',    basePrice: 69.75,    volatility: 0.0008, volume24hBase: 79730000,  logoUrl: 'https://assets.staticimg.com/cms/media/3uuqWjtaP8Cn1nBpIL_Q6tB7C6jP5Q4G0L6Z1Q6uOlg.png' },
  { symbol: 'XPTUSDT',    displayName: 'XPT',    category: 'Platinum',  basePrice: 1020.00,  volatility: 0.0006, volume24hBase: 1660000,   logoUrl: '' },
  { symbol: 'XPDUSDT',    displayName: 'XPD',    category: 'Palladium', basePrice: 1010.00,  volatility: 0.0007, volume24hBase: 1960000,   logoUrl: '' },
  { symbol: 'COPPERUSDT', displayName: 'COPPER', category: 'Palladium', basePrice: 4.80,     volatility: 0.0006, volume24hBase: 2760000,   logoUrl: '' },

  // Stocks (fallback prices — real-time prices come from API server via Yahoo Finance)
  { symbol: 'TSLAUSDT',   displayName: 'TSLA',   category: 'Stock',     basePrice: 270.00,   volatility: 0.0012, volume24hBase: 5090000,   logoUrl: 'https://assets.parqet.com/logos/symbol/TSLA?format=jpg' },
  { symbol: 'AAPLUSDT',   displayName: 'AAPL',   category: 'Stock',     basePrice: 220.00,   volatility: 0.0008, volume24hBase: 8430000,   logoUrl: 'https://assets.parqet.com/logos/symbol/AAPL?format=jpg' },
  { symbol: 'AMZNUSDT',   displayName: 'AMZN',   category: 'Stock',     basePrice: 195.00,   volatility: 0.001,  volume24hBase: 1020000,   logoUrl: 'https://assets.parqet.com/logos/symbol/AMZN?format=jpg' },
  { symbol: 'MSTRUSDT',   displayName: 'MSTR',   category: 'Stock',     basePrice: 320.00,   volatility: 0.0018, volume24hBase: 4360000,   logoUrl: 'https://assets.parqet.com/logos/symbol/MSTR?format=jpg' },
  { symbol: 'HOODUSDT',   displayName: 'HOOD',   category: 'Stock',     basePrice: 45.00,    volatility: 0.0015, volume24hBase: 1050000,   logoUrl: 'https://assets.parqet.com/logos/symbol/HOOD?format=jpg' },
  { symbol: 'INTCUSDT',   displayName: 'INTC',   category: 'Stock',     basePrice: 23.00,    volatility: 0.0012, volume24hBase: 446121,    logoUrl: 'https://assets.parqet.com/logos/symbol/INTC?format=jpg' },
  { symbol: 'CRCLUSDT',   displayName: 'CRCL',   category: 'Stock',     basePrice: 31.00,    volatility: 0.0012, volume24hBase: 4640000,   logoUrl: 'https://financialmodelingprep.com/image-stock/CRCL.png' },
  { symbol: 'COINUSDT',   displayName: 'COIN',   category: 'Stock',     basePrice: 210.00,   volatility: 0.0013, volume24hBase: 1460000,   logoUrl: 'https://assets.parqet.com/logos/symbol/COIN?format=jpg' },
  { symbol: 'PLTRUSDT',   displayName: 'PLTR',   category: 'Stock',     basePrice: 95.00,    volatility: 0.001,  volume24hBase: 787872,    logoUrl: 'https://assets.parqet.com/logos/symbol/PLTR?format=jpg' },
  { symbol: 'NVIDAUSDT',  displayName: 'NVDA',   category: 'Stock',     basePrice: 118.00,   volatility: 0.0012, volume24hBase: 12400000,  logoUrl: 'https://assets.parqet.com/logos/symbol/NVDA?format=jpg' },
  { symbol: 'GOOGLUSDT',  displayName: 'GOOGL',  category: 'Stock',     basePrice: 170.00,   volatility: 0.0009, volume24hBase: 6200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/GOOGL?format=jpg' },
  { symbol: 'METAUSDT',   displayName: 'META',   category: 'Stock',     basePrice: 590.00,   volatility: 0.001,  volume24hBase: 9800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/META?format=jpg' },
  { symbol: 'MSFTUSDT',   displayName: 'MSFT',   category: 'Stock',     basePrice: 395.00,   volatility: 0.0008, volume24hBase: 7100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/MSFT?format=jpg' },
  { symbol: 'AMDUSDT',    displayName: 'AMD',    category: 'Stock',     basePrice: 110.00,   volatility: 0.0014, volume24hBase: 6800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/AMD?format=jpg' },
  { symbol: 'NFLXUSDT',   displayName: 'NFLX',   category: 'Stock',     basePrice: 1000.00,  volatility: 0.0011, volume24hBase: 3200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/NFLX?format=jpg' },
  { symbol: 'DISNUSDT',   displayName: 'DIS',    category: 'Stock',     basePrice: 102.00,   volatility: 0.001,  volume24hBase: 2100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/DIS?format=jpg' },
  { symbol: 'JPMUSDT',    displayName: 'JPM',    category: 'Stock',     basePrice: 240.00,   volatility: 0.0009, volume24hBase: 4500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/JPM?format=jpg' },
  { symbol: 'BACUSDT',    displayName: 'BAC',    category: 'Stock',     basePrice: 42.00,    volatility: 0.0010, volume24hBase: 3800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/BAC?format=jpg' },
  { symbol: 'GSUSDT',     displayName: 'GS',     category: 'Stock',     basePrice: 530.00,   volatility: 0.0009, volume24hBase: 1900000,   logoUrl: 'https://assets.parqet.com/logos/symbol/GS?format=jpg' },
  { symbol: 'BRKBUSDT',   displayName: 'BRK.B',  category: 'Stock',     basePrice: 470.00,   volatility: 0.0007, volume24hBase: 2300000,   logoUrl: 'https://assets.parqet.com/logos/symbol/BRK-B?format=jpg' },
  { symbol: 'VISAUSDT',   displayName: 'V',      category: 'Stock',     basePrice: 345.00,   volatility: 0.0008, volume24hBase: 2700000,   logoUrl: 'https://assets.parqet.com/logos/symbol/V?format=jpg' },
  { symbol: 'MAUSDT',     displayName: 'MA',     category: 'Stock',     basePrice: 550.00,   volatility: 0.0008, volume24hBase: 2100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/MA?format=jpg' },
  { symbol: 'UBERUSDT',   displayName: 'UBER',   category: 'Stock',     basePrice: 82.00,    volatility: 0.0013, volume24hBase: 3100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/UBER?format=jpg' },
  { symbol: 'SPOTUSDT',   displayName: 'SPOT',   category: 'Stock',     basePrice: 595.00,   volatility: 0.0012, volume24hBase: 1400000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SPOT?format=jpg' },
  { symbol: 'SNAPUSDT',   displayName: 'SNAP',   category: 'Stock',     basePrice: 9.00,     volatility: 0.0016, volume24hBase: 2800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SNAP?format=jpg' },
  { symbol: 'JNJUSDT',    displayName: 'JNJ',    category: 'Stock',     basePrice: 158.00,   volatility: 0.0007, volume24hBase: 3900000,   logoUrl: 'https://assets.parqet.com/logos/symbol/JNJ?format=jpg' },
  { symbol: 'WMTUSDT',    displayName: 'WMT',    category: 'Stock',     basePrice: 98.00,    volatility: 0.0007, volume24hBase: 4200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/WMT?format=jpg' },
  { symbol: 'XOMUSDT',    displayName: 'XOM',    category: 'Stock',     basePrice: 115.00,   volatility: 0.0009, volume24hBase: 5100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/XOM?format=jpg' },
  { symbol: 'KOUSDT',     displayName: 'KO',     category: 'Stock',     basePrice: 70.00,    volatility: 0.0006, volume24hBase: 3600000,   logoUrl: 'https://assets.parqet.com/logos/symbol/KO?format=jpg' },
  { symbol: 'PFEUSDT',    displayName: 'PFE',    category: 'Stock',     basePrice: 26.00,    volatility: 0.0009, volume24hBase: 4800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/PFE?format=jpg' },
  { symbol: 'SAPUSDT',    displayName: 'SAP',    category: 'Stock',     basePrice: 255.00,   volatility: 0.0008, volume24hBase: 2100000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SAP?format=jpg' },
  { symbol: 'ASMUSDT',    displayName: 'ASML',   category: 'Stock',     basePrice: 710.00,   volatility: 0.0011, volume24hBase: 1800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/ASML?format=jpg' },
  { symbol: 'NESNUSDT',   displayName: 'NESN',   category: 'Stock',     basePrice: 88.00,    volatility: 0.0006, volume24hBase: 1500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/NSRGY?format=jpg' },
  { symbol: 'LVMHUSDT',   displayName: 'LVMH',   category: 'Stock',     basePrice: 580.00,   volatility: 0.001,  volume24hBase: 1200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/LVMHF?format=jpg' },
  { symbol: 'TMUSDT',     displayName: 'TM',     category: 'Stock',     basePrice: 178.00,   volatility: 0.0008, volume24hBase: 1900000,   logoUrl: 'https://assets.parqet.com/logos/symbol/TM?format=jpg' },
  { symbol: 'TSMUSDT',    displayName: 'TSM',    category: 'Stock',     basePrice: 180.00,   volatility: 0.001,  volume24hBase: 3400000,   logoUrl: 'https://assets.parqet.com/logos/symbol/TSM?format=jpg' },
  { symbol: 'BABAUSDT',   displayName: 'BABA',   category: 'Stock',     basePrice: 115.00,   volatility: 0.0014, volume24hBase: 4700000,   logoUrl: 'https://assets.parqet.com/logos/symbol/BABA?format=jpg' },
  { symbol: 'NVOUSDT',    displayName: 'NVO',    category: 'Stock',     basePrice: 78.00,    volatility: 0.001,  volume24hBase: 2200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/NVO?format=jpg' },

  // Commodities (fallback prices — real-time prices come from API server via Yahoo Finance)
  { symbol: 'WTIUSDT',    displayName: 'WTI',    category: 'Commodity', basePrice: 69.00,    volatility: 0.0009, volume24hBase: 28000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/USO?format=jpg',  bgColor: '#1a0e00' },
  { symbol: 'BRENTUSDT',  displayName: 'BRENT',  category: 'Commodity', basePrice: 72.00,    volatility: 0.0009, volume24hBase: 32000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/BNO?format=jpg',  bgColor: '#1a1208' },
  { symbol: 'NATGASUSDT', displayName: 'NATGAS', category: 'Commodity', basePrice: 4.20,     volatility: 0.0015, volume24hBase: 8500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/UNG?format=jpg',  bgColor: '#0a1a2a' },
  { symbol: 'COFFEEUSDT', displayName: 'COFFEE', category: 'Commodity', basePrice: 380.00,   volatility: 0.0012, volume24hBase: 1200000,   logoUrl: 'https://assets.parqet.com/logos/symbol/JO?format=jpg',   bgColor: '#2a1004' },
  { symbol: 'COCOAUSDT',  displayName: 'COCOA',  category: 'Commodity', basePrice: 7200.00,  volatility: 0.0014, volume24hBase: 980000,    logoUrl: 'https://assets.parqet.com/logos/symbol/NIB?format=jpg',  bgColor: '#1a0a04' },
  { symbol: 'SUGARUSDT',  displayName: 'SUGAR',  category: 'Commodity', basePrice: 20.50,    volatility: 0.0011, volume24hBase: 1500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/CANE?format=jpg', bgColor: '#1a1020' },
  { symbol: 'WHEATUSDT',  displayName: 'WHEAT',  category: 'Commodity', basePrice: 545.00,   volatility: 0.001,  volume24hBase: 1800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/WEAT?format=jpg', bgColor: '#2a1a04' },
  { symbol: 'CORNUSDT',   displayName: 'CORN',   category: 'Commodity', basePrice: 455.00,   volatility: 0.001,  volume24hBase: 1600000,   logoUrl: 'https://assets.parqet.com/logos/symbol/CORN?format=jpg', bgColor: '#2a1a00' },
  { symbol: 'SOYUSDT',    displayName: 'SOYBEAN',category: 'Commodity', basePrice: 1050.00,  volatility: 0.0011, volume24hBase: 1300000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SOYB?format=jpg', bgColor: '#0a1a08' },

  // Agriculture (fallback prices)
  { symbol: 'LUMBERUSDT', displayName: 'LUMBER',  category: 'Agriculture', basePrice: 570.00,  volatility: 0.0012, volume24hBase: 820000,    logoUrl: 'https://assets.parqet.com/logos/symbol/WOOD?format=jpg', bgColor: '#7c3a0a' },
  { symbol: 'FCATTLEUSDT',displayName: 'FCATTLE', category: 'Agriculture', basePrice: 280.00,  volatility: 0.0009, volume24hBase: 590000,    logoUrl: 'https://assets.parqet.com/logos/symbol/COW?format=jpg',  bgColor: '#5c3a0a' },
  { symbol: 'LHOGUSDT',   displayName: 'LHOG',    category: 'Agriculture', basePrice: 89.00,   volatility: 0.001,  volume24hBase: 420000,    logoUrl: '',                                                         bgColor: '#8b3a3a' },

  // Indices (fallback prices — real-time prices come from API server via Yahoo Finance)
  { symbol: 'SP500USDT',  displayName: 'SPX',    category: 'Index',     basePrice: 6556.00,  volatility: 0.0005, volume24hBase: 95000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/SPY?format=jpg',  bgColor: '#001a3a' },
  { symbol: 'NAS100USDT', displayName: 'NDX',    category: 'Index',     basePrice: 24002.00, volatility: 0.0006, volume24hBase: 78000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/QQQ?format=jpg',  bgColor: '#001a3a' },
  { symbol: 'DJIA30USDT', displayName: 'DJI',    category: 'Index',     basePrice: 46124.00, volatility: 0.0004, volume24hBase: 52000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/DIA?format=jpg',  bgColor: '#001a3a' },
  { symbol: 'DAXUSDT',    displayName: 'DAX',    category: 'Index',     basePrice: 23400.00, volatility: 0.0005, volume24hBase: 18000000,  logoUrl: 'https://flagcdn.com/w80/de.png', bgColor: '#000a1a' },
  { symbol: 'FTSE100USDT',displayName: 'FTSE',   category: 'Index',     basePrice: 8700.00,  volatility: 0.0004, volume24hBase: 14000000,  logoUrl: 'https://flagcdn.com/w80/gb.png', bgColor: '#0a001a' },
  { symbol: 'NI225USDT',  displayName: 'NKY',    category: 'Index',     basePrice: 38500.00, volatility: 0.0005, volume24hBase: 12000000,  logoUrl: 'https://flagcdn.com/w80/jp.png', bgColor: '#1a0000' },

  // Forex (fallback prices — real-time prices come from API server via Yahoo Finance)
  { symbol: 'EURUSDUSDT', displayName: 'EUR/USD', category: 'Forex',   basePrice: 1.1587,   volatility: 0.00025,volume24hBase: 180000000, logoUrl: 'https://flagcdn.com/w80/eu.png', bgColor: '#001a3a' },
  { symbol: 'GBPUSDUSDT', displayName: 'GBP/USD', category: 'Forex',   basePrice: 1.3381,   volatility: 0.0003, volume24hBase: 120000000, logoUrl: 'https://flagcdn.com/w80/gb.png', bgColor: '#1a001a' },
  { symbol: 'USDJPYUSDT', displayName: 'USD/JPY', category: 'Forex',   basePrice: 159.02,   volatility: 0.00025,volume24hBase: 150000000, logoUrl: 'https://flagcdn.com/w80/jp.png', bgColor: '#1a0000' },
  { symbol: 'USDTRYUSDT', displayName: 'USD/TRY', category: 'Forex',   basePrice: 40.50,    volatility: 0.0005, volume24hBase: 25000000,  logoUrl: 'https://flagcdn.com/w80/tr.png', bgColor: '#1a0a00' },
  { symbol: 'AUDUSDUSDT', displayName: 'AUD/USD', category: 'Forex',   basePrice: 0.6320,   volatility: 0.0003, volume24hBase: 65000000,  logoUrl: 'https://flagcdn.com/w80/au.png', bgColor: '#001a0a' },
  { symbol: 'USDCADUSDT', displayName: 'USD/CAD', category: 'Forex',   basePrice: 1.3870,   volatility: 0.00025,volume24hBase: 55000000,  logoUrl: 'https://flagcdn.com/w80/ca.png', bgColor: '#1a0000' },

  // ETFs (fallback prices — real-time prices come from API server via Yahoo Finance)
  { symbol: 'SPYUSDT',    displayName: 'SPY',    category: 'ETF',       basePrice: 655.00,   volatility: 0.0005, volume24hBase: 42000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/SPY?format=jpg' },
  { symbol: 'QQQUSDT',    displayName: 'QQQ',    category: 'ETF',       basePrice: 508.00,   volatility: 0.0006, volume24hBase: 38000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/QQQ?format=jpg' },
  { symbol: 'GLDUSDT',    displayName: 'GLD',    category: 'ETF',       basePrice: 412.00,   volatility: 0.0004, volume24hBase: 18000000,  logoUrl: 'https://assets.parqet.com/logos/symbol/GLD?format=jpg', bgColor: '#1a1000' },
  { symbol: 'SLVUSDT',    displayName: 'SLV',    category: 'ETF',       basePrice: 64.00,    volatility: 0.0007, volume24hBase: 9500000,   logoUrl: 'https://assets.parqet.com/logos/symbol/SLV?format=jpg', bgColor: '#1a1a1a' },
  { symbol: 'ARKKUSDT',   displayName: 'ARKK',   category: 'ETF',       basePrice: 55.00,    volatility: 0.0013, volume24hBase: 5800000,   logoUrl: 'https://assets.parqet.com/logos/symbol/ARKK?format=jpg' },
];

export const TEXT_LOGO_ASSETS: Record<string, { text: string; bg: string; textColor: string; fontSize?: number }> = {
  SPX:     { text: 'S&P', bg: '#003087', textColor: '#ffffff', fontSize: 9 },
  NDX:     { text: 'NDQ', bg: '#0066cc', textColor: '#ffffff', fontSize: 9 },
  DJI:     { text: 'DOW', bg: '#1a3a6e', textColor: '#ffffff', fontSize: 9 },
  DAX:     { text: 'DAX', bg: '#000000', textColor: '#ffcc00', fontSize: 9 },
  FTSE:    { text: 'UK',  bg: '#012169', textColor: '#ffffff', fontSize: 11 },
  NKY:     { text: 'NK',  bg: '#bc002d', textColor: '#ffffff', fontSize: 11 },
  LUMBER:  { text: 'LBR', bg: '#7c3a0a', textColor: '#f5deb3', fontSize: 9 },
  LHOG:    { text: 'HOG', bg: '#8b3a3a', textColor: '#ffffff', fontSize: 9 },
  FCATTLE: { text: 'FCT', bg: '#5c3a0a', textColor: '#ffd700', fontSize: 9 },
  WTI:     { text: 'WTI', bg: '#1a0e00', textColor: '#f97316', fontSize: 9 },
  BRENT:   { text: 'BRT', bg: '#1a1208', textColor: '#f97316', fontSize: 9 },
  NATGAS:  { text: 'GAS', bg: '#0a1a2a', textColor: '#38bdf8', fontSize: 9 },
  COFFEE:  { text: 'CFE', bg: '#2a1004', textColor: '#d97706', fontSize: 9 },
  COCOA:   { text: 'CCO', bg: '#1a0a04', textColor: '#a16207', fontSize: 9 },
  SUGAR:   { text: 'SGR', bg: '#1a1020', textColor: '#e879f9', fontSize: 9 },
  WHEAT:   { text: 'WHT', bg: '#2a1a04', textColor: '#fbbf24', fontSize: 9 },
  CORN:    { text: 'CRN', bg: '#2a1a00', textColor: '#fde047', fontSize: 9 },
  SOYBEAN: { text: 'SOY', bg: '#0a1a08', textColor: '#86efac', fontSize: 8 },
};

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
