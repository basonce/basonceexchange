import { Block, Transaction, Address, Token, TokenHolder, NetworkStats, PaginatedResult, SearchResult, ChainDataSource, HomeAnalytics, PricePoint, TrendPoint, TvlProject, TopToken, TopAccount, ValidatorInfo, VerifiedContract, TokenListing, GasOracle, GasTier } from './types';
import { computeBncMarket, bncSparkline } from '../bncMarket';

// Helper functions for mock data generation
const generateHash = (prefix: string, length: number) => {
  const chars = '0123456789abcdef';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

const generateAddress = () => generateHash('0x', 40);
const generateTxHash = () => generateHash('0x', 64);
const generateBlockHash = () => generateHash('0x', 64);

const METHODS = ['Transfer', 'Swap', 'Approve', 'Multicall', 'Execute', 'Mint', 'Claim'];

// Initial state
const INITIAL_BLOCK_NUMBER = 18456200;
let currentBlockNumber = INITIAL_BLOCK_NUMBER;
const START_TIME = Date.now() - 50 * 3000; // newest seed block lands ~now (3s blocks)

// In-memory mock database
const blocks: Block[] = [];
const transactions: Transaction[] = [];
const addresses: Map<string, Address> = new Map();

// Seed initial data — 21 super-representatives produce blocks under named pools.
const VALIDATOR_NAMES = [
  'Basonce Foundation', 'Aurora Capital', 'Helios Nodes', 'Meridian Labs',
  'Polaris Staking', 'Vanguard Network', 'Summit Validators', 'Atlas Compute',
  'Quantum Pool', 'Sentinel Group', 'Beacon Digital', 'Citadel Nodes',
  'Horizon Capital', 'Nexus Validators', 'Orion Systems', 'Pinnacle Staking',
  'Equinox Labs', 'Vertex Network', 'Lumen Nodes', 'Apex Digital', 'Zenith Pool',
];
const VALIDATORS = Array.from({ length: 21 }, () => generateAddress());
const ACTIVE_ADDRESSES = Array.from({ length: 100 }, () => generateAddress());
ACTIVE_ADDRESSES.push('0x0000000000000000000000000000000000000000'); // Null address

const getRandomAddress = () => ACTIVE_ADDRESSES[Math.floor(Math.random() * ACTIVE_ADDRESSES.length)];
const pickValidator = () => Math.floor(Math.random() * VALIDATORS.length);

// Generate historical blocks and txs
let currentTime = START_TIME;
for (let i = 0; i < 50; i++) {
  const txCount = Math.floor(Math.random() * 50) + 10;
  const blockTxs: Transaction[] = [];
  
  for (let j = 0; j < txCount; j++) {
    const from = getRandomAddress();
    const to = getRandomAddress();
    const value = Math.random() > 0.8 ? 0 : Math.random() * 1000;
    
    const tx: Transaction = {
      hash: generateTxHash(),
      blockNumber: INITIAL_BLOCK_NUMBER - 50 + i,
      timestamp: currentTime + j * 50,
      status: Math.random() > 0.05 ? 'success' : 'failed',
      from,
      to,
      value,
      fee: Math.random() * 0.01 + 0.001,
      gasPrice: 5 + Math.random() * 10,
      gasUsed: 21000 + Math.floor(Math.random() * 100000),
      gasLimit: 3000000,
      nonce: Math.floor(Math.random() * 1000),
      method: METHODS[Math.floor(Math.random() * METHODS.length)],
      input: '0x' + generateHash('', 128)
    };
    
    blockTxs.push(tx);
    transactions.unshift(tx); // Newest first
    
    // Update addresses
    if (!addresses.has(from)) addresses.set(from, { hash: from, balance: Math.random() * 10000, txCount: 1, firstSeen: currentTime, lastSeen: currentTime, type: 'eoa' });
    else { const a = addresses.get(from)!; a.txCount++; a.lastSeen = currentTime; }
    
    if (to !== '0x0000000000000000000000000000000000000000') {
      if (!addresses.has(to)) addresses.set(to, { hash: to, balance: Math.random() * 10000, txCount: 1, firstSeen: currentTime, lastSeen: currentTime, type: 'eoa' });
      else { const a = addresses.get(to)!; a.txCount++; a.lastSeen = currentTime; }
    }
  }
  
  const vIdx = pickValidator();
  blocks.unshift({ // Newest first
    number: INITIAL_BLOCK_NUMBER - 50 + i,
    hash: generateBlockHash(),
    timestamp: currentTime,
    txCount,
    validator: VALIDATORS[vIdx],
    producerName: VALIDATOR_NAMES[vIdx],
    gasUsed: blockTxs.reduce((sum, tx) => sum + tx.gasUsed, 0),
    gasLimit: 30000000,
    reward: 2 + Math.random(),
    size: 15000 + Math.floor(Math.random() * 20000)
  });
  
  currentTime += 3000; // 3 seconds per block
}

currentBlockNumber = INITIAL_BLOCK_NUMBER;

// --- Token registry -------------------------------------------------------
// A single source of truth for each token's metadata. The native asset of the
// Basonce Chain is BNC; other addresses resolve to a generic token.
export const BNC_PRICE = 2.43;
export const BNC_SUPPLY = 9_500_000_000;

interface TokenMeta {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  price: number;
  holderCount: number;
  native: boolean;
}

function tokenMeta(address: string): TokenMeta {
  if (address.toLowerCase() === '0xbasonce') {
    // Live BNC price from the shared exchange engine so the token detail page
    // matches the header / home card exactly.
    return { name: 'Basonce Coin', symbol: 'BNC', decimals: 18, totalSupply: BNC_SUPPLY, price: Number(computeBncMarket().price.toFixed(4)), holderCount: 2437, native: true };
  }
  return { name: 'Mock Token', symbol: 'MCK', decimals: 18, totalSupply: 1000000, price: 1.2, holderCount: 120, native: false };
}

// Build a believable holder distribution (top whales + a long dust tail) that
// sums to ~100% of supply. Deterministic per token via the cache below.
function buildHolders(totalSupply: number, count: number): TokenHolder[] {
  const topWeights = [
    18.4, 9.7, 6.3, 4.8, 3.9, 3.1, 2.6, 2.2, 1.9, 1.6,
    1.4, 1.2, 1.05, 0.94, 0.83, 0.74, 0.66, 0.59, 0.52, 0.47,
  ];
  const holders: TokenHolder[] = [];
  const topUsed = Math.min(topWeights.length, count);
  let topSum = 0;
  for (let i = 0; i < topUsed; i++) {
    const pct = topWeights[i];
    topSum += pct;
    holders.push({ address: generateAddress(), balance: Math.round((totalSupply * pct) / 100), percentage: pct });
  }
  const tailCount = count - topUsed;
  if (tailCount > 0) {
    const remaining = Math.max(0, 100 - topSum);
    const weights: number[] = [];
    let w = 1;
    for (let i = 0; i < tailCount; i++) { weights.push(w); w *= 0.999; }
    const wsum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < tailCount; i++) {
      const pct = (remaining * weights[i]) / wsum;
      holders.push({ address: generateAddress(), balance: Math.round((totalSupply * pct) / 100), percentage: Number(pct.toFixed(6)) });
    }
  }
  return holders;
}

const holdersCache = new Map<string, TokenHolder[]>();
function getHoldersFor(address: string): TokenHolder[] {
  const key = address.toLowerCase();
  let cached = holdersCache.get(key);
  if (!cached) {
    const meta = tokenMeta(address);
    cached = buildHolders(meta.totalSupply, meta.holderCount);
    holdersCache.set(key, cached);
  }
  return cached;
}

// Value-bearing transactions are the token's transfers. The native token sees
// every value transfer; non-native tokens map to a deterministic subset.
function getTokenTransferList(address: string): Transaction[] {
  const valueTransfers = transactions.filter((t) => t.value > 0);
  return tokenMeta(address).native ? valueTransfers : valueTransfers.filter((_, i) => i % 9 === 0);
}

// --- Analytics fixtures ---------------------------------------------------
// Generated once at module load so charts stay stable across refetches while
// still looking organic. Designed to be replaced by real chain telemetry.
const DAY_MS = 24 * 60 * 60 * 1000;

function dayLabel(offsetFromToday: number): string {
  const d = new Date(Date.now() - offsetFromToday * DAY_MS);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function wobble(base: number, spread: number, i: number, drift = 0): number {
  const wave = Math.sin(i * 0.7) * 0.4 + Math.sin(i * 1.9) * 0.25 + (Math.random() - 0.5) * 0.7;
  return Math.max(0, base * (1 + wave * spread) + base * drift * i);
}

const ANALYTICS: HomeAnalytics = (() => {
  const days = 14;

  // Coherent with the live BNC price: same exchange engine drives this sparkline.
  const priceSeries: PricePoint[] = bncSparkline(30, 6 * 3600 * 1000).map((price, i) => ({
    t: Date.now() - (29 - i) * DAY_MS,
    price: Number(price.toFixed(4)),
  }));

  const txTrend: TrendPoint[] = Array.from({ length: days }, (_, i) => {
    const total = Math.round(wobble(13_400_000, 0.18, i));
    return {
      date: dayLabel(days - 1 - i),
      total,
      bncTransfers: Math.round(total * (0.32 + Math.random() * 0.06)),
      stableTransfers: Math.round(total * (0.41 + Math.random() * 0.06)),
    };
  });

  const tvlSeries: TrendPoint[] = Array.from({ length: days }, (_, i) => ({
    date: dayLabel(days - 1 - i),
    tvl: Math.round(wobble(25_400_000_000, 0.05, i)),
    staked: Math.round(wobble(14_500_000_000, 0.04, i)),
  }));

  const tvlProjects: TvlProject[] = [
    { name: 'Basonce Staking', category: 'Governance', tvl: 14_539_845_655, change24h: -0.99 },
    { name: 'LendHub DAO', category: 'Lending | Staking', tvl: 6_292_427_037, change24h: -0.67 },
    { name: 'Basonce Cryptos', category: 'Cross Chain', tvl: 2_030_013_205, change24h: -1.54 },
    { name: 'USDB', category: 'Stablecoin | Lending', tvl: 2_029_242_877, change24h: -0.21 },
    { name: 'SunSwap', category: 'Swap | Farm | Perp', tvl: 613_172_061, change24h: -0.59 },
    { name: 'stBNC', category: 'RWA | Staking | Yield', tvl: 58_559_146, change24h: 0.08 },
  ];

  const transferVolumeSeries: TrendPoint[] = Array.from({ length: days }, (_, i) => ({
    date: dayLabel(days - 1 - i),
    USDB: Math.round(wobble(30_000_000_000, 0.16, i)),
    BNC: Math.round(wobble(2_300_000_000, 0.2, i)),
    USDD: Math.round(wobble(640_000_000, 0.22, i)),
    JST: Math.round(wobble(120_000_000, 0.25, i)),
  }));

  const topTokens: TopToken[] = [
    { rank: 1, name: 'Tether USD', symbol: 'USDB', transferVolume: 30_030_947_409, transfers: 2_894_991, marketCap: 89_230_552_917 },
    { rank: 2, name: 'Basonce Coin', symbol: 'BNC', transferVolume: 2_346_843_941, transfers: 5_323_618, marketCap: 23_085_000_000 },
    { rank: 3, name: 'Basonce USD', symbol: 'USDD', transferVolume: 207_321_109, transfers: 1_774, marketCap: 1_082_128_117 },
    { rank: 4, name: 'JustStake', symbol: 'JST', transferVolume: 40_385_970, transfers: 2_924, marketCap: 807_005_981 },
    { rank: 5, name: 'Apex Agent', symbol: 'A2A', transferVolume: 4_564_818, transfers: 801, marketCap: 519_290_894 },
  ];

  const activeAccounts: TrendPoint[] = Array.from({ length: days }, (_, i) => ({
    date: dayLabel(days - 1 - i),
    active: Math.round(wobble(5_150_000, 0.12, i)),
    created: Math.round(wobble(185_000, 0.2, i)),
  }));

  const revenue: TrendPoint[] = Array.from({ length: days }, (_, i) => ({
    date: dayLabel(days - 1 - i),
    revenue: Math.round(wobble(8_900_000, 0.14, i)),
  }));

  const supplySeries: TrendPoint[] = Array.from({ length: days }, (_, i) => ({
    date: dayLabel(days - 1 - i),
    supply: Math.round(BNC_SUPPLY + i * 778_000 + (Math.random() - 0.5) * 200_000),
    staked: Math.round(wobble(4_550_000_000, 0.02, i)),
  }));

  return {
    priceSeries, txTrend, tvlSeries, tvlProjects,
    transferVolumeSeries, topTokens, activeAccounts, revenue, supplySeries,
  };
})();

// --- Top accounts (rich list) --------------------------------------------
const ACCOUNT_LABELS: Array<{ tag: string; type: 'eoa' | 'contract' }> = [
  { tag: 'Basonce: Foundation', type: 'eoa' },
  { tag: 'Binance: Hot Wallet', type: 'eoa' },
  { tag: 'Basonce: Staking', type: 'contract' },
  { tag: 'OKX', type: 'eoa' },
  { tag: 'Basonce: Team Vault', type: 'contract' },
  { tag: 'Bybit: Cold Wallet', type: 'eoa' },
  { tag: 'SunSwap: Router', type: 'contract' },
  { tag: 'Basonce: Ecosystem Fund', type: 'contract' },
  { tag: 'Kraken', type: 'eoa' },
  { tag: 'LendHub: Treasury', type: 'contract' },
  { tag: 'Basonce: Burn Address', type: 'eoa' },
  { tag: 'Gate.io', type: 'eoa' },
];

const TOP_ACCOUNTS: TopAccount[] = (() => {
  const count = 100;
  const list: TopAccount[] = [];
  let weight = 6.2;
  for (let i = 0; i < count; i++) {
    const pct = weight;
    weight *= 0.9 - Math.random() * 0.02;
    const label = ACCOUNT_LABELS[i];
    list.push({
      rank: i + 1,
      address: generateAddress(),
      nameTag: label ? label.tag : null,
      balance: Math.round((BNC_SUPPLY * pct) / 100),
      percentage: Number(pct.toFixed(4)),
      txCount: Math.floor(50 + Math.random() * 50000),
      type: label ? label.type : (Math.random() > 0.7 ? 'contract' : 'eoa'),
    });
  }
  return list;
})();

// --- Validator leaderboard -----------------------------------------------
const VALIDATOR_INFO: ValidatorInfo[] = (() => {
  const raw = VALIDATOR_NAMES.map((name, i) => ({
    name,
    address: VALIDATORS[i],
    weight: Math.pow(0.86, i) * (0.9 + Math.random() * 0.2),
  }));
  raw.sort((a, b) => b.weight - a.weight);
  const totalWeight = raw.reduce((s, r) => s + r.weight, 0);
  const totalStaked = 4_550_648_861;
  return raw.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    address: r.address,
    votingPower: Number(((r.weight / totalWeight) * 100).toFixed(2)),
    stake: Math.round((r.weight / totalWeight) * totalStaked),
    blocksProduced: Math.floor((r.weight / totalWeight) * 4_417_260),
    uptime: Number((99.2 + Math.random() * 0.79).toFixed(2)),
    status: 'active' as const,
  }));
})();

// --- Verified contracts --------------------------------------------------
const CONTRACT_DEFS: Array<{ name: string; compiler: string; version: string; license: string }> = [
  { name: 'BasonceStaking', compiler: 'Solidity', version: 'v0.8.24+commit', license: 'MIT' },
  { name: 'SunSwapV3Router', compiler: 'Solidity', version: 'v0.8.23+commit', license: 'GPL-3.0' },
  { name: 'USDB Token', compiler: 'Solidity', version: 'v0.8.20+commit', license: 'MIT' },
  { name: 'LendHubComptroller', compiler: 'Solidity', version: 'v0.8.19+commit', license: 'BUSL-1.1' },
  { name: 'BasonceMultisig', compiler: 'Solidity', version: 'v0.8.24+commit', license: 'MIT' },
  { name: 'stBNC Vault', compiler: 'Solidity', version: 'v0.8.21+commit', license: 'MIT' },
  { name: 'JustStakeFarm', compiler: 'Solidity', version: 'v0.8.18+commit', license: 'GPL-3.0' },
  { name: 'BasonceBridge', compiler: 'Solidity', version: 'v0.8.24+commit', license: 'MIT' },
  { name: 'A2A Token', compiler: 'Solidity', version: 'v0.8.22+commit', license: 'MIT' },
  { name: 'GovernanceTimelock', compiler: 'Solidity', version: 'v0.8.20+commit', license: 'MIT' },
  { name: 'NFTMarketplace', compiler: 'Solidity', version: 'v0.8.19+commit', license: 'MIT' },
  { name: 'BasonceVesting', compiler: 'Solidity', version: 'v0.8.24+commit', license: 'Apache-2.0' },
  { name: 'OracleAggregator', compiler: 'Solidity', version: 'v0.8.21+commit', license: 'MIT' },
  { name: 'USDD Stablecoin', compiler: 'Solidity', version: 'v0.8.20+commit', license: 'MIT' },
  { name: 'PerpetualExchange', compiler: 'Solidity', version: 'v0.8.23+commit', license: 'BUSL-1.1' },
];

const VERIFIED_CONTRACTS: VerifiedContract[] = (() => {
  const list: VerifiedContract[] = [];
  for (let i = 0; i < 80; i++) {
    const def = CONTRACT_DEFS[i % CONTRACT_DEFS.length];
    const suffix = i < CONTRACT_DEFS.length ? '' : ` v${Math.floor(i / CONTRACT_DEFS.length) + 1}`;
    list.push({
      address: generateAddress(),
      name: def.name + suffix,
      compiler: def.compiler,
      version: def.version,
      balance: Math.round(Math.random() * 500000),
      txCount: Math.floor(100 + Math.random() * 2_000_000),
      verifiedAt: Date.now() - Math.floor(Math.random() * 180) * DAY_MS,
      license: def.license,
    });
  }
  return list;
})();

// --- Top tokens ----------------------------------------------------------
const TOKEN_LISTINGS: TokenListing[] = [
  { rank: 1, address: '0xbasonce', name: 'Tether USD', symbol: 'USDB', price: 1.0, change24h: 0.01, volume24h: 30_030_947_409, holders: 6_412_338, marketCap: 89_230_552_917 },
  { rank: 2, address: '0xbasonce', name: 'Basonce Coin', symbol: 'BNC', price: BNC_PRICE, change24h: -0.99, volume24h: 2_346_843_941, holders: 2_437_991, marketCap: 23_085_000_000 },
  { rank: 3, address: generateAddress(), name: 'Basonce USD', symbol: 'USDD', price: 0.999, change24h: -0.21, volume24h: 207_321_109, holders: 184_771, marketCap: 1_082_128_117 },
  { rank: 4, address: generateAddress(), name: 'JustStake', symbol: 'JST', price: 0.0276, change24h: 1.84, volume24h: 40_385_970, holders: 92_924, marketCap: 807_005_981 },
  { rank: 5, address: generateAddress(), name: 'Apex Agent', symbol: 'A2A', price: 0.519, change24h: 4.12, volume24h: 4_564_818, holders: 38_801, marketCap: 519_290_894 },
  { rank: 6, address: generateAddress(), name: 'SunSwap', symbol: 'SUN', price: 0.0184, change24h: -2.31, volume24h: 3_812_440, holders: 27_412, marketCap: 412_882_010 },
  { rank: 7, address: generateAddress(), name: 'LendHub', symbol: 'LHB', price: 1.42, change24h: 0.77, volume24h: 2_104_882, holders: 19_338, marketCap: 284_990_220 },
  { rank: 8, address: generateAddress(), name: 'Staked BNC', symbol: 'stBNC', price: 2.61, change24h: -0.88, volume24h: 1_982_330, holders: 14_209, marketCap: 213_440_119 },
  { rank: 9, address: generateAddress(), name: 'Helios', symbol: 'HLS', price: 0.342, change24h: 6.05, volume24h: 1_402_118, holders: 11_882, marketCap: 142_009_551 },
  { rank: 10, address: generateAddress(), name: 'Meridian', symbol: 'MRD', price: 0.087, change24h: -1.14, volume24h: 980_221, holders: 9_120, marketCap: 98_220_440 },
  { rank: 11, address: generateAddress(), name: 'Polaris', symbol: 'PLR', price: 0.213, change24h: 2.44, volume24h: 742_119, holders: 7_338, marketCap: 74_900_222 },
  { rank: 12, address: generateAddress(), name: 'Vanguard', symbol: 'VGD', price: 0.561, change24h: -3.02, volume24h: 612_004, holders: 5_991, marketCap: 61_200_010 },
];

const listeners: Set<(event: { type: 'new_block' | 'new_transaction'; data: any }) => void> = new Set();

// Simulate live updates
setInterval(() => {
  currentBlockNumber++;
  const now = Date.now();
  const txCount = Math.floor(Math.random() * 30) + 5;
  const newTxs: Transaction[] = [];
  
  for (let j = 0; j < txCount; j++) {
    const tx: Transaction = {
      hash: generateTxHash(),
      blockNumber: currentBlockNumber,
      timestamp: now,
      status: Math.random() > 0.05 ? 'success' : 'failed',
      from: getRandomAddress(),
      to: getRandomAddress(),
      value: Math.random() > 0.8 ? 0 : Math.random() * 500,
      fee: Math.random() * 0.01 + 0.001,
      gasPrice: 5 + Math.random() * 10,
      gasUsed: 21000 + Math.floor(Math.random() * 100000),
      gasLimit: 3000000,
      nonce: Math.floor(Math.random() * 1000),
      method: METHODS[Math.floor(Math.random() * METHODS.length)],
      input: '0x' + generateHash('', 64)
    };
    newTxs.push(tx);
    transactions.unshift(tx);
    listeners.forEach(l => l({ type: 'new_transaction', data: tx }));
  }
  
  const vIdx = pickValidator();
  const newBlock: Block = {
    number: currentBlockNumber,
    hash: generateBlockHash(),
    timestamp: now,
    txCount,
    validator: VALIDATORS[vIdx],
    producerName: VALIDATOR_NAMES[vIdx],
    gasUsed: newTxs.reduce((sum, tx) => sum + tx.gasUsed, 0),
    gasLimit: 30000000,
    reward: 2 + Math.random(),
    size: 15000 + Math.floor(Math.random() * 20000)
  };
  
  blocks.unshift(newBlock);
  listeners.forEach(l => l({ type: 'new_block', data: newBlock }));
  
  // Keep arrays manageable
  if (blocks.length > 1000) blocks.length = 1000;
  if (transactions.length > 5000) transactions.length = 5000;
  
}, 3000);

export class MockChainDataSource implements ChainDataSource {
  async getNetworkStats(): Promise<NetworkStats> {
    // Live BNC price + 24h % pulled from the shared exchange engine so the
    // explorer mirrors the Kite Exchange / Basonce Wallet numbers exactly.
    const m = computeBncMarket();
    const bncPrice = Number(m.price.toFixed(4));
    return {
      latestBlock: currentBlockNumber,
      totalAccounts: 12_408_153 + Math.floor(transactions.length / 4),
      accounts24h: 38_512 + Math.floor(Math.random() * 4000),
      totalValueLocked: 25_586_191_100 + Math.floor((Math.random() - 0.5) * 20_000_000),
      tvlChange24h: Number((-0.91 + (Math.random() - 0.5) * 0.4).toFixed(2)),
      totalTransactions: 4_417_260_240 + transactions.length,
      transactions24h: 12_969_477 + transactions.length,
      totalTransferVolume: 7_626_760_608_687 + transactions.length * 1000,
      transferVolume24h: 30_642_469_210 + Math.floor(Math.random() * 5_000_000),
      bncPrice,
      priceChange24h: Number(m.change24h.toFixed(2)),
      marketCap: Math.round(bncPrice * BNC_SUPPLY),
      volume24h: Math.round(m.volumeMillions * 1_000_000),
      totalSupply: BNC_SUPPLY,
      totalStaked: 4_550_648_861,
      stakingRate: 47.9,
      tps: 87 + Math.floor(Math.random() * 40),
      maxTps: 1035,
      totalNodes: 8279,
      totalContracts: 3_597_188,
      totalTokens: 190_638,
      activeValidators: 21,
      gasPriceGwei: 0.01,
    };
  }

  async getHomeAnalytics(): Promise<HomeAnalytics> {
    // Keep BNC's market cap in the Top Tokens widget aligned with the live price.
    const liveCap = Math.round(computeBncMarket().price * BNC_SUPPLY);
    return {
      ...ANALYTICS,
      topTokens: ANALYTICS.topTokens.map((t) =>
        t.symbol === 'BNC' ? { ...t, marketCap: liveCap } : t
      ),
    };
  }

  async getTopAccounts(page: number, pageSize: number): Promise<PaginatedResult<TopAccount>> {
    const start = (page - 1) * pageSize;
    return {
      data: TOP_ACCOUNTS.slice(start, start + pageSize),
      total: TOP_ACCOUNTS.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(TOP_ACCOUNTS.length / pageSize)),
    };
  }

  async getValidators(): Promise<ValidatorInfo[]> {
    return VALIDATOR_INFO;
  }

  async getVerifiedContracts(page: number, pageSize: number): Promise<PaginatedResult<VerifiedContract>> {
    const start = (page - 1) * pageSize;
    return {
      data: VERIFIED_CONTRACTS.slice(start, start + pageSize),
      total: VERIFIED_CONTRACTS.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(VERIFIED_CONTRACTS.length / pageSize)),
    };
  }

  async getTopTokens(): Promise<TokenListing[]> {
    // BNC row mirrors the live exchange price / 24h % / market cap.
    const m = computeBncMarket();
    return TOKEN_LISTINGS.map((t) =>
      t.symbol === 'BNC'
        ? {
            ...t,
            price: Number(m.price.toFixed(4)),
            change24h: Number(m.change24h.toFixed(2)),
            marketCap: Math.round(m.price * BNC_SUPPLY),
          }
        : t
    );
  }

  async getGasOracle(): Promise<GasOracle> {
    // Ultra-low fees on the Basonce Chain — headline gas ~0.01 Gwei.
    const base = 0.01;
    const transferGas = 21000;
    const price = computeBncMarket().price;
    const tier = (gwei: number, timeSec: number): GasTier => ({
      gwei: Number(gwei.toFixed(2)),
      usd: Number(((gwei * 1e-9 * transferGas) * price).toFixed(4)),
      timeSec,
    });
    return {
      low: tier(base, 30),
      average: tier(base, 12),
      high: tier(base, 6),
      baseFee: base,
      bncPrice: Number(price.toFixed(4)),
    };
  }

  async getLatestBlocks(count: number = 10): Promise<Block[]> {
    return [...blocks].slice(0, count);
  }

  async getLatestTransactions(count: number = 10): Promise<Transaction[]> {
    return [...transactions].slice(0, count);
  }

  async getTransactionsPage(page: number, pageSize: number): Promise<PaginatedResult<Transaction>> {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: transactions.slice(start, end),
      total: transactions.length,
      page,
      pageSize,
      totalPages: Math.ceil(transactions.length / pageSize)
    };
  }

  async getBlocksPage(page: number, pageSize: number): Promise<PaginatedResult<Block>> {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: blocks.slice(start, end),
      total: blocks.length,
      page,
      pageSize,
      totalPages: Math.ceil(blocks.length / pageSize)
    };
  }

  async getBlock(numberOrHash: string | number): Promise<Block | null> {
    const block = blocks.find(b => 
      typeof numberOrHash === 'number' ? b.number === numberOrHash : 
      b.hash.toLowerCase() === numberOrHash.toString().toLowerCase() ||
      b.number.toString() === numberOrHash.toString()
    );
    return block || null;
  }

  async getTransaction(hash: string): Promise<Transaction | null> {
    const tx = transactions.find(t => t.hash.toLowerCase() === hash.toLowerCase());
    return tx || null;
  }

  async getAddress(hash: string): Promise<Address | null> {
    let addr = addresses.get(hash.toLowerCase());
    if (!addr) {
      // Mock on the fly if not found to make it look realistic
      addr = {
        hash,
        balance: Math.random() * 5000,
        txCount: Math.floor(Math.random() * 100),
        firstSeen: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastSeen: Date.now() - Math.random() * 24 * 60 * 60 * 1000,
        type: 'eoa'
      };
      addresses.set(hash.toLowerCase(), addr);
    }
    return addr;
  }

  async getAddressTransactions(hash: string, page: number, pageSize: number): Promise<PaginatedResult<Transaction>> {
    const addrTxs = transactions.filter(t => 
      t.from.toLowerCase() === hash.toLowerCase() || 
      (t.to && t.to.toLowerCase() === hash.toLowerCase())
    );
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: addrTxs.slice(start, end),
      total: addrTxs.length,
      page,
      pageSize,
      totalPages: Math.ceil(addrTxs.length / pageSize)
    };
  }

  async getToken(address: string): Promise<Token | null> {
    const meta = tokenMeta(address);
    return {
      address,
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
      totalSupply: meta.totalSupply,
      holders: meta.holderCount,
      transfers: getTokenTransferList(address).length,
      price: meta.price,
    };
  }

  async getTokenTransfers(address: string, page: number, pageSize: number): Promise<PaginatedResult<Transaction>> {
    const list = getTokenTransferList(address);
    const total = list.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: list.slice(start, end),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getTokenHolders(address: string, page: number, pageSize: number): Promise<PaginatedResult<TokenHolder>> {
    const holders = getHoldersFor(address);
    const total = holders.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: holders.slice(start, end),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async search(query: string): Promise<SearchResult> {
    const q = query.trim().toLowerCase();
    
    // Check if it's a block number
    if (/^\d+$/.test(q)) {
      const block = await this.getBlock(parseInt(q));
      if (block) return { type: 'block', id: block.number.toString() };
    }
    
    // Check if it's a transaction hash (66 chars with 0x)
    if (q.length === 66 && q.startsWith('0x')) {
      const tx = await this.getTransaction(q);
      if (tx) return { type: 'transaction', id: q };
      // Even if not found, route to tx page to show "not found"
      return { type: 'transaction', id: q };
    }
    
    // Check if it's an address (42 chars with 0x)
    if (q.length === 42 && q.startsWith('0x')) {
      return { type: 'address', id: q };
    }
    
    return { type: null, id: '' };
  }

  subscribe(callback: (event: { type: 'new_block' | 'new_transaction'; data: any }) => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
}
