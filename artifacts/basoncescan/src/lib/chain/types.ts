export interface NetworkStats {
  latestBlock: number;
  totalTransactions: number;
  bsoPrice: number;
  marketCap: number;
  gasPriceGwei: number;
  tps: number;
  activeValidators: number;
}

export interface Block {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  validator: string;
  gasUsed: number;
  gasLimit: number;
  reward: number; // in BSO
  size: number;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  from: string;
  to: string | null;
  value: number; // in BSO
  fee: number; // in BSO
  gasPrice: number; // in Gwei
  gasUsed: number;
  gasLimit: number;
  nonce: number;
  method: string;
  input: string;
}

export interface Address {
  hash: string;
  balance: number; // in BSO
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

export interface ChainDataSource {
  getNetworkStats(): Promise<NetworkStats>;
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
