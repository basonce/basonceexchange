// COIN:NETWORK pairs with REAL per-user deposit addresses (NOWPayments).
// Must stay in sync with artifacts/kite-exchange/src/lib/nowpay-supported.ts
// and NOWPAY_CUR in kite-exchange/cf-worker/_worker.js.
export const NOWPAY_SUPPORTED = new Set([
  '1INCH:ERC20', 'AAVE:ERC20', 'ADA:ADA', 'ALGO:ALGO',
  'APE:ERC20', 'APT:APT', 'ARB:ARBITRUM', 'ARPA:BEP20',
  'ARPA:ERC20', 'AXS:ERC20', 'BABYDOGE:BEP20', 'BAT:ERC20',
  'BCH:BCH', 'BEL:BEP20', 'BEL:ERC20', 'BNB:BEP20',
  'BOBA:ERC20', 'BTC:BTC', 'BTTC:TRC20', 'C98:BEP20',
  'CAKE:BEP20', 'CFX:BEP20', 'CHZ:ERC20', 'COTI:ERC20',
  'CTSI:ERC20', 'DAI:ARBITRUM', 'DAI:ERC20', 'DOGE:DOGE',
  'EGLD:BEP20', 'EGLD:EGLD', 'ETC:ETC', 'ETH:ARBITRUM',
  'ETH:BASE', 'ETH:BEP20', 'ETH:ERC20', 'ETH:ETH',
  'FIL:FIL', 'FLOKI:BEP20', 'FLOKI:ERC20', 'FUN:ERC20',
  'GALA:ERC20', 'GMX:ARBITRUM', 'GMX:AVAXC', 'GRT:ERC20',
  'HOT:ERC20', 'ILV:ERC20', 'INJ:BEP20', 'INJ:ERC20',
  'INJ:INJ', 'KNC:ERC20', 'LINK:ERC20', 'LTC:LTC',
  'MANA:ERC20', 'MATIC:ERC20', 'MATIC:POLYGON', 'NEAR:NEAR',
  'OKB:ERC20', 'OMG:ERC20', 'ONT:ONT', 'PEPE:ERC20',
  'QTUM:QTUM', 'SAND:ERC20', 'SHIB:BEP20', 'SHIB:ERC20',
  'SOL:SOL', 'SUI:SUI', 'SUPER:ERC20', 'TRX:TRC20',
  'TUSD:ERC20', 'TUSD:TRC20', 'UNI:ERC20', 'USDC:ALGO',
  'USDC:ARBITRUM', 'USDC:AVAXC', 'USDC:BASE', 'USDC:BEP20',
  'USDC:ERC20', 'USDC:OPTIMISM', 'USDC:POLYGON', 'USDC:SOL',
  'USDT:ARBITRUM', 'USDT:AVAXC', 'USDT:BEP20', 'USDT:CELO',
  'USDT:ERC20', 'USDT:OPTIMISM', 'USDT:POLYGON', 'USDT:SOL',
  'USDT:TRC20', 'VET:VET', 'WAVES:WAVES', 'WBTC:POLYGON',
  'WIN:TRC20', 'XMR:XMR', 'XRP:XRP', 'YFI:ERC20',
  'ZEC:ZEC', 'ZIL:ZIL',
]);

// Basonce platform tokens (real BEP-20 tokens not listed on NOWPayments).
// Deposits use the user's REAL assigned wallet_pool address on BSC; they can
// also be received via in-app transfer from another Basonce user.
export const INTERNAL_TOKENS = new Set(['BNC', 'EQ', 'EQL']);

export const NETWORK_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', ERC20: 'Ethereum (ERC20)',
  BEP20: 'BNB Smart Chain (BEP20)', TRC20: 'Tron (TRC20)',
  SOL: 'Solana', XRP: 'Ripple', ADA: 'Cardano', DOGE: 'Dogecoin',
  LTC: 'Litecoin', BCH: 'Bitcoin Cash', ETC: 'Ethereum Classic',
  ARBITRUM: 'Arbitrum One', BASE: 'Base', OPTIMISM: 'Optimism',
  POLYGON: 'Polygon', AVAXC: 'Avalanche C-Chain', CELO: 'Celo',
  ALGO: 'Algorand', NEAR: 'NEAR', APT: 'Aptos', SUI: 'Sui',
  FIL: 'Filecoin', EGLD: 'MultiversX', INJ: 'Injective',
  ONT: 'Ontology', QTUM: 'Qtum', VET: 'VeChain', WAVES: 'Waves',
  XMR: 'Monero', ZEC: 'Zcash', ZIL: 'Zilliqa',
};

const coinCache: string[] = [];
export function receivableCoins(): string[] {
  if (coinCache.length === 0) {
    const coins = new Set<string>();
    for (const pair of NOWPAY_SUPPORTED) coins.add(pair.split(':')[0]);
    for (const t of INTERNAL_TOKENS) coins.add(t);
    coinCache.push(...Array.from(coins).sort());
  }
  return coinCache;
}

export function networksForCoin(coin: string): string[] {
  const c = coin.toUpperCase();
  const nets: string[] = [];
  for (const pair of NOWPAY_SUPPORTED) {
    const [pc, pn] = pair.split(':');
    if (pc === c) nets.push(pn);
  }
  return nets.sort();
}
