import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Search, X, Activity, Crown, Flame, TrendingUp, Gem, ThumbsUp, ThumbsDown, Award,
  Globe, Bot, Coins, Gamepad2, Layers, Gauge, Users, ArrowUpRight, ArrowDownRight, Copy, CheckCircle,
} from 'lucide-react';
import type { AlphaToken, AlphaTransaction, AlphaPricePoint } from '../../types/alpha';
import {
  fetchAlphaTokens, generateBotTrade, calculatePriceAfterTrade, updateTokenAfterTrade,
  fetchTokenTransactions,
} from '../../lib/alpha-service';
import { STATIC_MOCK_TOKENS, getNextNewListing } from '../../lib/alpha-mock-tokens';
import AlphaPriceManager from '../../lib/alpha-price-manager';
import AlphaLiveTicker from '../../components/alpha/AlphaLiveTicker';
import AlphaTokenCard from '../../components/alpha/AlphaTokenCard';
import AlphaTokenChart from '../../components/alpha/AlphaTokenChart';
import AlphaTradingPanel from '../../components/alpha/AlphaTradingPanel';
import AlphaCreateToken from '../../components/alpha/AlphaCreateToken';
import { supabase } from '../../lib/supabase';

type PageProps = { user?: any; onAuth?: (m: 'login' | 'register') => void; onDeposit?: () => void; onNavigate?: (t: any) => void };

const SORT_FILTERS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'new', label: 'New', icon: Gem },
  { id: 'voted', label: 'Top Voted', icon: ThumbsUp },
  { id: 'graduated', label: 'Graduated', icon: Award },
];

const CATEGORY_FILTERS = [
  { id: 'All', label: 'All', icon: Globe },
  { id: 'Meme', label: 'Meme', icon: Flame },
  { id: 'AI', label: 'AI', icon: Bot },
  { id: 'DeFi', label: 'DeFi', icon: Coins },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'Layer2', label: 'L2', icon: Layers },
  { id: 'RWA', label: 'RWA', icon: Gauge },
];

const NETWORKS = ['All', 'BNC', 'Ethereum', 'Solana', 'Base'];
const NETWORK_COLORS: Record<string, string> = { BNC: '#F0B90B', BSC: '#F0B90B', Ethereum: '#627EEA', Solana: '#00D1FF', Base: '#0052FF' };

function mergeTokens(dbTokens: AlphaToken[], mockTokens: AlphaToken[]): AlphaToken[] {
  const symbols = new Set(dbTokens.map(t => t.symbol.toUpperCase()));
  const filtered = mockTokens.filter(m => !symbols.has(m.symbol.toUpperCase()));
  return [...dbTokens, ...filtered];
}

function sortTokens(tokens: AlphaToken[], filter: string): AlphaToken[] {
  const list = [...tokens];
  switch (filter) {
    case 'trending':
      return list.sort((a, b) => (b.volume_24h + b.community_score * 10) - (a.volume_24h + a.community_score * 10));
    case 'new':
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'voted':
      return list.sort((a, b) => b.community_score - a.community_score);
    case 'graduated':
      return list.filter(t => t.is_graduated).sort((a, b) => b.market_cap - a.market_cap);
    default:
      return list;
  }
}

function formatVol(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatMcap(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatPrice(p: number): string {
  if (p < 0.000001) return p.toFixed(10);
  if (p < 0.0001) return p.toFixed(8);
  if (p < 0.01) return p.toFixed(6);
  if (p < 1) return p.toFixed(4);
  return p.toFixed(2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function DesktopAlpha(_props: PageProps) {
  const [dbTokens, setDbTokens] = useState<AlphaToken[]>([]);
  const [injectedTokens, setInjectedTokens] = useState<AlphaToken[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('trending');
  const [network, setNetwork] = useState('All');
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const priceManagerRef = useRef<ReturnType<typeof AlphaPriceManager.getInstance> | null>(null);
  const newListingTimerRef = useRef<number | null>(null);

  const allTokens = useMemo(() => {
    const merged = mergeTokens(dbTokens, STATIC_MOCK_TOKENS);
    return mergeTokens(merged, injectedTokens.filter(t => !merged.some(m => m.id === t.id)));
  }, [dbTokens, injectedTokens]);

  const loadTokens = useCallback(async () => {
    try {
      const data = await fetchAlphaTokens('trending', 'All');
      setDbTokens(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadTokens();
    const interval = setInterval(loadTokens, 30000);
    return () => clearInterval(interval);
  }, [loadTokens]);

  useEffect(() => {
    if (allTokens.length === 0) return;
    const manager = AlphaPriceManager.getInstance();
    priceManagerRef.current = manager;
    manager.initTokens(allTokens);
    const unsub = manager.subscribe(prices => setLivePrices(prices));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTokens.length]);

  useEffect(() => {
    if (allTokens.length === 0) return;
    const injectNew = () => {
      const token = getNextNewListing();
      setInjectedTokens(prev => [token, ...prev].slice(0, 30));
      if (priceManagerRef.current) priceManagerRef.current.initTokens([token]);
    };
    const delay = 18000 + Math.random() * 12000;
    const firstTimer = window.setTimeout(() => {
      injectNew();
      newListingTimerRef.current = window.setInterval(injectNew, 24000 + Math.random() * 10000);
    }, delay);
    return () => {
      clearTimeout(firstTimer);
      if (newListingTimerRef.current) clearInterval(newListingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTokens.length]);

  const tokensWithLivePrices = useMemo(() =>
    allTokens.map(t => ({ ...t, current_price: livePrices[t.id] ?? t.current_price })),
    [allTokens, livePrices]
  );

  const filteredByNetwork = network === 'All'
    ? tokensWithLivePrices
    : tokensWithLivePrices.filter(t =>
        network === 'BNC' ? (t.network === 'BSC' || t.network === 'BNC') : t.network === network
      );
  const filteredByCategory = category === 'All'
    ? filteredByNetwork
    : filteredByNetwork.filter(t => t.tag === category);
  const filteredBySearch = searchQuery
    ? filteredByCategory.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByCategory;
  const filteredTokens = useMemo(() => sortTokens(filteredBySearch, filter), [filteredBySearch, filter]);

  const bncTokens = useMemo(() => allTokens.filter(t => t.network === 'BSC' || t.network === 'BNC'), [allTokens]);
  const kingToken = useMemo(() => {
    const pool = bncTokens.length > 0 ? bncTokens : allTokens;
    return pool.reduce((best, t) => (!best || t.volume_24h > best.volume_24h ? t : best), null as AlphaToken | null);
  }, [bncTokens, allTokens]);

  const categoryCounts: Record<string, number> = { All: allTokens.length };
  CATEGORY_FILTERS.slice(1).forEach(c => {
    categoryCounts[c.id] = allTokens.filter(t => t.tag === c.id).length;
  });

  const isNewlyInjected = useCallback((id: string) => injectedTokens.some(t => t.id === id), [injectedTokens]);

  const selectedToken = useMemo(() => {
    const fromList = filteredTokens.find(t => t.id === selectedId)
      || tokensWithLivePrices.find(t => t.id === selectedId);
    if (fromList) return fromList;
    return filteredTokens[0] || kingToken || null;
  }, [selectedId, filteredTokens, tokensWithLivePrices, kingToken]);

  const handleTokenCreated = async (tokenId: string) => {
    const { data } = await supabase.from('alpha_tokens').select('*').eq('id', tokenId).maybeSingle();
    if (data) { setSelectedId(data.id); loadTokens(); }
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <AlphaLiveTicker tokens={allTokens} />

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Title block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-white font-bold text-3xl">Basonce Alpha</h1>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0ECB81]/15 rounded-md border border-[#0ECB81]/25">
                <Activity className="w-3 h-3 text-[#0ECB81]" />
                <span className="text-[#0ECB81] text-xs font-bold tabular-nums">{allTokens.length} Live</span>
              </div>
            </div>
            <p className="text-[#848E9C] text-sm mt-1">On-chain token launchpad with bonding-curve trading. Discover, trade, and launch early-stage Web3 tokens.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2 flex items-center gap-2 w-full sm:w-72">
              <Search className="w-4 h-4 text-[#848E9C] shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens by name or symbol"
                className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] flex-1 min-w-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="Clear search">
                  <X className="w-4 h-4 text-[#848E9C]" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0B90B] hover:bg-[#FCD535] rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-4 h-4 text-[#0B0E11]" />
              <span className="text-[#0B0E11] text-sm font-bold whitespace-nowrap">Create Token</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            {SORT_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.id ? 'bg-[#1E2329] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            ))}
          </div>
          <div className="hidden xl:block w-px h-6 bg-[#2B3139]" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_FILTERS.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  category === c.id ? 'bg-[#2B3139] text-white' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                <c.icon className="w-3 h-3" />
                {c.label}
                <span className="text-[10px] opacity-60 tabular-nums">({categoryCounts[c.id] ?? 0})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap xl:ml-auto">
            {NETWORKS.map(n => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  network === n ? 'bg-[#2B3139] text-white' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                {n !== 'All' && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NETWORK_COLORS[n] || '#666' }} />}
                {n === 'All' ? 'All' : n === 'BNC' ? `BNC (${bncTokens.length})` : n}
              </button>
            ))}
          </div>
        </div>

        {/* King of the hill banner */}
        {kingToken && !kingToken.is_graduated && (
          <button
            onClick={() => setSelectedId(kingToken.id)}
            className="w-full text-left mb-6 relative overflow-hidden bg-[#181A20] border border-[#F0B90B]/25 rounded-xl p-4 hover:border-[#F0B90B]/50 transition-colors"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#F0B90B]/8 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Crown className="w-4 h-4 text-[#F0B90B]" />
                  <span className="text-[#F0B90B] text-xs font-black tracking-widest hidden sm:inline">KING OF THE HILL</span>
                  <Flame className="w-3.5 h-3.5 text-[#F6465D]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold truncate">{kingToken.name}</span>
                    <span className="text-[#848E9C] text-xs">${kingToken.symbol}</span>
                  </div>
                  <div className="h-1.5 bg-[#0B0E11] rounded-full overflow-hidden mt-1.5 w-40">
                    <div className="h-full bg-gradient-to-r from-[#F0B90B] to-[#FCD535] rounded-full"
                      style={{ width: `${Math.min((kingToken.raised_amount / kingToken.target_amount) * 100, 100).toFixed(0)}%` }} />
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[#0ECB81] text-sm font-bold tabular-nums whitespace-nowrap">{formatVol(kingToken.volume_24h)}</div>
                <div className="text-[#5E6673] text-[10px]">24h Volume</div>
              </div>
            </div>
          </button>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-6 items-start">
          {/* Discovery list */}
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#2B3139] flex items-center justify-between">
              <h2 className="text-white font-semibold text-base">Token Discovery</h2>
              <span className="text-[#848E9C] text-xs tabular-nums">{filteredTokens.length} tokens</span>
            </div>
            {loading ? (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-[#0B0E11] rounded-xl p-4 animate-pulse border border-[#2B3139]/50 h-[160px]" />
                ))}
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-20 text-center">
                <Gem className="w-8 h-8 text-[#2B3139] mx-auto mb-3" />
                <span className="text-[#848E9C] text-sm">
                  {searchQuery ? `No tokens found for "${searchQuery}"` : 'No tokens in this category'}
                </span>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredTokens.map(token => (
                  <div
                    key={token.id}
                    className={`rounded-xl transition-all ${selectedToken?.id === token.id ? 'ring-1 ring-[#F0B90B]/60 rounded-xl' : ''}`}
                  >
                    <AlphaTokenCard
                      token={token}
                      onClick={() => setSelectedId(token.id)}
                      isNew={isNewlyInjected(token.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected token panel */}
          <div className="xl:sticky xl:top-6">
            {selectedToken ? (
              <TokenDetailPanel key={selectedToken.id} token={selectedToken} liveManager={priceManagerRef} />
            ) : (
              <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-10 text-center">
                <Gem className="w-8 h-8 text-[#2B3139] mx-auto mb-3" />
                <span className="text-[#848E9C] text-sm">Select a token to view its chart and trade</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlphaCreateToken isOpen={showCreate} onClose={() => setShowCreate(false)} onTokenCreated={handleTokenCreated} />
    </div>
  );
}

const TF_INTERVAL_MS: Record<string, number> = {
  '1M': 60000, '5M': 300000, '15M': 900000, '1H': 3600000, '4H': 14400000, '1D': 86400000,
};

function TokenDetailPanel({ token: initialToken, liveManager }: { token: AlphaToken; liveManager: React.MutableRefObject<ReturnType<typeof AlphaPriceManager.getInstance> | null> }) {
  const [liveToken, setLiveToken] = useState<AlphaToken>(initialToken);
  const liveTokenRef = useRef<AlphaToken>(initialToken);
  liveTokenRef.current = liveToken;
  const [transactions, setTransactions] = useState<AlphaTransaction[]>([]);
  const [priceHistory, setPriceHistory] = useState<AlphaPricePoint[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState('5M');
  const [userBalance, setUserBalance] = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);
  const [toast, setToast] = useState<{ type: 'buy' | 'sell'; amount: number; price: number } | null>(null);

  useEffect(() => { setLiveToken(initialToken); }, [initialToken]);

  // Fetch real user balance for the raised token
  useEffect(() => {
    setBalanceLoaded(false);
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) { if (active) { setUserBalance(0); setBalanceLoaded(true); } return; }
        const sym = liveToken.raised_token === 'BSC' ? 'BNC' : liveToken.raised_token;
        const { data } = await supabase.from('user_balances').select('balance')
          .eq('user_id', session.user.id).eq('symbol', sym).maybeSingle();
        if (active) setUserBalance(data ? parseFloat(data.balance as string) || 0 : 0);
      } catch { if (active) setUserBalance(0); }
      finally { if (active) setBalanceLoaded(true); }
    })();
    return () => { active = false; };
  }, [liveToken.raised_token]);

  // Subscribe to live prices
  useEffect(() => {
    const manager = liveManager.current || AlphaPriceManager.getInstance();
    const unsub = manager.subscribe((prices) => {
      const newPrice = prices[liveToken.id];
      if (newPrice && newPrice > 0 && newPrice !== liveToken.current_price) {
        setLiveToken(prev => ({
          ...prev,
          current_price: newPrice,
          market_cap: newPrice * (prev.total_supply || 1000000000),
        }));
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveToken.id]);

  // Load recent transactions
  useEffect(() => {
    let active = true;
    fetchTokenTransactions(liveToken.id)
      .then(txs => { if (active && txs.length) setTransactions(txs); })
      .catch(() => {});
    return () => { active = false; };
  }, [liveToken.id]);

  // Bot trades simulation feeding chart history + tape
  useEffect(() => {
    const interval = setInterval(() => {
      const lt = liveTokenRef.current;
      const botTrade = generateBotTrade(lt);
      setTransactions(prev => [botTrade, ...prev].slice(0, 40));

      const initialPrice = lt.initial_price || lt.current_price * 0.1;
      const tradeAmt = botTrade.total_value * 0.1;
      const { newPrice, newRaised } = calculatePriceAfterTrade(
        botTrade.tx_type, tradeAmt, lt.raised_amount, lt.target_amount, initialPrice
      );

      setLiveToken(prev => ({
        ...prev,
        current_price: newPrice,
        raised_amount: newRaised,
        market_cap: newPrice * (prev.total_supply || 1000000000),
        transaction_count: (prev.transaction_count || 0) + 1,
        price_change_24h: (prev.price_change_24h || 0) + ((newPrice - prev.current_price) / Math.max(prev.current_price, 0.0000001)) * 100 * 0.05,
      }));

      setPriceHistory(prev => {
        const intervalMs = TF_INTERVAL_MS[activeTimeframe] || 300000;
        const bucketTs = Math.floor(Date.now() / intervalMs) * intervalMs;
        const existingIdx = prev.findIndex(p => Math.floor(new Date(p.timestamp).getTime() / intervalMs) * intervalMs === bucketTs);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const candle = { ...updated[existingIdx] };
          candle.high_price = Math.max(candle.high_price, newPrice);
          candle.low_price = Math.min(candle.low_price, newPrice);
          candle.close_price = newPrice;
          candle.price = newPrice;
          candle.volume = candle.volume + botTrade.total_value;
          updated[existingIdx] = candle;
          return updated;
        }
        const lastClose = prev.length > 0 ? prev[prev.length - 1].close_price : newPrice;
        return [...prev, {
          timestamp: new Date(bucketTs).toISOString(),
          open_price: lastClose, high_price: Math.max(lastClose, newPrice),
          low_price: Math.min(lastClose, newPrice), close_price: newPrice,
          volume: botTrade.total_value, price: newPrice, market_cap: newPrice * 1000000000,
        }].slice(-300);
      });
    }, 2800 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [liveToken.id, activeTimeframe]);

  const handleTrade = (type: 'buy' | 'sell', amount: number) => {
    const initialPrice = liveToken.initial_price || liveToken.current_price * 0.1;
    const { newPrice, newRaised } = calculatePriceAfterTrade(type, amount, liveToken.raised_amount, liveToken.target_amount, initialPrice);

    setToast({ type, amount, price: newPrice });
    setTimeout(() => setToast(null), 3000);

    setLiveToken(prev => ({
      ...prev, current_price: newPrice, raised_amount: newRaised,
      market_cap: newPrice * (prev.total_supply || 1000000000),
      transaction_count: (prev.transaction_count || 0) + 1,
      volume_24h: (prev.volume_24h || 0) + amount,
      ath_price: Math.max(prev.ath_price || 0, newPrice),
    }));

    const newTx: AlphaTransaction = {
      id: crypto.randomUUID(), token_id: liveToken.id, user_id: null,
      tx_type: type, amount: Math.round(amount / Math.max(newPrice, 0.000000001)),
      price: newPrice, total_value: amount, wallet_address: '0xYou...r',
      username: 'You', avatar_url: null, token_symbol: liveToken.symbol,
      token_name: liveToken.name, raised_token: liveToken.raised_token,
      created_at: new Date().toISOString(),
    };
    setTransactions(prev => [newTx, ...prev]);
    updateTokenAfterTrade(liveToken.id, type, amount, liveToken).catch(() => {});
  };

  const handleVote = async (direction: 'up' | 'down') => {
    if (voteState === direction) return;
    const delta = direction === 'up' ? 1 : -1;
    const prevDelta = voteState === 'up' ? -1 : voteState === 'down' ? 1 : 0;
    const totalDelta = delta + prevDelta;
    setVoteState(direction);
    setLiveToken(prev => ({ ...prev, community_score: prev.community_score + totalDelta }));
    try {
      await supabase.from('alpha_tokens').update({ community_score: liveToken.community_score + totalDelta }).eq('id', liveToken.id);
    } catch { /* ignore */ }
  };

  const contractAddr = '0x' + liveToken.id.replace(/-/g, '').slice(0, 40);
  const handleCopy = () => { navigator.clipboard.writeText(contractAddr); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const progress = Math.min((liveToken.raised_amount / liveToken.target_amount) * 100, 100);
  const netColor = NETWORK_COLORS[liveToken.network] || '#666';
  const raisedTok = liveToken.raised_token === 'BSC' ? 'BNC' : liveToken.raised_token;
  const isUp = (liveToken.price_change_24h || 0) >= 0;

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className={`absolute -top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-2xl ${toast.type === 'buy' ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'}`}>
          {toast.type === 'buy' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {toast.type === 'buy' ? 'Bought' : 'Sold'} {toast.amount} {raisedTok}
          <span className="text-white/80 text-[11px] tabular-nums">@ ${formatPrice(toast.price)}</span>
        </div>
      )}

      {/* Token header */}
      <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#F0B90B] to-[#E8831D] flex items-center justify-center shrink-0 relative">
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">{liveToken.symbol.slice(0, 2)}</span>
              {liveToken.logo_url && (
                <img src={liveToken.logo_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base truncate">{liveToken.name}</span>
                {liveToken.is_graduated && <Award className="w-4 h-4 text-[#0ECB81] shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#848E9C] text-xs">${liveToken.symbol}</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${netColor}18` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: netColor }} />
                  <span className="text-[10px] font-bold" style={{ color: netColor }}>{liveToken.network === 'BSC' ? 'BNC' : liveToken.network}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-white font-bold text-base tabular-nums whitespace-nowrap">${formatPrice(liveToken.current_price)}</div>
            <div className={`text-xs font-bold tabular-nums whitespace-nowrap ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isUp ? '+' : ''}{(liveToken.price_change_24h || 0).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-[#0B0E11] rounded-lg p-2.5">
            <div className="text-[#5E6673] text-[10px]">Market Cap</div>
            <div className="text-white text-sm font-semibold tabular-nums whitespace-nowrap">{formatMcap(liveToken.market_cap)}</div>
          </div>
          <div className="bg-[#0B0E11] rounded-lg p-2.5">
            <div className="text-[#5E6673] text-[10px]">24h Volume</div>
            <div className="text-white text-sm font-semibold tabular-nums whitespace-nowrap">{formatVol(liveToken.volume_24h)}</div>
          </div>
          <div className="bg-[#0B0E11] rounded-lg p-2.5">
            <div className="text-[#5E6673] text-[10px]">Holders</div>
            <div className="text-white text-sm font-semibold tabular-nums whitespace-nowrap">{liveToken.holder_count.toLocaleString()}</div>
          </div>
        </div>

        <button onClick={handleCopy} className="mt-3 w-full flex items-center justify-between bg-[#0B0E11] rounded-lg px-3 py-2 hover:bg-[#1E2329] transition-colors">
          <span className="text-[#848E9C] text-xs font-mono truncate">{contractAddr.slice(0, 12)}...{contractAddr.slice(-8)}</span>
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-[#0ECB81] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#848E9C] shrink-0" />}
        </button>
      </div>

      {/* Chart */}
      <AlphaTokenChart
        priceHistory={priceHistory}
        currentPrice={liveToken.current_price}
        priceChange={liveToken.price_change_24h || 0}
        onTimeframeChange={setActiveTimeframe}
      />

      {/* Bonding curve */}
      <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#848E9C] text-xs font-medium">Bonding Curve Progress</span>
          <span className={`text-sm font-bold tabular-nums ${liveToken.is_graduated ? 'text-[#0ECB81]' : 'text-[#F0B90B]'}`}>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-[#0B0E11] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${liveToken.is_graduated ? 'bg-gradient-to-r from-[#0ECB81] to-[#17FFAC]' : 'bg-gradient-to-r from-[#C88B00] to-[#F0B90B]'}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[#5E6673] text-[11px] tabular-nums whitespace-nowrap">{liveToken.raised_amount.toFixed(2)} / {liveToken.target_amount} {raisedTok}</span>
          <span className="text-[#5E6673] text-[11px]">Listed {timeAgo(liveToken.created_at)} ago</span>
        </div>
      </div>

      {/* Trading panel */}
      <AlphaTradingPanel token={liveToken} onTrade={handleTrade} userBalance={userBalance} balanceLoaded={balanceLoaded} />

      {/* Community vote */}
      <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#848E9C] text-xs font-medium">Community Sentiment</span>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[#5E6673]" />
            <span className={`text-xs font-bold tabular-nums ${liveToken.community_score >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {liveToken.community_score >= 0 ? '+' : ''}{liveToken.community_score}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote('up')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${voteState === 'up' ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/30' : 'bg-[#0B0E11] text-[#848E9C] border border-[#2B3139] hover:text-[#0ECB81]'}`}
          >
            <ThumbsUp className="w-4 h-4" /> Bullish
          </button>
          <button
            onClick={() => handleVote('down')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${voteState === 'down' ? 'bg-[#F6465D]/20 text-[#F6465D] border border-[#F6465D]/30' : 'bg-[#0B0E11] text-[#848E9C] border border-[#2B3139] hover:text-[#F6465D]'}`}
          >
            <ThumbsDown className="w-4 h-4" /> Bearish
          </button>
        </div>
      </div>

      {/* Recent trades tape */}
      <div className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2B3139] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#F0B90B]" />
          <span className="text-white text-sm font-semibold">Recent Trades</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[11px] text-[#5E6673] border-b border-[#2B3139]/60">
          <span>Trader</span>
          <span className="text-right">Type</span>
          <span className="text-right">Value</span>
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-[#5E6673] text-xs">No trades yet</div>
          ) : (
            transactions.slice(0, 25).map(tx => (
              <div key={tx.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 items-center border-b border-[#2B3139]/40 last:border-0">
                <span className="text-[#B7BDC6] text-xs truncate min-w-0">{tx.username || 'Anonymous'}</span>
                <span className={`text-xs font-bold text-right whitespace-nowrap ${tx.tx_type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {tx.tx_type === 'buy' ? 'Buy' : 'Sell'}
                </span>
                <span className="text-[#EAECEF] text-xs font-medium text-right tabular-nums whitespace-nowrap">
                  {tx.total_value.toFixed(tx.raised_token === 'ETH' ? 4 : 2)} {tx.raised_token === 'BSC' ? 'BNC' : tx.raised_token}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
