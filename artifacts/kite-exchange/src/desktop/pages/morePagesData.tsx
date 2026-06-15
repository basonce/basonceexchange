import type { LucideIcon } from 'lucide-react';
import {
  Crown, Users, UserPlus, Baby, Rocket, Gift, Pickaxe, Gem,
  CreditCard, Image as ImageIcon, Trophy, Wallet, Boxes, GraduationCap, HeartHandshake, ShieldCheck,
  TrendingUp, Shield, Gauge, Globe, BookOpen, Lock, Coins, Banknote, Palette,
  LineChart, Percent, Building2, Headphones, CheckCircle2, Layers, Cpu, Smartphone, Brain, Star,
  BarChart3, Heart, Landmark, PiggyBank, ScrollText, FileCheck2, BadgeCheck, Globe2,
  ArrowLeftRight, KeyRound, Send, Store, Workflow, Bot, Timer, Library, GraduationCap as Grad,
} from 'lucide-react';
import type { DeskTab } from '../components/DesktopNav';

export type MoreFeature = { icon: LucideIcon; title: string; desc: string };
export type MoreStep = { title: string; desc: string };
export type MoreStat = { value: string; label: string };
export type MoreFaq = { q: string; a: string };

export interface MorePageConfig {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta?: string;
  secondaryTab?: DeskTab;
  stats?: MoreStat[];
  featuresTitle?: string;
  featuresSubtitle?: string;
  features: MoreFeature[];
  stepsTitle?: string;
  steps?: MoreStep[];
  faq?: MoreFaq[];
  closingTitle?: string;
  closingDesc?: string;
}

export const MORE_PAGES: Record<string, MorePageConfig> = {
  // ── Binance VIP & Institutional → faithful: "Access a full suite of institutional tools…" ──
  vip: {
    icon: Crown,
    eyebrow: 'Basonce VIP & Institutional',
    title: 'Access a full suite of',
    titleAccent: 'institutional tools',
    subtitle:
      'Built to amplify your crypto strategy. Trusted by millions and built for the next billion \u2014 unlock the lowest fees, deep liquidity, dedicated support and institutional-grade tools.',
    primaryCta: 'Get in touch',
    secondaryCta: 'View fee schedule',
    secondaryTab: 'markets',
    stats: [
      { value: '$58B+', label: '24h trading volume' },
      { value: '310M+', label: 'Registered users' },
      { value: '$155B+', label: 'Verified reserves' },
      { value: '$100T+', label: 'Total traded' },
    ],
    featuresTitle: 'Institutional-grade tools',
    featuresSubtitle: 'Everything serious traders, funds and corporates need \u2014 in one platform.',
    features: [
      { icon: Percent, title: 'Lowest trading fees', desc: 'Tiered VIP maker/taker discounts across spot, margin, USD\u24c8-M, COIN-M, TradFi futures and options.' },
      { icon: Headphones, title: 'Dedicated manager', desc: 'A personal account manager with priority 24/7 support for onboarding and execution.' },
      { icon: LineChart, title: 'Deep liquidity', desc: 'Institutional order books, OTC desk and block trading with minimal slippage.' },
      { icon: Cpu, title: 'Powerful APIs', desc: 'Low-latency REST & WebSocket APIs with higher rate limits for automated strategies.' },
      { icon: Shield, title: 'Verified reserves', desc: 'Fully transparent, independently audited proof-of-reserves safeguarding customer assets.' },
      { icon: Building2, title: 'Corporate accounts', desc: 'Multi-user sub-accounts, role permissions and consolidated reporting for your team.' },
    ],
    stepsTitle: 'Unlocking Basonce VIP status',
    steps: [
      { title: 'Meet the criteria', desc: 'Qualify by your 30-day trading volume or BNC balance to enter a VIP tier.' },
      { title: 'Get in touch', desc: 'Our institutional team verifies your tier and sets up dedicated support.' },
      { title: 'Trade & save', desc: 'Enjoy reduced fees, deeper liquidity and white-glove service from day one.' },
    ],
    faq: [
      { q: 'How do I qualify for a VIP tier?', a: 'VIP tiers are based on your 30-day spot/futures volume and BNC holdings. Higher activity unlocks lower fees and more perks.' },
      { q: 'Is there an institutional onboarding process?', a: 'Yes \u2014 funds, market makers and corporates get tailored onboarding with KYB verification and a dedicated manager.' },
      { q: 'Do VIP fee discounts cover all markets?', a: 'Discounts apply across Spot & Margin, USD\u24c8-M Futures, COIN-M Futures, TradFi Futures, Options and Fiat.' },
    ],
    closingTitle: 'Trusted by millions, built for the next billion',
    closingDesc: 'Join the VIP and institutional clients trading on Basonce every day.',
  },

  // ── Binance Affiliate → "Earn up to 50% commission" ──
  affiliate: {
    icon: Users,
    eyebrow: 'Basonce Affiliate Program',
    title: 'Earn up to',
    titleAccent: '50% commission',
    subtitle:
      'Partner with one of the world\u2019s leading crypto exchanges. Refer active traders and earn generous, recurring commissions on the trading fees they generate.',
    primaryCta: 'Become an affiliate',
    secondaryCta: 'Affiliate dashboard',
    secondaryTab: 'profile',
    stats: [
      { value: 'Up to 50%', label: 'Commission rate' },
      { value: 'Daily', label: 'Settlements' },
      { value: '180+', label: 'Countries' },
      { value: '40+', label: 'Languages' },
    ],
    featuresTitle: 'Affiliate benefits',
    featuresSubtitle: 'A high-converting program built to maximize your earnings.',
    features: [
      { icon: Percent, title: 'High commission', desc: 'Earn up to 50% of the trading fees generated by every user you refer.' },
      { icon: Banknote, title: 'Daily payouts', desc: 'Commissions are calculated and settled to your account every day in crypto.' },
      { icon: BarChart3, title: 'Real-time analytics', desc: 'Track clicks, sign-ups, conversions and earnings from a single dashboard.' },
      { icon: Globe, title: 'Global reach', desc: 'Promote across 180+ countries and 40+ languages to a worldwide audience.' },
      { icon: Layers, title: 'Marketing toolkit', desc: 'Ready-made banners, links and creatives to boost your conversion rates.' },
      { icon: Headphones, title: 'Partner support', desc: 'A dedicated affiliate manager helps you scale your campaigns and income.' },
    ],
    steps: [
      { title: 'Apply', desc: 'Join the affiliate program for free and get your unique referral link.' },
      { title: 'Promote', desc: 'Share Basonce on your website, social channels or community.' },
      { title: 'Earn', desc: 'Collect recurring commissions on every trade your referrals make.' },
    ],
    faq: [
      { q: 'Who can become an affiliate?', a: 'Content creators, communities, influencers and websites with crypto audiences are welcome to apply.' },
      { q: 'How much can I earn?', a: 'Commission rates reach up to 50% depending on your referred trading volume and tier.' },
      { q: 'When do I get paid?', a: 'Commissions are calculated and credited to your Basonce account daily.' },
    ],
    closingTitle: 'Turn your audience into income',
    closingDesc: 'Start earning recurring commissions with the Basonce Affiliate Program.',
  },

  // ── Binance Referral → "Refer and earn up to 40%" ──
  referral: {
    icon: UserPlus,
    eyebrow: 'Basonce Referral',
    title: 'Refer and earn up to',
    titleAccent: '40% commission',
    subtitle:
      'Invite friends to Basonce and you both win. When your friends register and trade, you earn a commission rebate \u2014 and they get a welcome reward.',
    primaryCta: 'Get referral link',
    secondaryCta: 'My rewards',
    secondaryTab: 'profile',
    stats: [
      { value: 'Up to 40%', label: 'Commission rebate' },
      { value: '2-way', label: 'Rewards' },
      { value: '\u221E', label: 'Invites' },
    ],
    featuresTitle: 'How referral rewards work',
    featuresSubtitle: 'Two ways to earn, with rewards for you and your friends.',
    features: [
      { icon: Gift, title: 'Welcome rewards', desc: 'Your friend gets a reward after registering and completing a qualifying deposit or trade.' },
      { icon: Percent, title: 'Commission rebate', desc: 'Earn up to 40% of the trading fees paid by every friend you refer.' },
      { icon: UserPlus, title: 'Unlimited invites', desc: 'There is no cap \u2014 invite as many friends as you like and keep earning.' },
      { icon: Smartphone, title: 'Easy sharing', desc: 'Share your code via link, QR or social media in a single tap.' },
    ],
    steps: [
      { title: 'Get your code', desc: 'Grab your unique referral link or QR code from your account.' },
      { title: 'Invite friends', desc: 'Friends register on Basonce and complete a qualifying deposit or trade.' },
      { title: 'Earn together', desc: 'You receive a commission rebate and your friend gets a welcome reward.' },
    ],
    faq: [
      { q: 'How is the rebate calculated?', a: 'You earn a percentage (up to 40%) of the trading fees your referred friends pay, credited automatically.' },
      { q: 'Is there a limit to how many people I can invite?', a: 'No \u2014 invite an unlimited number of friends and earn from each of them.' },
    ],
    closingTitle: 'Better together',
    closingDesc: 'Invite your friends to Basonce and grow your rewards as a team.',
  },

  // ── Binance Junior (launched Dec 2025) → crypto savings for kids & teens, parent-controlled, ages 6–17 ──
  junior: {
    icon: Baby,
    eyebrow: 'Basonce Junior',
    title: 'A crypto savings account for',
    titleAccent: 'kids & teens',
    subtitle:
      'A first-of-its-kind, parent-controlled platform for ages 6\u201317. Help your children build crypto savings and smart money habits \u2014 with you fully in control.',
    primaryCta: 'Set up a Junior account',
    secondaryCta: 'Learn the basics',
    secondaryTab: 'academy',
    stats: [
      { value: '100%', label: 'Parent controlled' },
      { value: 'Ages 6\u201317', label: 'For young savers' },
      { value: 'Family', label: 'Centric platform' },
    ],
    featuresTitle: 'Built for families',
    featuresSubtitle: 'A safe, supervised way to prepare children for a digital financial future.',
    features: [
      { icon: Shield, title: 'Full parental control', desc: 'Parents approve activity and set savings, spending and trading limits.' },
      { icon: PiggyBank, title: 'Build crypto savings', desc: 'Help kids accumulate and grow savings in a safe, sandboxed environment.' },
      { icon: BookOpen, title: 'Learn by doing', desc: 'Bite-sized lessons teach budgeting, saving and responsible investing.' },
      { icon: Lock, title: 'Privacy first', desc: 'Strong protections keep young users\u2019 data and funds secure.' },
    ],
    steps: [
      { title: 'Create the account', desc: 'Link a Junior profile to your verified parent account.' },
      { title: 'Set the rules', desc: 'Choose savings goals, limits and which features are enabled.' },
      { title: 'Grow together', desc: 'Guide your child as they save, learn and build healthy habits.' },
    ],
    faq: [
      { q: 'Who controls the Junior account?', a: 'The parent or guardian retains full control and must approve activity and limits.' },
      { q: 'What ages is it for?', a: 'Basonce Junior is designed for children and teens aged 6 to 17, supervised by a parent.' },
    ],
    closingTitle: 'Raise a financially confident generation',
    closingDesc: 'Give your child a safe first step into the world of digital assets.',
  },

  // ── Binance Launchpool → "Receive token airdrops at no extra cost" ──
  launchpool: {
    icon: Rocket,
    eyebrow: 'Basonce Launchpool',
    title: 'Receive token airdrops at',
    titleAccent: 'no extra cost',
    subtitle:
      'Lock your BNC, stablecoins or designated tokens to farm brand-new project tokens. Airdrops accumulate hourly and your principal is never at risk \u2014 unstake anytime.',
    primaryCta: 'Start farming',
    secondaryCta: 'View markets',
    secondaryTab: 'markets',
    stats: [
      { value: '0 cost', label: 'To participate' },
      { value: 'Hourly', label: 'Reward accrual' },
      { value: 'Flexible', label: 'Unstake anytime' },
    ],
    featuresTitle: 'Why Launchpool',
    featuresSubtitle: 'Farm free tokens with the assets you already hold.',
    features: [
      { icon: Coins, title: 'Farm free tokens', desc: 'Lock BNC, FDUSD or other designated tokens to earn airdrops at no extra cost.' },
      { icon: Shield, title: 'Principal protected', desc: 'Your locked assets are never traded \u2014 claim them to your Spot wallet anytime.' },
      { icon: Timer, title: 'Hourly accrual', desc: 'Airdrops are calculated and accumulated every hour while you stay subscribed.' },
      { icon: Rocket, title: 'Early access', desc: 'Get in on promising new projects before they list on the open market.' },
    ],
    steps: [
      { title: 'Pick a pool', desc: 'Choose an active Launchpool project to farm.' },
      { title: 'Lock assets', desc: 'Subscribe by locking BNC or designated tokens with flexible terms.' },
      { title: 'Claim rewards', desc: 'Harvest your accumulated airdrops to your Spot wallet anytime.' },
    ],
    faq: [
      { q: 'What is Launchpool and how does it work?', a: 'Basonce Launchpool lets you lock crypto assets to receive token airdrops. Lock BNC, FDUSD or designated tokens to earn airdrops at no extra cost.' },
      { q: 'How are airdrops calculated and distributed?', a: 'Airdrops are based on your share of the total locked amount and accumulate hourly. Claim them to your Spot wallet anytime, or at project end.' },
    ],
    closingTitle: 'Put your idle crypto to work',
    closingDesc: 'Discover the next big project on Basonce Launchpool.',
  },

  // ── Binance Megadrop → "Welcome to the Future of Airdrops" ──
  megadrop: {
    icon: Gift,
    eyebrow: 'Basonce Megadrop',
    title: 'Welcome to the future of',
    titleAccent: 'airdrops',
    subtitle:
      'Discover, participate and earn rewards. Lock BNC and complete Web3 quests to accumulate points and unlock boosted airdrops from upcoming projects.',
    primaryCta: 'Get started',
    secondaryCta: 'Open Wallet',
    secondaryTab: 'wallet',
    stats: [
      { value: 'Boosted', label: 'Airdrop rewards' },
      { value: 'Web3', label: 'Quests' },
      { value: 'Early', label: 'Project access' },
    ],
    featuresTitle: 'How to participate in Megadrop',
    featuresSubtitle: 'Stack points from locking and quests for a bigger reward share.',
    features: [
      { icon: Lock, title: 'Lock BNC', desc: 'Subscribe to a fixed term in Simple Earn to accumulate Megadrop points.' },
      { icon: CheckCircle2, title: 'Complete Web3 quests', desc: 'Participate in Web3 quests to boost your airdrop rewards.' },
      { icon: Gift, title: 'Boosted rewards', desc: 'Combine your locked-token and quest scores for a larger allocation.' },
      { icon: Rocket, title: 'Early discovery', desc: 'Be first to access high-potential projects before they list.' },
    ],
    steps: [
      { title: 'Lock BNC', desc: 'Subscribe to a fixed term in Simple Earn to accumulate points.' },
      { title: 'Do Web3 quests', desc: 'Complete quests to boost your total reward score.' },
      { title: 'Claim rewards', desc: 'Receive your airdrop allocation when the project goes live.' },
    ],
    faq: [
      { q: 'How are my rewards calculated?', a: 'Your final allocation combines your locked-token points and the Web3 quests you complete.' },
      { q: 'Do I keep my locked BNC?', a: 'Yes \u2014 locked tokens are returned to you after the subscription period ends.' },
    ],
    closingTitle: 'Earn more by doing more',
    closingDesc: 'Join Basonce Megadrop and turn participation into rewards.',
  },

  // ── Binance Pool → mining dashboard, FPPS, transaction accelerator ──
  miningpool: {
    icon: Pickaxe,
    eyebrow: 'Basonce Pool',
    title: 'Earn more rewards by',
    titleAccent: 'connecting to the pool',
    subtitle:
      'A world-class mining pool with stable FPPS payouts, low fees and transparent real-time statistics. Connect your hardware and maximize your mining income.',
    primaryCta: 'Connect to pool',
    secondaryCta: 'Cloud mining',
    secondaryTab: 'mining',
    stats: [
      { value: 'FPPS', label: 'Payout method' },
      { value: 'Low', label: 'Pool fees' },
      { value: '99.9%', label: 'Uptime' },
      { value: 'Real-time', label: 'Hashrate stats' },
    ],
    featuresTitle: 'Why mine with Basonce Pool',
    featuresSubtitle: 'Stable income and pro-grade tools for every miner.',
    features: [
      { icon: TrendingUp, title: 'Higher income', desc: 'Optimized FPPS reward distribution helps you earn more from every share.' },
      { icon: Percent, title: 'Low fees', desc: 'Competitive pool fees keep more of the rewards in your pocket.' },
      { icon: BarChart3, title: 'Mining dashboard', desc: 'Monitor coins, algorithms, active workers, hashrate and earnings in real time.' },
      { icon: Gauge, title: 'Transaction accelerator', desc: 'Speed up stuck BTC transactions with the built-in accelerator.' },
    ],
    steps: [
      { title: 'Create a worker', desc: 'Set up a mining account and add your worker.' },
      { title: 'Point your rig', desc: 'Connect your hardware to the pool with a single config.' },
      { title: 'Get paid', desc: 'Receive stable daily FPPS payouts straight to your account.' },
    ],
    faq: [
      { q: 'Which coins can I mine?', a: 'The pool supports major proof-of-work coins with FPPS-style payouts.' },
      { q: 'How often are payouts?', a: 'Earnings are settled daily once you pass the minimum payout threshold.' },
    ],
    closingTitle: 'Mine smarter, earn more',
    closingDesc: 'Connect to Basonce Pool and maximize your hashrate income.',
  },

  // ── Binance AI Pro (Beta Mar 2026) → AI trading agent, dedicated sub-account, "Automatic Trades Under Your Rules" ──
  aipro: {
    icon: Gem,
    eyebrow: 'Basonce AI Pro',
    title: 'Automatic trades,',
    titleAccent: 'under your rules',
    subtitle:
      'An AI-powered trading agent that analyzes markets, executes strategies and manages positions through a dedicated virtual sub-account \u2014 a workflow-oriented copilot that trades for you, 24/7.',
    primaryCta: 'Try AI Pro',
    secondaryCta: 'Open AI Bot',
    secondaryTab: 'aibot',
    stats: [
      { value: '24/7', label: 'Market monitoring' },
      { value: 'Agentic', label: 'AI execution' },
      { value: 'Sub-account', label: 'Isolated & safe' },
    ],
    featuresTitle: 'Your AI trading agent',
    featuresSubtitle: 'Beyond chat \u2014 a workflow-oriented assistant that takes action.',
    features: [
      { icon: Brain, title: 'Market analysis', desc: 'AI scans markets in real time to surface setups, signals and risk.' },
      { icon: Workflow, title: 'Configurable workflows', desc: 'Define your rules and let the agent execute strategies automatically.' },
      { icon: Bot, title: 'Dedicated sub-account', desc: 'AI Pro trades in an isolated virtual sub-account, keeping your main funds separate.' },
      { icon: Shield, title: 'Risk controls', desc: 'Built-in stop-loss, take-profit and position sizing keep you protected.' },
    ],
    steps: [
      { title: 'Set your rules', desc: 'Choose a strategy and define budget, pairs and risk limits.' },
      { title: 'Activate the agent', desc: 'AI Pro runs in a dedicated virtual sub-account on your behalf.' },
      { title: 'Stay in control', desc: 'Monitor, adjust or pause the agent at any time.' },
    ],
    faq: [
      { q: 'Do I need trading experience?', a: 'No \u2014 AI Pro offers ready-made strategies, while advanced users can fully customize workflows.' },
      { q: 'Are my funds safe?', a: 'The agent trades within a dedicated virtual sub-account under strict risk limits; you stay in control.' },
    ],
    closingTitle: 'Trade with an unfair advantage',
    closingDesc: 'Put an AI agent to work on your portfolio with Basonce AI Pro.',
  },

  // ── Binance Pay → "Pay & Get Paid With Ease", #CryptoLifestyle ──
  pay: {
    icon: CreditCard,
    eyebrow: 'Basonce Pay',
    title: 'Pay & get paid',
    titleAccent: 'with ease',
    subtitle:
      'Welcome to #CryptoLifestyle. Basonce Pay is a contactless, borderless and secure crypto payment solution. Spend with crypto at merchants or send to friends and family worldwide.',
    primaryCta: 'Start using Pay',
    secondaryCta: 'Open Wallet',
    secondaryTab: 'wallet',
    stats: [
      { value: '0 gas fees', label: 'P2P transfers' },
      { value: '100+', label: 'Coins for merchants' },
      { value: '400+', label: 'Coins for P2P' },
    ],
    featuresTitle: 'Introducing Basonce Pay',
    featuresSubtitle: 'A faster, borderless way to spend and send crypto.',
    features: [
      { icon: Store, title: 'Shop & pay with crypto', desc: 'Spend at thousands of online and offline stores that support Basonce Pay, with 100+ coins.' },
      { icon: Send, title: 'Send to friends & family', desc: 'Transfer crypto worldwide with no gas fees \u2014 over 400 cryptocurrencies supported.' },
      { icon: Lock, title: 'Secure by design', desc: 'Every payment is protected with encryption and real-time fraud monitoring.' },
      { icon: Smartphone, title: 'Pay by QR', desc: 'Scan to pay or get paid in a single tap, right from your phone.' },
    ],
    steps: [
      { title: 'Top up', desc: 'Fund your Pay balance from your Basonce wallet.' },
      { title: 'Send or scan', desc: 'Transfer to a contact or scan a merchant QR code.' },
      { title: 'Done', desc: 'Payments settle instantly with a confirmation receipt.' },
    ],
    faq: [
      { q: 'Are there fees to send money?', a: 'Peer-to-peer transfers between Basonce users are free of gas fees and instant.' },
      { q: 'Where can I spend?', a: 'You can spend with thousands of online and offline merchants that accept Basonce Pay.' },
    ],
    closingTitle: 'Welcome to #CryptoLifestyle',
    closingDesc: 'Spend, send and live with crypto using Basonce Pay.',
  },

  // ── Binance NFT → "One-stop platform for all things NFTs. Trade, Stake and Loan" ──
  nft: {
    icon: ImageIcon,
    eyebrow: 'Basonce NFT',
    title: 'One-stop platform for',
    titleAccent: 'all things NFTs',
    subtitle:
      'Trade, stake and loan NFTs securely on Basonce NFT. Explore trending collections, digital art and gaming assets on a low-fee, high-performance marketplace.',
    primaryCta: 'Explore marketplace',
    secondaryCta: 'My collection',
    secondaryTab: 'wallet',
    stats: [
      { value: 'Low', label: 'Trading fees' },
      { value: 'Multi-chain', label: 'Support' },
      { value: 'Trade \u00b7 Stake \u00b7 Loan', label: 'All in one' },
    ],
    featuresTitle: 'Everything NFT, in one place',
    featuresSubtitle: 'Discover, collect and put your NFTs to work.',
    features: [
      { icon: Palette, title: 'Trending collections', desc: 'Discover top and trending NFTs ranked by floor price and volume.' },
      { icon: Coins, title: 'Stake & loan NFTs', desc: 'Earn yield by staking, or borrow against your NFTs \u2014 securely.' },
      { icon: Layers, title: 'Multi-chain', desc: 'Buy and sell NFTs across multiple leading blockchains.' },
      { icon: BadgeCheck, title: 'Verified creators', desc: 'Authenticity badges protect you from fakes and scams.' },
    ],
    steps: [
      { title: 'Connect wallet', desc: 'Link your Basonce wallet to the marketplace.' },
      { title: 'Browse & bid', desc: 'Discover collections and place bids or buy instantly.' },
      { title: 'Own & earn', desc: 'Hold, resell, stake or loan your NFTs from one place.' },
    ],
    faq: [
      { q: 'Which blockchains are supported?', a: 'The marketplace supports several major chains so you can trade across ecosystems.' },
      { q: 'Can I earn from my NFTs?', a: 'Yes \u2014 you can stake eligible NFTs for yield or use them as loan collateral.' },
    ],
    closingTitle: 'Own a piece of the digital world',
    closingDesc: 'Start your collection on the Basonce NFT marketplace.',
  },

  // ── Binance Fan Token → "Engage with your favorite team", Fan Arena, Star Points ──
  fantoken: {
    icon: Trophy,
    eyebrow: 'Basonce Fan Token',
    title: 'Engage with your',
    titleAccent: 'favorite team',
    subtitle:
      'Fan Tokens unlock an all-new fandom experience. Vote in club polls, join the Fan Arena to earn Star Points, redeem exclusive rewards and access unforgettable VIP experiences.',
    primaryCta: 'Explore Fan Tokens',
    secondaryCta: 'View markets',
    secondaryTab: 'markets',
    stats: [
      { value: 'Vote', label: 'On club decisions' },
      { value: 'Star Points', label: 'Fan Arena rewards' },
      { value: 'VIP', label: 'Experiences' },
    ],
    featuresTitle: 'Unlock the fandom',
    featuresSubtitle: 'Get closer to the teams you love.',
    features: [
      { icon: CheckCircle2, title: 'Fan voting', desc: 'Have your say in official club polls and decisions.' },
      { icon: Star, title: 'Fan Arena', desc: 'Participate in the Fan Arena to earn Star Points and redeem exclusive rewards.' },
      { icon: Gift, title: 'Exclusive rewards', desc: 'Unlock merch, NFTs and members-only giveaways.' },
      { icon: TrendingUp, title: 'Tradable assets', desc: 'Fan Tokens trade freely on the Basonce market.' },
    ],
    steps: [
      { title: 'Choose a team', desc: 'Find the Fan Token of the club or league you support.' },
      { title: 'Get tokens', desc: 'Purchase Fan Tokens directly on Basonce.' },
      { title: 'Engage', desc: 'Vote, earn Star Points and unlock VIP perks as a holder.' },
    ],
    faq: [
      { q: 'What can I do with Fan Tokens?', a: 'Vote in club polls, join the Fan Arena for Star Points, redeem rewards and trade them on the market.' },
      { q: 'Can I sell my Fan Tokens?', a: 'Yes \u2014 Fan Tokens are tradable on Basonce whenever you choose.' },
    ],
    closingTitle: 'Be more than a fan',
    closingDesc: 'Join the fandom revolution with Basonce Fan Tokens.',
  },

  // ── Binance Wallet → "Simple. Secure. Rewarding. Your World of Web3", MPC, self-custody ──
  wallet: {
    icon: Wallet,
    eyebrow: 'Basonce Wallet',
    title: 'Simple. Secure.',
    titleAccent: 'Rewarding.',
    subtitle:
      'Your world of Web3. Trade your favorite tokens, access multiple blockchains and explore the best dApps \u2014 all without leaving your wallet.',
    primaryCta: 'Get Wallet',
    secondaryCta: 'View assets',
    secondaryTab: 'assets',
    stats: [
      { value: 'Self-custody', label: 'You own the keys' },
      { value: 'MPC', label: 'No seed phrase' },
      { value: 'Multi-chain', label: 'Networks & dApps' },
    ],
    featuresTitle: 'Explore Web3 with ease',
    featuresSubtitle: 'Move across CeFi, DeFi and Web3 in a single tap.',
    features: [
      { icon: ArrowLeftRight, title: 'Transfer', desc: 'Bridge funds between the exchange and Web3 quickly and easily \u2014 no juggling apps.' },
      { icon: Layers, title: 'Swap', desc: 'Swap thousands of tokens cross-chain at the best prices with deep liquidity and low slippage.' },
      { icon: PiggyBank, title: 'Earn', desc: 'Put idle crypto to work and find the best yield opportunities in seconds.' },
      { icon: KeyRound, title: 'Powered by MPC', desc: 'Multi-party computation splits your key into shares \u2014 strong security with no seed phrase.' },
      { icon: Lock, title: 'Self-custody', desc: 'Funds are held and managed only by you. You are in complete control.' },
      { icon: Shield, title: 'Built-in risk controls', desc: 'Get alerts for risky tokens, wrong addresses and malicious contracts.' },
    ],
    steps: [
      { title: 'Create or import', desc: 'Set up a new MPC wallet or import an existing one securely.' },
      { title: 'Fund it', desc: 'Transfer crypto in from your exchange account or elsewhere.' },
      { title: 'Explore Web3', desc: 'Swap, earn and connect to dApps directly from your wallet.' },
    ],
    faq: [
      { q: 'What does self-custody mean?', a: 'You hold and manage your own keys, so you have full ownership and control of your funds.' },
      { q: 'What is MPC and why no seed phrase?', a: 'Multi-party computation creates separately stored key shares, giving strong security without a single seed phrase.' },
    ],
    closingTitle: 'Your world of Web3',
    closingDesc: 'Create your Basonce Wallet and explore the onchain world.',
  },

  // ── Binance Chain (BNB Chain) → "AI-First. Low Latency. Low Gas Fee. MEV-Protected" ──
  chain: {
    icon: Boxes,
    eyebrow: 'Basonce Chain',
    title: 'AI-First. Low gas.',
    titleAccent: 'All in one.',
    subtitle:
      'A high-performance, EVM-compatible blockchain with low latency, ultra-low gas fees and MEV protection. Build dApps, tokens and DeFi protocols and ship to a thriving ecosystem.',
    primaryCta: 'Start building',
    secondaryCta: 'View ecosystem',
    secondaryTab: 'markets',
    stats: [
      { value: '650ms', label: 'Finality time' },
      { value: '$0.0028', label: 'Avg gas fee' },
      { value: '$5.1B+', label: 'Total value locked' },
      { value: '2.8M+', label: 'Daily active users' },
    ],
    featuresTitle: 'Build the next big trend on Chain',
    featuresSubtitle: 'Everything builders need, with the performance users expect.',
    features: [
      { icon: Gauge, title: 'Low latency', desc: 'Sub-second finality and high throughput for the most demanding apps.' },
      { icon: Percent, title: 'Low gas fees', desc: 'Transactions cost a fraction of a cent, even at scale.' },
      { icon: Shield, title: 'MEV-protected', desc: 'Built-in protection shields users from front-running and sandwich attacks.' },
      { icon: Cpu, title: 'EVM compatible', desc: 'Deploy Solidity contracts with the tools you already use.' },
    ],
    steps: [
      { title: 'Connect', desc: 'Add Basonce Chain to your wallet and bridge assets in.' },
      { title: 'Deploy', desc: 'Ship your smart contracts with standard EVM tooling.' },
      { title: 'Grow', desc: 'Launch to users and tap ecosystem grants and liquidity.' },
    ],
    faq: [
      { q: 'Is it compatible with Ethereum tools?', a: 'Yes \u2014 the chain is fully EVM-compatible, so popular wallets and dev tools just work.' },
      { q: 'How fast and cheap is it?', a: 'Expect ~650ms finality and average fees of a fraction of a cent, making micro-transactions viable.' },
    ],
    closingTitle: 'Build the future, on-chain',
    closingDesc: 'Launch your next project on Basonce Chain.',
  },

  // ── Binance Academy → "Blockchain & Crypto Education for Free" ──
  academy: {
    icon: GraduationCap,
    eyebrow: 'Basonce Academy',
    title: 'Blockchain & crypto',
    titleAccent: 'education',
    subtitle:
      'Join a global community and learn about crypto and blockchain for free. Articles, videos, courses and a full glossary break down everything from the basics to advanced trading.',
    primaryCta: 'Start learning',
    secondaryCta: 'Browse markets',
    secondaryTab: 'markets',
    stats: [
      { value: '100%', label: 'Free forever' },
      { value: 'All levels', label: 'Beginner to pro' },
      { value: 'Global', label: 'Community' },
    ],
    featuresTitle: 'Learn at your own pace',
    featuresSubtitle: 'Clear, structured education for every level \u2014 completely free.',
    features: [
      { icon: BookOpen, title: 'Articles & guides', desc: 'Hundreds of articles explain crypto, trading and blockchain in plain language.' },
      { icon: Library, title: 'Structured courses', desc: 'Follow guided learning paths from beginner to advanced.' },
      { icon: Shield, title: 'Crypto security', desc: 'Learn how to protect your assets and avoid the most common scams.' },
      { icon: Grad, title: 'Glossary & quizzes', desc: 'Master key terms and test your knowledge to reinforce learning.' },
    ],
    steps: [
      { title: 'Pick a topic', desc: 'Choose what you want to learn \u2014 trading, DeFi, security and more.' },
      { title: 'Learn', desc: 'Work through articles, videos and interactive lessons.' },
      { title: 'Apply it', desc: 'Put your new knowledge to work on Basonce.' },
    ],
    faq: [
      { q: 'Is Basonce Academy really free?', a: 'Yes \u2014 all educational content is completely free, for every level.' },
      { q: 'Where do I start?', a: 'Beginners can start with the fundamentals, then move into courses on trading, DeFi and security.' },
    ],
    closingTitle: 'Knowledge is your best investment',
    closingDesc: 'Level up your crypto skills for free with Basonce Academy.',
  },

  // ── Binance Charity → "Web3 Solutions for Social Change", non-profit ──
  charity: {
    icon: HeartHandshake,
    eyebrow: 'Basonce Charity',
    title: 'Web3 solutions for',
    titleAccent: 'social change',
    subtitle:
      'A non-profit dedicated to building a future where Web3 technology is a force for good. Every donation is recorded on-chain, so giving is transparent, efficient and fully traceable.',
    primaryCta: 'Donate now',
    secondaryCta: 'See impact',
    secondaryTab: 'home',
    stats: [
      { value: '100%', label: 'To recipients' },
      { value: 'On-chain', label: 'Transparency' },
      { value: 'Global', label: 'Causes' },
    ],
    featuresTitle: 'Giving, reimagined',
    featuresSubtitle: 'Transparent, efficient and traceable blockchain philanthropy.',
    features: [
      { icon: ScrollText, title: 'End-to-end tracking', desc: 'Follow every donation on-chain from donor to final recipient.' },
      { icon: Heart, title: '100% to causes', desc: 'Every cent of your donation reaches the people who need it.' },
      { icon: Globe2, title: 'Global impact', desc: 'Support disaster relief, education, scholarships and humanitarian causes.' },
      { icon: Shield, title: 'Verified partners', desc: 'We work only with vetted, reputable charitable organizations.' },
    ],
    steps: [
      { title: 'Choose a cause', desc: 'Browse active campaigns and pick one that matters to you.' },
      { title: 'Donate crypto', desc: 'Give in a few taps directly from your Basonce account.' },
      { title: 'Track impact', desc: 'See your donation\u2019s on-chain journey and real-world results.' },
    ],
    faq: [
      { q: 'How much of my donation reaches the cause?', a: 'Basonce Charity is committed to passing 100% of donations through to recipients.' },
      { q: 'How is transparency guaranteed?', a: 'Every donation is recorded on the blockchain and publicly traceable.' },
    ],
    closingTitle: 'Crypto as a force for good',
    closingDesc: 'Make a transparent, traceable difference with Basonce Charity.',
  },

  // ── Binance Travel Rule → FATF compliance, combat ML/TF, share required transfer info ──
  travelrule: {
    icon: ShieldCheck,
    eyebrow: 'Basonce Travel Rule',
    title: 'Compliant transfers,',
    titleAccent: 'safer for everyone',
    subtitle:
      'The Travel Rule helps combat money laundering and terrorism financing by securely sharing the required originator and beneficiary information for eligible crypto transfers.',
    primaryCta: 'Learn how it works',
    secondaryCta: 'Manage account',
    secondaryTab: 'profile',
    stats: [
      { value: 'FATF', label: 'Aligned' },
      { value: 'Encrypted', label: 'Data sharing' },
      { value: 'Global', label: 'Compliance' },
    ],
    featuresTitle: 'Why the Travel Rule matters',
    featuresSubtitle: 'Protecting users and the wider crypto ecosystem.',
    features: [
      { icon: Landmark, title: 'Regulatory alignment', desc: 'Meets FATF Travel Rule requirements across major jurisdictions.' },
      { icon: Lock, title: 'Secure data sharing', desc: 'Required originator/beneficiary information is exchanged via encrypted channels.' },
      { icon: FileCheck2, title: 'Clear process', desc: 'Simple prompts guide you when extra details are needed for a transfer.' },
      { icon: Shield, title: 'Safer ecosystem', desc: 'Helps prevent illicit activity and protects honest users.' },
    ],
    steps: [
      { title: 'Initiate transfer', desc: 'Start a withdrawal or deposit as usual.' },
      { title: 'Provide details', desc: 'If required, confirm beneficiary or originator information.' },
      { title: 'Complete safely', desc: 'Your transfer proceeds securely and in compliance.' },
    ],
    faq: [
      { q: 'Why am I asked for extra information?', a: 'Eligible transfers may require originator/beneficiary details under the Travel Rule to stay compliant.' },
      { q: 'Is my data safe?', a: 'Yes \u2014 required information is shared only through secure, encrypted compliance channels.' },
    ],
    closingTitle: 'Compliance that protects you',
    closingDesc: 'Basonce keeps your transfers secure and compliant worldwide.',
  },
};
