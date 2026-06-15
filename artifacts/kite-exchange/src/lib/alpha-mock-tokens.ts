import type { AlphaToken } from '../types/alpha';

const CMC = 'https://s2.coinmarketcap.com/static/img/coins/128x128';
const CG  = 'https://assets.coingecko.com/coins/images';

// Every token gets its own unique logo — no duplicates allowed
const L = {
  // ── Meme unique logos ──────────────────────────────────────────────────────
  TRUMPPUMP:   `${CMC}/36048.png`,
  PUMPKING:    `${CG}/29850/small/pepe-token.jpeg`,
  PEPEMOON:    `${CMC}/24478.png`,
  WIFMAGA:     `${CG}/33566/small/dogwifhat.jpg`,
  BOOBEAR:     `${CMC}/28752.png`,
  DOGWIF:      `${CMC}/74.png`,
  MILEI:       `${CMC}/5994.png`,
  BABYTRUMP:   `${CMC}/10804.png`,
  SHIBARMY:    `${CG}/11939/small/shiba.png`,
  CATBOY:      `${CG}/33764/small/image.png`,
  MEMEGOD:     `${CMC}/24911.png`,
  PEPEARMY:    `${CMC}/31686.png`,
  PEASANT:     `${CG}/28600/small/bonk.jpg`,
  DEGENKING:   `${CMC}/23095.png`,
  PUMPMASTER:  `${CG}/24383/small/apecoin.jpg`,
  WHALECOIN:   `${CG}/12805/small/WHALE-token.png`,
  BIDENOUT:    `${CMC}/35336.png`,
  KINGPEPE:    `${CG}/33831/small/myro.jpg`,
  DOGEMASTER:  `${CMC}/10407.png`,
  APESTRONG:   `${CMC}/9356.png`,
  // ── AI unique logos ────────────────────────────────────────────────────────
  AIAGENT:     `${CG}/5681/small/Fetch.jpg`,
  NEURALBRAIN: `${CG}/2138/small/singularitynet.png`,
  GPTCOIN:     `${CG}/11636/small/rndr.png`,
  MINDMELD:    `${CG}/3687/small/ocean-protocol-logo.jpg`,
  DEEPSEEK:    `${CG}/12785/small/akash-logo.png`,
  JARVIS:      `${CG}/34057/small/VIRTUAL_Token_Icon.png`,
  AIZAP:       `${CG}/52018/small/ai16z.jpg`,
  AGENTX:      `${CMC}/22974.png`,
  // ── Gaming unique logos ────────────────────────────────────────────────────
  QUESTGOLD:   `${CG}/13029/small/axie_infinity_logo.png`,
  GUILDMASTER: `${CG}/18229/small/ygg_logo.png`,
  PLAYFI:      `${CG}/12129/small/sandbox_logo.jpg`,
  HEROTOKEN:   `${CG}/9441/small/Decentraland_MANA_Logo.png`,
  GAMEKING:    `${CG}/14468/small/ILV.JPG`,
  LOOT:        `${CG}/17139/small/10631.png`,
  // ── DeFi unique logos ──────────────────────────────────────────────────────
  YIELDMAX:    `${CG}/12504/small/uniswap-uni.png`,
  LIQUIDFI:    `${CG}/12645/small/AAVE.png`,
  SWAPKING:    `${CG}/12124/small/Curve.png`,
  VAULTMASTER: `${CG}/11849/small/yfi-192x192.png`,
  DEXKING:     `${CG}/12271/small/512x512_Logo_no_chop.png`,
  FLASHLOAN:   `${CG}/10775/small/COMP.png`,
  ARBITRAGE:   `${CG}/11683/small/Balancer.png`,
  POOLMASTER:  `${CG}/13469/small/1inch-token.png`,
  // ── Layer2 unique logos ────────────────────────────────────────────────────
  ZKROLLUP:    `${CMC}/24091.png`,
  L2KING:      `${CG}/25244/small/Optimism.png`,
  ZKBRIDGE:    `${CG}/4713/small/matic-token-icon.png`,
  ROLLUPFI:    `${CG}/16547/small/photo_2023-03-29_18.09.49.jpeg`,
  ZKKING:      `${CG}/26433/small/starknet.png`,
  // ── RWA unique logos ───────────────────────────────────────────────────────
  GOLDTOKEN:   `${CG}/9519/small/paxg.PNG`,
  REALFI:      `${CG}/877/small/chainlink-new-logo.png`,
  ESTATEFI:    `${CG}/30980/small/token-logo.png`,
  USDCBACKED:  `${CG}/6319/small/usdc.png`,
  RWABRIDGE:   `${CG}/1364/small/Mark_Maker.png`,
  OMNILAYER:   `${CG}/26580/small/ONDO.png`,
  BRIDGEX:     `${CMC}/18963.png`,
  // ── New listings unique logos ──────────────────────────────────────────────
  NL001: `${CMC}/33412.png`,
  NL002: `${CMC}/30413.png`,
  NL003: `${CMC}/3773.png`,
  NL004: `${CMC}/33817.png`,
  NL005: `${CMC}/28087.png`,
  NL006: `${CMC}/33696.png`,
  NL007: `${CMC}/30817.png`,
  NL008: `${CMC}/7083.png`,
  NL009: `${CMC}/29735.png`,
  NL010: `${CMC}/22691.png`,
  NL011: `${CMC}/34400.png`,
  NL012: `${CMC}/6783.png`,
  NL013: `${CMC}/33869.png`,
  NL014: `${CMC}/21159.png`,
  NL015: `${CMC}/4705.png`,
  NL016: `${CMC}/30943.png`,
  NL017: `${CMC}/2424.png`,
  NL018: `${CMC}/29767.png`,
  NL019: `${CMC}/7278.png`,
  NL020: `${CMC}/32997.png`,
};

function mockToken(
  id: string,
  name: string,
  symbol: string,
  tag: string,
  network: string,
  raisedPct: number,
  mcap: number,
  vol: number,
  holders: number,
  priceChange: number,
  communityScore: number,
  logoUrl: string,
): AlphaToken {
  const target = network === 'Solana' ? 85 : network === 'Ethereum' ? 5 : 1000;
  const raised = target * (raisedPct / 100);
  const initialPrice = mcap / 1_000_000_000;
  const currentPrice = initialPrice * (1 + (raisedPct / 100) * 1.5);
  return {
    id: `mock-${id}`,
    creator_id: null,
    name,
    symbol,
    description: null,
    logo_url: logoUrl,
    network,
    tag,
    website_url: null,
    twitter_url: `https://twitter.com/${symbol.toLowerCase()}`,
    telegram_url: null,
    raised_amount: +raised.toFixed(4),
    target_amount: target,
    raised_token: network === 'Solana' ? 'SOL' : network === 'Ethereum' ? 'ETH' : 'BNC',
    current_price: +currentPrice.toFixed(10),
    market_cap: mcap,
    holder_count: holders,
    transaction_count: Math.floor(holders * 2.4),
    volume_24h: vol,
    community_score: communityScore,
    is_graduated: raisedPct >= 100,
    is_featured: communityScore > 3000,
    status: 'active',
    total_supply: 1_000_000_000,
    circulating_supply: 800_000_000,
    initial_price: +initialPrice.toFixed(12),
    creator_initial_buy: target * 0.02,
    price_change_24h: priceChange,
    ath_price: +currentPrice.toFixed(10) * 2.4,
    liquidity: vol * 0.3,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const STATIC_MOCK_TOKENS: AlphaToken[] = [
  // ── MEME ──────────────────────────────────────────────────────────────────
  mockToken('TRUMPUMP',   'TrumpPump',   'TRUMPUMP',  'Meme',   'BNC',     98, 89_200_000,  234_500, 12_500, 125.4, 4200, L.TRUMPPUMP),
  mockToken('PMPKING',    'PumpKing',    'PMPK',      'Meme',   'BNC',     98, 15_400_000,  221_000,  7_890,  67.8, 1778, L.PUMPKING),
  mockToken('PEPE2',      'PepeMoon',    'PEPE2',     'Meme',   'BNC',     76, 45_000_000,  892_000, 18_340,  88.6, 3400, L.PEPEMOON),
  mockToken('WIFMAGA',    'WifMaga',     'WIFM',      'Meme',   'Solana',  94,  8_500_000,  198_000,  9_100, 143.2, 2100, L.WIFMAGA),
  mockToken('BOOBEAR',    'BooBear',     'BBEAR',     'Meme',   'BNC',     55,  3_200_000,   87_000,  2_450,  34.5,  780, L.BOOBEAR),
  mockToken('DOGWIF',     'DogWifHat',   'DWIF',      'Meme',   'Solana',  88, 22_000_000,  445_000, 14_200,  96.7, 2890, L.DOGWIF),
  mockToken('MILEI',      'MileiCoin',   'MILEI',     'Meme',   'BNC',     97, 67_000_000,1_234_000, 23_400, 156.8, 5100, L.MILEI),
  mockToken('BABYTRUMP',  'BabyTrump',   'BTRUMP',    'Meme',   'BNC',     84, 21_300_000,  398_000,  8_700,  91.2, 2450, L.BABYTRUMP),
  mockToken('SHIBARMY',   'ShibArmy',    'SARMY',     'Meme',   'Ethereum',79, 18_600_000,  345_000,  9_200,  74.6, 2100, L.SHIBARMY),
  mockToken('CATBOY',     'CatBoy',      'CBOY',      'Meme',   'Solana',  66,  7_400_000,  138_000,  3_400,  36.8,  870, L.CATBOY),
  mockToken('MEMEGOD',    'MemeGod',     'MGOD',      'Meme',   'BNC',     95, 55_000_000,  987_000, 19_800, 134.5, 4500, L.MEMEGOD),
  mockToken('PEPEARMY',   'PepeArmy',    'PARMY',     'Meme',   'BNC',     73, 11_800_000,  222_000,  5_300,  52.4, 1380, L.PEPEARMY),
  mockToken('PEASANT',    'Peasant',     'PSNT',      'Meme',   'BNC',     38,  1_900_000,   38_000,    890,   9.7,  210, L.PEASANT),
  mockToken('DEGENKING',  'DegenKing',   'DKNG',      'Meme',   'Solana',  88, 26_400_000,  498_000, 11_600, 102.3, 2980, L.DEGENKING),
  mockToken('PUMPMASTER', 'PumpMaster',  'PMPMASTER', 'Meme',   'BNC',     61,  6_300_000,  118_000,  2_800,  29.4,  710, L.PUMPMASTER),
  mockToken('WHALECOIN',  'WhaleCoin',   'WHALE',     'Meme',   'Ethereum',85, 23_100_000,  434_000, 10_100,  79.8, 2200, L.WHALECOIN),
  mockToken('BIDENOUT',   'BidenOut',    'BOUTS',     'Meme',   'BNC',     99,102_000_000,1_890_000, 31_200, 198.4, 6200, L.BIDENOUT),
  mockToken('KINGPEPE',   'King Pepe',   'KPEPE',     'Meme',   'Ethereum',96, 78_000_000,1_456_000, 25_600, 167.3, 5400, L.KINGPEPE),
  mockToken('DOGEMASTER', 'DogeMaster',  'DGMASTER',  'Meme',   'BNC',     80, 17_200_000,  324_000,  7_800,  66.4, 1820, L.DOGEMASTER),
  mockToken('APESTRONG',  'ApeStrong',   'APES',      'Meme',   'Solana',  74, 12_100_000,  228_000,  5_600,  53.7, 1420, L.APESTRONG),

  // ── AI ────────────────────────────────────────────────────────────────────
  mockToken('AIAGENT',    'AIAgent',     'AAGT',      'AI',     'BNC',     72, 18_700_000,  320_000,  8_900,  55.1, 1650, L.AIAGENT),
  mockToken('NEURALBRAIN','NeuralBrain', 'NBRAIN',    'AI',     'Ethereum',61,  9_400_000,  187_000,  4_300,  29.8,  920, L.NEURALBRAIN),
  mockToken('GPTCOIN',    'GPTCoin',     'GPTC',      'AI',     'BNC',     83, 31_500_000,  567_000, 11_200,  81.4, 2340, L.GPTCOIN),
  mockToken('MINDMELD',   'MindMeld',    'MELD',      'AI',     'Base',    45,  4_100_000,   76_000,  1_890,  18.3,  410, L.MINDMELD),
  mockToken('DEEPSEEK',   'DeepSeekAI',  'DSK',       'AI',     'BNC',     67, 12_300_000,  234_000,  5_600,  42.7, 1120, L.DEEPSEEK),
  mockToken('JARVIS',     'JarvisAI',    'JRVIS',     'AI',     'Ethereum',78,  6_800_000,  143_000,  3_200,  63.9, 1440, L.JARVIS),
  mockToken('AIZAP',      'AI Pulse',    'AIZAP',     'AI',     'BNC',     58,  5_800_000,  108_000,  2_600,  25.3,  620, L.AIZAP),
  mockToken('AGENTX',     'AgentX',      'AGNTX',     'AI',     'BNC',     77, 13_200_000,  248_000,  5_900,  56.8, 1490, L.AGENTX),

  // ── Gaming ────────────────────────────────────────────────────────────────
  mockToken('QUESTGOLD',  'QuestGold',   'QGOLD',     'Gaming', 'BNC',     52,  5_600_000,   98_000,  2_100,  22.4,  550, L.QUESTGOLD),
  mockToken('GUILDMASTER','GuildMaster', 'GUILD',     'Gaming', 'Solana',  91, 14_200_000,  287_000,  7_800, 107.2, 2100, L.GUILDMASTER),
  mockToken('PLAYFI',     'PlayFi',      'PLFI',      'Gaming', 'BNC',     68,  8_900_000,  165_000,  4_500,  38.6, 1020, L.PLAYFI),
  mockToken('HEROTOKEN',  'HeroToken',   'HERO',      'Gaming', 'BNC',     44,  2_700_000,   54_000,  1_200,  14.2,  310, L.HEROTOKEN),
  mockToken('GAMEKING',   'GameKing',    'GKING',     'Gaming', 'Ethereum',77, 11_000_000,  210_000,  6_300,  59.1, 1560, L.GAMEKING),
  mockToken('LOOT',       'LootDrop',    'LOOT',      'Gaming', 'Solana',  93, 19_500_000,  389_000,  9_900, 118.5, 2780, L.LOOT),

  // ── DeFi ─────────────────────────────────────────────────────────────────
  mockToken('YIELDMAX',   'YieldMax',    'YMAX',      'DeFi',   'BNC',     86, 24_700_000,  498_000, 10_800,  74.3, 2100, L.YIELDMAX),
  mockToken('LIQUIDFI',   'LiquidFi',    'LFI',       'DeFi',   'Ethereum',59,  7_200_000,  134_000,  3_100,  27.6,  680, L.LIQUIDFI),
  mockToken('SWAPKING',   'SwapKing',    'SWPK',      'DeFi',   'BNC',     71, 10_500_000,  198_000,  4_800,  46.8, 1200, L.SWAPKING),
  mockToken('VAULTMASTER','VaultMaster', 'VAULT',     'DeFi',   'Base',    48,  3_800_000,   71_000,  1_600,  16.9,  380, L.VAULTMASTER),
  mockToken('DEXKING',    'DexKing',     'DXKG',      'DeFi',   'BNC',     82, 16_900_000,  312_000,  7_200,  68.4, 1780, L.DEXKING),
  mockToken('FLASHLOAN',  'FlashLoan',   'FLASH',     'DeFi',   'Ethereum',87, 20_700_000,  389_000,  8_600,  73.2, 1960, L.FLASHLOAN),
  mockToken('ARBITRAGE',  'ArbKing',     'ARBK',      'DeFi',   'Base',    64,  7_900_000,  148_000,  3_400,  36.1,  870, L.ARBITRAGE),
  mockToken('POOLMASTER', 'PoolMaster',  'POOL',      'DeFi',   'BNC',     57,  5_400_000,  101_000,  2_400,  24.1,  590, L.POOLMASTER),

  // ── Layer2 ────────────────────────────────────────────────────────────────
  mockToken('ZKROLLUP',   'ZkRollup',    'ZKR',       'Layer2', 'Ethereum',75, 13_400_000,  245_000,  6_100,  51.7, 1340, L.ZKROLLUP),
  mockToken('L2KING',     'L2King',      'L2KNG',     'Layer2', 'Base',    63,  6_700_000,  121_000,  2_900,  33.2,  760, L.L2KING),
  mockToken('ZKBRIDGE',   'ZkBridge',    'ZKBR',      'Layer2', 'Ethereum',70,  8_600_000,  162_000,  3_700,  43.1, 1040, L.ZKBRIDGE),
  mockToken('ROLLUPFI',   'RollupFi',    'RLFI2',     'Layer2', 'Base',    54,  4_600_000,   87_000,  1_900,  22.7,  530, L.ROLLUPFI),
  mockToken('ZKKING',     'ZkKing',      'ZKKG',      'Layer2', 'BNC',     69,  9_500_000,  179_000,  4_200,  44.3, 1070, L.ZKKING),

  // ── RWA ──────────────────────────────────────────────────────────────────
  mockToken('GOLDTOKEN',  'GoldToken',   'GOLD',      'RWA',    'Ethereum',90, 28_000_000,  534_000, 12_000,  82.1, 2200, L.GOLDTOKEN),
  mockToken('REALFI',     'RealFi',      'RLFI',      'RWA',    'BNC',     56,  5_100_000,   94_000,  2_200,  21.8,  510, L.REALFI),
  mockToken('ESTATEFI',   'EstateFi',    'ESTFI',     'RWA',    'Ethereum',69,  9_200_000,  174_000,  4_100,  40.5,  980, L.ESTATEFI),
  mockToken('USDCBACKED', 'USDCBacked',  'USDCB',     'RWA',    'Ethereum',78, 14_300_000,  268_000,  6_200,  48.9, 1240, L.USDCBACKED),
  mockToken('RWABRIDGE',  'RWABridge',   'RWAB',      'RWA',    'BNC',     65,  8_100_000,  153_000,  3_500,  37.6,  910, L.RWABRIDGE),

  // ── BNC extras ───────────────────────────────────────────────────────────
  mockToken('OMNILAYER',  'OmniLayer',   'OMNL',      'Layer2', 'BNC',     89, 28_900_000,  345_000,  6_780,  72.3, 1778, L.OMNILAYER),
  mockToken('BRIDGEX',    'BridgeX',     'BRGX',      'DeFi',   'BNC',     89, 12_600_000,  176_000,  5_670,  64.2, 1200, L.BRIDGEX),
];

const NEW_LISTING_POOL: AlphaToken[] = [
  mockToken('NL001', 'RocketDoge',   'RDOGE',   'Meme',   'BNC',     3,   450_000,  12_000,  234, 0, 15, L.NL001),
  mockToken('NL002', 'MoonPepe',     'MNPEPE',  'Meme',   'Solana',  1,   180_000,   5_800,   89, 0,  8, L.NL002),
  mockToken('NL003', 'AIWhisperer',  'AIWHS',   'AI',     'BNC',     5,   890_000,  22_000,  412, 0, 27, L.NL003),
  mockToken('NL004', 'TrumpMoon',    'TRMN',    'Meme',   'BNC',     2,   320_000,   8_400,  156, 0, 11, L.NL004),
  mockToken('NL005', 'GigaChad',     'GIGA',    'Meme',   'Ethereum',4,   670_000,  17_300,  278, 0, 19, L.NL005),
  mockToken('NL006', 'NeuroSwap',    'NSWAP',   'AI',     'BNC',     7, 1_200_000,  31_000,  567, 0, 42, L.NL006),
  mockToken('NL007', 'PepeWif',      'PWIF',    'Meme',   'Solana',  2,   240_000,   6_900,  112, 0,  9, L.NL007),
  mockToken('NL008', 'DeFiGod',      'DFGOD',   'DeFi',   'BNC',     6,   980_000,  25_000,  445, 0, 34, L.NL008),
  mockToken('NL009', 'MagaToken',    'MAGA',    'Meme',   'BNC',     3,   510_000,  14_200,  198, 0, 17, L.NL009),
  mockToken('NL010', 'ZkMaster',     'ZKMSTR',  'Layer2', 'Ethereum',8, 1_450_000,  38_000,  623, 0, 51, L.NL010),
  mockToken('NL011', 'BabyPepe2',    'BPEPE2',  'Meme',   'BNC',     1,   195_000,   5_200,   78, 0,  6, L.NL011),
  mockToken('NL012', 'CryptoNinja',  'CNINJA',  'Gaming', 'Solana',  4,   620_000,  16_500,  256, 0, 22, L.NL012),
  mockToken('NL013', 'ElonMeme',     'EMEME',   'Meme',   'BNC',     9, 1_800_000,  47_000,  789, 0, 63, L.NL013),
  mockToken('NL014', 'RealYield',    'RYLD',    'RWA',    'Ethereum',6, 1_100_000,  29_000,  478, 0, 38, L.NL014),
  mockToken('NL015', 'GoldRush',     'GRSH',    'RWA',    'BNC',     2,   280_000,   7_500,  134, 0, 10, L.NL015),
  mockToken('NL016', 'SuperApe',     'SAPE',    'Meme',   'BNC',     5,   750_000,  19_800,  312, 0, 25, L.NL016),
  mockToken('NL017', 'QuantumAI',    'QTAI',    'AI',     'BNC',     3,   480_000,  13_000,  201, 0, 16, L.NL017),
  mockToken('NL018', 'MemeWar',      'MWAR',    'Meme',   'Solana',  7, 1_300_000,  34_000,  556, 0, 44, L.NL018),
  mockToken('NL019', 'DeFiKing2',    'DFK2',    'DeFi',   'BNC',     4,   590_000,  15_600,  245, 0, 20, L.NL019),
  mockToken('NL020', 'ZeroToMoon',   'Z2M',     'Meme',   'BNC',     1,   165_000,   4_400,   65, 0,  5, L.NL020),
];

let nlIndex = 0;

export function getNextNewListing(): AlphaToken {
  const token = NEW_LISTING_POOL[nlIndex % NEW_LISTING_POOL.length];
  nlIndex++;
  return {
    ...token,
    id: `nl-${Date.now()}-${nlIndex}`,
    created_at: new Date().toISOString(),
  };
}
