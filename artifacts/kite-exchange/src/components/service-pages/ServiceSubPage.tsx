import { ArrowLeft, ChevronRight, CheckCircle, Zap, TrendingUp, BarChart2, Users, Shield, Gift, Star, Globe, BookOpen, AlertTriangle, HelpCircle, ArrowLeftRight, CreditCard, FileText, Wallet, Coins, Percent, Activity, MessageSquare, Layers, Tag, Award, Target, RefreshCw, Gem, Cpu, Trophy, Heart, Package, PiggyBank, Download } from 'lucide-react';

interface ServiceSubPageProps {
  serviceKey: string;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onOpenReferral?: () => void;
  onOpenEarn?: () => void;
  onOpenP2P?: () => void;
  onOpenPay?: () => void;
  onOpenSupport?: () => void;
  onNavigate?: (tab: string) => void;
}

const PAGES: Record<string, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  hero: { bg: string; text: string; sub: string };
  sections: { title?: string; items: { label: string; value?: string; sub?: string; badge?: string; type?: 'stat' | 'action' | 'info' | 'link' }[] }[];
  actionLabel?: string;
  actionKey?: string;
}> = {
  transfer: {
    title: 'Transfer',
    icon: ArrowLeftRight,
    hero: { bg: 'from-blue-900/40 to-[#0B0E11]', text: 'Transfer Assets', sub: 'Move funds between your Basonce accounts instantly' },
    sections: [
      { title: 'Transfer Between', items: [
        { label: 'Spot → Futures', sub: 'Transfer to Futures wallet', type: 'action', badge: 'Instant' },
        { label: 'Futures → Spot', sub: 'Transfer to Spot wallet', type: 'action', badge: 'Instant' },
        { label: 'Spot → Earn', sub: 'Transfer to Earn wallet', type: 'action' },
        { label: 'Mining → Spot', sub: 'Collect mining earnings', type: 'action', badge: 'Available' },
      ]},
      { title: 'Your Balances', items: [
        { label: 'Spot Wallet', value: '$0.00', type: 'stat' },
        { label: 'Futures Wallet', value: '$0.00', type: 'stat' },
        { label: 'Mining Balance', value: '0.00 EQ', type: 'stat' },
      ]},
    ],
    actionLabel: 'Open Transfer',
    actionKey: 'transfer-action',
  },
  'buy-crypto': {
    title: 'Buy Crypto',
    icon: Coins,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/20 to-[#0B0E11]', text: 'Buy Crypto Easily', sub: 'Purchase crypto with your local currency' },
    sections: [
      { title: 'Popular Coins', items: [
        { label: 'Bitcoin (BTC)', value: '$94,200', sub: '+2.4%', type: 'link', badge: 'Popular' },
        { label: 'Ethereum (ETH)', value: '$3,450', sub: '+1.8%', type: 'link' },
        { label: 'USDT', value: '$1.00', sub: 'Stable', type: 'link', badge: 'Recommended' },
        { label: 'BNB', value: '$620', sub: '+3.1%', type: 'link' },
        { label: 'SOL', value: '$185', sub: '+5.2%', type: 'link' },
      ]},
      { title: 'Payment Methods', items: [
        { label: 'Credit / Debit Card', sub: 'Visa, Mastercard', type: 'info', badge: 'Fast' },
        { label: 'Bank Transfer', sub: '1-3 business days', type: 'info' },
        { label: 'P2P Trading', sub: 'Buy from other users', type: 'info' },
      ]},
    ],
    actionLabel: 'Buy Now',
    actionKey: 'buy-crypto-action',
  },
  wallet: {
    title: 'Basonce Wallet',
    icon: Wallet,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'Basonce Wallet', sub: 'Your multi-chain crypto wallet' },
    sections: [
      { title: 'Supported Networks', items: [
        { label: 'BEP-20 (BSC)', sub: 'Binance Smart Chain', type: 'info', badge: 'Active' },
        { label: 'TRC-20 (TRON)', sub: 'TRON Network', type: 'info', badge: 'Active' },
        { label: 'ERC-20 (Ethereum)', sub: 'Ethereum Network', type: 'info' },
        { label: 'Solana (SOL)', sub: 'Solana Network', type: 'info' },
      ]},
      { title: 'Features', items: [
        { label: 'Send & Receive', sub: 'Transfer crypto anywhere', type: 'info', badge: 'Free' },
        { label: 'Auto Deposit Detection', sub: 'Deposits detected instantly', type: 'info' },
        { label: 'Multi-currency Support', sub: '200+ coins supported', type: 'info' },
      ]},
    ],
    actionLabel: 'Open Wallet',
    actionKey: 'wallet-action',
  },
  statement: {
    title: 'Account Statement',
    icon: FileText,
    hero: { bg: 'from-gray-800/40 to-[#0B0E11]', text: 'Account Statement', sub: 'View and export your complete transaction history' },
    sections: [
      { title: 'Statement Types', items: [
        { label: 'Spot Trading History', sub: 'All buy/sell transactions', type: 'action', badge: 'PDF' },
        { label: 'Futures PnL Report', sub: 'Profit/loss summary', type: 'action', badge: 'PDF' },
        { label: 'Deposit & Withdrawal', sub: 'Fund movement history', type: 'action', badge: 'CSV' },
        { label: 'Referral Earnings', sub: 'Commission history', type: 'action' },
      ]},
      { title: 'Time Period', items: [
        { label: 'Last 7 Days', type: 'action', badge: 'Quick' },
        { label: 'Last 30 Days', type: 'action' },
        { label: 'Last 3 Months', type: 'action' },
        { label: 'Custom Range', sub: 'Select your own dates', type: 'action' },
      ]},
    ],
    actionLabel: 'Download Statement',
    actionKey: 'statement-action',
  },
  launchpool: {
    title: 'Launchpool',
    icon: Gem,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/20 to-[#0B0E11]', text: 'Basonce Launchpool', sub: 'Stake tokens to earn new coin rewards' },
    sections: [
      { title: 'Active Pools', items: [
        { label: 'EQ Pool', sub: 'Stake USDT → Earn EQ', type: 'action', badge: 'Live', value: 'APY 125%' },
        { label: 'SZNP Pool', sub: 'Stake EQ → Earn SZNP', type: 'action', badge: 'Live', value: 'APY 89%' },
        { label: 'SGP Pool', sub: 'Stake USDT → Earn SGP', type: 'action', badge: 'Soon', value: 'APY ~200%' },
      ]},
      { title: 'How It Works', items: [
        { label: '1. Choose a pool', sub: 'Pick from active launchpools', type: 'info' },
        { label: '2. Stake your tokens', sub: 'Lock tokens to participate', type: 'info' },
        { label: '3. Earn rewards daily', sub: 'Rewards distributed every 24h', type: 'info' },
        { label: '4. Claim anytime', sub: 'No lockup period', type: 'info', badge: 'Flexible' },
      ]},
    ],
    actionLabel: 'Stake Now',
    actionKey: 'launchpool-action',
  },
  orders: {
    title: 'Orders',
    icon: FileText,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'Order Management', sub: 'Track all your open and completed orders' },
    sections: [
      { title: 'Open Orders', items: [
        { label: 'Spot Orders', sub: 'Active limit/market orders', type: 'action', badge: '0 Active' },
        { label: 'Futures Orders', sub: 'Active futures positions', type: 'action', badge: '0 Active' },
        { label: 'Stop Orders', sub: 'TP/SL orders', type: 'action' },
      ]},
      { title: 'Order History', items: [
        { label: 'Completed Orders', sub: 'All executed orders', type: 'action' },
        { label: 'Cancelled Orders', sub: 'Cancelled/expired orders', type: 'action' },
        { label: 'Trade History', sub: 'Full trade log', type: 'action' },
      ]},
    ],
    actionLabel: 'View Orders',
    actionKey: 'orders-nav',
  },
  security: {
    title: 'Security',
    icon: Shield,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'Account Security', sub: 'Keep your account safe and secure' },
    sections: [
      { title: 'Security Status', items: [
        { label: 'Email Verification', sub: 'Your email is verified', type: 'stat', badge: 'Enabled' },
        { label: 'Two-Factor Auth (2FA)', sub: 'Strongly recommended', type: 'action', badge: 'Setup' },
        { label: 'Anti-Phishing Code', sub: 'Protect against phishing', type: 'action' },
        { label: 'Withdrawal Whitelist', sub: 'Restrict withdrawal addresses', type: 'action' },
      ]},
      { title: 'Login Activity', items: [
        { label: 'Current Session', sub: 'Active now', type: 'info', badge: 'Secure' },
        { label: 'Device Management', sub: 'View trusted devices', type: 'action' },
        { label: 'Login History', sub: 'See all login attempts', type: 'action' },
      ]},
    ],
    actionLabel: 'Security Center',
    actionKey: 'security-action',
  },
  wotd: {
    title: 'Word of the Day',
    icon: Award,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/20 to-[#0B0E11]', text: 'Word of the Day', sub: 'Learn crypto terms and earn rewards daily' },
    sections: [
      { title: "Today's Word", items: [
        { label: 'HODL', value: 'Hold On for Dear Life', sub: 'A crypto strategy of holding assets long-term regardless of market volatility', type: 'info', badge: 'Today' },
      ]},
      { title: 'Recent Words', items: [
        { label: 'DeFi', sub: 'Decentralized Finance', type: 'info', badge: '+10 pts' },
        { label: 'Liquidity Pool', sub: 'Smart contract token reserves', type: 'info', badge: '+10 pts' },
        { label: 'Gas Fee', sub: 'Transaction processing cost', type: 'info', badge: '+10 pts' },
        { label: 'Bull Market', sub: 'Rising market trend', type: 'info', badge: '+10 pts' },
      ]},
      { title: 'Your Progress', items: [
        { label: 'Words Learned', value: '0', type: 'stat' },
        { label: 'Points Earned', value: '0 pts', type: 'stat' },
        { label: 'Current Streak', value: '0 days', type: 'stat' },
      ]},
    ],
    actionLabel: 'Answer Today',
    actionKey: 'wotd-action',
  },
  missions: {
    title: 'Monthly Missions',
    icon: Target,
    accent: true,
    hero: { bg: 'from-orange-900/30 to-[#0B0E11]', text: 'Monthly Missions', sub: 'Complete tasks and earn exclusive rewards' },
    sections: [
      { title: 'Active Missions', items: [
        { label: 'Trade 3 Times', sub: 'Spot or Futures trading', type: 'action', badge: '0/3', value: '+50 USDT' },
        { label: 'Deposit $100+', sub: 'Add funds to your account', type: 'action', badge: 'New', value: '+20 USDT' },
        { label: 'Refer 1 Friend', sub: 'Invite someone to Basonce', type: 'action', badge: '0/1', value: '+30 USDT' },
        { label: 'Mine for 7 Days', sub: 'Keep mining active', type: 'action', badge: '0/7', value: '+10 EQ' },
      ]},
      { title: 'Rewards Pool', items: [
        { label: 'Total Available', value: '$500 USDT', type: 'stat' },
        { label: 'Your Earned', value: '$0', type: 'stat' },
        { label: 'Days Remaining', value: '28 days', type: 'stat' },
      ]},
    ],
    actionLabel: 'Start Missions',
    actionKey: 'missions-action',
  },
  rewards: {
    title: 'Rewards Hub',
    icon: Gift,
    hero: { bg: 'from-pink-900/30 to-[#0B0E11]', text: 'Rewards Hub', sub: 'Redeem vouchers, coupons and special offers' },
    sections: [
      { title: 'Available Rewards', items: [
        { label: 'Trading Fee Voucher', sub: '50% off trading fees for 7 days', type: 'action', badge: 'Hot', value: '200 pts' },
        { label: 'Deposit Bonus', sub: '$10 bonus on $100 deposit', type: 'action', badge: 'New', value: '500 pts' },
        { label: 'Mining Boost x2', sub: 'Double mining speed for 24h', type: 'action', value: '150 pts' },
        { label: 'VIP Upgrade', sub: '1-month VIP access', type: 'action', value: '1000 pts' },
      ]},
      { title: 'Your Points', items: [
        { label: 'Available Points', value: '0 pts', type: 'stat' },
        { label: 'Points Expiring', value: 'None', type: 'stat' },
        { label: 'Lifetime Earned', value: '0 pts', type: 'stat' },
      ]},
    ],
    actionLabel: 'Claim Rewards',
    actionKey: 'rewards-modal',
  },
  'learn-earn': {
    title: 'Learn & Earn',
    icon: BookOpen,
    hero: { bg: 'from-teal-900/30 to-[#0B0E11]', text: 'Learn & Earn', sub: 'Study crypto and earn real tokens' },
    sections: [
      { title: 'Active Courses', items: [
        { label: 'Bitcoin Basics', sub: '5 lessons • ~15 min', type: 'action', badge: 'Start', value: '+5 USDT' },
        { label: 'DeFi Explained', sub: '8 lessons • ~25 min', type: 'action', badge: 'New', value: '+8 USDT' },
        { label: 'Futures Trading 101', sub: '10 lessons • ~30 min', type: 'action', value: '+12 USDT' },
        { label: 'Mining Guide', sub: '6 lessons • ~20 min', type: 'action', value: '+6 EQ' },
      ]},
      { title: 'Your Progress', items: [
        { label: 'Courses Completed', value: '0', type: 'stat' },
        { label: 'Total Earned', value: '$0', type: 'stat' },
        { label: 'Certificates', value: '0', type: 'stat' },
      ]},
    ],
    actionLabel: 'Start Learning',
    actionKey: 'learn-action',
  },
  'alpha-events': {
    title: 'Alpha Events',
    icon: Gem,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/20 to-[#0B0E11]', text: 'Alpha Events', sub: 'Exclusive trading events and competitions' },
    sections: [
      { title: 'Live Events', items: [
        { label: 'Alpha Trading Competition', sub: 'Top traders win $10,000 prize pool', type: 'action', badge: 'Live', value: '$10K' },
        { label: 'EQ Launch Celebration', sub: 'Special rewards for EQ traders', type: 'action', badge: 'Hot' },
        { label: 'New Year Trading Bonus', sub: 'Extra 20% on profits this week', type: 'action', badge: 'Limited' },
      ]},
      { title: 'Upcoming Events', items: [
        { label: 'Alpha Token Listing Day', sub: 'Trade new tokens on launch day', type: 'info', badge: 'Soon' },
        { label: 'Copy Trading Week', sub: 'Follow top traders for free', type: 'info', badge: 'Soon' },
      ]},
    ],
    actionLabel: 'Join Events',
    actionKey: 'alpha-events-modal',
  },
  convert: {
    title: 'Convert',
    icon: RefreshCw,
    hero: { bg: 'from-blue-900/30 to-[#0B0E11]', text: 'Convert Crypto', sub: 'Instantly swap between cryptocurrencies at the best rates' },
    sections: [
      { title: 'Popular Pairs', items: [
        { label: 'BTC → USDT', sub: 'Best rate guaranteed', type: 'action', badge: 'No fee' },
        { label: 'ETH → USDT', sub: 'Instant conversion', type: 'action', badge: 'No fee' },
        { label: 'BNB → USDT', sub: 'Zero slippage', type: 'action', badge: 'No fee' },
        { label: 'EQ → USDT', sub: 'Native token exchange', type: 'action', badge: 'Popular' },
      ]},
      { title: 'Benefits', items: [
        { label: 'Zero Trading Fees', sub: 'No commission on converts', type: 'info', badge: 'Free' },
        { label: 'Best Price Routing', sub: 'Aggregated from all markets', type: 'info' },
        { label: 'Instant Settlement', sub: 'Funds available immediately', type: 'info' },
      ]},
    ],
    actionLabel: 'Convert Now',
    actionKey: 'convert-action',
  },
  margin: {
    title: 'Margin Trading',
    icon: TrendingUp,
    hero: { bg: 'from-orange-900/30 to-[#0B0E11]', text: 'Margin Trading', sub: 'Amplify your trades with borrowed funds up to 10x' },
    sections: [
      { title: 'Margin Features', items: [
        { label: 'Cross Margin', sub: 'Shared margin across positions', type: 'info', badge: 'Up to 5x' },
        { label: 'Isolated Margin', sub: 'Separate margin per position', type: 'info', badge: 'Up to 10x' },
        { label: 'Borrow & Lend', sub: 'Borrow at competitive rates', type: 'action' },
      ]},
      { title: 'Risk Management', items: [
        { label: 'Auto Risk Engine', sub: 'Automatic liquidation protection', type: 'info', badge: 'Active' },
        { label: 'Stop Loss / Take Profit', sub: 'Set exit conditions', type: 'info' },
        { label: 'Margin Call Alerts', sub: 'Get notified before liquidation', type: 'info' },
      ]},
      { title: 'Requirements', items: [
        { label: 'Minimum Balance', value: '$100 USDT', type: 'stat' },
        { label: 'KYC Level', value: 'Level 1', type: 'stat' },
      ]},
    ],
    actionLabel: 'Start Margin Trading',
    actionKey: 'margin-nav',
  },
  otc: {
    title: 'OTC Trading',
    icon: Globe,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'OTC Trading', sub: 'Trade large volumes with no market impact' },
    sections: [
      { title: 'OTC Features', items: [
        { label: 'Large Block Trades', sub: 'Minimum $10,000 per trade', type: 'info', badge: 'VIP' },
        { label: 'Fixed Price Quotes', sub: 'Lock in your rate instantly', type: 'info' },
        { label: 'Zero Market Impact', sub: 'Trades off the order book', type: 'info', badge: 'Private' },
        { label: 'Dedicated Desk', sub: '24/7 OTC support team', type: 'info' },
      ]},
      { title: 'Supported Pairs', items: [
        { label: 'BTC/USDT', sub: 'Bitcoin OTC', type: 'info', badge: 'Available' },
        { label: 'ETH/USDT', sub: 'Ethereum OTC', type: 'info', badge: 'Available' },
        { label: 'All Major Coins', sub: '50+ pairs available', type: 'info' },
      ]},
    ],
    actionLabel: 'Request OTC Quote',
    actionKey: 'otc-action',
  },
  recurring: {
    title: 'Convert Recurring',
    icon: RefreshCw,
    hero: { bg: 'from-teal-900/30 to-[#0B0E11]', text: 'Recurring Buy', sub: 'Automate your crypto purchases on a schedule' },
    sections: [
      { title: 'Schedule Options', items: [
        { label: 'Daily', sub: 'Buy every day at set time', type: 'action', badge: 'Popular' },
        { label: 'Weekly', sub: 'Buy on a chosen day', type: 'action' },
        { label: 'Monthly', sub: 'Buy once a month', type: 'action' },
        { label: 'Custom', sub: 'Set your own interval', type: 'action' },
      ]},
      { title: 'Benefits', items: [
        { label: 'Dollar Cost Averaging', sub: 'Reduce timing risk', type: 'info', badge: 'Smart' },
        { label: 'Fully Automated', sub: 'Set once and forget', type: 'info' },
        { label: 'Low Minimum', sub: 'Start from $10', type: 'info' },
      ]},
    ],
    actionLabel: 'Create Plan',
    actionKey: 'recurring-action',
  },
  options: {
    title: 'Options Trading',
    icon: BarChart2,
    hero: { bg: 'from-purple-900/30 to-[#0B0E11]', text: 'Options Trading', sub: 'Trade crypto options with defined risk' },
    sections: [
      { title: 'Option Types', items: [
        { label: 'Call Options', sub: 'Profit when price rises', type: 'info', badge: 'Buy' },
        { label: 'Put Options', sub: 'Profit when price falls', type: 'info', badge: 'Sell' },
        { label: 'Covered Calls', sub: 'Earn premium on holdings', type: 'info' },
      ]},
      { title: 'Available Contracts', items: [
        { label: 'BTC Options', sub: 'Weekly & Monthly expiry', type: 'action', badge: 'Active' },
        { label: 'ETH Options', sub: 'Weekly & Monthly expiry', type: 'action', badge: 'Active' },
        { label: 'SOL Options', sub: 'Monthly expiry', type: 'action', badge: 'New' },
      ]},
    ],
    actionLabel: 'Trade Options',
    actionKey: 'options-action',
  },
  'eth-staking': {
    title: 'ETH Staking',
    icon: Coins,
    accent: true,
    hero: { bg: 'from-blue-800/30 to-[#0B0E11]', text: 'ETH 2.0 Staking', sub: 'Stake ETH and earn up to 4.5% APY' },
    sections: [
      { title: 'Staking Stats', items: [
        { label: 'Current APY', value: '4.5%', type: 'stat' },
        { label: 'Total ETH Staked', value: '12,450 ETH', type: 'stat' },
        { label: 'Min. Stake', value: '0.001 ETH', type: 'stat' },
        { label: 'Rewards', value: 'Daily', type: 'stat' },
      ]},
      { title: 'Features', items: [
        { label: 'Liquid Staking (bETH)', sub: 'Use staked ETH as collateral', type: 'info', badge: 'DeFi' },
        { label: 'No Lockup Period', sub: 'Unstake any time', type: 'info', badge: 'Flexible' },
        { label: 'Auto-compound', sub: 'Rewards auto-reinvested', type: 'info' },
      ]},
    ],
    actionLabel: 'Stake ETH Now',
    actionKey: 'eth-staking-action',
  },
  'sol-staking': {
    title: 'SOL Staking',
    icon: Zap,
    accent: true,
    hero: { bg: 'from-violet-900/30 to-[#0B0E11]', text: 'SOL Staking', sub: 'Stake Solana and earn up to 6.8% APY' },
    sections: [
      { title: 'Staking Stats', items: [
        { label: 'Current APY', value: '6.8%', type: 'stat' },
        { label: 'Total SOL Staked', value: '45,200 SOL', type: 'stat' },
        { label: 'Min. Stake', value: '0.1 SOL', type: 'stat' },
        { label: 'Rewards', value: 'Daily', type: 'stat' },
      ]},
      { title: 'Features', items: [
        { label: 'Liquid Staking (bSOL)', sub: 'Trade your staked SOL', type: 'info', badge: 'DeFi' },
        { label: 'Validator Selection', sub: 'Choose top validators', type: 'info' },
        { label: 'No Minimum Lock', sub: 'Unstake any time', type: 'info', badge: 'Flexible' },
      ]},
    ],
    actionLabel: 'Stake SOL Now',
    actionKey: 'sol-staking-action',
  },
  arbitrage: {
    title: 'Smart Arbitrage',
    icon: Cpu,
    accent: true,
    hero: { bg: 'from-cyan-900/30 to-[#0B0E11]', text: 'Smart Arbitrage Bot', sub: 'Automated low-risk profit from price differences' },
    sections: [
      { title: 'Bot Performance', items: [
        { label: 'Average Daily Return', value: '0.3-0.8%', type: 'stat' },
        { label: 'Win Rate', value: '94.2%', type: 'stat' },
        { label: 'Total Users', value: '8,450+', type: 'stat' },
        { label: 'Risk Level', value: 'Low', type: 'stat' },
      ]},
      { title: 'How It Works', items: [
        { label: 'Price Monitoring', sub: 'Scans 50+ markets in real-time', type: 'info' },
        { label: 'Auto Execution', sub: 'Trades executed in milliseconds', type: 'info', badge: 'Fast' },
        { label: 'Risk Controls', sub: 'Max loss limits built-in', type: 'info', badge: 'Safe' },
      ]},
    ],
    actionLabel: 'Start Arbitrage Bot',
    actionKey: 'arbitrage-action',
  },
  onchain: {
    title: 'On-chain Yields',
    icon: Coins,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'On-chain Yields', sub: 'Earn from DeFi protocols directly' },
    sections: [
      { title: 'Available Protocols', items: [
        { label: 'USDT Lending Pool', sub: 'Lend USDT to earn interest', type: 'action', badge: 'APY 8.2%', value: '$2.4M TVL' },
        { label: 'BTC Yield Vault', sub: 'Secure BTC yield strategy', type: 'action', badge: 'APY 4.1%' },
        { label: 'ETH Liquidity Pool', sub: 'Provide ETH liquidity', type: 'action', badge: 'APY 11.5%' },
        { label: 'Stablecoin Farm', sub: 'USDT/USDC farming', type: 'action', badge: 'APY 9.7%', value: 'Low Risk' },
      ]},
      { title: 'Your Position', items: [
        { label: 'Total Deposited', value: '$0', type: 'stat' },
        { label: 'Pending Yield', value: '$0', type: 'stat' },
        { label: 'Total Earned', value: '$0', type: 'stat' },
      ]},
    ],
    actionLabel: 'Deposit to Earn',
    actionKey: 'onchain-action',
  },
  'yield-arena': {
    title: 'Yield Arena',
    icon: Trophy,
    accent: true,
    hero: { bg: 'from-yellow-900/30 to-[#0B0E11]', text: 'Yield Arena', sub: 'Compete for the highest yields and win prizes' },
    sections: [
      { title: 'Current Season', items: [
        { label: 'Season 12 Prize Pool', value: '$50,000', type: 'stat' },
        { label: 'Your Ranking', value: 'Unranked', type: 'stat' },
        { label: 'Days Remaining', value: '18 days', type: 'stat' },
      ]},
      { title: 'Leaderboard', items: [
        { label: '#1 CryptoKing_TR', sub: '142% yield this month', type: 'info', badge: '🥇 $20K' },
        { label: '#2 SatoshiPro', sub: '118% yield this month', type: 'info', badge: '🥈 $10K' },
        { label: '#3 MoonTrader', sub: '95% yield this month', type: 'info', badge: '🥉 $5K' },
      ]},
    ],
    actionLabel: 'Join Arena',
    actionKey: 'arena-action',
  },
  'super-mine': {
    title: 'Super Mine',
    icon: Target,
    accent: true,
    hero: { bg: 'from-orange-800/30 to-[#0B0E11]', text: 'Super Mine', sub: 'Enhanced mining with boosted rewards' },
    sections: [
      { title: 'Super Mine Pools', items: [
        { label: 'Diamond Pool', sub: 'Highest tier mining rewards', type: 'action', badge: 'VIP Only', value: '+300% boost' },
        { label: 'Gold Pool', sub: 'Premium mining rewards', type: 'action', badge: 'Level 4+', value: '+150% boost' },
        { label: 'Silver Pool', sub: 'Standard boosted rewards', type: 'action', badge: 'Level 2+', value: '+75% boost' },
      ]},
      { title: 'Your Mining', items: [
        { label: 'Current Level', value: 'Level 1', type: 'stat' },
        { label: 'Daily Earnings', value: '0.00 EQ', type: 'stat' },
        { label: 'Total Mined', value: '0.00 EQ', type: 'stat' },
      ]},
    ],
    actionLabel: 'Upgrade Mining',
    actionKey: 'super-mine-nav',
  },
  discount: {
    title: 'Discount Buy',
    icon: Percent,
    hero: { bg: 'from-red-900/30 to-[#0B0E11]', text: 'Discount Buy', sub: 'Purchase crypto at below-market prices' },
    sections: [
      { title: 'Active Deals', items: [
        { label: 'BTC at 2% Discount', sub: 'Limited slots available', type: 'action', badge: 'Hot', value: 'Save 2%' },
        { label: 'ETH at 1.5% Discount', sub: '10 slots remaining', type: 'action', badge: '10 left', value: 'Save 1.5%' },
        { label: 'EQ at 5% Discount', sub: 'New user special', type: 'action', badge: 'New Users', value: 'Save 5%' },
      ]},
      { title: 'How It Works', items: [
        { label: 'Use Points to Unlock', sub: 'Spend Rewards Points for discounts', type: 'info' },
        { label: 'Limited Time Offers', sub: 'Deals expire quickly', type: 'info', badge: 'FOMO' },
        { label: 'Max $5000 per deal', sub: 'Per-user purchase limit', type: 'info' },
      ]},
    ],
    actionLabel: 'View All Deals',
    actionKey: 'discount-action',
  },
  'spot-wallet': {
    title: 'Spot Wallet',
    icon: Wallet,
    hero: { bg: 'from-blue-900/30 to-[#0B0E11]', text: 'Spot Wallet', sub: 'Manage your spot trading balances' },
    sections: [
      { title: 'Wallet Overview', items: [
        { label: 'Total Balance (USDT)', value: '$0.00', type: 'stat' },
        { label: 'Available Balance', value: '$0.00', type: 'stat' },
        { label: 'In Orders', value: '$0.00', type: 'stat' },
      ]},
      { title: 'Quick Actions', items: [
        { label: 'Deposit', sub: 'Add funds to spot wallet', type: 'action', badge: 'Fast' },
        { label: 'Withdraw', sub: 'Send to external wallet', type: 'action' },
        { label: 'Transfer', sub: 'Move to other wallets', type: 'action' },
        { label: 'Convert Small Balances', sub: 'Convert dust to BNB', type: 'action' },
      ]},
    ],
    actionLabel: 'Go to Assets',
    actionKey: 'spot-wallet-nav',
  },
  'futures-wallet': {
    title: 'Futures Wallet',
    icon: Activity,
    hero: { bg: 'from-orange-900/30 to-[#0B0E11]', text: 'Futures Wallet', sub: 'Your dedicated futures trading balance' },
    sections: [
      { title: 'Wallet Overview', items: [
        { label: 'Total Balance (USDT)', value: '$0.00', type: 'stat' },
        { label: 'Unrealized PnL', value: '$0.00', type: 'stat' },
        { label: 'Available Margin', value: '$0.00', type: 'stat' },
        { label: 'Margin Used', value: '$0.00', type: 'stat' },
      ]},
      { title: 'Quick Actions', items: [
        { label: 'Transfer from Spot', sub: 'Add funds to futures', type: 'action' },
        { label: 'Transfer to Spot', sub: 'Move profits to spot', type: 'action' },
        { label: 'Open Positions', sub: 'View active trades', type: 'action', badge: '0 open' },
      ]},
    ],
    actionLabel: 'Go to Futures',
    actionKey: 'futures-wallet-nav',
  },
  overview: {
    title: 'Portfolio Overview',
    icon: BarChart2,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'Portfolio Overview', sub: 'Complete view of all your assets' },
    sections: [
      { title: 'Total Assets', items: [
        { label: 'Portfolio Value', value: '$0.00', type: 'stat' },
        { label: '24h Change', value: '+$0.00 (0.00%)', type: 'stat' },
        { label: 'All-Time PnL', value: '$0.00', type: 'stat' },
      ]},
      { title: 'By Wallet', items: [
        { label: 'Spot Wallet', value: '$0.00', sub: '0% of total', type: 'stat' },
        { label: 'Futures Wallet', value: '$0.00', sub: '0% of total', type: 'stat' },
        { label: 'Mining Balance', value: '0 EQ', sub: 'Unclaimed', type: 'stat' },
      ]},
    ],
    actionLabel: 'View Full Assets',
    actionKey: 'overview-nav',
  },
  history: {
    title: 'Transaction History',
    icon: FileText,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'Transaction History', sub: 'Complete record of all account activity' },
    sections: [
      { title: 'Filter By Type', items: [
        { label: 'All Transactions', type: 'action', badge: 'Default' },
        { label: 'Deposits', type: 'action' },
        { label: 'Withdrawals', type: 'action' },
        { label: 'Spot Trades', type: 'action' },
        { label: 'Futures Trades', type: 'action' },
        { label: 'Mining Payouts', type: 'action' },
        { label: 'Referral Bonuses', type: 'action' },
      ]},
      { title: 'Recent Activity', items: [
        { label: 'No transactions yet', sub: 'Start trading to see your history', type: 'info' },
      ]},
    ],
    actionLabel: 'View Full History',
    actionKey: 'history-nav',
  },
  withdraw: {
    title: 'Withdraw',
    icon: CreditCard,
    hero: { bg: 'from-red-900/30 to-[#0B0E11]', text: 'Withdraw Crypto', sub: 'Send your funds to any external wallet' },
    sections: [
      { title: 'Withdrawal Info', items: [
        { label: 'Available Balance', value: '$0.00 USDT', type: 'stat' },
        { label: 'Min. Withdrawal', value: '$10 USDT', type: 'stat' },
        { label: 'Daily Limit', value: '$10,000', type: 'stat' },
        { label: 'Network Fee', value: '~$1-5', type: 'stat' },
      ]},
      { title: 'Supported Networks', items: [
        { label: 'TRC-20 (TRON)', sub: 'Lowest fees ~$1', type: 'info', badge: 'Recommended' },
        { label: 'BEP-20 (BSC)', sub: 'Fast & cheap ~$0.5', type: 'info', badge: 'Fast' },
        { label: 'ERC-20 (Ethereum)', sub: 'Highest fees ~$5-20', type: 'info' },
      ]},
    ],
    actionLabel: 'Withdraw Now',
    actionKey: 'withdraw-modal',
  },
  square: {
    title: 'Square (Social)',
    icon: MessageSquare,
    hero: { bg: 'from-blue-900/30 to-[#0B0E11]', text: 'Basonce Square', sub: 'Community news and trader discussions' },
    sections: [
      { title: 'Trending Topics', items: [
        { label: '#BTC Breaking $100K', sub: '2,341 posts today', type: 'action', badge: 'Hot' },
        { label: '#EQ Token Launch', sub: '1,205 posts today', type: 'action', badge: 'New' },
        { label: '#CryptoMining Tips', sub: '892 posts today', type: 'action' },
        { label: '#FuturesTrade', sub: '654 posts today', type: 'action' },
      ]},
      { title: 'Top Traders', items: [
        { label: 'AlphaTrader_TR', sub: '+214% this month', type: 'info', badge: 'PRO' },
        { label: 'CryptoWhale99', sub: '+156% this month', type: 'info', badge: 'PRO' },
        { label: 'MoonHunter', sub: '+98% this month', type: 'info' },
      ]},
    ],
    actionLabel: 'Open Square',
    actionKey: 'square-nav',
  },
  'market-updates': {
    title: 'Market Updates',
    icon: Activity,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'Market Updates', sub: 'Real-time market news and price alerts' },
    sections: [
      { title: 'Breaking News', items: [
        { label: 'BTC hits new ATH above $94K', sub: '2 hours ago • Bullish', type: 'info', badge: '🔥' },
        { label: 'ETH upgrade successful', sub: '4 hours ago • Bullish', type: 'info', badge: '✅' },
        { label: 'Fed signals rate cuts', sub: '6 hours ago • Positive', type: 'info' },
        { label: 'EQ listed on major exchange', sub: '8 hours ago • Basonce News', type: 'info', badge: '⭐' },
      ]},
      { title: 'Price Alerts', items: [
        { label: 'Set BTC Alert', sub: 'Notify when BTC reaches price', type: 'action' },
        { label: 'Set ETH Alert', sub: 'Notify when ETH reaches price', type: 'action' },
        { label: 'Portfolio Alert', sub: 'Alert on portfolio changes', type: 'action' },
      ]},
    ],
    actionLabel: 'View Markets',
    actionKey: 'markets-nav',
  },
  research: {
    title: 'Research',
    icon: BookOpen,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'Crypto Research', sub: 'In-depth analysis and reports from experts' },
    sections: [
      { title: 'Latest Reports', items: [
        { label: 'BTC 2025 Outlook', sub: 'Price targets & analysis', type: 'action', badge: 'New' },
        { label: 'DeFi Market Report Q1 2025', sub: 'TVL trends & opportunities', type: 'action' },
        { label: 'AI Tokens Deep Dive', sub: 'EQ, FET, AGIX analysis', type: 'action', badge: 'Hot' },
        { label: 'Mining Profitability Guide', sub: 'ROI analysis for 2025', type: 'action' },
      ]},
      { title: 'Categories', items: [
        { label: 'Fundamental Analysis', type: 'action' },
        { label: 'Technical Analysis', type: 'action' },
        { label: 'On-chain Data', type: 'action' },
        { label: 'Macro Outlook', type: 'action' },
      ]},
    ],
    actionLabel: 'Read Research',
    actionKey: 'research-action',
  },
  action: {
    title: 'Action Required',
    icon: AlertTriangle,
    hero: { bg: 'from-red-900/30 to-[#0B0E11]', text: 'Action Required', sub: 'Items needing your immediate attention' },
    sections: [
      { title: 'Pending Actions', items: [
        { label: 'No pending actions', sub: 'Your account is in good standing', type: 'info', badge: 'All Clear' },
      ]},
      { title: 'Account Health', items: [
        { label: 'Email Verified', sub: 'Verification complete', type: 'stat', badge: 'Done' },
        { label: 'KYC Status', sub: 'Not started - unlock higher limits', type: 'action', badge: 'Start KYC' },
        { label: 'Phone Number', sub: 'Add for extra security', type: 'action', badge: 'Optional' },
        { label: '2FA Security', sub: 'Strongly recommended', type: 'action', badge: 'Recommended' },
      ]},
    ],
    actionLabel: 'Review Actions',
    actionKey: 'action-check',
  },
  verify: {
    title: 'Basonce Verify',
    icon: CheckCircle,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'Basonce Verify', sub: 'Identity verification for higher limits' },
    sections: [
      { title: 'Verification Levels', items: [
        { label: 'Level 1 - Email', sub: 'Verified', type: 'stat', badge: 'Complete' },
        { label: 'Level 2 - KYC Basic', sub: 'ID + Selfie verification', type: 'action', badge: 'Start', value: 'Withdraw $10K/day' },
        { label: 'Level 3 - KYC Advanced', sub: 'Address proof required', type: 'action', value: 'Withdraw $100K/day' },
      ]},
      { title: 'Benefits', items: [
        { label: 'Higher withdrawal limits', type: 'info', badge: '✓' },
        { label: 'Access to OTC trading', type: 'info', badge: '✓' },
        { label: 'Priority customer support', type: 'info', badge: '✓' },
        { label: 'Reduced trading fees', type: 'info', badge: '✓' },
      ]},
    ],
    actionLabel: 'Verify Now',
    actionKey: 'verify-action',
  },
  faq: {
    title: 'FAQ',
    icon: HelpCircle,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'Frequently Asked Questions', sub: 'Find answers to common questions' },
    sections: [
      { title: 'Popular Questions', items: [
        { label: 'How do I deposit?', sub: 'Step-by-step deposit guide', type: 'action' },
        { label: 'Why is my withdrawal pending?', sub: 'Processing times explained', type: 'action' },
        { label: 'How does mining work?', sub: 'Complete mining guide', type: 'action' },
        { label: 'How to use referrals?', sub: 'Earn from referrals', type: 'action' },
        { label: 'What are trading fees?', sub: 'Fee schedule explained', type: 'action' },
        { label: 'How to set Stop Loss?', sub: 'Futures risk management', type: 'action' },
      ]},
      { title: 'Getting Started', items: [
        { label: 'Account Registration', type: 'action' },
        { label: 'First Deposit', type: 'action' },
        { label: 'KYC Verification', type: 'action' },
        { label: 'Beginner Trading Guide', type: 'action', badge: 'Recommended' },
      ]},
    ],
    actionLabel: 'Open Support',
    actionKey: 'support-modal',
  },
  'self-service': {
    title: 'Self Service',
    icon: Shield,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'Self Service Center', sub: 'Manage your account without support' },
    sections: [
      { title: 'Account Recovery', items: [
        { label: 'Reset Password', sub: 'Change your login password', type: 'action' },
        { label: 'Disable 2FA', sub: 'Emergency 2FA removal', type: 'action', badge: 'Identity Required' },
        { label: 'Recover Account', sub: 'Regain access to your account', type: 'action' },
      ]},
      { title: 'Account Management', items: [
        { label: 'Freeze Account', sub: 'Temporarily lock all activity', type: 'action', badge: 'Security' },
        { label: 'Close Account', sub: 'Permanently delete account', type: 'action', badge: 'Irreversible' },
        { label: 'Download Data', sub: 'Export all account data', type: 'action', badge: 'GDPR' },
      ]},
    ],
    actionLabel: 'Get Help',
    actionKey: 'support-modal',
  },
  nft: {
    title: 'Basonce NFT',
    icon: Layers,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/15 to-[#0B0E11]', text: 'Basonce NFT', sub: 'Discover, buy, and sell unique digital assets' },
    sections: [
      { title: 'Trending Collections', items: [
        { label: 'Basonce Genesis', sub: 'Floor: 0.5 ETH • 10K items', type: 'action', badge: 'Hot' },
        { label: 'Crypto Punks BSCE', sub: 'Floor: 0.2 ETH • 5K items', type: 'action', badge: 'New' },
        { label: 'EQ Warriors', sub: 'Floor: 100 EQ • 1K items', type: 'action', badge: 'Exclusive' },
      ]},
      { title: 'NFT Features', items: [
        { label: 'Create & Mint', sub: 'Turn your art into NFTs', type: 'action' },
        { label: 'Launchpad', sub: 'New NFT projects first', type: 'action', badge: 'Alpha' },
        { label: 'Trading Bot', sub: 'Auto buy/sell floor NFTs', type: 'action' },
      ]},
    ],
    actionLabel: 'Explore NFTs',
    actionKey: 'nft-action',
  },
  megadrop: {
    title: 'Megadrop',
    icon: Gift,
    accent: true,
    hero: { bg: 'from-pink-900/30 to-[#0B0E11]', text: 'Megadrop', sub: 'Earn new token airdrops by completing tasks' },
    sections: [
      { title: 'Active Megadrops', items: [
        { label: 'SGP Token Launch', sub: 'Stake EQ to qualify', type: 'action', badge: 'Live', value: '500K SGP Pool' },
        { label: 'PUNCH Airdrop', sub: 'Hold USDT to qualify', type: 'action', badge: 'New', value: '1M PUNCH' },
      ]},
      { title: 'How to Participate', items: [
        { label: '1. Lock Tokens', sub: 'Stake during campaign period', type: 'info' },
        { label: '2. Complete Tasks', sub: 'Web3 quests for bonus points', type: 'info' },
        { label: '3. Claim Tokens', sub: 'Receive at Token Generation Event', type: 'info', badge: 'TGE' },
      ]},
      { title: 'Your Status', items: [
        { label: 'Megadrops Joined', value: '0', type: 'stat' },
        { label: 'Tokens Claimed', value: '0', type: 'stat' },
      ]},
    ],
    actionLabel: 'Join Megadrop',
    actionKey: 'megadrop-action',
  },
  'gift-card': {
    title: 'Gift Card',
    icon: Gift,
    hero: { bg: 'from-red-800/30 to-[#0B0E11]', text: 'Crypto Gift Cards', sub: 'Send and receive crypto gift cards' },
    sections: [
      { title: 'Send a Gift Card', items: [
        { label: 'USDT Gift Card', sub: 'Send USDT to anyone', type: 'action', badge: 'Popular' },
        { label: 'BTC Gift Card', sub: 'Gift Bitcoin to friends', type: 'action' },
        { label: 'Custom Amount', sub: '$5 - $1000 USD', type: 'action' },
      ]},
      { title: 'Redeem Gift Card', items: [
        { label: 'Enter Gift Code', sub: 'Paste your gift card code', type: 'action', badge: 'Redeem' },
        { label: 'Check Balance', sub: 'View remaining value', type: 'action' },
      ]},
      { title: 'My Gift Cards', items: [
        { label: 'Sent Cards', value: '0', type: 'stat' },
        { label: 'Received Cards', value: '0', type: 'stat' },
      ]},
    ],
    actionLabel: 'Buy Gift Card',
    actionKey: 'gift-card-action',
  },
  insight: {
    title: 'Trading Insight',
    icon: TrendingUp,
    hero: { bg: 'from-blue-900/30 to-[#0B0E11]', text: 'Trading Insight', sub: 'AI-powered trading signals and analysis' },
    sections: [
      { title: 'Live Signals', items: [
        { label: 'BTC/USDT - LONG', sub: 'Confidence: 82% • Entry: $93,800', type: 'info', badge: '🟢 Strong Buy' },
        { label: 'ETH/USDT - LONG', sub: 'Confidence: 74% • Entry: $3,420', type: 'info', badge: '🟢 Buy' },
        { label: 'SOL/USDT - NEUTRAL', sub: 'Confidence: 58%', type: 'info', badge: '🟡 Hold' },
        { label: 'BNB/USDT - LONG', sub: 'Confidence: 71% • Entry: $615', type: 'info', badge: '🟢 Buy' },
      ]},
      { title: 'Analysis Tools', items: [
        { label: 'Fear & Greed Index', value: '72 - Greed', type: 'stat' },
        { label: 'Market Sentiment', value: 'Bullish', type: 'stat' },
        { label: 'BTC Dominance', value: '52.4%', type: 'stat' },
      ]},
    ],
    actionLabel: 'View All Signals',
    actionKey: 'insight-action',
  },
  api: {
    title: 'API Management',
    icon: Activity,
    hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'API Management', sub: 'Connect bots and third-party apps via API' },
    sections: [
      { title: 'Your API Keys', items: [
        { label: 'No API keys yet', sub: 'Create your first API key below', type: 'info' },
      ]},
      { title: 'Create New Key', items: [
        { label: 'Read Only Key', sub: 'View portfolio & market data', type: 'action', badge: 'Safe' },
        { label: 'Trade Key', sub: 'Execute trades via bot', type: 'action', badge: '2FA Required' },
        { label: 'Full Access Key', sub: 'All permissions including withdraw', type: 'action', badge: 'Whitelist' },
      ]},
      { title: 'Rate Limits', items: [
        { label: 'REST API', value: '1,200 req/min', type: 'stat' },
        { label: 'WebSocket', value: 'Unlimited streams', type: 'stat' },
      ]},
    ],
    actionLabel: 'Create API Key',
    actionKey: 'api-action',
  },
  'fan-token': {
    title: 'Fan Token',
    icon: Star,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/15 to-[#0B0E11]', text: 'Fan Tokens', sub: 'Own a piece of your favorite sports team or brand' },
    sections: [
      { title: 'Available Fan Tokens', items: [
        { label: 'Football Teams', sub: 'PSG, Barcelona, Juventus', type: 'action', badge: 'Hot' },
        { label: 'Basketball Teams', sub: 'Lakers, Warriors tokens', type: 'action' },
        { label: 'Esports Teams', sub: 'T1, Navi, Liquid tokens', type: 'action', badge: 'New' },
        { label: 'F1 Racing', sub: 'Ferrari, Mercedes, RedBull', type: 'action' },
      ]},
      { title: 'Fan Token Benefits', items: [
        { label: 'Voting Rights', sub: 'Vote on team decisions', type: 'info', badge: '✓' },
        { label: 'Exclusive Rewards', sub: 'Merchandise & experiences', type: 'info', badge: '✓' },
        { label: 'Staking Rewards', sub: 'Earn by holding', type: 'info', badge: '✓' },
      ]},
    ],
    actionLabel: 'Explore Fan Tokens',
    actionKey: 'fan-token-action',
  },
  marketplace: {
    title: 'Marketplace',
    icon: Globe,
    hero: { bg: 'from-teal-900/30 to-[#0B0E11]', text: 'Basonce Marketplace', sub: 'Buy, sell and trade crypto products & services' },
    sections: [
      { title: 'Featured Products', items: [
        { label: 'Premium Mining Plans', sub: 'Enhanced mining equipment', type: 'action', badge: 'Hot' },
        { label: 'Trading Signals (PRO)', sub: 'Premium signal subscriptions', type: 'action', badge: 'New' },
        { label: 'Bot Templates', sub: 'Pre-built trading strategies', type: 'action' },
        { label: 'VIP Membership', sub: 'Unlock all premium features', type: 'action', badge: 'Popular' },
      ]},
      { title: 'Categories', items: [
        { label: 'Mining Products', type: 'action' },
        { label: 'Trading Tools', type: 'action' },
        { label: 'Education & Courses', type: 'action' },
        { label: 'Community Services', type: 'action' },
      ]},
    ],
    actionLabel: 'Browse Marketplace',
    actionKey: 'marketplace-action',
  },
  babt: {
    title: 'BABT - Basonce Bound Token',
    icon: CheckCircle,
    hero: { bg: 'from-yellow-900/30 to-[#0B0E11]', text: 'BABT Token', sub: 'Soulbound KYC verification token on BSC' },
    sections: [
      { title: 'What is BABT?', items: [
        { label: 'Identity Proof NFT', sub: 'Non-transferable verification token', type: 'info', badge: 'Soulbound' },
        { label: 'BSC Network', sub: 'Minted on Binance Smart Chain', type: 'info' },
        { label: 'One Per Account', sub: 'Unique to your verified identity', type: 'info' },
      ]},
      { title: 'BABT Benefits', items: [
        { label: 'Proof of Humanity', sub: 'Prove you are a real verified user', type: 'info', badge: '✓' },
        { label: 'Platform Benefits', sub: 'Special perks across Web3', type: 'info', badge: '✓' },
        { label: 'DAO Voting', sub: 'Participate in governance votes', type: 'info', badge: '✓' },
      ]},
      { title: 'Requirements', items: [
        { label: 'KYC Level 2', sub: 'Advanced verification needed', type: 'stat' },
        { label: 'Minting Fee', value: '~$1 BNB gas', type: 'stat' },
      ]},
    ],
    actionLabel: 'Mint BABT',
    actionKey: 'babt-action',
  },
  'send-cash': {
    title: 'Send Cash',
    icon: CreditCard,
    hero: { bg: 'from-green-900/30 to-[#0B0E11]', text: 'Send Cash', sub: 'Send money to anyone using crypto instantly' },
    sections: [
      { title: 'Send Options', items: [
        { label: 'Send by Username', sub: 'Send to Basonce username', type: 'action', badge: 'Free', },
        { label: 'Send by Email', sub: 'Send to any email address', type: 'action', badge: 'Free' },
        { label: 'Send by Phone', sub: 'Send via phone number', type: 'action' },
        { label: 'Send to Wallet', sub: 'Send to blockchain address', type: 'action', badge: 'On-chain' },
      ]},
      { title: 'Transfer Stats', items: [
        { label: 'Min Amount', value: '$1 USDT', type: 'stat' },
        { label: 'Max per Day', value: '$10,000', type: 'stat' },
        { label: 'Transfer Fee', value: 'Free (Internal)', type: 'stat' },
      ]},
    ],
    actionLabel: 'Send Now',
    actionKey: 'pay-modal',
  },
  charity: {
    title: 'Charity',
    icon: Heart,
    accent: true,
    hero: { bg: 'from-red-900/30 to-[#0B0E11]', text: 'Crypto Charity', sub: 'Donate crypto to verified global causes' },
    sections: [
      { title: 'Active Campaigns', items: [
        { label: 'Children Education Fund', sub: 'Providing education to 5K children', type: 'action', badge: 'Urgent', value: '$45,231 raised' },
        { label: 'Climate Action 2025', sub: 'Tree planting initiative', type: 'action', value: '$28,100 raised' },
        { label: 'Earthquake Relief Turkey', sub: 'Emergency disaster relief', type: 'action', badge: 'Hot', value: '$112,400 raised' },
      ]},
      { title: 'Your Impact', items: [
        { label: 'Total Donated', value: '$0', type: 'stat' },
        { label: 'Campaigns Supported', value: '0', type: 'stat' },
        { label: 'Tax Receipt', sub: 'Download donation receipt', type: 'action' },
      ]},
    ],
    actionLabel: 'Donate Now',
    actionKey: 'charity-action',
  },
  'spot-colosseum': {
    title: 'Spot Colosseum',
    icon: Trophy,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/20 to-[#0B0E11]', text: 'Spot Colosseum', sub: 'Compete in live spot trading tournaments' },
    sections: [
      { title: 'Live Tournament', items: [
        { label: 'Weekly Spot Battle', sub: 'Highest % gain wins $5,000', type: 'action', badge: 'Live', value: '$5,000 prize' },
        { label: 'EQ Trading Cup', sub: 'EQ token only competition', type: 'action', badge: 'New', value: '50,000 EQ' },
      ]},
      { title: 'Top Performers', items: [
        { label: '#1 TurkishTrader', sub: '+892% this week', type: 'info', badge: '🥇' },
        { label: '#2 CryptoMaster99', sub: '+654% this week', type: 'info', badge: '🥈' },
        { label: '#3 AlphaHunter', sub: '+521% this week', type: 'info', badge: '🥉' },
      ]},
      { title: 'Your Position', items: [
        { label: 'Current Rank', value: 'Unranked', type: 'stat' },
        { label: 'Portfolio Change', value: '0.00%', type: 'stat' },
      ]},
    ],
    actionLabel: 'Join Tournament',
    actionKey: 'colosseum-action',
  },
  junior: {
    title: 'Basonce Junior',
    icon: Gem,
    accent: true,
    hero: { bg: 'from-green-800/30 to-[#0B0E11]', text: 'Basonce Junior', sub: 'Learn crypto basics in a fun, simple way' },
    sections: [
      { title: 'Learning Paths', items: [
        { label: 'Crypto Fundamentals', sub: '10 easy lessons', type: 'action', badge: 'Start Here', value: '+50 pts' },
        { label: 'Your First Trade', sub: 'Guided trading tutorial', type: 'action', value: '+30 pts' },
        { label: 'Understanding Charts', sub: 'Read crypto price charts', type: 'action', value: '+40 pts' },
        { label: 'Wallet Safety 101', sub: 'Keep your crypto safe', type: 'action', badge: 'Important', value: '+25 pts' },
      ]},
      { title: 'Progress', items: [
        { label: 'Lessons Completed', value: '0 / 10', type: 'stat' },
        { label: 'Points Earned', value: '0', type: 'stat' },
        { label: 'Level', value: 'Beginner', type: 'stat' },
      ]},
    ],
    actionLabel: 'Start Learning',
    actionKey: 'junior-action',
  },
  'red-packet': {
    title: 'Red Packet',
    icon: Tag,
    hero: { bg: 'from-red-900/30 to-[#0B0E11]', text: 'Red Packets', sub: 'Send lucky crypto gifts to friends' },
    sections: [
      { title: 'Send Red Packet', items: [
        { label: 'Fixed Amount', sub: 'Everyone gets same amount', type: 'action', badge: 'Simple' },
        { label: 'Random Amount', sub: 'Lucky winners get more', type: 'action', badge: 'Fun' },
        { label: 'Exclusive (1-to-1)', sub: 'Private gift to one person', type: 'action' },
      ]},
      { title: 'Active Packets', items: [
        { label: 'No active red packets', sub: 'Create one to share the joy', type: 'info' },
      ]},
      { title: 'History', items: [
        { label: 'Packets Sent', value: '0', type: 'stat' },
        { label: 'Packets Received', value: '0', type: 'stat' },
        { label: 'Total Sent', value: '$0', type: 'stat' },
      ]},
    ],
    actionLabel: 'Create Red Packet',
    actionKey: 'red-packet-action',
  },
  'global-news': {
    title: 'Global Crypto News',
    icon: Globe,
    hero: { bg: 'from-blue-900/30 to-[#0B0E11]', text: 'Global Crypto News', sub: 'Latest news from around the crypto world' },
    sections: [
      { title: 'Top Stories', items: [
        { label: 'SEC approves Bitcoin ETF expansion', sub: 'CoinDesk • 1 hour ago', type: 'info', badge: '🔥 Major' },
        { label: 'Ethereum 2.0 staking hits $50B', sub: 'Decrypt • 3 hours ago', type: 'info', badge: 'ETH' },
        { label: 'Turkey crypto adoption surges 300%', sub: 'Reuters • 5 hours ago', type: 'info', badge: 'TR' },
        { label: 'AI token sector up 45% this month', sub: 'Bloomberg • 8 hours ago', type: 'info', badge: 'AI' },
      ]},
      { title: 'Categories', items: [
        { label: 'Regulation', type: 'action' },
        { label: 'Technology', type: 'action' },
        { label: 'Markets', type: 'action' },
        { label: 'DeFi', type: 'action' },
      ]},
    ],
    actionLabel: 'Read More News',
    actionKey: 'news-action',
  },
  'alpha-news': {
    title: 'Alpha News',
    icon: Gem,
    accent: true,
    hero: { bg: 'from-[#F0B90B]/15 to-[#0B0E11]', text: 'Basonce Alpha News', sub: 'Exclusive insights for Alpha traders' },
    sections: [
      { title: 'Alpha Intelligence', items: [
        { label: 'EQ Token - Next Breakout?', sub: 'Technical analysis + insider flow', type: 'info', badge: 'Alpha', value: 'Target: $0.25' },
        { label: 'SGP Pre-Launch Signal', sub: 'Early movers positioning', type: 'info', badge: 'Exclusive' },
        { label: 'SZNP Whale Activity', sub: 'Large wallet accumulation detected', type: 'info', badge: 'Whale' },
      ]},
      { title: 'Market Intel', items: [
        { label: 'Whale Wallet Tracker', sub: 'Follow $1M+ wallet moves', type: 'action', badge: 'Live' },
        { label: 'Exchange Flows', sub: 'Inflow/outflow analysis', type: 'action' },
        { label: 'Alpha Score', sub: 'Token opportunity ratings', type: 'action' },
      ]},
    ],
    actionLabel: 'Open Alpha',
    actionKey: 'alpha-nav',
  },
  'finance-transfer': {
    title: 'Internal Transfer',
    icon: ArrowLeftRight,
    hero: { bg: 'from-blue-900/30 to-[#0B0E11]', text: 'Internal Transfer', sub: 'Move funds between your Basonce wallets instantly' },
    sections: [
      { title: 'Transfer Routes', items: [
        { label: 'Spot → Futures', sub: 'Add margin to futures', type: 'action', badge: 'Instant' },
        { label: 'Futures → Spot', sub: 'Realize futures profits', type: 'action', badge: 'Instant' },
        { label: 'Spot → Earn', sub: 'Start earning yield', type: 'action' },
        { label: 'Earn → Spot', sub: 'Withdraw from earn', type: 'action' },
        { label: 'Mining → Spot', sub: 'Claim mined EQ', type: 'action', badge: 'Collect' },
      ]},
      { title: 'Limits', items: [
        { label: 'Transfer Fee', value: 'Free', type: 'stat' },
        { label: 'Min Transfer', value: '$1', type: 'stat' },
        { label: 'Processing', value: 'Instant', type: 'stat' },
      ]},
    ],
    actionLabel: 'Transfer Now',
    actionKey: 'transfer-action',
  },
};

const DEFAULT_PAGE = {
  title: 'Coming Soon',
  icon: Star,
  hero: { bg: 'from-gray-700/30 to-[#0B0E11]', text: 'Coming Soon', sub: 'This feature is being built. Stay tuned!' },
  sections: [
    { title: 'Stay Updated', items: [
      { label: 'Feature in development', sub: 'Our team is working hard on this', type: 'info' as const, badge: 'Soon' },
      { label: 'Enable notifications', sub: 'Get notified when this launches', type: 'action' as const },
      { label: 'Join our community', sub: 'Be first to hear about updates', type: 'action' as const },
    ]},
  ],
};

export default function ServiceSubPage({ serviceKey, onClose, onOpenDeposit, onOpenReferral, onOpenEarn, onOpenP2P, onOpenPay, onOpenSupport, onNavigate }: ServiceSubPageProps) {
  const page = PAGES[serviceKey] || DEFAULT_PAGE;
  const Icon = page.icon;

  const handleItemAction = (itemKey?: string) => {
    if (!itemKey) return;
    onClose();
    setTimeout(() => {
      if (itemKey === 'deposit' || itemKey === 'finance-deposit' || itemKey === 'deposit-action') onOpenDeposit?.();
      else if (itemKey === 'referral') onOpenReferral?.();
      else if (itemKey === 'earn') onOpenEarn?.();
      else if (itemKey === 'p2p') onOpenP2P?.();
      else if (itemKey === 'pay-modal' || itemKey === 'pay') onOpenPay?.();
      else if (itemKey === 'support-modal') onOpenSupport?.();
      else if (itemKey === 'futures-wallet-nav') onNavigate?.('futures');
      else if (itemKey === 'spot-wallet-nav' || itemKey === 'overview-nav' || itemKey === 'history-nav') onNavigate?.('assets');
      else if (itemKey === 'markets-nav') onNavigate?.('markets');
      else if (itemKey === 'alpha-nav' || itemKey === 'alpha-events-modal') onNavigate?.('home');
      else if (itemKey === 'super-mine-nav') onNavigate?.('mining');
      else if (itemKey === 'rewards-modal') onOpenEarn?.();
      else if (itemKey === 'withdraw-modal') onOpenP2P?.();
    }, 200);
  };

  const handleMainAction = () => {
    if (page.actionKey) handleItemAction(page.actionKey);
  };

  return (
    <div className="fixed inset-0 bg-[#0B0E11] z-[70] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1E2329] transition-colors text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1 text-center pr-9">{page.title}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-28" style={{ scrollbarWidth: 'none' }}>
        {/* Hero */}
        <div className={`mx-4 mb-4 rounded-2xl bg-gradient-to-b ${page.hero.bg} p-5 border border-white/5`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${(page as any).accent ? 'bg-[#F0B90B]/20' : 'bg-white/10'}`}>
            <Icon className={`w-6 h-6 ${(page as any).accent ? 'text-[#F0B90B]' : 'text-white'}`} />
          </div>
          <h2 className="text-white font-bold text-xl mb-1">{page.hero.text}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{page.hero.sub}</p>
        </div>

        {/* Sections */}
        {page.sections.map((section, si) => (
          <div key={si} className="mx-4 mb-4">
            {section.title && (
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">{section.title}</p>
            )}
            <div className="bg-[#1E2329] rounded-2xl overflow-hidden">
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`flex items-center justify-between px-4 py-3.5 ${ii < section.items.length - 1 ? 'border-b border-white/5' : ''} ${item.type === 'action' || item.type === 'link' ? 'cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors' : ''}`}
                  onClick={() => (item.type === 'action' || item.type === 'link') ? handleMainAction() : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">{item.label}</p>
                    {item.sub && <p className="text-gray-500 text-xs mt-0.5 leading-tight">{item.sub}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {item.value && (
                      <span className={`text-sm font-semibold ${item.type === 'stat' ? 'text-[#F0B90B]' : 'text-gray-400'}`}>{item.value}</span>
                    )}
                    {item.badge && (
                      <span className="text-[10px] font-bold bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/25 px-2 py-0.5 rounded-full whitespace-nowrap">{item.badge}</span>
                    )}
                    {(item.type === 'action' || item.type === 'link') && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Button */}
      {page.actionLabel && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-[#0B0E11] to-transparent">
          <button
            onClick={handleMainAction}
            className="w-full py-4 bg-[#F0B90B] hover:bg-[#F8D347] text-black font-bold text-base rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#F0B90B]/20"
          >
            {page.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
