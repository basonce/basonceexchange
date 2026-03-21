import { useState, useEffect } from 'react';
import { ExternalLink, Globe, FileText, Search } from 'lucide-react';
import CoinLogo from './CoinLogo';

interface CoinInfoTabProps {
  symbol: string;
  coinName: string;
  logo?: string;
  currentPrice: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  volumeBase: number;
  change24h: number;
}

interface CoinMeta {
  marketCap: number;
  fullyDilutedMarketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  allTimeHigh: number;
  allTimeHighDate: string;
  allTimeLow: number;
  allTimeLowDate: string;
  marketDominance: number;
  rank: number;
  platformConcentration: number;
  description: string;
  websiteUrl: string;
  whitepaperUrl: string;
  blockExplorerUrl: string;
  coinInfoSub: string;
}

const COIN_METADATA: Record<string, Partial<CoinMeta>> = {
  BTC: {
    rank: 1, marketDominance: 54.2, circulatingSupply: 19700000, totalSupply: 21000000, maxSupply: 21000000,
    description: 'Bitcoin is a decentralized digital currency created in 2009 by Satoshi Nakamoto. It enables peer-to-peer transactions without the need for a central authority.',
    websiteUrl: 'https://bitcoin.org', whitepaperUrl: 'https://bitcoin.org/bitcoin.pdf', blockExplorerUrl: 'explorer.bitcoin.org', coinInfoSub: 'Proof of Work · Layer 1',
    platformConcentration: 21.45
  },
  ETH: {
    rank: 2, marketDominance: 17.3, circulatingSupply: 120400000, totalSupply: 120400000, maxSupply: null,
    description: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality. It is the community-run technology powering the ether (ETH) digital currency and thousands of decentralized applications.',
    websiteUrl: 'https://ethereum.org', whitepaperUrl: 'https://ethereum.org/whitepaper', blockExplorerUrl: 'etherscan.io', coinInfoSub: 'Smart Contracts · Layer 1',
    platformConcentration: 18.72
  },
  BNB: {
    rank: 4, marketDominance: 3.1, circulatingSupply: 140000000, totalSupply: 140000000, maxSupply: 200000000,
    description: 'BNB is the native cryptocurrency of the BNB Chain ecosystem. Originally created as a utility token for the Binance exchange, BNB has evolved into an ecosystem token.',
    websiteUrl: 'https://bnbchain.org', whitepaperUrl: 'https://github.com/bnb-chain/whitepaper', blockExplorerUrl: 'bscscan.com', coinInfoSub: 'BNB Chain · Layer 1',
    platformConcentration: 24.33
  },
  SOL: {
    rank: 5, marketDominance: 3.4, circulatingSupply: 460000000, totalSupply: 580000000, maxSupply: null,
    description: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale today. It processes thousands of transactions per second.',
    websiteUrl: 'https://solana.com', whitepaperUrl: 'https://solana.com/solana-whitepaper.pdf', blockExplorerUrl: 'explorer.solana.com', coinInfoSub: 'Proof of History · Layer 1',
    platformConcentration: 15.67
  },
  XRP: {
    rank: 3, marketDominance: 4.8, circulatingSupply: 56500000000, totalSupply: 99989000000, maxSupply: 100000000000,
    description: 'XRP is the native digital asset on the XRP Ledger (XRPL), an open-source, permissionless and decentralized blockchain technology.',
    websiteUrl: 'https://ripple.com', whitepaperUrl: 'https://ripple.com/files/ripple_consensus_whitepaper.pdf', blockExplorerUrl: 'xrpscan.com', coinInfoSub: 'Payments · Layer 1',
    platformConcentration: 32.18
  },
  DOGE: {
    rank: 9, marketDominance: 1.1, circulatingSupply: 143000000000, totalSupply: 143000000000, maxSupply: null,
    description: 'Dogecoin is a cryptocurrency featuring a likeness of the Shiba Inu dog from the "Doge" internet meme as its logo. It was created as a fun, lighthearted alternative to Bitcoin.',
    websiteUrl: 'https://dogecoin.com', whitepaperUrl: 'https://github.com/dogecoin/dogecoin/blob/master/README.md', blockExplorerUrl: 'dogechain.info', coinInfoSub: 'Meme · Layer 1',
    platformConcentration: 28.94
  },
  ADA: {
    rank: 10, marketDominance: 0.8, circulatingSupply: 35200000000, totalSupply: 45000000000, maxSupply: 45000000000,
    description: 'Cardano is a proof-of-stake blockchain platform, developed by IOHK. It was the first blockchain platform to be founded on peer-reviewed research and scientific philosophy.',
    websiteUrl: 'https://cardano.org', whitepaperUrl: 'https://whitepaper.io/coin/cardano', blockExplorerUrl: 'cardanoscan.io', coinInfoSub: 'Proof of Stake · Layer 1',
    platformConcentration: 19.55
  },
  AVAX: {
    rank: 12, marketDominance: 0.7, circulatingSupply: 404000000, totalSupply: 437000000, maxSupply: 720000000,
    description: 'Avalanche is a layer one blockchain that functions as a platform for decentralized applications and custom blockchain networks. It is fast, low cost, and eco-friendly.',
    websiteUrl: 'https://avax.network', whitepaperUrl: 'https://www.avalabs.org/whitepapers', blockExplorerUrl: 'snowtrace.io', coinInfoSub: 'Smart Contracts · Layer 1',
    platformConcentration: 22.11
  },
  DOT: {
    rank: 16, marketDominance: 0.4, circulatingSupply: 1430000000, totalSupply: 1390000000, maxSupply: null,
    description: 'Polkadot is a protocol that connects blockchains, allowing value and data to be sent across previously incompatible networks. It is designed to be fast and scalable.',
    websiteUrl: 'https://polkadot.network', whitepaperUrl: 'https://polkadot.network/PolkaDotPaper.pdf', blockExplorerUrl: 'polkascan.io', coinInfoSub: 'Layer 0 · Interoperability',
    platformConcentration: 17.88
  },
  LINK: {
    rank: 14, marketDominance: 0.5, circulatingSupply: 587000000, totalSupply: 1000000000, maxSupply: 1000000000,
    description: 'Chainlink is a decentralized blockchain oracle network built on Ethereum. It connects real-world data to smart contracts and is the market-leading oracle network.',
    websiteUrl: 'https://chain.link', whitepaperUrl: 'https://research.chain.link/whitepaper-v2.pdf', blockExplorerUrl: 'etherscan.io', coinInfoSub: 'Oracle · Layer 2',
    platformConcentration: 25.43
  },
  MATIC: {
    rank: 20, marketDominance: 0.3, circulatingSupply: 9900000000, totalSupply: 10000000000, maxSupply: 10000000000,
    description: 'Polygon (formerly MATIC) is an Ethereum scaling solution. It provides a framework for building interconnected blockchain networks and aims to bring mass adoption to Ethereum.',
    websiteUrl: 'https://polygon.technology', whitepaperUrl: 'https://polygon.technology/papers', blockExplorerUrl: 'polygonscan.com', coinInfoSub: 'Ethereum Scaling · Layer 2',
    platformConcentration: 20.77
  },
  UNI: {
    rank: 21, marketDominance: 0.3, circulatingSupply: 600000000, totalSupply: 1000000000, maxSupply: 1000000000,
    description: 'Uniswap is a leading decentralized crypto exchange that runs on the Ethereum blockchain. It uses an automated market maker (AMM) system.',
    websiteUrl: 'https://uniswap.org', whitepaperUrl: 'https://uniswap.org/whitepaper-v3.pdf', blockExplorerUrl: 'etherscan.io', coinInfoSub: 'DEX · DeFi',
    platformConcentration: 14.92
  },
  LTC: {
    rank: 15, marketDominance: 0.4, circulatingSupply: 74800000, totalSupply: 84000000, maxSupply: 84000000,
    description: 'Litecoin is a peer-to-peer Internet currency that enables instant, near-zero cost payments to anyone in the world. It was created as a lighter version of Bitcoin.',
    websiteUrl: 'https://litecoin.org', whitepaperUrl: 'https://litecoin.org/litecoin.pdf', blockExplorerUrl: 'blockchair.com/litecoin', coinInfoSub: 'Payments · Layer 1',
    platformConcentration: 23.66
  },
  ATOM: {
    rank: 23, marketDominance: 0.2, circulatingSupply: 390000000, totalSupply: 390000000, maxSupply: null,
    description: 'Cosmos is a decentralized network of independent parallel blockchains. Each blockchain is powered by Byzantine Fault Tolerant consensus algorithms like Tendermint.',
    websiteUrl: 'https://cosmos.network', whitepaperUrl: 'https://cosmos.network/cosmos-whitepaper.pdf', blockExplorerUrl: 'mintscan.io', coinInfoSub: 'Interoperability · Layer 0',
    platformConcentration: 18.34
  },
  FIL: {
    rank: 27, marketDominance: 0.2, circulatingSupply: 590000000, totalSupply: 2000000000, maxSupply: null,
    description: 'Filecoin is a decentralized storage network designed to store humanity\'s most important information. It aims to create a robust foundation for humanity\'s information.',
    websiteUrl: 'https://filecoin.io', whitepaperUrl: 'https://filecoin.io/filecoin.pdf', blockExplorerUrl: 'filfox.info', coinInfoSub: 'Storage · Web3',
    platformConcentration: 21.09
  },
  TRX: {
    rank: 11, marketDominance: 0.7, circulatingSupply: 87000000000, totalSupply: 87000000000, maxSupply: null,
    description: 'TRON is a blockchain-based decentralized platform that aims to build a free, global digital content entertainment system with distributed storage technology.',
    websiteUrl: 'https://tron.network', whitepaperUrl: 'https://tron.network/static/doc/white_paper_v_2_0.pdf', blockExplorerUrl: 'tronscan.org', coinInfoSub: 'DApp Platform · Layer 1',
    platformConcentration: 27.83
  },
  NEAR: {
    rank: 22, marketDominance: 0.2, circulatingSupply: 1080000000, totalSupply: 1080000000, maxSupply: null,
    description: 'NEAR Protocol is a layer-1 blockchain designed as a community-run cloud computing platform to eliminate flaws of competing systems like low transaction speeds and poor interoperability.',
    websiteUrl: 'https://near.org', whitepaperUrl: 'https://near.org/papers/the-official-near-white-paper/', blockExplorerUrl: 'nearblocks.io', coinInfoSub: 'Smart Contracts · Layer 1',
    platformConcentration: 16.45
  },
  EQ: {
    rank: 999, marketDominance: 0.0001, circulatingSupply: 50000000, totalSupply: 200000000, maxSupply: 200000000,
    description: 'EarnQuest (EQ) is the native token of the EarnQuest ecosystem — a next-generation crypto earning platform combining trading, mining, and DeFi rewards.',
    websiteUrl: 'https://earnquest.io', whitepaperUrl: 'https://earnquest.io/whitepaper', blockExplorerUrl: 'bscscan.com', coinInfoSub: 'Utility · BEP-20',
    platformConcentration: 45.22
  },
  PAYAI: {
    rank: 850, marketDominance: 0.0002, circulatingSupply: 100000000, totalSupply: 500000000, maxSupply: 1000000000,
    description: 'PayAI is a decentralized AI-powered payment protocol enabling frictionless cross-border transactions with intelligent routing and automated compliance.',
    websiteUrl: 'https://payai.network', whitepaperUrl: 'https://payai.network/whitepaper.pdf', blockExplorerUrl: 'solscan.io', coinInfoSub: 'AI · Payments',
    platformConcentration: 38.77
  },
  SGP: {
    rank: 760, marketDominance: 0.0003, circulatingSupply: 250000000, totalSupply: 1000000000, maxSupply: 1000000000,
    description: 'SagaPop (SGP) is a decentralized cultural token powering the SagaPop ecosystem — a platform for digital collectibles, NFTs, and creator economies.',
    websiteUrl: 'https://sagapop.io', whitepaperUrl: 'https://sagapop.io/whitepaper', blockExplorerUrl: 'etherscan.io', coinInfoSub: 'NFT · Culture',
    platformConcentration: 41.55
  },
  POWERAI: {
    rank: 890, marketDominance: 0.0001, circulatingSupply: 80000000, totalSupply: 400000000, maxSupply: 400000000,
    description: 'PowerAI is an artificial intelligence infrastructure token providing decentralized GPU computing power for AI model training and inference tasks.',
    websiteUrl: 'https://powerai.io', whitepaperUrl: 'https://powerai.io/whitepaper.pdf', blockExplorerUrl: 'etherscan.io', coinInfoSub: 'AI · Infrastructure',
    platformConcentration: 52.14
  },
  SZNP: {
    rank: 920, marketDominance: 0.00005, circulatingSupply: 150000000, totalSupply: 600000000, maxSupply: 600000000,
    description: 'SZNP is a season-based utility token that powers a decentralized rewards ecosystem, enabling holders to earn from seasonal crypto campaigns and yield strategies.',
    websiteUrl: 'https://sznp.io', whitepaperUrl: 'https://sznp.io/whitepaper', blockExplorerUrl: 'bscscan.com', coinInfoSub: 'Utility · Yield',
    platformConcentration: 43.88
  },
  PUNCH: {
    rank: 940, marketDominance: 0.00003, circulatingSupply: 200000000, totalSupply: 800000000, maxSupply: 800000000,
    description: 'PUNCH is a GameFi token powering a decentralized combat gaming ecosystem with play-to-earn mechanics, tournament rewards, and in-game asset ownership.',
    websiteUrl: 'https://punch.game', whitepaperUrl: 'https://punch.game/whitepaper.pdf', blockExplorerUrl: 'bscscan.com', coinInfoSub: 'GameFi · P2E',
    platformConcentration: 47.31
  },
};

function getMetaForSymbol(symbol: string, price: number, high24h: number, low24h: number, volume24h: number): CoinMeta {
  const stored = COIN_METADATA[symbol] || {};
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudo = (n: number) => {
    const x = Math.sin(seed * 9.1 + n * 3.7) * 10000;
    return Math.abs(x - Math.floor(x));
  };

  const marketCap = stored.circulatingSupply
    ? stored.circulatingSupply * price
    : price * (1000000 + pseudo(1) * 900000000);

  const totalSupply = stored.totalSupply || (stored.circulatingSupply ? stored.circulatingSupply * (1.2 + pseudo(2) * 1.5) : marketCap / price * 1.5);
  const maxSupply = stored.maxSupply !== undefined ? stored.maxSupply : (pseudo(3) > 0.5 ? null : totalSupply * (1 + pseudo(4)));
  const fullyDilutedMarketCap = maxSupply ? maxSupply * price : totalSupply * price;
  const circulatingSupply = stored.circulatingSupply || totalSupply * (0.5 + pseudo(5) * 0.4);

  const athMultiplier = 1.5 + pseudo(6) * 4;
  const atlMultiplier = 0.1 + pseudo(7) * 0.5;
  const athPrice = high24h * athMultiplier;
  const atlPrice = low24h * atlMultiplier;

  const athDaysAgo = Math.floor(7 + pseudo(8) * 180);
  const atlDaysAgo = Math.floor(30 + pseudo(9) * 400);
  const now = new Date();
  const athDate = new Date(now.getTime() - athDaysAgo * 86400000);
  const atlDate = new Date(now.getTime() - atlDaysAgo * 86400000);

  return {
    marketCap,
    fullyDilutedMarketCap,
    circulatingSupply,
    totalSupply,
    maxSupply,
    allTimeHigh: athPrice,
    allTimeHighDate: athDate.toISOString().split('T')[0],
    allTimeLow: atlPrice,
    allTimeLowDate: atlDate.toISOString().split('T')[0],
    marketDominance: stored.marketDominance ?? (pseudo(10) * 0.5),
    rank: stored.rank ?? Math.floor(10 + pseudo(11) * 990),
    platformConcentration: stored.platformConcentration ?? (10 + pseudo(12) * 40),
    description: stored.description ?? `${symbol} is a digital asset on the blockchain network.`,
    websiteUrl: stored.websiteUrl ?? `https://${symbol.toLowerCase()}.io`,
    whitepaperUrl: stored.whitepaperUrl ?? `https://${symbol.toLowerCase()}.io/whitepaper`,
    blockExplorerUrl: stored.blockExplorerUrl ?? `explorer.${symbol.toLowerCase()}.io`,
    coinInfoSub: stored.coinInfoSub ?? 'Blockchain · Crypto',
  };
}

function formatLarge(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatSupply(n: number, symbol: string): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T ${symbol}`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B ${symbol}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M ${symbol}`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K ${symbol}`;
  return `${n.toFixed(0)} ${symbol}`;
}

function formatPriceInfo(n: number): string {
  if (n === 0) return '0';
  if (n < 0.000001) return n.toFixed(12);
  if (n < 0.0001) return n.toFixed(10);
  if (n < 0.01) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  if (n < 100) return n.toFixed(4);
  if (n < 10000) return n.toFixed(2);
  return n.toFixed(0);
}

export default function CoinInfoTab({ symbol, coinName, logo, currentPrice, high24h, low24h, volume24h, change24h }: CoinInfoTabProps) {
  const [subTab, setSubTab] = useState<'coin-info' | 'trading-params'>('coin-info');
  const [expanded, setExpanded] = useState(false);

  const meta = getMetaForSymbol(symbol, currentPrice, high24h, low24h, volume24h);
  const volMarketCapRatio = meta.marketCap > 0 ? (volume24h / meta.marketCap) * 100 : 0;

  const rows: Array<{ label: string; left: string; leftSub?: string; right?: string; rightSub?: string; fullWidth?: boolean }> = [
    {
      label: 'Market Cap',
      left: formatLarge(meta.marketCap),
      right: 'Fully Diluted Market Cap',
    },
    {
      label: '',
      left: '',
      right: formatLarge(meta.fullyDilutedMarketCap),
    },
    {
      label: 'Market Dominance',
      left: `${meta.marketDominance.toFixed(4)}%`,
      right: 'Volume',
    },
    {
      label: '',
      left: '',
      right: formatLarge(volume24h),
    },
    {
      label: 'Vol/Market Cap',
      left: `${volMarketCapRatio.toFixed(2)}%`,
      right: 'Circulation Supply',
    },
    {
      label: '',
      left: '',
      right: formatSupply(meta.circulatingSupply, symbol),
    },
    {
      label: 'Max Supply',
      left: meta.maxSupply !== null ? `${formatSupply(meta.maxSupply, symbol).replace(' ' + symbol, '')} ${symbol}` : `∞ ${symbol}`,
      right: 'Total Supply',
    },
    {
      label: '',
      left: '',
      right: formatSupply(meta.totalSupply, symbol),
    },
    {
      label: 'Platform Concentration',
      left: meta.platformConcentration.toFixed(2),
      fullWidth: true,
    },
  ];

  return (
    <div className="pb-24">
      <div className="px-4 py-3 bg-[#1E2329] border-b border-[#2B3139]">
        <div className="flex gap-1">
          <button
            onClick={() => setSubTab('coin-info')}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${subTab === 'coin-info' ? 'bg-[#2B3139] text-white' : 'text-[#848E9C]'}`}
          >
            Coin Info
          </button>
          <button
            onClick={() => setSubTab('trading-params')}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${subTab === 'trading-params' ? 'bg-[#2B3139] text-white' : 'text-[#848E9C]'}`}
          >
            Trading Parameters
          </button>
        </div>
      </div>

      {subTab === 'coin-info' && (
        <div className="px-4 py-4">
          <p className="text-[12px] text-[#848E9C] leading-relaxed mb-3">
            This information is presented on an "as is" basis and does not serve as any form of representation or guarantee by Basonce.{' '}
            <span className="text-[#F0B90B]">Risk Warning</span>
          </p>

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <CoinLogo symbol={symbol} dbUrl={logo} size={40} />
              </div>
              <div>
                <div className="font-bold text-[18px] text-white">{coinName || symbol}</div>
                <div className="text-[12px] text-[#848E9C]">{(COIN_METADATA[symbol] || {}).coinInfoSub || 'Blockchain · Crypto'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[12px] text-[#848E9C]">Rank</div>
              <div className="font-bold text-white">NO.{meta.rank}</div>
            </div>
          </div>

          <div className="space-y-0">
            <div className="grid grid-cols-2 py-3 border-b border-[#2B3139]">
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Market Cap</div>
                <div className="font-bold text-white text-[15px]">{formatLarge(meta.marketCap)}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Fully Diluted Market Cap</div>
                <div className="font-bold text-white text-[15px]">{formatLarge(meta.fullyDilutedMarketCap)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 py-3 border-b border-[#2B3139]">
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Market Dominance</div>
                <div className="font-bold text-white text-[15px]">{meta.marketDominance.toFixed(4)}%</div>
              </div>
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Volume</div>
                <div className="font-bold text-white text-[15px]">{formatLarge(volume24h)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 py-3 border-b border-[#2B3139]">
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Vol/Market Cap</div>
                <div className="font-bold text-white text-[15px]">{volMarketCapRatio.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Circulation Supply</div>
                <div className="font-bold text-white text-[15px]">{formatSupply(meta.circulatingSupply, symbol)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 py-3 border-b border-[#2B3139]">
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Max Supply</div>
                <div className="font-bold text-white text-[15px]">
                  {meta.maxSupply !== null ? formatSupply(meta.maxSupply, symbol) : `∞ ${symbol}`}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">Total Supply</div>
                <div className="font-bold text-white text-[15px]">{formatSupply(meta.totalSupply, symbol)}</div>
              </div>
            </div>

            <div className="py-3 border-b border-[#2B3139]">
              <div className="text-[12px] text-[#848E9C] mb-1">Platform Concentration</div>
              <div className="font-bold text-white text-[15px]">{meta.platformConcentration.toFixed(2)}</div>
            </div>

            <div className="grid grid-cols-2 py-3 border-b border-[#2B3139]">
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">All Time High</div>
                <div className="font-bold text-white text-[14px]">{formatPriceInfo(meta.allTimeHigh)} $</div>
                <div className="text-[11px] text-[#848E9C]">{meta.allTimeHighDate}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#848E9C] mb-1">All Time Low</div>
                <div className="font-bold text-white text-[14px]">{formatPriceInfo(meta.allTimeLow)} $</div>
                <div className="text-[11px] text-[#848E9C]">{meta.allTimeLowDate}</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="font-bold text-[17px] text-white mb-4">Links</div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#848E9C]">Official Website</span>
                <div className="flex items-center gap-2">
                  <a
                    href={meta.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-[#2B3139] rounded-full px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3C4149] transition-colors"
                  >
                    <Globe className="w-3 h-3" />
                    Official Website
                  </a>
                  <a
                    href={meta.whitepaperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-[#2B3139] rounded-full px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3C4149] transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    Whitepaper
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#848E9C]">Block Explorer</span>
                <div className="flex items-center gap-1.5 bg-[#2B3139] rounded-lg px-3 py-2 text-[12px] text-white max-w-[220px]">
                  <Search className="w-3 h-3 text-[#848E9C] flex-shrink-0" />
                  <span className="truncate">{meta.blockExplorerUrl}</span>
                  <ExternalLink className="w-3 h-3 text-[#848E9C] flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {meta.description && (
            <div className="mt-6">
              <div className="font-bold text-[17px] text-white mb-3">About {coinName || symbol}</div>
              <div className="relative">
                <p className={`text-[13px] text-[#848E9C] leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
                  {meta.description}
                </p>
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-[#F0B90B] text-[12px] font-medium mt-1"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'trading-params' && (
        <div className="px-4 py-4">
          <div className="space-y-0">
            {[
              { label: 'Spot Trading', value: 'Enabled', positive: true },
              { label: 'Margin Trading', value: 'Enabled', positive: true },
              { label: 'Isolated Margin', value: 'Enabled', positive: true },
              { label: 'Cross Margin', value: 'Enabled', positive: true },
              { label: 'Maker Fee', value: '0.1%', positive: null },
              { label: 'Taker Fee', value: '0.1%', positive: null },
              { label: 'Min Order Size', value: `1 ${symbol}`, positive: null },
              { label: 'Max Order Size', value: `9,000,000 ${symbol}`, positive: null },
              { label: 'Price Precision', value: '8 decimal places', positive: null },
              { label: 'Quantity Precision', value: '2 decimal places', positive: null },
              { label: 'Limit Order', value: 'Supported', positive: true },
              { label: 'Market Order', value: 'Supported', positive: true },
              { label: 'Stop-Limit Order', value: 'Supported', positive: true },
              { label: 'OCO Order', value: 'Supported', positive: true },
            ].map(({ label, value, positive }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-[#2B3139]">
                <span className="text-[13px] text-[#848E9C]">{label}</span>
                <span className={`text-[13px] font-medium ${positive === true ? 'text-[#0ECB81]' : positive === false ? 'text-[#F6465D]' : 'text-white'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
