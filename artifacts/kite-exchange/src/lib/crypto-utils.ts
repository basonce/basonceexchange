export interface Network {
  id: string;
  name: string;
  minDeposit: number;
  minWithdraw: number;
  withdrawFee: number;
  confirmations: number;
  estimatedTime: string;
}

export interface CoinNetworks {
  [key: string]: Network[];
}

export const CRYPTO_NETWORKS: CoinNetworks = {
  BTC: [
    {
      id: 'BTC',
      name: 'Bitcoin',
      minDeposit: 0.0001,
      minWithdraw: 0.0005,
      withdrawFee: 0.0002,
      confirmations: 2,
      estimatedTime: '~20 min'
    }
  ],
  ETH: [
    {
      id: 'ERC20',
      name: 'Ethereum (ERC20)',
      minDeposit: 0.001,
      minWithdraw: 0.005,
      withdrawFee: 0.003,
      confirmations: 12,
      estimatedTime: '~5 min'
    }
  ],
  BNB: [
    {
      id: 'BEP20',
      name: 'BNB Smart Chain (BEP20)',
      minDeposit: 0.01,
      minWithdraw: 0.05,
      withdrawFee: 0.0005,
      confirmations: 15,
      estimatedTime: '~3 min'
    }
  ],
  USDT: [
    {
      id: 'ERC20',
      name: 'Ethereum (ERC20)',
      minDeposit: 10,
      minWithdraw: 50,
      withdrawFee: 25,
      confirmations: 12,
      estimatedTime: '~5 min'
    },
    {
      id: 'TRC20',
      name: 'Tron (TRC20)',
      minDeposit: 1,
      minWithdraw: 10,
      withdrawFee: 1,
      confirmations: 19,
      estimatedTime: '~2 min'
    },
    {
      id: 'BEP20',
      name: 'BNB Smart Chain (BEP20)',
      minDeposit: 1,
      minWithdraw: 10,
      withdrawFee: 0.8,
      confirmations: 15,
      estimatedTime: '~3 min'
    }
  ],
  SOL: [
    {
      id: 'SOL',
      name: 'Solana',
      minDeposit: 0.01,
      minWithdraw: 0.05,
      withdrawFee: 0.01,
      confirmations: 1,
      estimatedTime: '~1 min'
    }
  ],
  XRP: [
    {
      id: 'XRP',
      name: 'Ripple',
      minDeposit: 1,
      minWithdraw: 20,
      withdrawFee: 0.25,
      confirmations: 1,
      estimatedTime: '~1 min'
    }
  ],
  ADA: [
    {
      id: 'ADA',
      name: 'Cardano',
      minDeposit: 1,
      minWithdraw: 10,
      withdrawFee: 1,
      confirmations: 15,
      estimatedTime: '~5 min'
    }
  ],
  DOGE: [
    {
      id: 'DOGE',
      name: 'Dogecoin',
      minDeposit: 10,
      minWithdraw: 50,
      withdrawFee: 5,
      confirmations: 20,
      estimatedTime: '~10 min'
    }
  ],
  TRX: [
    {
      id: 'TRC20',
      name: 'Tron (TRC20)',
      minDeposit: 1,
      minWithdraw: 10,
      withdrawFee: 1,
      confirmations: 19,
      estimatedTime: '~2 min'
    }
  ]
};

export function generateDepositAddress(coinSymbol: string, network: string, userId: string): string {
  const prefixes: { [key: string]: string } = {
    BTC: '1',
    ERC20: '0x',
    BEP20: '0x',
    TRC20: 'T',
    SOL: '',
    XRP: 'r',
    ADA: 'addr1',
    DOGE: 'D'
  };

  const lengths: { [key: string]: number } = {
    BTC: 34,
    ERC20: 42,
    BEP20: 42,
    TRC20: 34,
    SOL: 44,
    XRP: 34,
    ADA: 58,
    DOGE: 34
  };

  const prefix = prefixes[network] || '0x';
  const targetLength = lengths[network] || 42;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  let seed = userId + coinSymbol + network;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }

  let address = prefix;
  const remainingLength = targetLength - prefix.length;

  for (let i = 0; i < remainingLength; i++) {
    const index = Math.abs((hash + i) * 9301 + 49297) % chars.length;
    address += chars[index];
  }

  return address;
}

export function generateQRCodeUrl(address: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
}

export function formatCryptoAmount(amount: number, decimals: number = 8): string {
  return amount.toFixed(decimals);
}

export function validateAddress(address: string, network: string): boolean {
  const patterns: { [key: string]: RegExp } = {
    BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    ERC20: /^0x[a-fA-F0-9]{40}$/,
    BEP20: /^0x[a-fA-F0-9]{40}$/,
    TRC20: /^T[a-zA-Z0-9]{33}$/,
    SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    XRP: /^r[0-9a-zA-Z]{24,34}$/,
    ADA: /^addr1[a-z0-9]{58}$/,
    DOGE: /^D[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/
  };

  const pattern = patterns[network];
  return pattern ? pattern.test(address) : address.length > 20;
}
