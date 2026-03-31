export interface CoinGeckoPrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  NEAR: 'near',
  ALGO: 'algorand',
  VET: 'vechain',
  ICP: 'internet-computer',
  FIL: 'filecoin',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  RENDER: 'render-token',
  FTM: 'fantom',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  FLOKI: 'floki',
  TRX: 'tron',
  TON: 'the-open-network',
  HBAR: 'hedera-hashgraph',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  THETA: 'theta-token',
  EOS: 'eos',
  XTZ: 'tezos',
  AAVE: 'aave',
  CRV: 'curve-dao-token',
  MKR: 'maker',
  COMP: 'compound-governance-token',
  SNX: 'havven',
  ZEC: 'zcash',
  DASH: 'dash',
  XMR: 'monero',
  BCH: 'bitcoin-cash',
  EGLD: 'elrond-erd-2',
  WAVES: 'waves',
  ZIL: 'zilliqa',
  ENJ: 'enjincoin',
  CHZ: 'chiliz',
  BAT: 'basic-attention-token',
  GRT: 'the-graph',
  LRC: 'loopring',
  SUSHI: 'sushi',
  '1INCH': '1inch',
  YFI: 'yearn-finance',
  CAKE: 'pancakeswap-token',
  RUNE: 'thorchain',
  LUNA: 'terra-luna-2',
  LUNC: 'terra-luna',
  UST: 'terrausd',
  FTT: 'ftx-token',
  KAS: 'kaspa',
  JUNO: 'juno-network',
  FLR: 'flare-networks',
  ADEN: 'adenine',
  BABYDOGE: 'baby-doge-coin',
  BCHA: 'bitcoin-cash-abc-2',
  BOBA: 'boba-network',
  BSV: 'bitcoin-cash-sv',
  BTT: 'bittorrent',
  BTTC: 'bittorrent-new',
  DPI: 'defipulse-index',
  ELON: 'dogelon-mars',
  HT: 'huobi-token',
  KCS: 'kucoin-shares',
  LOOKS: 'looksrare',
  NANO: 'nano',
  XNO: 'nano',
  NFT: 'apenft',
  OKB: 'okb',
  OMG: 'omisego',
  ONE: 'harmony',
  ONT: 'ontology',
  QTUM: 'qtum',
  RVN: 'ravencoin',
  SC: 'siacoin',
  SCRT: 'secret',
  STEEM: 'steem',
  STORJ: 'storj',
  TFUEL: 'theta-fuel',
  TITAN: 'iron-titanium-token',
  WIN: 'wink',
  XDC: 'xdce-crowd-sale',
  XEM: 'nem',
  ZEN: 'zencash',
  KLAY: 'klay-token',
  CELO: 'celo',
  ROSE: 'oasis-network',
  ICX: 'icon',
  IOTA: 'iota',
  LSK: 'lisk',
  NEO: 'neo',
  WAN: 'wanchain',
  ZRX: 'ox-funder',
  ANKR: 'ankr',
  API3: 'api3',
  BAND: 'band-protocol',
  CEEK: 'ceek',
  CLV: 'clover-finance',
  CKB: 'nervos-network',
  CTSI: 'cartesi',
  DGB: 'digibyte',
  DODO: 'dodo',
  ERG: 'ergo',
  FLUX: 'zelcash',
  GALA: 'gala',
  GLM: 'golem',
  IMX: 'immutable-x',
  KAVA: 'kava',
  KNC: 'kyber-network-crystal',
  LST: 'lido-staked-ether',
  MASK: 'mask-network',
  MDT: 'measurable-data-token',
  MOVR: 'moonriver',
  NMR: 'numeraire',
  OGN: 'origin-protocol',
  OMI: 'ecomi',
  PAXG: 'pax-gold',
  PEOPLE: 'constitutiondao',
  PERP: 'perpetual-protocol',
  PYR: 'vulcan-forged',
  QNT: 'quant-network',
  RAY: 'raydium',
  REEF: 'reef',
  REQ: 'request-network',
  RNDR: 'render-token',
  RSS3: 'rss3',
  SPELL: 'spell-token',
  SRM: 'serum',
  STG: 'stargate-finance',
  STPT: 'stp-network',
  SXP: 'swipe',
  TRIBE: 'tribe-2',
  TWT: 'trust-wallet-token',
  UMA: 'uma',
  UNFI: 'unifi-protocol-dao',
  VELO: 'velo',
  VRA: 'verasity',
  WOO: 'woo-network',
  XVS: 'venus',
  YGG: 'yield-guild-games',
  DYDX: 'dydx',
  ENS: 'ethereum-name-service',
  GMT: 'stepn',
  MAGIC: 'magic',
  SSV: 'ssv-network',
  BLUR: 'blur',
  CFX: 'conflux-token',
  HOOK: 'hooked-protocol',
  ID: 'space-id',
  JOE: 'joe',
  LQTY: 'liquity',
  RDNT: 'radiant-capital',
  RPL: 'rocket-pool',
  STMX: 'stormx',
  VOXEL: 'voxies',
  WLD: 'worldcoin-wld',
  ACH: 'alchemy-pay',
  ADX: 'adex',
  AGIX: 'singularitynet',
  AGI: 'delysium',
  AI: 'sleepless-ai',
  ALPACA: 'alpaca-finance',
  ALPINE: 'alpine-f1-team-fan-token',
  AMB: 'amber',
  AMO: 'amo-coin',
  JASMY: 'jasmycoin',
  JUV: 'juventus-fan-token',
  CELR: 'celer-network',
  CVX: 'convex-finance',
  DF: 'dforce-token',
  FET: 'fetch-ai',
  FORTH: 'ampleforth-governance-token',
  FRONT: 'frontier-token',
  LINA: 'linear',
  MBOX: 'mobox',
  MDX: 'mdex',
  NULS: 'nuls',
  OCEAN: 'ocean-protocol',
  OXT: 'orchid-protocol',
  POLS: 'polkastarter',
  PNT: 'pnetwork',
  POLYX: 'polymesh',
  PRISM: 'prism',
  PUNDIX: 'pundi-x-2',
  RLC: 'iexec-rlc',
  SFP: 'safepal',
  SANTOS: 'santos-fc-fan-token',
  SKL: 'skale',
  STRAX: 'stratis',
  T: 'threshold-network-token',
  TROY: 'troy',
  TUSDT: 'tether',
  TLM: 'alien-worlds',
  UTK: 'utrust',
  VTHO: 'vethor-token',
  WAXP: 'wax',
  AUCTION: 'bounce-token',
  BAKE: 'bakerytoken',
  BETA: 'beta-finance',
  BURGER: 'burger-swap',
  CHESS: 'chess',
  FOR: 'force-protocol',
  HARD: 'kava-lend',
  PORTO: 'fc-porto',
  PSG: 'paris-saint-germain-fan-token',
  QUICK: 'quickswap',
  SPARTA: 'spartan-protocol-token',
  SPS: 'splinterlands',
  SWINGBY: 'swingby',
  SYN: 'synapse-2',
  TORN: 'tornado-cash',
  VIDT: 'vidt-dao',
  XVG: 'verge',
};

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

let cgCache = new Map<string, CoinGeckoPrice>();
let cgLastFetch = 0;
const CG_TTL = 60000;

export async function fetchCoinGeckoPrices(symbols: string[], force = false): Promise<Map<string, CoinGeckoPrice>> {
  const upperSymbols = symbols.map(s => s.toUpperCase());
  const ids = upperSymbols
    .map(s => SYMBOL_TO_COINGECKO_ID[s])
    .filter(Boolean);

  if (ids.length === 0) return new Map();

  const now = Date.now();

  if (!force && now - cgLastFetch < CG_TTL && cgCache.size > 0) {
    const result = new Map<string, CoinGeckoPrice>();
    upperSymbols.forEach(sym => {
      const cached = cgCache.get(sym);
      if (cached) result.set(sym, cached);
    });
    if (result.size === upperSymbols.length) return result;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) throw new Error(`CoinGecko error: ${response.status}`);

    const data: any[] = await response.json();
    const result = new Map<string, CoinGeckoPrice>();

    const idToRequestedSymbol = new Map<string, string>();
    upperSymbols.forEach(sym => {
      const id = SYMBOL_TO_COINGECKO_ID[sym];
      if (id) idToRequestedSymbol.set(id, sym);
    });

    for (const coin of data) {
      const cgSym = coin.symbol?.toUpperCase();
      if (!cgSym || !coin.current_price) continue;

      const requestedSym = idToRequestedSymbol.get(coin.id) ?? cgSym;

      const price: CoinGeckoPrice = {
        symbol: requestedSym,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        high24h: coin.high_24h || coin.current_price,
        low24h: coin.low_24h || coin.current_price,
        volume: coin.total_volume || 0,
      };

      cgCache.set(requestedSym, price);
      result.set(requestedSym, price);
      if (cgSym !== requestedSym) {
        cgCache.set(cgSym, price);
      }
    }

    upperSymbols.forEach(sym => {
      const cached = cgCache.get(sym);
      if (cached && !result.has(sym)) result.set(sym, cached);
    });

    cgLastFetch = now;
    return result;
  } catch (error) {
    console.error('CoinGecko fetch error:', error);
    const fallback = new Map<string, CoinGeckoPrice>();
    upperSymbols.forEach(sym => {
      const cached = cgCache.get(sym);
      if (cached) fallback.set(sym, cached);
    });
    return fallback;
  }
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
}
