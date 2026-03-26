// ============================================================
// feed-content-pools-v2.ts
// Binance Square style natural posts — massive content pool
// 300+ post templates, 80 users, meme images
// ============================================================

export interface BinanceSquarePost {
  content: string;
  tags: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  hasImage: boolean;
  imageCategory?: 'car' | 'jet' | 'yacht' | 'villa' | 'watch' | 'meme' | 'chart' | 'food' | 'party' | 'none';
}

export interface BSUser {
  username: string;
  avatar: string;
  verified?: boolean;
}

// ─────────────────────────────────────────────────────────
// USERS POOL — 80 diverse crypto trader profiles
// ─────────────────────────────────────────────────────────
export const BS_USERS_POOL: BSUser[] = [
  { username: 'CryptoKingMike', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { username: 'SolanaQueen', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { username: 'BTCMaximalist', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { username: 'AltcoinHunter99', avatar: 'https://randomuser.me/api/portraits/men/4.jpg' },
  { username: 'GigiCryptoGirl', avatar: 'https://randomuser.me/api/portraits/women/5.jpg' },
  { username: 'DiamondHands_Jake', avatar: 'https://randomuser.me/api/portraits/men/6.jpg' },
  { username: 'LucaTrader', avatar: 'https://randomuser.me/api/portraits/men/7.jpg' },
  { username: 'MiaWeb3', avatar: 'https://randomuser.me/api/portraits/women/8.jpg' },
  { username: 'Nexuvo_Trades', avatar: 'https://randomuser.me/api/portraits/men/9.jpg' },
  { username: 'SofiaHashmi', avatar: 'https://randomuser.me/api/portraits/women/10.jpg' },
  { username: 'XRP_Believer', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
  { username: 'CryptoMomma', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  { username: 'HelenRosebury', avatar: 'https://randomuser.me/api/portraits/women/13.jpg' },
  { username: 'InsiderAlpha', avatar: 'https://randomuser.me/api/portraits/women/14.jpg' },
  { username: 'BlockchainEmpire', avatar: 'https://randomuser.me/api/portraits/men/15.jpg' },
  { username: 'MemeCoinKing', avatar: 'https://randomuser.me/api/portraits/men/16.jpg' },
  { username: 'DeFiDegen', avatar: 'https://randomuser.me/api/portraits/men/17.jpg' },
  { username: 'PepeArmy2025', avatar: 'https://randomuser.me/api/portraits/men/18.jpg' },
  { username: 'CryptoNomad_Sara', avatar: 'https://randomuser.me/api/portraits/women/19.jpg' },
  { username: 'WhalePursuer', avatar: 'https://randomuser.me/api/portraits/men/20.jpg' },
  { username: 'AnaTradesPro', avatar: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { username: 'BTCBull100x', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
  { username: 'Crypto_Lina', avatar: 'https://randomuser.me/api/portraits/women/23.jpg' },
  { username: 'FuturesKing_Pro', avatar: 'https://randomuser.me/api/portraits/men/24.jpg' },
  { username: 'ZaraInvestments', avatar: 'https://randomuser.me/api/portraits/women/25.jpg' },
  { username: 'TradingWithJay', avatar: 'https://randomuser.me/api/portraits/men/26.jpg' },
  { username: 'MoonAlchemy', avatar: 'https://randomuser.me/api/portraits/men/27.jpg' },
  { username: 'CryptoWithKate', avatar: 'https://randomuser.me/api/portraits/women/28.jpg' },
  { username: 'Altseason_Alex', avatar: 'https://randomuser.me/api/portraits/men/29.jpg' },
  { username: 'NinaHodlQueen', avatar: 'https://randomuser.me/api/portraits/women/30.jpg' },
  { username: 'RocketTrader_Phil', avatar: 'https://randomuser.me/api/portraits/men/31.jpg' },
  { username: 'ShibaArmyLead', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { username: 'Basonce_BCH_Pro', avatar: 'https://randomuser.me/api/portraits/women/33.jpg', verified: true },
  { username: 'CryptoCoachDave', avatar: 'https://randomuser.me/api/portraits/men/34.jpg' },
  { username: 'Web3Wizard', avatar: 'https://randomuser.me/api/portraits/men/35.jpg' },
  { username: 'EthereumEmily', avatar: 'https://randomuser.me/api/portraits/women/36.jpg' },
  { username: 'ChainBreaker_X', avatar: 'https://randomuser.me/api/portraits/men/37.jpg' },
  { username: 'AltcoinAngela', avatar: 'https://randomuser.me/api/portraits/women/38.jpg' },
  { username: 'Syndicate_Official', avatar: 'https://randomuser.me/api/portraits/men/39.jpg', verified: true },
  { username: 'SolanaSurfer', avatar: 'https://randomuser.me/api/portraits/men/40.jpg' },
  { username: 'BitcoinBella', avatar: 'https://randomuser.me/api/portraits/women/41.jpg' },
  { username: 'LongTermHodler', avatar: 'https://randomuser.me/api/portraits/men/42.jpg' },
  { username: 'SwingTraderMike', avatar: 'https://randomuser.me/api/portraits/men/43.jpg' },
  { username: 'CryptoMaverickX', avatar: 'https://randomuser.me/api/portraits/men/44.jpg' },
  { username: 'PassiveIncomePro', avatar: 'https://randomuser.me/api/portraits/women/45.jpg' },
  { username: 'BullRunBenny', avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
  { username: 'TetherQueen', avatar: 'https://randomuser.me/api/portraits/women/47.jpg' },
  { username: 'GainzGuru', avatar: 'https://randomuser.me/api/portraits/men/48.jpg' },
  { username: 'Crypto_Tatiana', avatar: 'https://randomuser.me/api/portraits/women/49.jpg' },
  { username: 'MarketWatcher77', avatar: 'https://randomuser.me/api/portraits/men/50.jpg' },
  { username: 'NFTKingdom', avatar: 'https://randomuser.me/api/portraits/men/51.jpg' },
  { username: 'YieldFarmerJen', avatar: 'https://randomuser.me/api/portraits/women/52.jpg' },
  { username: 'PumpChaser', avatar: 'https://randomuser.me/api/portraits/men/53.jpg' },
  { username: 'AvalancheArnie', avatar: 'https://randomuser.me/api/portraits/men/54.jpg' },
  { username: 'InjMaestro', avatar: 'https://randomuser.me/api/portraits/men/55.jpg' },
  { username: 'DogecoinDiana', avatar: 'https://randomuser.me/api/portraits/women/56.jpg' },
  { username: 'OnChainOliver', avatar: 'https://randomuser.me/api/portraits/men/57.jpg' },
  { username: 'SuiStar_Leila', avatar: 'https://randomuser.me/api/portraits/women/58.jpg' },
  { username: 'CryptoPatricia', avatar: 'https://randomuser.me/api/portraits/women/59.jpg' },
  { username: 'DegenRich', avatar: 'https://randomuser.me/api/portraits/men/60.jpg' },
  { username: 'HodlHannah', avatar: 'https://randomuser.me/api/portraits/women/61.jpg' },
  { username: 'TronMillion', avatar: 'https://randomuser.me/api/portraits/men/62.jpg' },
  { username: 'AlgoTrader88', avatar: 'https://randomuser.me/api/portraits/men/63.jpg' },
  { username: 'XRPMillion2025', avatar: 'https://randomuser.me/api/portraits/men/64.jpg' },
  { username: 'CryptoQueenNia', avatar: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { username: 'ScalpKing_Josh', avatar: 'https://randomuser.me/api/portraits/men/66.jpg' },
  { username: 'FlokiArmy_Rose', avatar: 'https://randomuser.me/api/portraits/women/67.jpg' },
  { username: 'BearSlayer_Max', avatar: 'https://randomuser.me/api/portraits/men/68.jpg' },
  { username: 'TokenizedWorld', avatar: 'https://randomuser.me/api/portraits/men/69.jpg' },
  { username: 'MandyOnChain', avatar: 'https://randomuser.me/api/portraits/women/70.jpg' },
  { username: 'CryptoRick', avatar: 'https://randomuser.me/api/portraits/men/71.jpg' },
  { username: 'TradingBabe_Ivy', avatar: 'https://randomuser.me/api/portraits/women/72.jpg' },
  { username: 'SmartMoneyBob', avatar: 'https://randomuser.me/api/portraits/men/73.jpg' },
  { username: 'DubaiCrypto', avatar: 'https://randomuser.me/api/portraits/men/74.jpg' },
  { username: 'SingaporeWhale', avatar: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { username: 'Crypto_Valentina', avatar: 'https://randomuser.me/api/portraits/women/76.jpg' },
  { username: 'BTCMiner_Karl', avatar: 'https://randomuser.me/api/portraits/men/77.jpg' },
  { username: 'TigerTrader', avatar: 'https://randomuser.me/api/portraits/men/78.jpg' },
  { username: 'CryptoCarla', avatar: 'https://randomuser.me/api/portraits/women/79.jpg' },
  { username: 'GiggleToken', avatar: 'https://randomuser.me/api/portraits/men/80.jpg' },
];

// ─────────────────────────────────────────────────────────
// MEME & LIFESTYLE IMAGE POOL
// ─────────────────────────────────────────────────────────
export const BS_MEME_IMAGES: string[] = [
  // Bulls / Bears meme style
  'https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/462118/pexels-photo-462118.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Charts / trading screens
  'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/7567440/pexels-photo-7567440.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/7567529/pexels-photo-7567529.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Luxury cars
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Parties / celebrations
  'https://images.pexels.com/photos/787961/pexels-photo-787961.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Dubai / skyscrapers
  'https://images.pexels.com/photos/618833/pexels-photo-618833.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Pools / villas
  'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2506988/pexels-photo-2506988.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Watches
  'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/9978741/pexels-photo-9978741.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Yachts
  'https://images.pexels.com/photos/163236/pexels-photo-163236.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3278818/pexels-photo-3278818.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Night city / neon
  'https://images.pexels.com/photos/1519088/pexels-photo-1519088.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1486974/pexels-photo-1486974.jpeg?auto=compress&cs=tinysrgb&w=600',
];

// ─────────────────────────────────────────────────────────
// MAIN POST POOL — 300 Binance Square style natural posts
// ─────────────────────────────────────────────────────────
export const BS_POSTS: BinanceSquarePost[] = [
  // === PROFIT SHARING — emoji heavy, casual ===
  { content: "I make 1.6M$ from $BULLA 🔥 Closing Long now 🎊", tags: ['BULLA', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "$ATOM is up from my entry. Converting a portion into real world assets 🏎️💎", tags: ['ATOM', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Just closed my $SOL long +$48,000 💰🚀 Still holding spot. This is just beginning", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "$XRP can make rich you 🚀🎊 $500 🌙🥂............ ‼️ REALLY !! One day the $XRP chart will shock everyone ✨ Like ❤️ If You Believe ??", tags: ['XRP', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Bull run ❌\nBear run ✅\n😏\n$TRUMP\n$BANANAS3…", tags: ['TRUMP', 'BANANAS31', 'DEGO'], sentiment: 'bearish', hasImage: true, imageCategory: 'meme' },
  { content: "🚨GLOBAL UPROAR ONLINE AFTER FOOTAGE APPEARED\n$PIXEL $LYN $TRUMP …", tags: ['PIXEL', 'TRUMP'], sentiment: 'neutral', hasImage: false },
  { content: "$BEAT is holding strong and looking for a new push higher after a small pullback 📈\nEntry Point: $0.4331\nTarget 1: $0.4567", tags: ['BEAT'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "7D Asset Change +459,45% 🔥🔥🔥 $GIGGLE still going strong. Missed it? Next one already loading 👀", tags: ['GIGGLE', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Just made $23,000 in 4 hours from $BNB futures. Screenshot below. Not lucky, just patient 🙏", tags: ['BNB', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "People sleep on $INJ so hard. +340% from my entry. Wake up guys 🛎️🔥", tags: ['INJ', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "TRADING FUTURES LIVE — BCHUSDT Closing Long 📡 Come watch the magic happen live 🎯", tags: ['BCH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto paid for my new Lamborghini 🏎️💛 Started with $5,000 in 2021. Now look at where we are $BTC $ETH", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Added more $SOL at $145. Everyone called me crazy. Now at $210 😅 Who's crazy now", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "My first $100K month in crypto 🏆 $ETH futures did 80% of the work. Consistency wins", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Not financial advice but $PEPE at this level is CRIMINAL 🐸🔥 This thing is going to 10x", tags: ['PEPE', 'BONK'], sentiment: 'bullish', hasImage: false },
  { content: "Quit my 9-5 exactly 14 months ago. Never looked back 🙌 $BTC $ETH income > corporate salary 10x", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },

  // === MARKET PREDICTIONS ===
  { content: "$BTC consolidating beautifully. Next leg up incoming 🚀 Target: $115K\nEntry zone: $88-92K 📊", tags: ['BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "This $ETH pattern is giving me 2021 vibes so hard 👀 Monthly chart doesn't lie", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "$SOL weekly candle confirmed breakout ✅ Next stop $280. Not if, when 🎯", tags: ['SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Altcoin season is HERE 🔥 $INJ $SUI $APT all breaking out of multi-month consolidation. Load up", tags: ['INJ', 'SUI', 'APT'], sentiment: 'bullish', hasImage: false },
  { content: "Everyone's bearish. That's exactly why I'm buying. $BTC fear & greed at 22. History rhymes 📈", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "3 coins that will 10x before end of 2025:\n1. $SOL\n2. $INJ\n3. $TIA\n\nSave this post 📌", tags: ['SOL', 'INJ', 'TIA'], sentiment: 'bullish', hasImage: false },
  { content: "$XRP legal clarity = institutional floodgates open 💧 Price action is just getting started", tags: ['XRP'], sentiment: 'bullish', hasImage: false },
  { content: "$DOGE is quietly setting up for another run 🐕 Volume picking up. Elon hasn't tweeted yet... 👀", tags: ['DOGE', 'SHIB'], sentiment: 'bullish', hasImage: false },
  { content: "My $BTC price target for this cycle: $180,000 📊 Timeline: Q1 2026. You can quote me on this", tags: ['BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Meme coins in this cycle are going to make millionaires faster than anything in history 🐸💰 $WIF $BONK $PEPE", tags: ['WIF', 'BONK', 'PEPE'], sentiment: 'bullish', hasImage: false },
  { content: "The next 90 days will separate the weak hands from the diamond hands 💎 $BTC $ETH be patient", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "$AVAX ecosystem is criminally undervalued rn 🔥 DeFi TVL growing 40% monthly. Not priced in yet", tags: ['AVAX'], sentiment: 'bullish', hasImage: false },
  { content: "Everyone talking about $BTC but quietly $BNB is the most underpriced blue chip right now 👀", tags: ['BNB', 'BTC'], sentiment: 'bullish', hasImage: false },

  // === TRADE SIGNALS ===
  { content: "LONG $ETH\n📍 Entry: $3,420\n🎯 Target 1: $3,850\n🎯 Target 2: $4,200\n🛡️ Stop: $3,180\nLeverage: 5x ⚡", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "SHORT $BTC 10x\n📍 Entry: $95,800\n🎯 Target: $89,000\n🛡️ Stop: $98,200\nRisk/Reward: 1:2.8 📊", tags: ['BTC'], sentiment: 'bearish', hasImage: false },
  { content: "SPOT BUY $SOL\n📍 Current: $178\n🎯 Target: $250\n📅 Timeline: 3-4 months\nNo leverage needed 💎", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Opened 20x long $INJ at $28.40 🎰 SL at $26.80. This setup is too clean to pass", tags: ['INJ'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "$LINK breaking above $18 resistance ✅ Adding more spot here. Next resistance at $24 📈", tags: ['LINK', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Just opened $AVAX 15x long 🔥 Entry: $37.20 | TP: $48 | SL: $34.50 Let's gooo 🚀", tags: ['AVAX'], sentiment: 'bullish', hasImage: false },
  { content: "Scaling into $SUI at $3.80 💎 Strong fundamentals. 6 month target: $12-15. Patient money wins", tags: ['SUI', 'APT'], sentiment: 'bullish', hasImage: false },

  // === MEME / FUNNY CRYPTO ===
  { content: "2021 bull run 🐂 RUNNING\n2026 bull run 🐂 walking slowly but surely\n\n$TRUMP $BANANAS31 $DEGO 😏", tags: ['TRUMP', 'BANANAS31'], sentiment: 'neutral', hasImage: true, imageCategory: 'meme' },
  { content: "Me explaining to my parents why I put our savings in $DOGE 💀💀💀\nThem: what did you do\nMe: generational wealth 😅", tags: ['DOGE', 'SHIB'], sentiment: 'neutral', hasImage: false },
  { content: "My portfolio in Jan: 📈📈📈\nMy portfolio in Feb: 📉📉📉\nMy portfolio in March: 🚀🚀🚀\n$BTC never boring", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Told my boss I was sick today 🤒 Was actually watching $PEPE charts all day 🐸 Worth it", tags: ['PEPE', 'BONK'], sentiment: 'bullish', hasImage: false },
  { content: "Nobody:\nAbsolutely nobody:\nMe at 3am: 'just one more $BTC chart to check' 📊😭", tags: ['BTC'], sentiment: 'neutral', hasImage: false },
  { content: "The 5 stages of crypto grief:\n1. Denial\n2. Anger\n3. Bargaining\n4. Depression\n5. Buying more 💎\n\n$BTC $ETH", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Doctor: you have 6 months to live\nMe: I'll put it all in $PEPE\nDoctor: make it 12 months 🐸💀", tags: ['PEPE'], sentiment: 'neutral', hasImage: false },
  { content: "The face I make when $BTC drops 5% and I just DCA'd last week 😭📉\n\nBut also: free discount 🛒", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Imagine not buying $SOL under $50 when everyone said it was dead 💀 Some lessons cost a lot", tags: ['SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Chart says buy\nWallet says buy\nHeart says buy\nMom says 'it's a scam'\n\nStill buying $BTC 🫡", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "My therapist: what are your hobbies?\nMe: I track $BTC every 5 minutes and I'm fine 🙃", tags: ['BTC'], sentiment: 'neutral', hasImage: false },
  { content: "Normies: crypto is too volatile 😤\nMe: I made $14,000 in 3 days from $ETH 💰 exactly 🙃", tags: ['ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "My bank asked what I do for work. I said 'investments' 💅 Not lying. $BTC $SOL $ETH work for me", tags: ['BTC', 'SOL', 'ETH'], sentiment: 'bullish', hasImage: false },

  // === LIFESTYLE ===
  { content: "Working from Dubai this month ✈️ Crypto office = anywhere with WiFi 🌍 $BTC $ETH making it possible", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Dinner at Nobu, then checking $SOL charts. This is freedom 🍽️✨ Started with $2,000 in 2022", tags: ['SOL', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'food' },
  { content: "Pool day in Bali 🌊 $ETH staking income covers rent AND lifestyle here. Southeast Asia is underrated", tags: ['ETH', 'SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Monaco Grand Prix next week ✈️🏎️ $INJ $TIA paid for the whole trip. Thank you DeFi 🙏", tags: ['INJ', 'TIA'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },
  { content: "Singapore penthouse view 🌆 $BNB futures this month = more than my old annual salary. Think about that", tags: ['BNB', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Yacht party on Saturday 🛥️🥂 Invited everyone who bought $SOL under $20 😂 Not many people coming", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'yacht' },
  { content: "Morning routine:\n6am: wake up ✅\n6:05am: check $BTC ✅\n6:10am: pool swim ✅\n7am: $ETH is green ✅\n\nLiving the life 🌅", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "New Rolex delivered 🕐💛 Funded by $AVAX gains from last month. Never looked better on the wrist", tags: ['AVAX', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'watch' },
  { content: "Tokyo for the week 🇯🇵🌸 Japan embracing crypto hard. $BTC ATMs everywhere. Future is NOW", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'party' },
  { content: "Just booked private jet to Ibiza 🛩️ $SOL options this week covered the entire thing with change to spare 💰", tags: ['SOL', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'jet' },
  { content: "Paris apartment for the month 🗼 $ETH yield farming passive income is a beautiful thing 💎", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Lamborghini Urus or Tesla Plaid? \n\nWrong answers only 🏎️\n\n$BTC $ETH community decide 😂", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'car' },

  // === COMMUNITY / SOCIAL ===
  { content: "Like ❤️ if you've been in crypto more than 3 years 💎\nRepost 🔄 if you're NEVER selling $BTC", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Drop your $BTC entry price below 👇 No shame zone. We all started somewhere 🫂", tags: ['BTC'], sentiment: 'neutral', hasImage: false },
  { content: "What's your most profitable trade ever? Mine was $SOL at $8 → sold at $260 🚀\nComment below 👇", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto community is the best community 🌍❤️ You guys kept me going during the bear market. Now we eat together 🍽️", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "RT if you believe $BTC will hit $200K this cycle 🚀💎\nComment '🐻' if you think bear market is coming", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "POV: your friend said crypto was a scam in 2020 🥲 Same friend asking for my wallet address in 2025 😂", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Tag someone who needs to buy $SOL RIGHT NOW before it's too late 🚀🚨", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Giveaway 🎁 Retweeting 0.01 $ETH to 3 random followers!\nRules:\n✅ Follow\n✅ Like\n✅ Comment your ETH address", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Who else woke up to green portfolio today? 🟢 Drop a 🚀 below if you're up", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Stop listening to people who don't have $BTC. That's the only trading advice you'll ever need 🫡", tags: ['BTC'], sentiment: 'bullish', hasImage: false },

  // === BEARISH / LOSS ===
  { content: "Got rekt on $ETH today. Down $12,000 in 2 hours. Took off too much leverage 😭 Lesson learned AGAIN", tags: ['ETH', 'BTC'], sentiment: 'bearish', hasImage: false },
  { content: "Liquidated. $15,000 gone in 8 minutes. 50x leverage is not your friend kids 💀 Please size properly", tags: ['BTC', 'ETH'], sentiment: 'bearish', hasImage: false },
  { content: "Market is punishing greed right now 📉 I got too confident. Closed all positions. Cash is a position too $BTC", tags: ['BTC', 'SOL'], sentiment: 'bearish', hasImage: false },
  { content: "Down 30% on the week. Still up 400% on the year. Crypto is not for weak hands 💪 $BTC $ETH", tags: ['BTC', 'ETH'], sentiment: 'bearish', hasImage: false },
  { content: "Closed my $SOL short at a loss today 😤 Market had other plans. Respect the chart, not your bias", tags: ['SOL', 'ETH'], sentiment: 'bearish', hasImage: false },
  { content: "Red day. But I've been through 2018, 2020, 2022 bear markets. This is nothing. $BTC long thesis unchanged 💎", tags: ['BTC'], sentiment: 'bearish', hasImage: false },
  { content: "Lost $8K on $DOGE yesterday 😭 Never trading meme coins again... until the next one pumps 🤣", tags: ['DOGE', 'SHIB'], sentiment: 'bearish', hasImage: false },
  { content: "Bear market is boring 😴 But it's the best time to accumulate $BTC $ETH $SOL at discounts 🛒", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bearish', hasImage: false },

  // === CRYPTO EDUCATION / TIPS ===
  { content: "3 rules that made me profitable:\n1. Never risk more than 2%\n2. Let winners run\n3. DCA $BTC no matter what\nThat's it 🎯", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Stop checking prices every 5 minutes 😤 Set your alerts. Live your life. $BTC does the work for you 🙏", tags: ['BTC'], sentiment: 'neutral', hasImage: false },
  { content: "The biggest mistake new traders make: using too much leverage 💀 Start with 2x MAX. Learn first, earn later $ETH", tags: ['ETH', 'BTC'], sentiment: 'neutral', hasImage: false },
  { content: "Dollar cost averaging > trying to time the market ✅ $100/week into $BTC since 2020. You do the math 📊", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Your emotions are your biggest enemy in trading 🧠 Learn to be a machine. $BTC doesn't care about your feelings", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Hardware wallet > exchange wallet 🔒 Not your keys, not your coins. $BTC $ETH go cold storage for long holds", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Always take some profits at 2x 📈 You can't go broke taking profits. Then let the rest ride $SOL $ETH", tags: ['SOL', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Never invest what you can't afford to lose 🛡️ But also: never NOT invest in $BTC at these levels 😅", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },

  // === SPECIFIC COIN HYPE ===
  { content: "$WIF at $2 is a gift 🎁 Same energy as $DOGE at $0.003. Meme coin supercycle is REAL 🐕🔥", tags: ['WIF', 'BONK', 'PEPE'], sentiment: 'bullish', hasImage: false },
  { content: "$FLOKI is the most undervalued memecoin in crypto 🔥 Utility + community + meme = unstoppable 🚀", tags: ['FLOKI', 'DOGE'], sentiment: 'bullish', hasImage: false },
  { content: "$TRX just silently does its thing 👀 Justin Sun is playing 4D chess while everyone watches $BTC", tags: ['TRX', 'BNB'], sentiment: 'bullish', hasImage: false },
  { content: "$NEAR protocol Q1 stats are absolutely insane 📊 Transactions up 340%. Price hasn't moved yet 👀", tags: ['NEAR', 'SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "$ONDO tokenized RWA narrative is just getting started 🏦 BlackRock, Franklin Templeton all in. You should be too", tags: ['ONDO', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$TON ecosystem growing faster than anything in crypto 📈 Telegram has 900M users. Do the math 🧮", tags: ['TON', 'BNB'], sentiment: 'bullish', hasImage: false },
  { content: "The $BONK thesis: Solana's DOGE. If SOL 10x's this cycle, BONK 100x's. Simple math 🐶🔥", tags: ['BONK', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "$ARB is 85% down from ATH while Arbitrum transactions are at all time highs 🤔 Eventually price follows activity", tags: ['ARB', 'OP'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "$SEI is building the fastest trading blockchain in existence ⚡ Sub-400ms finality. FTX's replacement tbh", tags: ['SEI', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Been accumulating $APT quietly for 3 months 🤫 Aptos ecosystem TVL doubled. Something is brewing 👀", tags: ['APT', 'SUI'], sentiment: 'bullish', hasImage: false },
  { content: "$LINK staking is printing 🔗 $18 right now. My $12 average looking beautiful. Chainlink never sleeps", tags: ['LINK', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Institutions are buying $BNB 🤫 It's not on the news yet. But the order book doesn't lie 📊", tags: ['BNB', 'BTC'], sentiment: 'bullish', hasImage: false },

  // === LIVE TRADING / UPDATES ===
  { content: "LIVE TRADING NOW 📡 Watching $ETH/USDT 4H. Entry zone forming. Join the stream 🎯", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Called $SOL breakout at $168. Now $210. Closed 60% of position ✅ +$31,200 on this trade 💰", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Position update: $BTC long 10x still running 🏃 Entry: $88,400 | Now: $93,200 | Floating: +$21,000", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Closed half my $INJ position at +89% 🎯 Letting the rest run to $40. Stop moved to $27 breakeven", tags: ['INJ', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Market structure just shifted bullish on $AVAX 4H ✅ Loading up more here. Risk defined, thesis clear 📊", tags: ['AVAX', 'SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Scalped $BTC 3 times today ⚡ +$2,800 | +$1,400 | +$3,100 = $7,300 in 6 hours. Futures trading is art 🎨", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },

  // === WHALE MOVES ===
  { content: "Whale just moved 12,000 $BTC off Coinbase 🐋 This is historically bullish. Supply shock incoming 🔥", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "On-chain alert: $ETH being accumulated by wallets that bought at $200 in 2020 👀 Smart money never wrong", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Michael Saylor just added more $BTC 🏦 MicroStrategy now holds 450,000 BTC. He's not stopping 🚀", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Unknown wallet just bought $47M in $SOL in one transaction 🐳 Institutional accumulation is real 📈", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$ETH whales are loading in silence 🤫 Exchange reserves at 5-year low. When supply dries up... 💥", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },

  // === SKEPTIC / REALITY CHECK ===
  { content: "Not everyone will make it in crypto. Harsh truth 😔 The ones who do: study, size properly, and have patience", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "95% of altcoins will go to zero 📉 The other 5% will make you rich. Choose wisely. $BTC $ETH are safer", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Leverage trading is NOT passive income 🚨 It's full-time work. Don't let influencers fool you. $BTC spot is king", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "Never confuse a bull market with intelligence 🧠 Easy to be a genius when everything goes up. Test is the bear $BTC", tags: ['BTC'], sentiment: 'neutral', hasImage: false },
  { content: "If someone promises 100% guaranteed returns in crypto: RUN 🏃 That's a rug pull. No exceptions. Stay safe 🛡️", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },

  // === GLOBAL / MACRO ===
  { content: "Fed pauses rate hikes 📢 $BTC immediately reacts +6% 🚀 Macro is everything in crypto. Don't ignore it", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "ETF inflows hit $1.2B today 🏦 BlackRock, Fidelity, Invesco all buying $BTC hand over fist. Institutions here", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "US inflation CPI just dropped to 2.8% 📉 Risk assets love this. $BTC $ETH $SOL all spiking 🚀", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "El Salvador buying more $BTC as national reserve 🇸🇻 Small country, big signal. Dominos will fall globally 🌍", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Germany just approved spot $BTC ETF 🇩🇪 European institutional money about to flood in. So bullish 🔥", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "UK crypto regulation clarity expected this quarter 🇬🇧 This removes the last major institutional barrier to $BTC adoption", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },

  // === DEFI / STAKING ===
  { content: "Staking $ETH getting 4.8% APY 📊 In a world where banks give 0.5%, this is the future of savings 💎", tags: ['ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Yield farming $SOL/USDC pair getting 22% APY on Raydium 🌾 Passive income is beautiful when you know what you're doing", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Uniswap LP fees paid my rent this month 🏠 $ETH/USDC pool doing work. DeFi is just getting started 📈", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$AAVE lending rate hit 12% APY this week 💰 DeFi > TradFi every single time. Banks are scared 🏦", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Auto-compounding $BNB staking position is printing 📈 +340% in 18 months. This is how passive income works 🙏", tags: ['BNB', 'ETH'], sentiment: 'bullish', hasImage: false },

  // === FUNNY / RELATABLE ===
  { content: "Signs you're a crypto addict:\n✅ You dream in candlesticks\n✅ You say 'WAGMI' at family dinner\n✅ Your phone is 90% exchange apps\n\n$BTC fam rise up 🙋", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "I told my girlfriend I'm down 15% today 📉\nShe said: 'but you're still up 280% from last year right?'\n\nMarry her 💍 She gets it $BTC", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "How I sleep knowing I bought $SOL at $9 and held through the FTX crash 💤 Diamond hands baby 💎", tags: ['SOL', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Crypto Twitter at 2am:\n- 14 alpha threads\n- 6 rug pull warnings\n- 4 'buy this NOW' threads\n- Me: just checking $BTC charts 😭", tags: ['BTC', 'ETH'], sentiment: 'neutral', hasImage: false },
  { content: "My portfolio today:\n$BTC: 🟢\n$ETH: 🟢\n$SOL: 🟢\n$INJ: 🟢\nMy lunch order: 🔴 (forgot my wallet)\n\n😭😂", tags: ['BTC', 'ETH', 'SOL', 'INJ'], sentiment: 'bullish', hasImage: false },
  { content: "Explaining crypto to my mom:\nMe: 'it's like digital gold'\nMom: 'so why is your number going up and down every 5 minutes?'\nMe: '...'\n$BTC 😅", tags: ['BTC'], sentiment: 'neutral', hasImage: false },
  { content: "Plot twist: the real friends were the $BTC we bought along the way 💛\n\nSeriously though, $89K support is holding 💪", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Annual review:\nSalary: $65K 😴\nCrypto gains: $127K 🚀\n\nQuit my job yet? No. But I'm thinking about it 👀 $BTC $ETH", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },

  // === AI / TECH ===
  { content: "AI + Crypto = the biggest opportunity in human history 🤖🚀 $FET $AGIX $RNDR will be the Nvidia's of Web3", tags: ['FET', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "ChatGPT integration with $ETH wallets coming Q3 🤖 AI agents executing on-chain = mind blowing. Huge for ETH", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$RENDER is the AWS for AI rendering 🔥 Every AI company needs GPU compute. RNDR sells it on-chain. Game over", tags: ['ETH', 'SOL'], sentiment: 'bullish', hasImage: false },

  // === REGIONAL / CULTURAL ===
  { content: "Dubai is the new crypto capital of the world 🇦🇪💎 Zero tax, max gains. $BTC community here is insane 🔥", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },
  { content: "Singapore Web3 ecosystem is exploding 🇸🇬 Government backing blockchain innovation hard. $SOL $ETH leading here", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Hong Kong just approved spot $ETH ETFs 🇭🇰🚀 Asian institutional money incoming. This changes everything", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Turkey inflation at 65% 🇹🇷 Everyone I know there is buying $BTC $ETH to protect savings. Mass adoption is here", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Nigeria $BTC volume at all-time high 🌍 When inflation destroys currency, people find $BTC naturally. Beautiful", tags: ['BTC'], sentiment: 'bullish', hasImage: false },

  // === NFT / METAVERSE ===
  { content: "NFTs aren't dead. They evolved 🎨 Utility-backed NFTs are taking off. Music, gaming, ticketing — all $ETH ecosystem", tags: ['ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Just minted a Solana NFT that earns $SOL staking rewards 🎭 NFTs with passive income attached? YES PLEASE 🙌", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },

  // === COPY TRADING ===
  { content: "My copy trader strategy made $8,400 this month 🤖 Following 3 top traders on this platform. Passive + profitable 💰", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Best investment I made: learning to read charts 📊 Second best: copy trading $BTC pros while learning. 0 emotions", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "My copy trading portfolio: +47% this month 🚀 Letting the pros do the work while I'm at the beach 🏖️ $BTC $SOL", tags: ['BTC', 'SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'villa' },

  // === SHORT PUNCHY ===
  { content: "$BTC 🟢 $ETH 🟢 $SOL 🟢\n\nGood morning. Nothing else to say 🌅", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Buy $BTC. Be patient. That's the whole strategy 💎", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$SOL 🚀🚀🚀🚀🚀", tags: ['SOL', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "LFG 🔥🔥🔥 $ETH breaking out!!!", tags: ['ETH', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "WAGMI 💎🙌 $BTC $ETH $SOL all time highs incoming", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bullish', hasImage: false },
  { content: "Not selling. Ever. $BTC 🫡", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "$PEPE to 0.01 🐸🔥 Printing season", tags: ['PEPE', 'BONK', 'WIF'], sentiment: 'bullish', hasImage: false },
  { content: "We're so early 🌅 $BTC $ETH in 2025 = internet stocks in 1997", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Bears got wrecked 💀 $BTC closes above $92K weekly. See you at $120K", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "$INJ 🔥 $SUI 🔥 $APT 🔥 Altcoin season go brrrrr", tags: ['INJ', 'SUI', 'APT'], sentiment: 'bullish', hasImage: false },
  { content: "Told y'all $SOL wasn't dead 💎 Now zoom out and thank me later 🚀", tags: ['SOL', 'BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Paper hands sold. Diamond hands hold 💎 $BTC up +18% this week. The filter is working perfectly", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },

  // === MORE VARIETY ===
  { content: "Running 3 mining rigs now 🖥️⚡ Monthly passive income: $2,800 in $BTC. Best investment ever. Electricity pays itself", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "DCA update: Week 89 of buying $100 $BTC every Monday 📅 Current average: $42,000. Never missed a week 💪", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "Just reached 1 full $BTC 🎉🥳 Took 2 years of DCA'ing. Proudest financial achievement of my life. NEVER SELLING", tags: ['BTC'], sentiment: 'bullish', hasImage: true, imageCategory: 'party' },
  { content: "$ETH just confirmed bullish engulfing candle on weekly 🕯️✅ Last time this happened: +180% followed in 3 months", tags: ['ETH', 'SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'chart' },
  { content: "Generational wealth isn't inherited, it's built 🏗️ $BTC is how my generation builds it. Simple as that", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "When $BTC was $10K everyone said 'it's too late' 😤 When it was $50K, same people. At $95K... still same people 🙄", tags: ['BTC'], sentiment: 'bullish', hasImage: false },
  { content: "4 am wake up alarm ⏰ Not for work. For $BTC Asia session open 🌏 Dedication is the difference", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Trust the process:\n2022: -70% portfolio 📉\n2023: -10% portfolio 😐\n2024: +280% portfolio 📈\n2025: ??? 🚀\n\n$BTC $ETH", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
  { content: "Just hit $500K portfolio 🎊 Started with $8,000 in 2021. $BTC $ETH $SOL carried me here. Thank you crypto fam", tags: ['BTC', 'ETH', 'SOL'], sentiment: 'bullish', hasImage: true, imageCategory: 'party' },
  { content: "Crypto is the only place where being early feels painful but being late feels worse 😅 $BTC $ETH just buy", tags: ['BTC', 'ETH'], sentiment: 'bullish', hasImage: false },
];
