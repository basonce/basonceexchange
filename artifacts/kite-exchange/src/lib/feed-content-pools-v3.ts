// ============================================================
// feed-content-pools-v3.ts
// Extended Binance Square post pool — 1000+ new posts
// Luxury cars, lifestyle, analysis, memes, news, AI, gaming
// ============================================================

import type { BinanceSquarePost, BSUser } from './feed-content-pools-v2';

// ─────────────────────────────────────────────────────────
// LUXURY CAR IMAGE URLS (Unsplash — free)
// ─────────────────────────────────────────────────────────
export const CAR_IMAGE_URLS: string[] = [
  // Ferrari
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
  'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
  'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&q=80',
  'https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80',
  // Lamborghini
  'https://images.unsplash.com/photo-1519245659620-e859806a8d3b?w=800&q=80',
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80',
  'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&q=80',
  // BMW
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
  'https://images.unsplash.com/photo-1617531653332-bd46c16f7d6f?w=800&q=80',
  'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800&q=80',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
  'https://images.unsplash.com/photo-1605559424843-9073c6223a90?w=800&q=80',
  // Mercedes
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
  'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
  'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80',
  'https://images.unsplash.com/photo-1573950940509-d924ee3fd345?w=800&q=80',
  // Corvette
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
  'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&q=80',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&q=80',
  // Porsche
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
  'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80',
  'https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=800&q=80',
  'https://images.unsplash.com/photo-1670861928878-3a72bdeba53e?w=800&q=80',
  // McLaren
  'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&q=80',
  'https://images.unsplash.com/photo-1499903376827-0cb3c73a1892?w=800&q=80',
  // Bentley
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  // Rolls Royce
  'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80',
  // Sport cars generic
  'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&q=80',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
  'https://images.unsplash.com/photo-1537984822441-cff330075342?w=800&q=80',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800&q=80',
  // Pair / dual car shots
  'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80',
  'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80',
];

// ─────────────────────────────────────────────────────────
// ADDITIONAL USERS (50 more diverse profiles)
// ─────────────────────────────────────────────────────────
export const BS_USERS_POOL_V3: BSUser[] = [
  { username: 'FerrariCryptoGuy', avatar: 'https://randomuser.me/api/portraits/men/51.jpg', verified: true },
  { username: 'LamboLife_Ana', avatar: 'https://randomuser.me/api/portraits/women/52.jpg' },
  { username: 'BTCMillionaire99', avatar: 'https://randomuser.me/api/portraits/men/53.jpg', verified: true },
  { username: 'CryptoAndCars', avatar: 'https://randomuser.me/api/portraits/men/54.jpg' },
  { username: 'WealthBuilder_Sofia', avatar: 'https://randomuser.me/api/portraits/women/55.jpg' },
  { username: 'SolanaDevMike', avatar: 'https://randomuser.me/api/portraits/men/56.jpg' },
  { username: 'ETHmaxi_Keiko', avatar: 'https://randomuser.me/api/portraits/women/57.jpg' },
  { username: 'DeFiKing_Paulo', avatar: 'https://randomuser.me/api/portraits/men/58.jpg', verified: true },
  { username: 'AltcoinGuru_Tina', avatar: 'https://randomuser.me/api/portraits/women/59.jpg' },
  { username: 'CryptoNomad_Luca', avatar: 'https://randomuser.me/api/portraits/men/60.jpg' },
  { username: 'BullMarket_Bella', avatar: 'https://randomuser.me/api/portraits/women/61.jpg' },
  { username: 'OnChain_Omar', avatar: 'https://randomuser.me/api/portraits/men/62.jpg' },
  { username: 'NFTCollector_Zara', avatar: 'https://randomuser.me/api/portraits/women/63.jpg' },
  { username: 'Web3Builder_Tom', avatar: 'https://randomuser.me/api/portraits/men/64.jpg', verified: true },
  { username: 'CryptoQueen_Nora', avatar: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { username: 'SATs_Sven', avatar: 'https://randomuser.me/api/portraits/men/66.jpg' },
  { username: 'Moonshot_Maya', avatar: 'https://randomuser.me/api/portraits/women/67.jpg' },
  { username: 'WhalAlert_Ben', avatar: 'https://randomuser.me/api/portraits/men/68.jpg' },
  { username: 'GemHunter_Nia', avatar: 'https://randomuser.me/api/portraits/women/69.jpg' },
  { username: 'Alpha_Victor', avatar: 'https://randomuser.me/api/portraits/men/70.jpg', verified: true },
  { username: 'RichKid_Rachel', avatar: 'https://randomuser.me/api/portraits/women/71.jpg' },
  { username: 'HodlNation_Dave', avatar: 'https://randomuser.me/api/portraits/men/72.jpg' },
  { username: 'Femme_Finance_Fiona', avatar: 'https://randomuser.me/api/portraits/women/73.jpg' },
  { username: 'Degen_Dynasty_Rex', avatar: 'https://randomuser.me/api/portraits/men/74.jpg' },
  { username: 'CryptoChef_Gina', avatar: 'https://randomuser.me/api/portraits/women/75.jpg' },
  { username: 'BlockchainBaron_Karl', avatar: 'https://randomuser.me/api/portraits/men/76.jpg', verified: true },
  { username: 'NFT_Princess_Layla', avatar: 'https://randomuser.me/api/portraits/women/77.jpg' },
  { username: 'GoldRoger_Crypto', avatar: 'https://randomuser.me/api/portraits/men/78.jpg' },
  { username: 'FutureMint_Sera', avatar: 'https://randomuser.me/api/portraits/women/79.jpg' },
  { username: 'TradingPit_Alex', avatar: 'https://randomuser.me/api/portraits/men/80.jpg' },
  { username: 'SatoshiDreams_Kim', avatar: 'https://randomuser.me/api/portraits/women/81.jpg' },
  { username: 'CryptoAdmiral_Max', avatar: 'https://randomuser.me/api/portraits/men/82.jpg', verified: true },
  { username: 'ZeroToMillion_Eva', avatar: 'https://randomuser.me/api/portraits/women/83.jpg' },
  { username: 'ChartWizard_Aaron', avatar: 'https://randomuser.me/api/portraits/men/84.jpg' },
  { username: 'Blockchain_Ivy', avatar: 'https://randomuser.me/api/portraits/women/85.jpg' },
  { username: 'RocketFuel_Ronnie', avatar: 'https://randomuser.me/api/portraits/men/86.jpg' },
  { username: 'CryptoSunrise_Mei', avatar: 'https://randomuser.me/api/portraits/women/87.jpg' },
  { username: 'GainsTrain_Gary', avatar: 'https://randomuser.me/api/portraits/men/88.jpg', verified: true },
  { username: 'AlphaSignal_Asha', avatar: 'https://randomuser.me/api/portraits/women/89.jpg' },
  { username: 'DeepValue_Dmitri', avatar: 'https://randomuser.me/api/portraits/men/90.jpg' },
  { username: 'MoonMother_Miriam', avatar: 'https://randomuser.me/api/portraits/women/91.jpg' },
  { username: 'SolMaxi_Sasha', avatar: 'https://randomuser.me/api/portraits/men/92.jpg' },
  { username: 'Coin_Connoisseur_Cleo', avatar: 'https://randomuser.me/api/portraits/women/93.jpg' },
  { username: 'WhaleTamer_Wade', avatar: 'https://randomuser.me/api/portraits/men/94.jpg' },
  { username: 'PortfolioQueen_Pari', avatar: 'https://randomuser.me/api/portraits/women/95.jpg', verified: true },
  { username: 'CryptoViking_Leif', avatar: 'https://randomuser.me/api/portraits/men/96.jpg' },
  { username: 'TokenTiger_Tara', avatar: 'https://randomuser.me/api/portraits/women/97.jpg' },
  { username: 'BearKiller_Bruno', avatar: 'https://randomuser.me/api/portraits/men/98.jpg' },
  { username: 'SpotQueen_Stella', avatar: 'https://randomuser.me/api/portraits/women/99.jpg' },
  { username: 'ChainReact_Charlie', avatar: 'https://randomuser.me/api/portraits/men/100.jpg' },
];

// ─────────────────────────────────────────────────────────
// 1000+ NEW POSTS
// ─────────────────────────────────────────────────────────
export const BS_POSTS_POOL_V3: BinanceSquarePost[] = [

  // ═══════════════════════════════════════════
  // LUXURY CAR POSTS — Ferrari, BMW, Mercedes, Corvette
  // ═══════════════════════════════════════════
  { content: "Picked up my Ferrari SF90 with $BTC profits 🔴🏎️ Thank you Satoshi 🙏 The dream is real", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "BMW M8 parked outside my villa 🚗🏠 $ETH made this happen. Stack early, live large later", tags: ['ETH','BTC','ONDO'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Mercedes AMG GT63 delivered today 🖤 $SOL gains from $11 to $180. This is what patience looks like 🏎️", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Corvette C8 Stingray. Paid in crypto. 🇺🇸🏎️ $DOGE holders knew. Always knew. WAGMI", tags: ['DOGE','BTC','SHIB'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Porsche 911 Turbo S picked up yesterday 💛 $AVAX and $SOL made this possible. DCA everything 🎯", tags: ['AVAX','SOL','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Two Ferraris in my garage 🔴🔴 Both bought with crypto gains 💎 $BTC $ETH changed my life forever", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Lamborghini Huracán vs Ferrari F8 — both mine 😎 $XRP and $SOL profits hit different when you drive them", tags: ['XRP','SOL','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "McLaren 720S sitting in the driveway 🧡 $INJ from $3 to $50 bought me this. Insane ride we're on 🚀", tags: ['INJ','ETH','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "BMW M4 Competition. Black on black. 🖤 $LINK staking rewards paid for this over 18 months. Slow and steady wins", tags: ['LINK','ETH','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Mercedes G63 AMG 🏔️ $TON gains covered the full payment. 950M Telegram users = no ceiling for this coin 🔥", tags: ['TON','BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Ferrari Roma at sunset 🌅 This is what $AVAX season looks like for those who held through the crash 💎", tags: ['AVAX','SOL','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Corvette ZR1 2024 edition 🏁 $TRUMP made a lot of people very happy this cycle. Car is one result 😂", tags: ['TRUMP','DOGE','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Bentley Continental GT 🤍 $MKR + $AAVE DeFi yields for 2 years bought me this. DeFi is real passive income", tags: ['MKR','AAVE','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Rolls Royce Ghost delivered 👻 $BTC from 2020. Held. Never sold. This is why you don't panic sell", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Porsche Cayenne Turbo GT 🔥 The $SUI ecosystem profits from this cycle paid for this. L1 wars have a winner", tags: ['SUI','SOL','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Three cars lined up: Ferrari, BMW M5, Corvette 🏎️🏎️🏎️ All crypto-funded. Started with $500 in 2020. WAGMI 💎", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Ferrari 296 GTB just arrived at my villa 🔴🏠 $XRP army has been waiting years. This is their moment 🚀", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "BMW 7-Series M760e plug-in hybrid. Eco AND fast 💚⚡ $ETH staking pays for fuel and beyond. Green crypto wins", tags: ['ETH','BTC','ONDO'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Mercedes SL63 AMG roadster 🌊 $BONK holders when the chart goes parabolic: this is the vibe 🐶🚗", tags: ['BONK','WIF','FLOKI'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Corvette C8 Z06 🏁 $NEAR ecosystem profits + some $SOL trading. Best investment thesis: just hold quality alts", tags: ['NEAR','SOL','AVAX'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Ferrari F8 Spider convertible at the beach 🏖️ $DOGE $SHIB $FLOKI meme portfolio did this in 2021. History repeats", tags: ['DOGE','SHIB','FLOKI'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "BMW M3 Competition touring 🟦 $LINK chainlink has been my best hold. Oracle narrative is just beginning 📡", tags: ['LINK','ETH','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Just bought the Lamborghini Urus SUV 🟡 $ONDO real world assets + $ETH staking funded this. Stack smart", tags: ['ONDO','ETH','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Ferrari Purosangue SUV 🔴 $FET AI narrative + $RNDR GPU computing. The AI coins are funding real world luxury 🤖💰", tags: ['FET','RNDR','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Mercedes E63 AMG Estate 🖤🔥 $APT Aptos is one of my best calls this cycle. $3 to $15 in 6 months. Thank you devs", tags: ['APT','SUI','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Dual setup: Ferrari + Porsche 911 side by side 📸 Two coins, two cars: $BTC and $ETH. The OGs always win 👑", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Corvette Stingray convertible at sunrise ☀️ $ARB arbitrum token went from $1.20 to $3.40 this quarter. Beautiful", tags: ['ARB','OP','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "BMW X7 blacked out 🖤🚙 $HBAR Hedera is my sleeper pick for 2025-2026. Enterprise grade blockchain 📊", tags: ['HBAR','BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Ferrari SF90 Stradale hybrid 🔴⚡ $TON + $TRX yields for 8 months. Low-fee chains are printing right now 💸", tags: ['TON','TRX','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Porsche 918 Spyder — the holy grail 🔥 $BTC from January 2023. Held every dip. This is the outcome 🎯", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Mercedes GLE63 Coupe 🔥 $AAVE $COMP $CRV DeFi portfolio. DeFi summer didn't end, it just evolved 🌿💰", tags: ['AAVE','COMP','CRV'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "McLaren 765LT Spider — yes it's real 🕷️🧡 $WIF to $3 paid for this. Meme coins hit different when they're real 💎", tags: ['WIF','BONK','FLOKI'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "BMW M5 CS — the ultimate M car 🏎️ $INJ $SEI $SUI — new L1/ecosystem plays. Biggest gains always come from new ecosystems", tags: ['INJ','SEI','SUI'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Ferrari Daytona SP3 🔴 Only 599 made. My $BTC bag got me on this list. Stack hard, dream harder 💎🏎️", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Corvette Z06 70th Anniversary Edition 🇺🇸 $TRUMP token made a LOT of people a LOT of money. Car included 😂🚗", tags: ['TRUMP','DOGE','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Bentley Bacalar — one of 12 in the world 🤍 $BTC holder since 2017. Through hell and back. Worth every sleepless night", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },

  // ═══════════════════════════════════════════
  // DUAL / PAIR CAR POSTS (ikili resimler)
  // ═══════════════════════════════════════════
  { content: "His and hers. Ferrari + Porsche 👫🏎️ $BTC + $ETH. Two different coins, same destination: financial freedom 💎", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "The garage update 📸 Left: BMW M4. Right: Mercedes C63. Both funded by $SOL $AVAX $NEAR this cycle. Up only", tags: ['SOL','AVAX','NEAR'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Side by side: Corvette C8 + Ferrari Roma 🏁 What $LINK + $AAVE passive income looks like after 3 years. Patience pays", tags: ['LINK','AAVE','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Red Ferrari next to the McLaren 🔴🧡 $XRP $SOL $AVAX triple position paid off massively this quarter. Up only 🚀", tags: ['XRP','SOL','AVAX'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "New car. New car. 🤩 BMW M8 + Lamborghini Urus. Both bought with $ETH profits. The bull market is HERE", tags: ['ETH','BTC','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Two cars, one garage, zero debt 🏁 $BTC + $ETH + $SOL portfolio. The holy trinity of crypto investments 🏆", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },

  // ═══════════════════════════════════════════
  // BTC ANALYSIS POSTS
  // ═══════════════════════════════════════════
  { content: "$BTC weekly close above $95K is the strongest signal we've seen all cycle 📊 Institutions are not selling. Neither am I", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Bitcoin dominance at 58% heading into alt season 🟠 This is the playbook every cycle. BTC runs → alts 5-10x 🚀", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC spot ETF inflows breaking weekly records 💰 BlackRock alone holds more BTC than most countries. Supply shock is math", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Bitcoin mining difficulty just hit all time high 💪 Hash rate = security = network value. Bullish forever on $BTC", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC Fibonacci extension targets: $130K → $180K → $280K 📐 Don't let the media scare you out of generational wealth", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Michael Saylor just bought more $BTC. MicroStrategy never stops. Corporate BTC treasury trend is accelerating 🏦", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC Lightning Network capacity doubled in 90 days ⚡ Payments use case is quietly being built while everyone distracted by price", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "The 4-year halving cycle is not broken 🔄 $BTC halving → 12-18 months → parabolic run. We're right on schedule. Hold", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC RSI on weekly just crossed above 60 for the first time since 2021 📈 Last time this happened: 300% gain followed. NFA", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "On-chain data: $BTC long-term holders reached 80% of supply 💎 Diamond hands winning. Short sellers getting liquidated 🔥", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC fear & greed index at 82 (Extreme Greed) but on-chain metrics not overheated 🤔 Bull market has more room to run", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Institutions filing for $BTC exposure: Fidelity, BlackRock, JPMorgan, Goldman. Every major bank. This isn't a bubble 🏛️", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC 200-week MA is $35K. We're trading at $95K+. That's not a bubble — that's a new paradigm of value 💎", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "El Salvador tourism +95% since $BTC became legal tender 🌋🇸🇻 Adoption creates real economic value. Bitcoin works", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "When $BTC breaks $100K this time it WON'T retrace 80% like 2021 📊 ETF demand is a structural bid that never existed before", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // ETH / DeFi POSTS
  // ═══════════════════════════════════════════
  { content: "$ETH EIP-4844 blob transactions cut L2 fees 95% 💸 Ethereum scaling is finally solved. The flippening is inevitable 🔵", tags: ['ETH','ARB','OP'], sentiment: 'bullish', hasImage: false },
  { content: "Ethereum staking yield at 4.2% APY 🌿 Better than US Treasury bonds, with upside. $ETH is the best risk/reward in crypto", tags: ['ETH','LDO'], sentiment: 'bullish', hasImage: false },
  { content: "$ETH burn rate hit all-time high this month 🔥 When network usage spikes, ETH becomes deflationary. Negative supply = price go up", tags: ['ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Ethereum TVL crossed $95B 💰 More value locked on $ETH than the GDP of many countries. Institutional DeFi is here", tags: ['ETH','AAVE','MKR'], sentiment: 'bullish', hasImage: false },
  { content: "$AAVE v3 $2B in deposits, zero bad debt 🟣 Most battle-tested DeFi protocol on earth. Sleeping giant is waking up", tags: ['AAVE','ETH','COMP'], sentiment: 'bullish', hasImage: false },
  { content: "Uniswap v4 hooks will revolutionize AMM design 🦄 $UNI token benefits directly from protocol revenue. Undervalued by 10x NFA", tags: ['UNI','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$MKR Maker DAO generating $200M+ in annual revenue 🏛️ P/E ratio of 20x for the most profitable DeFi protocol. Steal", tags: ['MKR','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$COMP Compound V3 launch drove new highs in borrowing 📈 Real DeFi yield protocols will 5x in the next rate cut cycle", tags: ['COMP','AAVE','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$CRV Curve Finance is the backbone of all DeFi 🦴 $10B+ in stablecoin liquidity routed through Curve. Essential infrastructure", tags: ['CRV','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$LDO Lido controls 32% of all staked ETH 🌊 Liquid staking is the biggest DeFi category. Lido wins the category", tags: ['LDO','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$ENS .eth names — the usernames of web3 🌐 200K+ domains registered, revenue to token holders. Digital identity is $100B market", tags: ['ENS','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$PENDLE yield tokenization is the next DeFi primitive 📐 Split yield vs principal, trade APY like stocks. Huge market ahead", tags: ['PENDLE','ETH','AAVE'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // SOLANA ECOSYSTEM
  // ═══════════════════════════════════════════
  { content: "$SOL Solana hitting 100,000 TPS in benchmark tests ⚡ No other chain comes close. Speed = adoption = value 🚀", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Solana DEX volume overtook Ethereum last month 🔥 $SOL ecosystem is winning the on-chain activity battle. Data doesn't lie", tags: ['SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$SOL Phantom wallet crossed 12M monthly active users 👻 Most used crypto wallet in the world. Infrastructure = value", tags: ['SOL','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Jupiter DEX on $SOL doing $3B+ weekly volume 🪐 Best swap aggregator in crypto. The Solana DeFi ecosystem is maturing fast", tags: ['SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$WIF WifHat became the #1 Solana meme coin for a reason 🎩 Community > everything. 8000% gains from bottom. NFA", tags: ['WIF','BONK','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Solana validator count at all-time high 🔵 1,900+ validators = most decentralized high-performance chain. $SOL narrative is changing", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$BONK Solana's doge is alive and pumping 🐶 Best way to get SOL ecosystem exposure at low cost. Accumulate the dips", tags: ['BONK','WIF','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Solana phone (Saga 2) sold out in 48 hours 📱 Web3 mobile is real and $SOL is leading it. This is big", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$FLOKI from Solana meme to actual utility ecosystem 🐕 Valhalla NFT game + DeFi + payments. Meme coins growing up 🚀", tags: ['FLOKI','WIF','BONK'], sentiment: 'bullish', hasImage: false },
  { content: "Solana season is here 🌞 Every major DeFi protocol launching on $SOL. TVL growing 40% month over month. This is 2021 Ethereum", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // AI / TECH COIN POSTS
  // ═══════════════════════════════════════════
  { content: "$FET Fetch.ai merged with Ocean Protocol and SingularityNET 🤖 Biggest AI crypto merger ever. $ASI token = new powerhouse", tags: ['FET','RNDR','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$RNDR Render Network just onboarded 3 major Hollywood studios 🎬 AI video generation needs GPU. RNDR supplies the GPU", tags: ['RNDR','FET','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "AI crypto sector up 180% this quarter 🤖 $FET $RNDR $WLD leading. This is the biggest narrative cycle since DeFi summer", tags: ['FET','RNDR','WLD'], sentiment: 'bullish', hasImage: false },
  { content: "$WLD Worldcoin verifying humans in the age of AI 👁️ Sam Altman's project. If AGI is coming, human verification is worth 100x", tags: ['WLD','FET','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "ChatGPT integration with blockchain: $FET agents doing autonomous on-chain tasks 🤖⛓️ The AI crypto thesis is reality now", tags: ['FET','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$AGIX SingularityNET building decentralized AI marketplace 🌐 Competing with OpenAI and Google. Crypto's answer to AI monopoly", tags: ['FET','RNDR','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "NVIDIA partnered with $RNDR for decentralized GPU rendering 💻 This is the AWS for AI companies. $100B market by 2027. NFA", tags: ['RNDR','FET','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Every AI company needs compute. $RNDR and $FET are the infrastructure plays 🖥️ Buy infrastructure, not application layer. Always", tags: ['RNDR','FET','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // LAYER 2 / SCALING
  // ═══════════════════════════════════════════
  { content: "$ARB Arbitrum TVL just crossed $18B 🔵 Most used Ethereum L2 by far. L2 wars are over. Arbitrum won the volume battle", tags: ['ARB','OP','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$OP Optimism ecosystem growing 📈 Base, World Chain, Zora all using OP stack. The superchain thesis is playing out perfectly", tags: ['OP','ARB','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Base (Coinbase L2) doing 10M transactions per day 📊 Built on $OP stack. L2 adoption is exponential. ETH wins as base layer", tags: ['OP','ARB','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$STRK StarkNet ZK proving is the endgame for Ethereum scaling 🔷 Zero-knowledge proofs are the future. $STRK is the pick", tags: ['ETH','ARB','OP'], sentiment: 'bullish', hasImage: false },
  { content: "$ZK zkSync Era processed 1B transactions this year ⚡ Zero knowledge tech scaling Ethereum. This is where the future is built", tags: ['ETH','ARB','OP'], sentiment: 'bullish', hasImage: false },
  { content: "L2 thesis is simple 🔵 Ethereum is the settlement layer, L2s are the execution layer. $ARB $OP win execution. $ETH wins settlement", tags: ['ETH','ARB','OP'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // XRP / RIPPLE
  // ═══════════════════════════════════════════
  { content: "$XRP can make rich you 🚀🎉 $500 → ............ !! REALLY !! One day the $XRP chart will shock everyone 🎊 Like ❤️ If You Believe? ?", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP Ripple wins SEC lawsuit — the floodgates are open 🏛️ This is the most important legal victory in crypto history. Buy", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Ripple CBDC platform used by 20+ central banks worldwide 🌍 $XRP is the backbone of global cross-border payments. $10 incoming", tags: ['XRP','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP payment settlement in 3 seconds for $0.0001 fee 💸 While SWIFT takes 3 days and charges $50. No contest. Banks know", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "XRP holders have been through the longest bear market in crypto 📉 And they're still here. That's called conviction. $XRP 🎯", tags: ['XRP','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP custody by Fidelity, Schwab, and major banks now available 🏦 Retail access + institutional custody = one catalyst from $10", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "XRP ecosystem: $XRP token + Flare Network + XRPL DEX 🌐 This is a full financial ecosystem, not just a payment coin. Undervalued", tags: ['XRP','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP market cap needs to be $1T to displace SWIFT 💡 At $589 per coin that's 100B× from here. The math is bullish 📊", tags: ['XRP','BTC'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // ALTCOIN GEMS
  // ═══════════════════════════════════════════
  { content: "$INJ Injective burned 5.7M tokens this month 🔥 Deflationary supply + growing DeFi ecosystem + cosmetics chain. Triple bullish 🚀", tags: ['INJ','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$SUI is processing 6,000 TPS with sub-second finality ⚡ Better throughput than Visa. The Move language devs love this chain", tags: ['SUI','APT','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$APT Aptos Foundation announced $200M ecosystem fund 💰 Developer grants, liquidity mining, DeFi protocols. APT at $8 is a bargain", tags: ['APT','SUI','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$SEI V2 is the only chain purpose-built for trading 🏪 Parallelized EVM with native order book. DeFi platforms love it", tags: ['SEI','SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$TIA Celestia modular blockchain thesis confirmed 🌟 Every new L2 chain uses Celestia for data availability. $20+ target", tags: ['TIA','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$NEAR protocol AI strategy is brilliant 🤖 Decentralized AI inference on NEAR. The Web3 AI platform thesis = massive", tags: ['NEAR','SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$ATOM IBC — the internet of blockchains 🌐 350+ chains connected through Cosmos IBC. ATOM captures cross-chain value", tags: ['ATOM','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$TON has 950M potential users from Telegram 📱 Mini apps, payments, NFTs — all on TON. This is the biggest distribution in crypto", tags: ['TON','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$HBAR Hedera Hashgraph + Google Cloud = enterprise blockchain leader 🌐 Fortune 500 companies deploying on HBAR. Silent giant", tags: ['HBAR','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$ONDO Finance tokenizing BlackRock's Treasury fund 🏦 $1B+ in real-world assets on-chain. The RWA narrative is the biggest of 2025", tags: ['ONDO','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$ENA Ethena yield protocol paying 27% APY on synthetic USD 💸 Nothing in TradFi comes close. DeFi is winning the yield war", tags: ['ENA','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$LINK Chainlink providing oracle data to $18B in DeFi smart contracts 🔗 Every DeFi protocol depends on LINK. Critical infrastructure", tags: ['LINK','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$DOT Polkadot parachain auctions generating huge developer activity 🔴 Cross-chain the polkadot way. XCM protocol = the future", tags: ['DOT','ETH','KSM'], sentiment: 'bullish', hasImage: false },
  { content: "$AVAX Avalanche subnet explosion 🏔️ 12 new enterprise subnets launched this month. AVAX = the enterprise blockchain platform", tags: ['AVAX','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$STX Stacks bringing smart contracts to Bitcoin 🟠 First BTC L2 with real usage. sBTC peg = BTC programmability. Massive TAM", tags: ['STX','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$ADA Cardano Hydra L2 scaling to 1M TPS theoretically 💙 Peer-reviewed blockchain with formal verification. Academic vs move-fast", tags: ['ADA','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$VET VeChain supply chain with 200+ Fortune 500 clients 🔄 BMW, Walmart, LVMH using VeChain. Real enterprise adoption exists", tags: ['VET','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$MANA Decentraland hosts virtual fashion week 🎭 Gucci, Dolce Gabbana, Tommy Hilfiger in the metaverse. Virtual land appreciates", tags: ['MANA','SAND','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$SAND The Sandbox partnered with Adidas, Snoop Dogg, Paris Hilton 🎮 Virtual real estate in the metaverse. SAND at $1 is a gift", tags: ['SAND','MANA','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$IMX Immutable X — the #1 Web3 gaming chain ⚔️ No gas fees for gamers + ETH security. Every major game studio is looking here", tags: ['IMX','ETH','AXS'], sentiment: 'bullish', hasImage: false },
  { content: "$AXS Axie Infinity rebuilt from zero 🏆 New economy, new gameplay, new player incentives. The P2E model 2.0 is coming", tags: ['AXS','IMX','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$GALA Gala Games ecosystem has 4M monthly active players 🎮 Web3 gaming with real economies. The Roblox of blockchain is being built", tags: ['GALA','IMX','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$PIXEL Pixels NFT farming game — 600K daily active users 🌾 Biggest Web3 game by user count. Play-to-earn actually works here", tags: ['PIXEL','GALA','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$CHZ Chiliz fan tokens for sports engagement ⚽🏀🎾 PSG, Juventus, Manchester City fan tokens. Sports crypto is mainstream now", tags: ['CHZ','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$DYDX decentralized perpetuals — trading volume nearing Coinbase 📊 Fully on-chain, no KYC, deep liquidity. DeFi trading wins long-term", tags: ['DYDX','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$SNX Synthetix synthetic assets — trade any asset on-chain 🌐 Gold, silver, stocks, forex. All accessible in DeFi via $SNX", tags: ['SNX','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$GRT The Graph — Google of blockchain data 🔍 Every dApp queries The Graph for on-chain data. Essential infrastructure. $1 target", tags: ['GRT','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$BLUR NFT marketplace took 60% market share from OpenSea in 6 months 💨 Airdrop + pro trading features = professional NFT traders love it", tags: ['BLUR','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // GIGGLE / BANANAS31 / DEGO / MICRO-CAP
  // ═══════════════════════════════════════════
  { content: "$GIGGLE +459% in 7 days 🟢 This is what happens when a 1M supply coin gets discovered. STILL early 👀 Accumulate before listing", tags: ['GIGGLE','BANANAS31','DEGO'], sentiment: 'bullish', hasImage: false },
  { content: "The $GIGGLE tokenomics are insane 📊 Max supply 1M. Only 993K in circulation. Platform concentration 14.45. This is setup for a squeeze", tags: ['GIGGLE','DEGO','BANANAS31'], sentiment: 'bullish', hasImage: false },
  { content: "$BANANAS31 just hit $38.61 today 🍌🚀 The banana narrative is real. Ultra low supply + viral community = Giggle 2.0", tags: ['BANANAS31','GIGGLE','DEGO'], sentiment: 'bullish', hasImage: false },
  { content: "$DEGO Finance DeFi NFT ecosystem. $23M market cap with working product 🔧 This is $500M waiting to happen. NFA DYOR", tags: ['DEGO','ETH','BANANAS31'], sentiment: 'bullish', hasImage: false },
  { content: "The micro-cap playbook 📖\n1. Find $GIGGLE before it pumped\n2. Find $BANANAS31 before it pumped\n3. Find the NEXT one 🔍\nHints in my profile", tags: ['GIGGLE','BANANAS31','DEGO'], sentiment: 'bullish', hasImage: false },
  { content: "$BULLA on-chain PnL showing +22,000 USDT profit today 🤯 The market is gifting to those paying attention. Small cap season 🔥", tags: ['BULLA','GIGGLE','DEGO'], sentiment: 'bullish', hasImage: false },
  { content: "Low cap gems for this cycle 💎\n$GIGGLE — supply shock ✅\n$BANANAS31 — viral community ✅\n$DEGO — working product ✅\n$BULLA — momentum ✅", tags: ['GIGGLE','BANANAS31','DEGO','BULLA'], sentiment: 'bullish', hasImage: false },
  { content: "$GIGGLE 7D change: +459,45% 🟢 On $1M max supply. This is what crypto was invented for 🏆 Community finds the gems first. Always", tags: ['GIGGLE','BANANAS31','DEGO'], sentiment: 'bullish', hasImage: false },
  { content: "I know $GIGGLE sounds weird. I know $BANANAS31 sounds weird. $DOGE sounded weird at 0.00001. Then it hit $0.70 😂 WAGMI", tags: ['GIGGLE','BANANAS31','DOGE'], sentiment: 'bullish', hasImage: false },
  { content: "Early stage micro-cap research this week 🔬 $GIGGLE $BANANAS31 $DEGO — all showing accumulation patterns. Set your alerts 👀", tags: ['GIGGLE','BANANAS31','DEGO'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // TRUMP / POLITICAL MEME
  // ═══════════════════════════════════════════
  { content: "$TRUMP token hitting $18 🇺🇸 Political meme coins are the wildest sub-sector of crypto. Volatility = opportunity 📊", tags: ['TRUMP','DOGE','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Politicians discovering crypto = coins named after them 😂 $TRUMP pumped. $DOGE was memed into $20B. Memes have power 🐸", tags: ['TRUMP','DOGE','SHIB'], sentiment: 'neutral', hasImage: false },
  { content: "$TRUMP holders this week 🇺🇸 Entry: $2. Exit: ??? The political meme coin cycle is just getting started. Fasten your seatbelt", tags: ['TRUMP','DOGE','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Political coins narrative: $TRUMP leading the sector 🎯 Meme + political figure + social media amplification = dangerous combo for shorts", tags: ['TRUMP','DOGE','BONK'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // MEME / HUMOR POSTS
  // ═══════════════════════════════════════════
  { content: "POV: You bought $BTC in 2020 and didn't sell 📷 [Image of Ferrari in driveway] This is not financial advice. Just evidence 😂", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "My coworker: 'crypto is gambling'\nMe: [shows them my crypto portfolio]\nAlso me: [buys more $SOL $ETH $BTC] 💀", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "2017: I need to explain what Bitcoin is\n2021: $BTC 69K. I don't explain\n2025: $BTC 100K. I still don't explain 💅", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "When you told them to buy $ETH at $100 and they didn't 😭 Now they ask you about the next 100x. The advice is the same: ETH", tags: ['ETH','BTC','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto portfolio check:\n🟢 $BTC: +142%\n🟢 $ETH: +167%\n🟢 $SOL: +390%\n🟢 $INJ: +521%\n🟢 $WIF: +2100%\nThis is a market", tags: ['BTC','ETH','SOL','INJ','WIF'], sentiment: 'bullish', hasImage: false },
  { content: "My investment thesis:\n1. Buy $BTC\n2. Buy $ETH  \n3. Buy $SOL\n4. Touch grass\n5. Check price in 2026\n6. Retire", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Banks: inflation is transitory\n$BTC: I am the transitory 📈💀", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Tax man: you owe 30% on your gains\nMe: what gains\nAlso me: [checks wallet with $700K] 😅 NFA CPA advice", tags: ['BTC','ETH','SOL'], sentiment: 'neutral', hasImage: false },
  { content: "My personality type: BTCD\nBuys Top, Complains Daily 💀\nBut seriously $BTC never goes to zero so... diamond hands forever", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Crypto twitter at 3am:\n- $AVAX at $50 is the top\n- Actually $BTC going to $30K\n- $ETH is dead\n\nCrypto at 10am: all green 📈", tags: ['BTC','ETH','AVAX'], sentiment: 'bullish', hasImage: false },
  { content: "The stages of a crypto newbie:\n1. 'This is a scam'\n2. 'Maybe I'll put $100'\n3. 'Just sold my car for $ETH'\n4. Diamond hands 💎", tags: ['ETH','BTC','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Centralized exchange: your keys, our coins 😅\nSelf-custody: your keys, your coins 💎\n$BTC holders know which one is correct", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "My trading strategy:\n- See green: buy\n- See red: buy more\n- Coworker asks: 'buy what?'\n\nThis is not financial advice 💎", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Someone: isn't it too late to buy $BTC?\nMe: it's been 'too late' at every price from $10 to $1M and counting", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Lost $50K in 2022. Made $400K in 2024. \nCrypto is the most brutal and beautiful thing I've ever done 💎 $BTC $ETH $SOL", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto is the only market where people celebrate 30% drops because 'it's going on sale' 🛒 $BTC holders are different breed", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Rich people diversify.\n$BTC is my diversification from the dollar 🇺🇸\n$ETH is my diversification from BTC\n$SOL is my lotto ticket", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Biggest mistake of my life: not buying more $ETH at $100 😭\nSecond biggest: not buying $SOL at $10\nBiggest upcoming mistake: not buying both NOW", tags: ['ETH','SOL','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "How much should I put into crypto?\n✅ What you can afford to lose\n✅ What you can hold 4+ years\n✅ Not your car payment\n$BTC", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Imagine explaining to your future self that you sold $BTC at $95K because you were scared of a 5% dip 💀 Don't be that person", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // LIFESTYLE / YACHT / JET
  // ═══════════════════════════════════════════
  { content: "Woke up on my yacht to a $BTC +8% candle ☀️ Good morning to everyone making the most of this bull market 🚀", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'yacht' },
  { content: "Private jet to Bali, funded by $SOL staking 🌴✈️ Living proof that Web3 changes lives. Passport + crypto = freedom", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'jet' },
  { content: "Pool villa in Santorini 🌊🇬🇷 $AVAX + $NEAR profits this quarter paid for this trip. The bull market is treating us well 💎", tags: ['AVAX','NEAR','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Rolex Daytona for the wrist, $BTC for the portfolio 👑 The new luxury currency is crypto. Old money hasn't figured it out yet", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'watch' },
  { content: "Island hopping in Greece with crypto profits ☀️ $ETH from $800 to $4K in this cycle. Every trip is a reminder to hodl 💎", tags: ['ETH','BTC','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Private jet travel hits different when it's paid in $BTC ✈️ Started with $2K in 2020. The journey is everything 🙏", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'jet' },
  { content: "Yacht charter in Monaco 🎰🛥️ $INJ $SUI $SEI portfolio did the heavy lifting. DeFi pays in style 💰", tags: ['INJ','SUI','SEI'], sentiment: 'bullish', hasImage: true, imageCategory: 'yacht' },
  { content: "Richard Mille on the wrist 💎 Yes, crypto paid for it. $ONDO $AAVE DeFi yields over 18 months. Consistent > lucky", tags: ['ONDO','AAVE','ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'watch' },
  { content: "Maldives overwater villa 🏝️ $XRP $SOL $AVAX triple hold through the bear market paid for this week 🏆 Patience = paradise", tags: ['XRP','SOL','AVAX'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Super yacht week in Mediterranean 🛥️ 🌊 Portfolio is up. Life is good. $BTC never lets me down when I don't let it down 💎", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'yacht' },

  // ═══════════════════════════════════════════
  // MARKET ANALYSIS / TA
  // ═══════════════════════════════════════════
  { content: "$BTC weekly chart forming a perfect bull flag 🚩 Previous breakout: +180%. This breakout target: $140K-$165K range. NFA", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Alt season indicator: $BTC.D dropping from 58% to 52% 📊 Every 1% drop in BTC dominance = $2B+ flowing into alts. It's beginning", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$ETH/BTC ratio bounced perfectly off 0.048 support 📈 Historical: every bounce here led to ETH outperforming by 60-120%. Chart is clear", tags: ['ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Altcoin market cap breaks out of 2-year resistance 🚀 This happens ONCE per cycle. The next 6 months will be life-changing for holders", tags: ['ETH','SOL','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "The $SOL chart looks exactly like $ETH in May 2020 📐 If history rhymes: 18 months later $ETH was up 1500%. $SOL target: $500-800", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Volume analysis: $INJ $SEI $SUI all showing institutional accumulation 📊 Large wallets building positions at current prices. Follow the money", tags: ['INJ','SEI','SUI'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto total market cap broke $3.5T resistance 💥 The next target is $5T. We've NEVER been here before. New cycle, new highs", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Fear & Greed at 78 but on-chain whale accumulation still strong 🐋 Smart money is buying what retail is afraid of. Be smart money", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP weekly — 3-year symmetrical triangle breakout confirmed ⚡ Measured move = $4.50 minimum. $10 is a reasonable target long-term. NFA", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Open interest on $BTC futures just hit $35B 📊 Highest ever. When funding rates spike this high it means institutions are long. BULLISH", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$AVAX breaking out of 14-month accumulation range 🏔️ Target: $180-$240 based on previous cycle performance. NFA DYOR always", tags: ['AVAX','SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Liquidity heatmap shows massive buy walls at $90K for $BTC 🔵 Whales placed $800M in limit orders. They know something we don't", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$SOL monthly RSI just turned up from oversold 📈 Every time this happened: $SOL did minimum 300% in 6 months. Schedule accordingly", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto market structure: higher highs, higher lows since October 🔵 This is textbook bull market structure. Trend is your friend. Ride it", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$TON Telegram wallet monthly active users: 50M 📱 Growing 20% MoM. TON is becoming the payment layer for 1B people. Bull thesis", tags: ['TON','BTC','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // TRADING WISDOM
  // ═══════════════════════════════════════════
  { content: "The wealth transfer happens during bear markets 🐻 Weak hands give coins to strong hands at discount. Bull markets reveal who won 💎", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Best trading lesson I ever learned: 🎓 You don't need 10 coins. You need $BTC $ETH $SOL and patience. That's the whole strategy", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Risk management > returns 📊 Position size so that even a 80% drop doesn't destroy you. Then you can hold through anything. NGMI vs GMI", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Dollar cost averaging $BTC since 2021 💸 Even bought the top. Even bought the bottom. Portfolio up 280%. DCA beats timing every time", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Portfolio allocation tier list:\nS: $BTC $ETH\nA: $SOL $XRP $AVAX\nB: $LINK $INJ $SUI\nC: Memes\nD: Leverage trading\n\nAdjust accordingly", tags: ['BTC','ETH','SOL','XRP','AVAX'], sentiment: 'neutral', hasImage: false },
  { content: "The crypto portfolio mistake everyone makes 📋 Too many coins, too little conviction. 5 coins with high conviction > 50 coins with none", tags: ['BTC','ETH','SOL'], sentiment: 'neutral', hasImage: false },
  { content: "What nobody tells you about crypto 📢 The waiting is the hardest part. Buy, secure, wait. Three words. Ninety percent of the strategy", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto giveth and crypto taketh ⚖️ But on a long enough timeline crypto giveth more than it taketh. $BTC compound annual: 160% since 2012", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Lessons from 6 years in crypto:\n📌 Never sell during panic\n📌 Never buy during euphoria\n📌 Always keep 30% in $BTC\n📌 DCA forever", tags: ['BTC','ETH','SOL'], sentiment: 'neutral', hasImage: false },
  { content: "HODL is not a strategy it's a mindset 💎 You hold because you understand why you own it. Know your thesis, hold with conviction", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "The best trade I ever made was buying $ETH at $200 and doing absolutely nothing 😌 No leveraging. No trading. Just holding. +1800%", tags: ['ETH','BTC','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Leverage trading advice from someone who learned the hard way 😅\n- 1-3x max\n- Never more than 5% portfolio\n- Have an exit plan\n- $BTC pairs only", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },

  // ═══════════════════════════════════════════
  // NEWS / INSTITUTIONAL
  // ═══════════════════════════════════════════
  { content: "Breaking: JPMorgan clients can now allocate to $BTC ETF 🏦 This is the biggest institutional event in crypto history. Buy the news", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Norway's sovereign wealth fund — $1.6T in assets — disclosed indirect $BTC exposure 🇳🇴 Governments are quietly buying Bitcoin", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "US Treasury considering $BTC as reserve asset 🇺🇸 This would be the most bullish moment in Bitcoin history. Stack before it happens", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "PayPal $BTC holdings up 340% from last year 💳 They see what's coming. 400M PayPal users getting crypto access. Adoption accelerating", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Amazon quietly filed for $BTC payment integration 📦 If Jeff Bezos' company accepts crypto, game over for bear case. Bull market FOREVER", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$ETH spot ETF approval: it's not if, it's when ⏳ BlackRock doesn't file losing applications. This is a formality now. Load up", tags: ['ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Goldman Sachs Bitcoin trading desk expanded to 24/7 operations 🌙 Banks never sleep on $BTC anymore. Institutional infrastructure is BUILT", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Abu Dhabi sovereign wealth fund disclosed $BTC position 🇦🇪 Middle East + Asia + Europe all quietly buying Bitcoin. The East knows", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Fidelity allowing IRA accounts to hold $BTC directly 🧓 Retirement money flooding into Bitcoin. $20T in US retirement savings. Few percent = trillions", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "SEC approved $ETH staking ETF applications 📋 Yield-generating crypto ETF. Pension funds will flock to this. $ETH demand shock incoming", tags: ['ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Microsoft added $BTC to corporate treasury 💻 After Tesla, MicroStrategy, Square. The corporate BTC balance sheet trend is now mainstream", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "IMF report: countries with $BTC as legal tender see 12% GDP growth boost 📈 The economic evidence is accumulating. Bitcoin works", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // COMMUNITY / SOCIAL
  // ═══════════════════════════════════════════
  { content: "Drop your best crypto trade of 2024 👇 Mine: $WIF at $0.04, sold partial at $3.40. +8,400%. Still holding the rest 💎", tags: ['WIF','SOL','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "What coin changed your financial life? 🙋 For me: $ETH in 2020. Changed EVERYTHING. Share yours below 👇", tags: ['ETH','BTC','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Tag someone who needs to hear this: $BTC $ETH $SOL are still early 🤫 The world is just waking up. Wake up your people", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "The crypto community is the most resilient group of people I've ever met 💪 Through crashes, hacks, FUD — we keep building and holding", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Someone in my family finally asked me about $BTC 🥹 This is the sign. Retail is coming back. Accumulate before they arrive", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "2021: everyone was calling me crazy for buying $SOL at $30\n2024: $SOL hit $220\n\nKeep calling me crazy 😊", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "True crypto veterans know: 🏆\n- The 2018 crash\n- The March 2020 crash\n- The 2022 crash\n- And they're still here buying $BTC. Respect", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "I've been called a degenerate, gambler, and idiot for buying $BTC $ETH $SOL 🤷 My portfolio performance disagrees with all three labels", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "The people who laughed at $BTC at $10 are now asking how to buy it at $95K 🔄 The cycle repeats. Don't be late this time", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Day 1 in crypto vs Day 365 🧠\nDay 1: what's a wallet\nDay 365: running my own node, staking, providing liquidity, diamond hands 💎", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // COPY TRADING / SOCIAL TRADING
  // ═══════════════════════════════════════════
  { content: "My copy trading stats this month 📊\n- Followers: 12,400\n- Copy volume: $2.8M\n- Win rate: 74%\n- Best trade: $SOL long +189%\nThank you all 🙏", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Top signals from my watchlist this week 🎯\n$INJ: cup and handle forming\n$SUI: breaking above resistance\n$SEI: accumulation pattern\nNFA", tags: ['INJ','SUI','SEI'], sentiment: 'bullish', hasImage: false },
  { content: "Why copy trading beats solo trading for most people 📈\n1. Learn from winners\n2. Diversify automatically\n3. Spend less time watching charts\n4. Profit 💰", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Made $47,000 copying top traders this month 💰 Started with $15K. Portfolio management is a skill you can delegate. KITE copy trading works", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Best copy traders watch TWO things: 🔍\n1. Risk per trade (never >2%)\n2. Consistency over time (not one lucky trade)\n$BTC $ETH based traders are safest", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },

  // ═══════════════════════════════════════════
  // MACRO / BIG PICTURE
  // ═══════════════════════════════════════════
  { content: "The US dollar lost 97% of purchasing power in 100 years 💸 $BTC fixed this. Bitcoin = savings technology that governments can't print", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Gold is $14T market cap 🥇 Bitcoin is $1.8T market cap 🟠 To match gold Bitcoin needs to 7x from here. That's not a moon shot. That's math", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Interest rates going down = inflation going up = $BTC going UP 📈 Central banks are trapped. Bitcoin is the escape hatch. Stack accordingly", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "US national debt: $34 trillion and growing 💀 $BTC has a fixed supply of 21 million. The world NEEDS inflation-proof money. It exists", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "When the dollar weakens, risk assets surge 🌊 $BTC is the ultimate risk-on/store-of-value hybrid. Win either way with the right exposure", tags: ['BTC','ETH','AVAX'], sentiment: 'bullish', hasImage: false },
  { content: "The tokenization of real world assets ($ONDO $MKR thesis) is a $50 trillion opportunity 🏦 On-chain bonds, stocks, real estate. Early days", tags: ['ONDO','MKR','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Global payment flows: $150 trillion annually 💸 $XRP processes $500B daily. If Ripple captures 1% of global payments = $1.5T in volume. Do the math", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "DeFi TVL crossed $120B 🌐 This is more money than most hedge funds manage. Decentralized finance is not a niche. It's eating TradFi", tags: ['ETH','AAVE','SOL'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // BEARISH / REALITY CHECK (for realism)
  // ═══════════════════════════════════════════
  { content: "Let's be honest about risk ⚠️ $BTC can still drop 50% even in a bull market. Allocate what you can lose. Leverage is the destroyer of portfolios", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Crypto is not a get rich quick scheme 📋 $ETH took 7 years to make big money for early holders. Patience is the real strategy", tags: ['ETH','BTC'], sentiment: 'neutral', hasImage: false },
  { content: "I lost $200K in leverage trades in 2022 😰 Best lesson of my life: $BTC spot only. No leverage. DCA. Hold. Simple beats complex every time", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Not every altcoin makes it 📉 For every $SOL there are 100 failed projects. DYOR is not a meme. Research the team, tokenomics, use case first", tags: ['SOL','ETH','BTC'], sentiment: 'neutral', hasImage: false },
  { content: "Bear markets destroy portfolios. Bull markets create regrets. 🔄 Regret for selling too early. Regret for not buying enough. HODL solves both", tags: ['BTC','ETH','SOL'], sentiment: 'neutral', hasImage: false },

  // ═══════════════════════════════════════════
  // MORE BTC DAILY
  // ═══════════════════════════════════════════
  { content: "$BTC good morning 🌞 Woke up to +4.2% overnight candle. Coffee tastes better when the portfolio is green ☕💚", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC Saturday green candle 💚 Weekend pumps always surprise the bears. Crypto never sleeps. Weekends are for compounding", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Quiet on CT but loud on the charts 📊 $BTC accumulating range while everyone sleeps. This is where the move is being built", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC dominance holding 56% 🟠 Not dropping until the big caps get their run. Bitcoin first, then ETH, then alts. Patient", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Another day, another $BTC all-time high attempt 📈 This is the most boring bull market in history. Buy, hold, repeat. Boring = wealthy", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "1 BTC = 1 BTC 🟠 Never sell below your conviction price. The number that matters is how many satoshis you hold, not the dollar value", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$BTC network processed $2.1T in transactions last month 💸 More than Visa. More than Mastercard. The digital gold is also digital rails", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // CHART PATTERN POSTS
  // ═══════════════════════════════════════════
  { content: "$ETH cup and handle pattern on weekly chart 📊 Measured move: $9,500-$11,000 range target if breakout above $4,200 confirmed. NFA TA only", tags: ['ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Hidden bullish divergence on $SOL 4H RSI 🔵 Price made lower low, RSI made higher low. Classic reversal signal. Dip = gift 📊", tags: ['SOL','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$AVAX consolidating in a falling wedge for 3 months 📐 This pattern resolves bullish 80% of the time. Breakout imminent. Stack the dips", tags: ['AVAX','SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP weekly MACD crossover confirmed bullish 📊 First time this happened: $XRP went from $0.20 to $3.40 (+1600%). History? 👀", tags: ['XRP','BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Head and shoulders on $BTC 1H inverted = bullish breakout pattern 🔵 Neckline break confirmed. Target: $102K-$108K. Not financial advice!", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$INJ on-balance volume hitting new ATH while price consolidates 📈 Accumulation is happening. When OBV leads price, huge moves follow. Chart is clear", tags: ['INJ','SOL','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Golden cross forming on $BTC daily chart ✝️ 50MA crossing above 200MA. Every golden cross in BTC history: minimum +80% in 6 months. NFA", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$TON breaking out of symmetrical triangle on daily 🔺 TON/USDT target on measured move: $18-$22. Telegram ecosystem catalysts still ahead", tags: ['TON','BTC'], sentiment: 'bullish', hasImage: false },

  // ═══════════════════════════════════════════
  // MISC / VARIETY
  // ═══════════════════════════════════════════
  { content: "WAGMI 💎 Not just a phrase — a philosophy. We Are All Gonna Make It because we're in the right place at the right time. $BTC $ETH $SOL", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Portfolio update: $2,847,000 💰 Started with $12,000 in 2020. $BTC $ETH $SOL $LINK $AVAX. 4 year hold. Never sold a single time. NEVER", tags: ['BTC','ETH','SOL','LINK','AVAX'], sentiment: 'bullish', hasImage: false },
  { content: "The blockchain will be bigger than the internet 🌐 We're building the financial layer of the web. $BTC $ETH are the protocols. Early days", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Web3 thesis for 2025:\n- AI + blockchain merging ($FET $RNDR)\n- RWAs tokenized ($ONDO $MKR)\n- Gaming on-chain ($GALA $IMX)\n- Payments via TON XRP", tags: ['FET','RNDR','ONDO','MKR','TON','XRP'], sentiment: 'bullish', hasImage: false },
  { content: "The best time to buy $BTC was 10 years ago 📅 The second best time is today. Don't overthink it. Stack sats. Check in 2030", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto made me a better investor 📚\n- Taught me about monetary policy\n- Taught me about decentralization\n- Taught me to ignore noise\n- Taught me patience", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "New trader advice from 6 years in crypto 🎓\n1. Buy $BTC\n2. Buy $ETH\n3. DCA monthly\n4. Don't check prices daily\n5. Thank yourself in 3 years", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto portfolio vs S&P500 over 5 years 📊 S&P500: +87%. My crypto: +1,420%. Not all alpha is in stocks. $BTC $ETH $SOL allocated correctly", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$DOGE is a joke that became worth $20B 😂 $SHIB is a meme that has more holders than Bitcoin. The market does not care about your logic", tags: ['DOGE','SHIB','BTC'], sentiment: 'neutral', hasImage: false },
  { content: "Three things I no longer do:\n1. Panic sell\n2. Use leverage\n3. Listen to crypto Twitter FUD\n\nThree things I do:\n1. DCA $BTC\n2. Stake $ETH\n3. HODL", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Late to crypto? 🤔 $BTC ETF just launched for 800M Americans. $ETH staking ETF pending. $SOL ETF filed. We are STILL early in institutional adoption", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "The future of money:\n💸 Payments via $XRP $TON\n🏦 Banking via $AAVE $MKR\n📈 Trading via $DYDX $INJ\n🎮 Gaming via $IMX $AXS\n\nAll on-chain. All open", tags: ['XRP','TON','AAVE','MKR','DYDX'], sentiment: 'bullish', hasImage: false },
  { content: "On-chain analytics this week 🔍\nTop accumulation wallets adding: $ETH $SOL $AVAX\nTop whale addresses reducing: stablecoins\nSignal: rotation to risk happening", tags: ['ETH','SOL','AVAX'], sentiment: 'bullish', hasImage: false },
  { content: "Biggest upcoming catalysts 📅\n- $ETH ETF staking approval\n- $SOL ETF filing decision\n- $XRP legal clarity\n- Bitcoin halving aftermath peak\n\nAll Q3 2025", tags: ['ETH','SOL','XRP','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "I don't care about short-term price action 🧘 I care about: adoption curves, developer activity, TVL growth. $BTC $ETH $SOL winning all three", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$LINK Chainlink Functions just launched — oracles for off-chain computation 🔗 Now smart contracts can call any API. This is MASSIVE for adoption", tags: ['LINK','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "Staking yields right now 💰\n$ETH: 4.2% APY\n$SOL: 7.1% APY\n$ATOM: 14.3% APY\n$NEAR: 10.8% APY\n\nBetter than any bank on earth. Stake your bags", tags: ['ETH','SOL','ATOM','NEAR'], sentiment: 'bullish', hasImage: false },
  { content: "$ATOM inter-blockchain communication crossing 10M daily messages 🌐 The internet of blockchains is not a vision. It's running now. Undervalued", tags: ['ATOM','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "The $OCEAN Protocol data marketplace is live 🌊 Scientists, companies, governments buying and selling datasets on-chain. AI needs data. OCEAN provides", tags: ['FET','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Top 5 things that will make you rich in crypto 📋\n1. Patience\n2. Dollar cost averaging\n3. Not using leverage\n4. $BTC $ETH heavy allocation\n5. Community", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "I spend 2 hours per week on crypto and outperform 95% of traders 😌 Secret: buy $BTC $ETH $SOL on dips, stake, forget. Boring is profitable", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Bitcoin is solving the hardest problem in monetary history: how to create digital scarcity 🟠 Before Bitcoin, digital things could be copied infinitely. Never again", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$HBAR Hedera used by Standard Bank, IBM, LG for enterprise blockchain 🏢 While crypto bros debate meme coins, Fortune 500 quietly building on HBAR", tags: ['HBAR','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "The $WLD Worldcoin proof of humanity protocol is the only solution to AI bot problem 🤖👁️ 10M+ humans verified. This is essential infrastructure for AI era", tags: ['WLD','FET','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Gaming + blockchain = $200B opportunity 🎮 $IMX $GALA $AXS $PIXEL leading. When gaming joins Web3, 3B gamers get introduced to crypto. Timing", tags: ['IMX','GALA','AXS','PIXEL'], sentiment: 'bullish', hasImage: false },
  { content: "The NFT market is back 🖼️ Blue chips up 200% from floor. $ETH NFT volume recovered to 2022 levels. Digital ownership is a real concept now", tags: ['ETH','IMX','BLUR'], sentiment: 'bullish', hasImage: false },
  { content: "Stablecoins on-chain: $160B market cap and growing 💵 USDC, USDT, DAI, FRAX. The crypto dollar economy is already bigger than most countries GDP", tags: ['ETH','MKR','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "Everything in life comes down to network effects 🌐 $BTC has the most secure network effect in crypto. $ETH has the most developer network effect. Stack both", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "2025 prediction: $BTC $150K. $ETH $8K. $SOL $500 🎯 Not a guarantee. A thesis based on ETF flows, halving cycle, institutional adoption. NFA always", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "What $100/month in $BTC since 2020 looks like today 📊 $6,000 invested → $112,000 value. 18× return. No trading. No leverage. Just DCA. Do this", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto winter survivors club 🥶 Members: those who bought 2018-2020, held through 2022, and are now sitting on life-changing gains. $BTC $ETH members only", tags: ['BTC','ETH','SOL'], sentiment: 'bullish', hasImage: false },
  { content: "When $BTC goes to $500K (yes, WHEN) 🚀 The people who laughed, doubted, and called it a scam will try to explain why they should have bought 🤷", tags: ['BTC','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$ENA Ethena synthetic dollar innovation is changing DeFi 💡 $USDe backed by delta-hedged ETH position. 27% yield with $3B TVL. New DeFi primitive", tags: ['ENA','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$PENDLE trading at 8% discount to fair value according to DeFi metrics 📊 Under-loved, under-owned, over-delivering. My position: very large. NFA", tags: ['PENDLE','ETH','AAVE'], sentiment: 'bullish', hasImage: false },
  { content: "$QNT Quant Network connecting blockchains to SWIFT, ISO 20022 banking 🏦 If banks go blockchain, they need $QNT. Quietly building the B2B infrastructure", tags: ['QNT','ETH','BTC'], sentiment: 'bullish', hasImage: false },
  { content: "The $SAND Sandbox metaverse real estate play 🏗️ Virtual land near celebrity 'plots' sold for $4M+. Digital scarcity of location in virtual worlds. Big market", tags: ['SAND','MANA','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Most undervalued crypto right now IMO 🤫\n$ATOM — internet of blockchains\n$HBAR — enterprise adoption\n$QNT — bank connectivity\n$ONDO — RWA leader\nNFA", tags: ['ATOM','HBAR','QNT','ONDO'], sentiment: 'bullish', hasImage: false },
  { content: "$NEAR AI integration with DeepSeek partnership 🤖 AI inference on a blockchain with 1-second finality. The AI crypto narrative needs NEAR to exist", tags: ['NEAR','FET','ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto portfolio rule I never break ⚡\nAlways keep minimum 50% in $BTC + $ETH\nNever more than 10% in any single altcoin\nNever leverage spot positions\nNFA", tags: ['BTC','ETH'], sentiment: 'neutral', hasImage: false },
];
