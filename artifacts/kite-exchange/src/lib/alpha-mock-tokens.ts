import type { AlphaToken } from '../types/alpha';

const CMC = 'https://s2.coinmarketcap.com/static/img/coins/64x64';
const CG  = 'https://assets.coingecko.com/coins/images';

// Verified working logo URLs
const LOGOS = {
  // Meme
  TRUMP:   `${CMC}/36048.png`,
  PEPE:    `${CG}/29850/small/pepe-token.jpeg`,
  WIF:     `${CG}/33566/small/dogwifhat.jpg`,
  DOGE:    `${CG}/5/small/dogecoin.png`,
  SHIB:    `${CG}/11939/small/shiba.png`,
  FLOKI:   `${CG}/16746/small/PNG_image.png`,
  APE:     `${CG}/24383/small/apecoin.jpg`,
  BONK:    `${CG}/28600/small/bonk.jpg`,
  POPCAT:  `${CG}/33764/small/image.png`,
  MYRO:    `${CG}/33831/small/myro.jpg`,
  WHALE:   `${CG}/12805/small/WHALE-token.png`,
  GIGACHAD:`${CMC}/31686.png`,
  // AI
  FET:     `${CG}/5681/small/Fetch.jpg`,
  AGIX:    `${CG}/2138/small/singularitynet.png`,
  RNDR:    `${CG}/11636/small/rndr.png`,
  OCEAN:   `${CG}/3687/small/ocean-protocol-logo.jpg`,
  AKT:     `${CG}/12785/small/akash-logo.png`,
  VIRTUAL: `${CG}/34057/small/VIRTUAL_Token_Icon.png`,
  AI16Z:   `${CG}/52018/small/ai16z.jpg`,
  TAO:     `${CMC}/22974.png`,
  // Gaming
  AXS:     `${CG}/13029/small/axie_infinity_logo.png`,
  YGG:     `${CG}/18229/small/ygg_logo.png`,
  SAND:    `${CG}/12129/small/sandbox_logo.jpg`,
  MANA:    `${CG}/9441/small/Decentraland_MANA_Logo.png`,
  ILV:     `${CG}/14468/small/ILV.JPG`,
  GODS:    `${CG}/17139/small/10631.png`,
  // DeFi
  UNI:     `${CG}/12504/small/uniswap-uni.png`,
  AAVE:    `${CG}/12645/small/AAVE.png`,
  CRV:     `${CG}/12124/small/Curve.png`,
  YFI:     `${CG}/11849/small/yfi-192x192.png`,
  SUSHI:   `${CG}/12271/small/512x512_Logo_no_chop.png`,
  COMP:    `${CG}/10775/small/COMP.png`,
  BAL:     `${CG}/11683/small/Balancer.png`,
  INCH:    `${CG}/13469/small/1inch-token.png`,
  // Layer2
  ZK:      `${CMC}/24091.png`,
  OP:      `${CG}/25244/small/Optimism.png`,
  MATIC:   `${CG}/4713/small/matic-token-icon.png`,
  ARB:     `${CG}/16547/small/photo_2023-03-29_18.09.49.jpeg`,
  STRK:    `${CG}/26433/small/starknet.png`,
  // RWA
  PAXG:    `${CG}/9519/small/paxg.PNG`,
  LINK:    `${CG}/877/small/chainlink-new-logo.png`,
  MNT:     `${CG}/30980/small/token-logo.png`,
  USDC:    `${CG}/6319/small/usdc.png`,
  MKR:     `${CG}/1364/small/Mark_Maker.png`,
  ONDO:    `${CG}/26580/small/ONDO.png`,
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
  mockToken('TRUMPUMP','TrumpPump','TRUMPUMP','Meme','BNC',98,89_200_000,234_500,12_500,125.4,4200, LOGOS.TRUMP),
  mockToken('PMPKING','PumpKing','PMPK','Meme','BNC',98,15_400_000,221_000,7_890,67.8,1778, LOGOS.PEPE),
  mockToken('PEPE2','PepeMoon','PEPE2','Meme','BNC',76,45_000_000,892_000,18_340,88.6,3400, LOGOS.PEPE),
  mockToken('WIFMAGA','WifMaga','WIFM','Meme','Solana',94,8_500_000,198_000,9_100,143.2,2100, LOGOS.WIF),
  mockToken('BOOBEAR','BooBear','BBEAR','Meme','BNC',55,3_200_000,87_000,2_450,34.5,780, LOGOS.FLOKI),
  mockToken('DOGWIF','DogWifHat','DWIF','Meme','Solana',88,22_000_000,445_000,14_200,96.7,2890, LOGOS.WIF),
  mockToken('MILEI','MileiCoin','MILEI','Meme','BNC',97,67_000_000,1_234_000,23_400,156.8,5100, LOGOS.TRUMP),
  mockToken('BABYTRUMP','BabyTrump','BTRUMP','Meme','BNC',84,21_300_000,398_000,8_700,91.2,2450, LOGOS.TRUMP),
  mockToken('SHIBARMY','ShibArmy','SARMY','Meme','Ethereum',79,18_600_000,345_000,9_200,74.6,2100, LOGOS.SHIB),
  mockToken('CATBOY','CatBoy','CBOY','Meme','Solana',66,7_400_000,138_000,3_400,36.8,870, LOGOS.POPCAT),
  mockToken('MEMEGOD','MemeGod','MGOD','Meme','BNC',95,55_000_000,987_000,19_800,134.5,4500, LOGOS.PEPE),
  mockToken('PEPEARMY','PepeArmy','PARMY','Meme','BNC',73,11_800_000,222_000,5_300,52.4,1380, LOGOS.PEPE),
  mockToken('PEASANT','Peasant','PSNT','Meme','BNC',38,1_900_000,38_000,890,9.7,210, LOGOS.BONK),
  mockToken('DEGENKING','DegenKing','DKNG','Meme','Solana',88,26_400_000,498_000,11_600,102.3,2980, LOGOS.MYRO),
  mockToken('PUMPMASTER','PumpMaster','PMPMASTER','Meme','BNC',61,6_300_000,118_000,2_800,29.4,710, LOGOS.PEPE),
  mockToken('WHALECOIN','WhaleCoin','WHALE','Meme','Ethereum',85,23_100_000,434_000,10_100,79.8,2200, LOGOS.WHALE),
  mockToken('BIDENOUT','BidenOut','BOUTS','Meme','BNC',99,102_000_000,1_890_000,31_200,198.4,6200, LOGOS.TRUMP),
  mockToken('KINGPEPE','King Pepe','KPEPE','Meme','Ethereum',96,78_000_000,1_456_000,25_600,167.3,5400, LOGOS.PEPE),
  mockToken('DOGEMASTER','DogeMaster','DGMASTER','Meme','BNC',80,17_200_000,324_000,7_800,66.4,1820, LOGOS.DOGE),
  mockToken('APESTRONG','ApeStrong','APES','Meme','Solana',74,12_100_000,228_000,5_600,53.7,1420, LOGOS.APE),

  // ── AI ────────────────────────────────────────────────────────────────────
  mockToken('AIAGENT','AIAgent','AAGT','AI','BNC',72,18_700_000,320_000,8_900,55.1,1650, LOGOS.FET),
  mockToken('NEURALBRAIN','NeuralBrain','NBRAIN','AI','Ethereum',61,9_400_000,187_000,4_300,29.8,920, LOGOS.AGIX),
  mockToken('GPTCOIN','GPTCoin','GPTC','AI','BNC',83,31_500_000,567_000,11_200,81.4,2340, LOGOS.RNDR),
  mockToken('MINDMELD','MindMeld','MELD','AI','Base',45,4_100_000,76_000,1_890,18.3,410, LOGOS.OCEAN),
  mockToken('DEEPSEEK','DeepSeekAI','DSK','AI','BNC',67,12_300_000,234_000,5_600,42.7,1120, LOGOS.AKT),
  mockToken('JARVIS','JarvisAI','JRVIS','AI','Ethereum',78,6_800_000,143_000,3_200,63.9,1440, LOGOS.VIRTUAL),
  mockToken('AIZAP','AI Zap','AIZAP','AI','BNC',58,5_800_000,108_000,2_600,25.3,620, LOGOS.AI16Z),
  mockToken('AGENTX','AgentX','AGNTX','AI','BNC',77,13_200_000,248_000,5_900,56.8,1490, LOGOS.TAO),

  // ── Gaming ────────────────────────────────────────────────────────────────
  mockToken('QUESTGOLD','QuestGold','QGOLD','Gaming','BNC',52,5_600_000,98_000,2_100,22.4,550, LOGOS.AXS),
  mockToken('GUILDMASTER','GuildMaster','GUILD','Gaming','Solana',91,14_200_000,287_000,7_800,107.2,2100, LOGOS.YGG),
  mockToken('PLAYFI','PlayFi','PLFI','Gaming','BNC',68,8_900_000,165_000,4_500,38.6,1020, LOGOS.SAND),
  mockToken('HEROTOKEN','HeroToken','HERO','Gaming','BNC',44,2_700_000,54_000,1_200,14.2,310, LOGOS.MANA),
  mockToken('GAMEKING','GameKing','GKING','Gaming','Ethereum',77,11_000_000,210_000,6_300,59.1,1560, LOGOS.ILV),
  mockToken('LOOT','LootDrop','LOOT','Gaming','Solana',93,19_500_000,389_000,9_900,118.5,2780, LOGOS.GODS),

  // ── DeFi ─────────────────────────────────────────────────────────────────
  mockToken('YIELDMAX','YieldMax','YMAX','DeFi','BNC',86,24_700_000,498_000,10_800,74.3,2100, LOGOS.UNI),
  mockToken('LIQUIDFI','LiquidFi','LFI','DeFi','Ethereum',59,7_200_000,134_000,3_100,27.6,680, LOGOS.AAVE),
  mockToken('SWAPKING','SwapKing','SWPK','DeFi','BNC',71,10_500_000,198_000,4_800,46.8,1200, LOGOS.CRV),
  mockToken('VAULTMASTER','VaultMaster','VAULT','DeFi','Base',48,3_800_000,71_000,1_600,16.9,380, LOGOS.YFI),
  mockToken('DEXKING','DexKing','DXKG','DeFi','BNC',82,16_900_000,312_000,7_200,68.4,1780, LOGOS.SUSHI),
  mockToken('FLASHLOAN','FlashLoan','FLASH','DeFi','Ethereum',87,20_700_000,389_000,8_600,73.2,1960, LOGOS.COMP),
  mockToken('ARBITRAGE','ArbKing','ARBK','DeFi','Base',64,7_900_000,148_000,3_400,36.1,870, LOGOS.BAL),
  mockToken('POOLMASTER','PoolMaster','POOL','DeFi','BNC',57,5_400_000,101_000,2_400,24.1,590, LOGOS.INCH),

  // ── Layer2 ────────────────────────────────────────────────────────────────
  mockToken('ZKROLLUP','ZkRollup','ZKR','Layer2','Ethereum',75,13_400_000,245_000,6_100,51.7,1340, LOGOS.ZK),
  mockToken('L2KING','L2King','L2KNG','Layer2','Base',63,6_700_000,121_000,2_900,33.2,760, LOGOS.OP),
  mockToken('ZKBRIDGE','ZkBridge','ZKBR','Layer2','Ethereum',70,8_600_000,162_000,3_700,43.1,1040, LOGOS.MATIC),
  mockToken('ROLLUPFI','RollupFi','RLFI2','Layer2','Base',54,4_600_000,87_000,1_900,22.7,530, LOGOS.ARB),
  mockToken('ZKKING','ZkKing','ZKKG','Layer2','BNC',69,9_500_000,179_000,4_200,44.3,1070, LOGOS.STRK),

  // ── RWA ──────────────────────────────────────────────────────────────────
  mockToken('GOLDTOKEN','GoldToken','GOLD','RWA','Ethereum',90,28_000_000,534_000,12_000,82.1,2200, LOGOS.PAXG),
  mockToken('REALFI','RealFi','RLFI','RWA','BNC',56,5_100_000,94_000,2_200,21.8,510, LOGOS.LINK),
  mockToken('ESTATEFI','EstateFi','ESTFI','RWA','Ethereum',69,9_200_000,174_000,4_100,40.5,980, LOGOS.MNT),
  mockToken('USDCBACKED','USDCBacked','USDCB','RWA','Ethereum',78,14_300_000,268_000,6_200,48.9,1240, LOGOS.USDC),
  mockToken('RWABRIDGE','RWABridge','RWAB','RWA','BNC',65,8_100_000,153_000,3_500,37.6,910, LOGOS.MKR),

  // ── BNC extras ───────────────────────────────────────────────────────────
  mockToken('OMNILAYER','OmniLayer','OMNL','Layer2','BNC',89,28_900_000,345_000,6_780,72.3,1778, LOGOS.ARB),
  mockToken('BRIDGEX','BridgeX','BRGX','DeFi','BNC',89,12_600_000,176_000,5_670,64.2,1200, LOGOS.UNI),
];

const NEW_LISTING_POOL: AlphaToken[] = [
  mockToken('NL001','RocketDoge','RDOGE','Meme','BNC',3,450_000,12_000,234,0,15, LOGOS.DOGE),
  mockToken('NL002','MoonPepe','MNPEPE','Meme','Solana',1,180_000,5_800,89,0,8, LOGOS.PEPE),
  mockToken('NL003','AIWhisperer','AIWHS','AI','BNC',5,890_000,22_000,412,0,27, LOGOS.FET),
  mockToken('NL004','TrumpMoon','TRMN','Meme','BNC',2,320_000,8_400,156,0,11, LOGOS.TRUMP),
  mockToken('NL005','GigaChad','GIGA','Meme','Ethereum',4,670_000,17_300,278,0,19, LOGOS.GIGACHAD),
  mockToken('NL006','NeuroSwap','NSWAP','AI','BNC',7,1_200_000,31_000,567,0,42, LOGOS.OCEAN),
  mockToken('NL007','PepeWif','PWIF','Meme','Solana',2,240_000,6_900,112,0,9, LOGOS.PEPE),
  mockToken('NL008','DeFiGod','DFGOD','DeFi','BNC',6,980_000,25_000,445,0,34, LOGOS.UNI),
  mockToken('NL009','MagaToken','MAGA','Meme','BNC',3,510_000,14_200,198,0,17, LOGOS.TRUMP),
  mockToken('NL010','ZkMaster','ZKMSTR','Layer2','Ethereum',8,1_450_000,38_000,623,0,51, LOGOS.ZK),
  mockToken('NL011','BabyPepe2','BPEPE2','Meme','BNC',1,195_000,5_200,78,0,6, LOGOS.PEPE),
  mockToken('NL012','CryptoNinja','CNINJA','Gaming','Solana',4,620_000,16_500,256,0,22, LOGOS.AXS),
  mockToken('NL013','ElonMeme','EMEME','Meme','BNC',9,1_800_000,47_000,789,0,63, LOGOS.FLOKI),
  mockToken('NL014','RealYield','RYLD','RWA','Ethereum',6,1_100_000,29_000,478,0,38, LOGOS.ONDO),
  mockToken('NL015','GoldRush','GRSH','RWA','BNC',2,280_000,7_500,134,0,10, LOGOS.PAXG),
  mockToken('NL016','SuperApe','SAPE','Meme','BNC',5,750_000,19_800,312,0,25, LOGOS.APE),
  mockToken('NL017','QuantumAI','QTAI','AI','BNC',3,480_000,13_000,201,0,16, LOGOS.AGIX),
  mockToken('NL018','MemeWar','MWAR','Meme','Solana',7,1_300_000,34_000,556,0,44, LOGOS.BONK),
  mockToken('NL019','DeFiKing2','DFK2','DeFi','BNC',4,590_000,15_600,245,0,20, LOGOS.SUSHI),
  mockToken('NL020','ZeroToMoon','Z2M','Meme','BNC',1,165_000,4_400,65,0,5, LOGOS.DOGE),
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
