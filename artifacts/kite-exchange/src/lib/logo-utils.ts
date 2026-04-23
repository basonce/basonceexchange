const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

const CMC_IDS: Record<string, number> = {
  USDT: 825, USDC: 3408, BUSD: 4687, DAI: 4943,
  BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426, XRP: 52, ADA: 2010, DOGE: 74,
  AVAX: 5805, DOT: 6636, MATIC: 3890, LINK: 1975, UNI: 7083, LTC: 2,
  ATOM: 3794, ETC: 1321, XLM: 512, NEAR: 6535, ALGO: 4030, VET: 3077,
  ICP: 8916, FIL: 2280, APT: 21794, ARB: 11841, OP: 11840, INJ: 7226,
  SUI: 20947, SEI: 23149, TIA: 22861, RENDER: 5690, FTM: 3513, PEPE: 24478,
  SHIB: 5994, WIF: 28752, FLOKI: 10804, TRX: 1958, HBAR: 4642, MKR: 1518,
  AAVE: 7278, GRT: 6719, STX: 4847, IMX: 10603, SAND: 6210, MANA: 1966,
  AXS: 6783, GALA: 7080, ENJ: 2130, CRV: 6538, SNX: 2586, COMP: 5692,
  LDO: 8000, RPL: 2943, BAL: 5728, SUSHI: 6758, YFI: 5864, DYDX: 11156,
  GMX: 11857, CAKE: 7186, JOE: 11396, RUNE: 4157, KSM: 5034, FLOW: 4558,
  THETA: 2416, KAVA: 4846, CELO: 5567, ONE: 3945, ROSE: 7653, ZIL: 2469,
  QTUM: 1684, ICX: 2099, ZEN: 1698, WAVES: 1274, DASH: 131, DCR: 1168,
  BAT: 1697, ENS: 13855, LRC: 1934, CHZ: 4066, MASK: 8536, AUDIO: 7455,
  RLC: 1637, STORJ: 1772, ANKR: 3783, CELR: 3814, CTSI: 5444, SKL: 5765,
  NKN: 2780, BAND: 4679, API3: 7737, OCEAN: 3911, FET: 3773, AGIX: 2424,
  RNDR: 5690, WLD: 13502, ACH: 9399, JASMY: 8425, BLUR: 23121, MAGIC: 14783,
  PENDLE: 9481, SSV: 12999, LQTY: 7429, FXS: 6953, PERP: 6950,
  HIGH: 11232, LEVER: 20873, AMB: 2081, LOOM: 2588, KEY: 2398,
  MINA: 8646, CFX: 7334, EGLD: 6892, CKB: 4948, ACE: 28632, PYTH: 28177,
  JTO: 28541, ONDO: 21159, STRK: 22691, DYM: 28932, PIXEL: 29064,
  PORTAL: 29555, ALT: 29073, MANTA: 28881, BOME: 29870,
  ENA: 30171, W: 29587, TNSR: 30240, REZ: 30753, BB: 30896,
  NOT: 28850, IO: 30691, ZK: 24091, LISTA: 31038, ZRO: 26997,
  BANANA: 28066, DOGS: 32698, SUN: 10529, WIN: 4206, JST: 5488,
  BTT: 16086, PEOPLE: 13579, LUNC: 4172, USTC: 7129,
  BONK: 23095, WOO: 7501, RSR: 3964, IOTA: 1720, NEO: 1376, EOS: 1765,
  XTZ: 2011, MEME: 28301, ORDI: 25028, SATS: 28683,
  '1INCH': 8104, TROY: 4070, CREAM: 6193, PNT: 4877,
  DODO: 7224, ALPHA: 8280, TWT: 5964, C98: 10903, BAKE: 7978,
  MDT: 2348, STEEM: 1230, XVS: 7288, BETA: 10294, RARE: 11294,
  TRU: 7725, POND: 8795, ALCX: 8613, SPELL: 11289, CVX: 9903,
  OGN: 5117, PROM: 4120, INIT: 33538, ORCA: 11165,
  AMP: 6945, FLUX: 3029, AR: 5632, HNT: 5665,
  GMT: 18069, APE: 18876, T: 14895, HOOK: 21753,
  ID: 27657, EDU: 28298, MAV: 27979,
  CYBER: 28481, ARKM: 27565, NTRN: 27985, TRB: 1585,
  BEAMX: 28998, SUPER: 8290, ASTR: 12885, MOVR: 9285,
  GLMR: 6836, ACA: 6756, RDNT: 21106, VOXEL: 10678,
  DENT: 1886, HOT: 2682,
  COTI: 3992, MTL: 1788, IRIS: 3874, ONG: 3217,
  STPT: 4006, FOR: 3775, SCRT: 5604,
  XNO: 1567, QNT: 3155, AGLD: 11568, LINA: 7102,
  TOMO: 2570, REQ: 2071, ARPA: 4039, MBL: 3876,
  SXP: 4279, FLM: 7150, GHST: 7046,
  POLYX: 20362, UFT: 7412, POLS: 7208, ALICE: 8766,
  DUSK: 4092, ERN: 8615, MLN: 1552, PYR: 9308,
  QUICK: 3701, BICO: 9543, RAD: 6843, BOND: 11548,
  AUCTION: 10188, CLV: 8384, FORTH: 9421, FARM: 6859,
  BADGER: 9638, KP3R: 7535, UNFI: 7672, ALPACA: 8707,
  TLM: 9119, ILV: 8719, SANTOS: 14783, CITY: 13899,
  CHESS: 10764, DAR: 11374, BSW: 18276,
  EPX: 18279, MULTI: 1732, COMBO: 28891,
  ARK: 1586, LSK: 1214, IOTX: 2777, RVN: 2577,
  ONT: 2566, NULS: 2092, WAN: 2606, GAS: 1785,
  POWR: 2132, REN: 2607, DGB: 109, SC: 1042,
  ZEC: 1437, BCH: 1831, BSV: 3602, BTG: 2083,
  LUNA: 20314, KDA: 5765,
  ACM: 14041, ADEN: 15196, AKRO: 3325, ASR: 13528, ATA: 11901,
  AXL: 17799, BABYDOGE: 16125, BAR: 13440, BCHA: 13503, BEL: 7046,
  BOBA: 14556, BTCST: 14235, BTTC: 22457, BURGER: 7158,
  DF: 8343, DPI: 7455, ELON: 14962, FLR: 4642, FRONT: 8105,
  GAL: 11877, JUV: 12263, KAS: 20396, LAZIO: 20058, LOOKS: 22173,
  MC: 18753, OG: 11663, ORN: 5631, OSMO: 12220, PHA: 6841,
  PLA: 14316, PORTO: 12345, PRIME: 22572, PSG: 12252, PUNDIX: 14571,
  RARI: 11845, RON: 14101, SAMO: 15051, SFP: 13905, SLP: 5765,
  VIDT: 4852, WAXP: 2300, WRX: 10547, XEC: 10791, YGG: 17358,
};

export function getProxiedLogoUrl(logoUrl: string | null | undefined): string {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('/') || logoUrl.startsWith('data:')) return logoUrl;
  if (logoUrl.includes('/storage/v1/object/public/')) return logoUrl;
  if (logoUrl.includes('/functions/v1/logo-proxy')) return logoUrl;
  return logoUrl;
}

export function getStorageLogoUrl(symbol: string): string {
  if (!SUPABASE_URL) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/coin-logos/${symbol.toLowerCase()}.png`;
}

export function getFallbackLogoUrl(symbol: string): string {
  const colors = ['0ea5e9', '22c55e', 'f59e0b', 'ef4444', '06b6d4', 'f97316', '14b8a6', 'F0B90B'];
  const idx = (symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 0)) % colors.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol.slice(0, 2))}&background=${colors[idx]}&color=fff&size=128&bold=true`;
}

const BNB_TRADFI = (t: string) => `https://bin.bnbstatic.com/static/images/common/tradfi/${t}.svg`;
const WVL        = (slug: string) => `https://cdn.worldvectorlogo.com/logos/${slug}.svg`;
const GL         = (domain: string) => `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
const CMC_LOGO   = (t: string) => `https://companiesmarketcap.com/img/company-logos/256/${t}.webp`;

const TRADFI_LOGO_URLS: Record<string, string[]> = {
  // Metals - BNB CDN
  XAU:    [BNB_TRADFI('XAU')],
  XAG:    [BNB_TRADFI('XAG')],
  XPT:    [BNB_TRADFI('XPT')],
  XPD:    [BNB_TRADFI('XPD')],
  COPPER: [BNB_TRADFI('COPPER')],

  // Commodities - BNB CDN
  WTI:    [BNB_TRADFI('OIL')],
  BRENT:  [BNB_TRADFI('BRENT')],
  NATGAS: [BNB_TRADFI('NATGAS')],
  COFFEE: [BNB_TRADFI('COFFEE')],
  COCOA:  [BNB_TRADFI('COCOA')],
  SUGAR:  [BNB_TRADFI('SUGAR')],
  WHEAT:  [BNB_TRADFI('WHEAT')],
  CORN:   [BNB_TRADFI('CORN')],
  SOYBEAN:[BNB_TRADFI('SOYBEAN')],

  // Indices - BNB CDN
  SPX:    [BNB_TRADFI('SPX')],
  NDX:    [BNB_TRADFI('NDX')],
  DJI:    [BNB_TRADFI('DJI')],
  DAX:    [BNB_TRADFI('DAX')],
  FTSE:   [BNB_TRADFI('FTSE')],
  NKY:    [BNB_TRADFI('NKY')],

  // Forex - BNB CDN
  'EUR/USD': [BNB_TRADFI('EURUSD')],
  'GBP/USD': [BNB_TRADFI('GBPUSD')],
  'USD/JPY': [BNB_TRADFI('USDJPY')],
  'USD/TRY': [BNB_TRADFI('USDTRY')],
  'AUD/USD': [BNB_TRADFI('AUDUSD')],
  'USD/CAD': [BNB_TRADFI('USDCAD')],

  // ETFs
  SPY:    [BNB_TRADFI('SPY'),  GL('ssga.com'),           CMC_LOGO('SPY')],
  QQQ:    [BNB_TRADFI('QQQ'),  GL('invesco.com'),         CMC_LOGO('QQQ')],
  GLD:    [BNB_TRADFI('GLD'),  GL('spdrgoldshares.com'),  CMC_LOGO('GLD')],
  SLV:    [BNB_TRADFI('SLV'),  GL('ishares.com'),         CMC_LOGO('SLV')],
  ARKK:   [BNB_TRADFI('ARKK'), GL('ark-invest.com'),      CMC_LOGO('ARKK')],

  // Stocks - WorldVectorLogo SVG ilk, Google favicon ikinci, CMC üçüncü
  TSLA:   [WVL('tesla-motors'),            GL('tesla.com'),             CMC_LOGO('TSLA')],
  AAPL:   [WVL('apple'),                   GL('apple.com'),             CMC_LOGO('AAPL')],
  AMZN:   [WVL('amazon'),                  GL('amazon.com'),            CMC_LOGO('AMZN')],
  NVDA:   [WVL('nvidia'),                  GL('nvidia.com'),            CMC_LOGO('NVDA')],
  MSFT:   [WVL('microsoft'),               GL('microsoft.com'),         CMC_LOGO('MSFT')],
  GOOGL:  [WVL('google-g-2015'),           GL('google.com'),            CMC_LOGO('GOOGL')],
  META:   [WVL('meta-1'),                  GL('meta.com'),              CMC_LOGO('META')],
  NFLX:   [WVL('netflix-4'),              GL('netflix.com'),           CMC_LOGO('NFLX')],
  AMD:    [WVL('amd'),                     GL('amd.com'),               CMC_LOGO('AMD')],
  COIN:   [WVL('coinbase-1'),              GL('coinbase.com'),          CMC_LOGO('COIN')],
  HOOD:   [WVL('robinhood'),               GL('robinhood.com'),         CMC_LOGO('HOOD')],
  INTC:   [WVL('intel'),                   GL('intel.com'),             CMC_LOGO('INTC')],
  PLTR:   [WVL('palantir'),                GL('palantir.com'),          CMC_LOGO('PLTR')],
  MSTR:   [WVL('microstrategy'),           GL('strategy.com'),          CMC_LOGO('MSTR')],
  CRCL:   [WVL('circle-2'),               GL('circle.com'),            CMC_LOGO('CRCL')],
  DIS:    [WVL('disney'),                  GL('disney.com'),            CMC_LOGO('DIS')],
  JPM:    [WVL('jpmorgan-chase'),          GL('jpmorgan.com'),          CMC_LOGO('JPM')],
  BAC:    [WVL('bank-of-america'),         GL('bankofamerica.com'),     CMC_LOGO('BAC')],
  GS:     [WVL('goldman-sachs'),           GL('goldmansachs.com'),      CMC_LOGO('GS')],
  'BRK.B':[WVL('berkshire-hathaway'),      GL('berkshirehathaway.com'), CMC_LOGO('BRK-B')],
  V:      [WVL('visa-2'),                  GL('visa.com'),              CMC_LOGO('V')],
  MA:     [WVL('mastercard-4'),            GL('mastercard.com'),        CMC_LOGO('MA')],
  UBER:   [WVL('uber-1'),                  GL('uber.com'),              CMC_LOGO('UBER')],
  SPOT:   [WVL('spotify-1'),               GL('spotify.com'),           CMC_LOGO('SPOT')],
  SNAP:   [WVL('snapchat'),                GL('snap.com'),              CMC_LOGO('SNAP')],
};

const LOCAL_HD_LOGOS: Record<string, string> = {
  'PAYAI':   '/payai-logo.png',
  'SGP':     '/sgp-logo.png',
  'POWERAI': '/powerai-logo.png',
  'SZNP':    '/SZNP.jpg',
};

export function buildLogoChain(symbol: string, dbUrl?: string | null): string[] {
  if (symbol === 'EQ' || symbol === 'EARN') return ['/earnquest-logo-icon-2.png'];
  if (symbol === 'BNC') return ['/ChatGPT_Image_28_Sub_2026_03_53_59 copy.png'];
  if (LOCAL_HD_LOGOS[symbol]) return [LOCAL_HD_LOGOS[symbol]];

  if (TRADFI_LOGO_URLS[symbol]) {
    return TRADFI_LOGO_URLS[symbol];
  }

  const urls: string[] = [];

  const cmcId = CMC_IDS[symbol];
  if (cmcId) {
    urls.push(`https://s2.coinmarketcap.com/static/img/coins/128x128/${cmcId}.png`);
  }

  if (dbUrl && !dbUrl.includes('coincap.io') && !dbUrl.includes('logo-proxy') && !dbUrl.includes('ui-avatars') && !dbUrl.includes('/storage/v1/object/public/')) {
    urls.push(dbUrl);
  }

  const lc = symbol.toLowerCase();
  urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${lc}.png`);
  urls.push(`https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/${lc}.png`);

  const colors = ['F0B90B', '0ECB81', '3861FB', 'E8831D', '00D1FF', 'FF6B35', '14b8a6', '8b5cf6'];
  const idx = (symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 0)) % colors.length;
  urls.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(symbol.slice(0, 2))}&background=${colors[idx]}&color=fff&size=64&bold=true`);

  return urls;
}

export const logoFailCache = new Set<string>();
