// Network configs + deterministic deposit-address generation.
// Mirrors kite-exchange/src/lib/crypto-utils.ts so the SAME user gets the SAME
// deposit address in both apps.

export interface Network {
  id: string;
  name: string;
  minDeposit: number;
  minWithdraw: number;
  withdrawFee: number;
  confirmations: number;
  estimatedTime: string;
}

export const CRYPTO_NETWORKS: Record<string, Network[]> = {
  BTC: [{ id: 'BTC', name: 'Bitcoin', minDeposit: 0.0001, minWithdraw: 0.0005, withdrawFee: 0.0002, confirmations: 2, estimatedTime: '~20 min' }],
  ETH: [{ id: 'ERC20', name: 'Ethereum (ERC20)', minDeposit: 0.001, minWithdraw: 0.005, withdrawFee: 0.003, confirmations: 12, estimatedTime: '~5 min' }],
  BNB: [{ id: 'BEP20', name: 'BNB Smart Chain (BEP20)', minDeposit: 0.01, minWithdraw: 0.05, withdrawFee: 0.0005, confirmations: 15, estimatedTime: '~3 min' }],
  USDT: [
    { id: 'ERC20', name: 'Ethereum (ERC20)', minDeposit: 10, minWithdraw: 50, withdrawFee: 25, confirmations: 12, estimatedTime: '~5 min' },
    { id: 'TRC20', name: 'Tron (TRC20)', minDeposit: 1, minWithdraw: 10, withdrawFee: 1, confirmations: 19, estimatedTime: '~2 min' },
    { id: 'BEP20', name: 'BNB Smart Chain (BEP20)', minDeposit: 1, minWithdraw: 10, withdrawFee: 0.8, confirmations: 15, estimatedTime: '~3 min' },
  ],
  SOL: [{ id: 'SOL', name: 'Solana', minDeposit: 0.01, minWithdraw: 0.05, withdrawFee: 0.01, confirmations: 1, estimatedTime: '~1 min' }],
  XRP: [{ id: 'XRP', name: 'Ripple', minDeposit: 1, minWithdraw: 20, withdrawFee: 0.25, confirmations: 1, estimatedTime: '~1 min' }],
  TRX: [{ id: 'TRC20', name: 'Tron (TRC20)', minDeposit: 1, minWithdraw: 10, withdrawFee: 1, confirmations: 19, estimatedTime: '~2 min' }],
};

export function generateDepositAddress(coinSymbol: string, network: string, userId: string): string {
  const prefixes: Record<string, string> = {
    BTC: '1', ERC20: '0x', BEP20: '0x', TRC20: 'T', SOL: '', XRP: 'r', ADA: 'addr1', DOGE: 'D',
  };
  const lengths: Record<string, number> = {
    BTC: 34, ERC20: 42, BEP20: 42, TRC20: 34, SOL: 44, XRP: 34, ADA: 58, DOGE: 34,
  };

  const prefix = prefixes[network] || '0x';
  const targetLength = lengths[network] || 42;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  const seed = userId + coinSymbol + network;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }

  let address = prefix;
  const remaining = targetLength - prefix.length;
  for (let i = 0; i < remaining; i++) {
    const index = Math.abs((hash + i) * 9301 + 49297) % chars.length;
    address += chars[index];
  }
  return address;
}
