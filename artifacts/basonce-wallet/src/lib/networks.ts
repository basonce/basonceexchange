// Network configs (fees / minimums) used by the withdrawal flow.
// Deposit addresses are NEVER generated client-side — they come from the
// NOWPayments-backed /api/nowpay/deposit-address endpoint (see lib/wallet.ts).

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
