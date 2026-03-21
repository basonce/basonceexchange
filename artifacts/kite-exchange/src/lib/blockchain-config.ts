export const BLOCKCHAIN_NETWORKS = {
  bsc_testnet: {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    requiredConfirmations: 15
  },
  polygon_mumbai: {
    name: 'Polygon Mumbai',
    chainId: 80001,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    requiredConfirmations: 128
  },
  bsc: {
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    requiredConfirmations: 15
  },
  polygon: {
    name: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    requiredConfirmations: 128
  }
} as const;

export const SUPPORTED_TOKENS = {
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    addresses: {
      bsc_testnet: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      polygon_mumbai: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832',
      bsc: '0x55d398326f99059fF775485246999027B3197955',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    }
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    addresses: {
      bsc_testnet: '0x6ce8dA28E2f864420840cF74474eFf5fD80E65B8',
      polygon_mumbai: '0x0d787a4a1548f673ed375445535a6c7A1EE56180',
      bsc: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      polygon: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'
    }
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    addresses: {
      bsc_testnet: '0x8BaBbB98678facC7342735486C851ABD7A0d17Ca',
      polygon_mumbai: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      bsc: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    }
  }
} as const;

export type NetworkKey = keyof typeof BLOCKCHAIN_NETWORKS;
export type TokenSymbol = keyof typeof SUPPORTED_TOKENS;

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint amount)'
];

export const MIN_DEPOSIT_AMOUNTS = {
  BNB: 0.01,
  MATIC: 1,
  USDT: 10,
  BTC: 0.001,
  ETH: 0.01
} as const;

export const WITHDRAWAL_FEES = {
  BNB: 0.001,
  MATIC: 0.1,
  USDT: 1,
  BTC: 0.0001,
  ETH: 0.001
} as const;

export const DEFAULT_NETWORK: NetworkKey = 'bsc';

export const NETWORK_GROUPS = {
  mainnet: ['bsc', 'polygon'],
  testnet: ['bsc_testnet', 'polygon_mumbai']
} as const;

export const isMainnet = (network: NetworkKey): boolean => {
  return NETWORK_GROUPS.mainnet.includes(network as any);
};

export const getNetworkDisplayInfo = (network: NetworkKey) => {
  const config = BLOCKCHAIN_NETWORKS[network];
  return {
    name: config.name,
    isMainnet: isMainnet(network),
    badge: isMainnet(network) ? 'MAINNET' : 'TESTNET',
    badgeColor: isMainnet(network) ? 'text-green-400' : 'text-yellow-400',
    nativeCurrency: config.nativeCurrency.symbol
  };
};
