const CMC_IDS: Record<string, number> = {
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
  XTZ: 2011, MEME: 28301, ORDI: 25028, SATS: 28683, RAT: 28752,
  '1INCH': 8104, TROY: 4, CREAM: 6193, PNT: 4877,
  DODO: 7224, ALPHA: 8280, TWT: 5964, C98: 10903, BAKE: 7978,
  MDT: 2348, STEEM: 1230, XVS: 7288, BETA: 10294, RARE: 11294,
  TRU: 7725, POND: 8795, ALCX: 8613, SPELL: 11289, CVX: 9903,
  OGN: 5117, PROM: 4120, INIT: 33538, ORCA: 11165,
  EUL: 14280, ALLO: 32704, SOMI: 33000, MUBARAK: 33118,
  AMP: 6945, FLUX: 3029, KDA: 5765, AR: 5632, HNT: 5665,
  GMT: 18069, APE: 18876, T: 14895, HOOK: 21753,
  ID: 27657, EDU: 28298, MAV: 27979,
  CYBER: 28481, ARKM: 27565, NTRN: 27985, TRB: 1585,
  BEAMX: 28998, SUPER: 8290, ASTR: 12885, MOVR: 9285,
  GLMR: 6836, ACA: 6756, RDNT: 21106, VOXEL: 10678,
  SLP: 5765, PHA: 6841, DENT: 1886, HOT: 2682,
  COTI: 3992, MTL: 1788, IRIS: 3874, ONG: 3217,
  STPT: 4006, FOR: 3775, SCRT: 5604, HARD: 5765,
  XNO: 1567, QNT: 3155, AGLD: 11568, LINA: 7102,
  TOMO: 2570, REQ: 2071, ARPA: 4039, MBL: 3876,
  SXP: 4279, FLM: 7150, ORN: 5765, GHST: 7046,
  POLYX: 20362, UFT: 7412, POLS: 7208, ALICE: 8766,
  DUSK: 4092, ERN: 8615, MLN: 1552, PYR: 9308,
  QUICK: 3701, BICO: 9543, RAD: 6843, BOND: 11548,
  AUCTION: 10188, CLV: 8384, FORTH: 9421, FARM: 6859,
  BADGER: 11156, KP3R: 7535, UNFI: 7672, ALPACA: 8707,
  TLM: 9119, ILV: 8719, SANTOS: 14783, CITY: 13899,
  PORTO: 12345, LAZIO: 11156, ATM: 28,
  CHESS: 10764, DAR: 11374, BSW: 18276,
  EPX: 18279, MULTI: 1732, COMBO: 28891,
  ARK: 1586, LSK: 1214, IOTX: 2777, RVN: 2577,
  ONT: 2566, NULS: 2092, WAN: 2606, GAS: 1785,
  POWR: 2132, REN: 2607, DGB: 109, SC: 1042,
  ZEC: 1437, BCH: 1831, BSV: 3602, BTG: 2083,
  LUNA: 20314, UMA: 5765,
  KMNO: 33100, ESP: 33200,
};

export const COIN_NETWORKS: Record<string, string[]> = {
  BSC: ['BNB', 'CAKE', 'BAKE', 'BSW', 'TWT', 'C98', 'ALPACA', 'XVS', 'SXP', 'ALPHA', 'BETA', 'HOOK', 'ID', 'EDU', 'COMBO', 'CHESS', 'DAR', 'EPX', 'HIGH', 'LEVER', 'LISTA', 'FLOKI', 'SANTOS', 'LAZIO', 'PORTO', 'CITY', 'ATM', 'TLM', 'VOXEL', 'FOR', 'DODO', 'BANANA'],
  Ethereum: ['ETH', 'UNI', 'AAVE', 'COMP', 'MKR', 'LINK', 'SNX', 'CRV', 'LDO', 'RPL', 'BAL', 'SUSHI', 'YFI', 'DYDX', 'ENS', 'LRC', 'MASK', 'BLUR', 'PENDLE', 'SSV', 'LQTY', 'FXS', 'PERP', 'CVX', 'ALCX', 'SPELL', 'BADGER', 'FARM', 'FORTH', 'KP3R', 'MLN', 'RLC', 'BAT', 'STORJ', 'ANKR', 'CELR', 'CTSI', 'SKL', 'NKN', 'BAND', 'API3', 'OCEAN', 'FET', 'AGIX', 'WLD', 'ACH', 'JASMY', 'ENA', 'GRT', 'CHZ', 'AUDIO', 'AMP', 'REQ', 'BOND', 'RAD', 'BICO', 'DUSK', 'ERN', 'GHST', 'POLS', 'UFT', 'ALICE', 'ILV', 'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'IMX', 'SHIB', 'PEPE', 'APE', 'ONDO', 'RNDR', 'RENDER', 'QNT', 'UNFI', 'AUCTION', 'CLV', 'ARPA', 'LINA', 'AGLD', 'STPT', 'MTL', 'COTI', 'POWR', 'REN', 'ORN', 'PYR', 'T', 'OGN', 'RARE', 'TRU', 'POND', 'LOOM', 'AMB', 'KEY', 'MDT', 'PNT', 'CREAM', '1INCH', 'EUL', 'PEOPLE', 'MEME', 'MAGIC', 'ARKM', 'CYBER', 'W', 'ZRO', 'ZK', 'STRK'],
  Solana: ['SOL', 'BONK', 'WIF', 'ORCA', 'PYTH', 'JTO', 'TNSR', 'BOME', 'RAT', 'KMNO', 'MEME'],
  Base: ['DEGEN', 'BRETT', 'AERO'],
  Arbitrum: ['ARB', 'GMX', 'MAGIC', 'RDNT', 'GRT', 'PENDLE'],
  Sui: ['SUI'],
  TRON: ['TRX', 'SUN', 'WIN', 'JST', 'BTT'],
  Avalanche: ['AVAX', 'JOE'],
  Polygon: ['MATIC', 'QUICK', 'GHST', 'POLYX'],
  Cosmos: ['ATOM', 'INJ', 'SEI', 'TIA', 'NTRN', 'DYM', 'KAVA', 'SCRT', 'IRIS'],
  TON: ['NOT', 'DOGS'],
  Bitcoin: ['BTC', 'ORDI', 'SATS'],
  Optimism: ['OP', 'WLD', 'VELO'],
};

export const FUTURES_COINS = new Set([
  'BNC',
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'LTC', 'ATOM', 'ETC', 'XLM', 'NEAR', 'ALGO', 'VET', 'ICP',
  'FIL', 'APT', 'ARB', 'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'RENDER', 'FTM',
  'PEPE', 'SHIB', 'WIF', 'FLOKI', 'TRX', 'HBAR', 'MKR', 'AAVE', 'GRT', 'STX',
  'IMX', 'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'CRV', 'SNX', 'COMP', 'LDO',
  'SUSHI', 'YFI', 'DYDX', 'GMX', 'RUNE', 'KSM', 'FLOW', 'THETA', 'KAVA',
  'CELO', 'ONE', 'ROSE', 'ZIL', 'BAT', 'ENS', 'LRC', 'CHZ', 'MASK', 'BLUR',
  'PENDLE', 'FET', 'WLD', 'JASMY', 'BONK', 'MEME', 'ORDI', 'ONDO', 'PYTH',
  'JTO', 'STRK', 'PIXEL', 'PORTAL', 'ALT', 'MANTA', 'BOME', 'ENA', 'W',
  'NOT', 'IO', 'ZK', 'LISTA', 'ZRO', 'PEOPLE', 'CAKE', 'DOGE', 'AGIX',
  'OCEAN', 'ACE', 'DYM', 'BB', 'REZ', 'TNSR', 'DOGS', 'LUNC', 'CFX',
  'EGLD', 'CKB', 'MINA', 'HOOK', 'ID', 'EDU', 'MAV', 'CYBER', 'ARKM',
  'NTRN', 'TRB', 'SUPER', 'APE', 'GMT', 'HIGH', 'LEVER', 'COMBO',
  'RPL', 'SSV', 'LQTY', 'FXS', 'BAL', 'MAGIC', 'RDNT', 'WOO', 'RSR',
  'IOTA', 'NEO', 'EOS', 'XTZ', 'DASH', 'ZEC', 'BCH', 'QTUM', 'WAVES',
  'ONT', 'IOTX', 'RVN', 'SXP', 'ALICE', 'DUSK', 'MTL', 'OGN', 'STEEM',
  'ANKR', 'CELR', 'CTSI', 'SKL', 'API3', 'BAND', 'NKN', 'STORJ', 'RLC',
  'T', 'INIT', 'PROM', 'MUBARAK',
]);

export function getCoinNetwork(symbol: string): string | null {
  for (const [network, coins] of Object.entries(COIN_NETWORKS)) {
    if (coins.includes(symbol)) return network;
  }
  return null;
}

export function getCoinLogoUrl(symbol: string, dbLogos?: Record<string, string>): string {
  if (symbol === 'EQ') return '/earnquest-logo-icon-2.png';
  if (symbol === 'BNC') return '/bnc-logo.png';
  const cmcId = CMC_IDS[symbol];
  if (cmcId) return `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`;
  if (dbLogos?.[symbol] && !dbLogos[symbol].includes('coincap.io')) return dbLogos[symbol];
  const slug = symbol.toLowerCase();
  return `https://assets.coingecko.com/coins/images/1/small/${slug}.png`;
}

export function getCoinLogoFallbackChain(symbol: string, dbLogos?: Record<string, string>): string[] {
  if (symbol === 'EQ') return ['/earnquest-logo-icon-2.png'];
  if (symbol === 'BNC') return ['/bnc-logo.png'];
  const urls: string[] = [];
  const cmcId = CMC_IDS[symbol];
  if (cmcId) urls.push(`https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`);
  if (dbLogos?.[symbol] && !dbLogos[symbol].includes('coincap.io')) urls.push(dbLogos[symbol]);
  const slug = symbol.toLowerCase();
  urls.push(`https://assets.coingecko.com/coins/images/1/small/${slug}.png`);
  const colors = ['F0B90B', '0ECB81', '3861FB', 'E8831D', '627EEA', '00D1FF', 'FF6B35'];
  const idx = (symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 0)) % colors.length;
  urls.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(symbol.slice(0, 2))}&background=${colors[idx]}&color=fff&size=64&bold=true`);
  return urls;
}

export function hasCoinLogo(symbol: string, dbLogos?: Record<string, string>): boolean {
  return true;
}
