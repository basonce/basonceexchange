export interface NetworkStats {
  latestBlock: number;
  totalAccounts: number;
  accounts24h: number;
  totalValueLocked: number;
  tvlChange24h: number;
  totalTransactions: number;
  transactions24h: number;
  totalTransferVolume: number;
  transferVolume24h: number;
  bncPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  totalSupply: number;
  totalStaked: number;
  stakingRate: number;
  tps: number;
  maxTps: number;
  totalNodes: number;
  totalContracts: number;
  totalTokens: number;
  activeValidators: number;
  gasPriceGwei: number;
}

export interface Block {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  validator: string;
  producerName: string;
  gasUsed: number;
  gasLimit: number;
  reward: number; // in BNC
  size: number;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  from: string;
  to: string | null;
  value: number; // in BNC
  fee: number; // in BNC
  gasPrice: number; // in Gwei
  gasUsed: number;
  gasLimit: number;
  nonce: number;
  method: string;
  input: string;
}

export interface Address {
  hash: string;
  balance: number; // in BNC
  txCount: number;
  firstSeen: number;
  lastSeen: number;
  type: 'eoa' | 'contract';
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  holders: number;
  transfers: number;
  price: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchResult {
  type: 'block' | 'transaction' | 'address' | 'token' | null;
  id: string;
}

// --- Analytics types (home dashboard) -------------------------------------
export interface PricePoint {
  t: number;
  price: number;
}

export interface TrendPoint {
  date: string;
  [series: string]: number | string;
}

export interface TvlProject {
  name: string;
  category: string;
  tvl: number;
  change24h: number;
}

export interface TopToken {
  rank: number;
  name: string;
  symbol: string;
  transferVolume: number;
  transfers: number;
  marketCap: number;
}

export interface HomeAnalytics {
  priceSeries: PricePoint[];
  txTrend: TrendPoint[];              // { date, total, bncTransfers, stableTransfers }
  tvlSeries: TrendPoint[];           // { date, tvl, staked }
  tvlProjects: TvlProject[];
  transferVolumeSeries: TrendPoint[]; // { date, BNC, USDB, USDD, JST }
  topTokens: TopToken[];
  activeAccounts: TrendPoint[];      // { date, active, created }
  revenue: TrendPoint[];             // { date, revenue }
  supplySeries: TrendPoint[];        // { date, supply, staked }
}

export interface TopAccount {
  rank: number;
  address: string;
  nameTag: string | null;
  balance: number;       // in BNC
  percentage: number;    // share of total supply
  txCount: number;
  type: 'eoa' | 'contract';
}

export interface ValidatorInfo {
  rank: number;
  name: string;
  address: string;
  votingPower: number;   // percentage
  stake: number;         // in BNC
  blocksProduced: number;
  uptime: number;        // percentage
  status: 'active' | 'standby';
}

export interface VerifiedContract {
  address: string;
  name: string;
  compiler: string;
  version: string;
  balance: number;       // in BNC
  txCount: number;
  verifiedAt: number;    // timestamp
  license: string;
}

export interface TokenListing {
  rank: number;
  address: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  holders: number;
  marketCap: number;
}

export interface GasTier {
  gwei: number;
  usd: number;          // cost of a standard transfer in USD
  timeSec: number;      // expected confirmation time
}

export interface GasOracle {
  low: GasTier;
  average: GasTier;
  high: GasTier;
  baseFee: number;      // gwei
  bncPrice: number;
}

export interface ChainDataSource {
  getNetworkStats(): Promise<NetworkStats>;
  getHomeAnalytics(): Promise<HomeAnalytics>;
  getTopAccounts(page: number, pageSize: number): Promise<PaginatedResult<TopAccount>>;
  getValidators(): Promise<ValidatorInfo[]>;
  getVerifiedContracts(page: number, pageSize: number): Promise<PaginatedResult<VerifiedContract>>;
  getTopTokens(): Promise<TokenListing[]>;
  getGasOracle(): Promise<GasOracle>;
  getLatestBlocks(count?: number): Promise<Block[]>;
  getLatestTransactions(count?: number): Promise<Transaction[]>;
  getTransactionsPage(page: number, pageSize: number): Promise<PaginatedResult<Transaction>>;
  getBlocksPage(page: number, pageSize: number): Promise<PaginatedResult<Block>>;
  getBlock(numberOrHash: string | number): Promise<Block | null>;
  getTransaction(hash: string): Promise<Transaction | null>;
  getAddress(hash: string): Promise<Address | null>;
  getAddressTransactions(hash: string, page: number, pageSize: number): Promise<PaginatedResult<Transaction>>;
  getToken(address: string): Promise<Token | null>;
  getTokenTransfers(address: string, page: number, pageSize: number): Promise<PaginatedResult<Transaction>>;
  getTokenHolders(address: string, page: number, pageSize: number): Promise<PaginatedResult<TokenHolder>>;
  search(query: string): Promise<SearchResult>;

  // Subscription for live updates
  subscribe(callback: (event: { type: 'new_block' | 'new_transaction'; data: any }) => void): () => void;
}
