import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, TrendingUp, Sparkles, ThumbsUp, Award, Search, X, Crown, Flame, Zap, Bot, Gamepad2, Layers, Coins, Globe, Activity } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';
import { fetchAlphaTokens } from '../../lib/alpha-service';
import { STATIC_MOCK_TOKENS, getNextNewListing } from '../../lib/alpha-mock-tokens';
import AlphaLiveTicker from './AlphaLiveTicker';
import AlphaTokenCard from './AlphaTokenCard';
import AlphaTokenDetail from './AlphaTokenDetail';
import AlphaCreateToken from './AlphaCreateToken';
import AlphaCompetition from './AlphaCompetition';
import AlphaPriceManager from '../../lib/alpha-price-manager';
import { supabase } from '../../lib/supabase';

const SORT_FILTERS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'new', label: 'New', icon: Sparkles },
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
  { id: 'RWA', label: 'RWA', icon: Zap },
];

const NETWORKS = ['All', 'BNC', 'Ethereum', 'Solana', 'Base'];

const NETWORK_COLORS: Record<string, string> = {
  BNC: '#F0B90B', Ethereum: '#627EEA', Solana: '#00D1FF', Base: '#0052FF',
};

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

export default function AlphaLaunchpad() {
  const [dbTokens, setDbTokens] = useState<AlphaToken[]>([]);
  const [injectedTokens, setInjectedTokens] = useState<AlphaToken[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('trending');
  const [network, setNetwork] = useState('All');
  const [category, setCategory] = useState('All');
  const [selectedToken, setSelectedToken] = useState<AlphaToken | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newListing, setNewListing] = useState<AlphaToken | null>(null);
  const [newListingVisible, setNewListingVisible] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const newListingTimerRef = useRef<number | null>(null);
  const priceManagerRef = useRef<InstanceType<typeof AlphaPriceManager> | null>(null);

  const allTokens = useMemo(() => {
    const merged = mergeTokens(dbTokens, STATIC_MOCK_TOKENS);
    return mergeTokens(merged, injectedTokens.filter(t =>
      !merged.some(m => m.id === t.id)
    ));
  }, [dbTokens, injectedTokens]);

  const loadTokens = useCallback(async () => {
    try {
      const data = await fetchAlphaTokens('trending', 'All');
      setDbTokens(data);
    } catch {
    } finally {
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
    const counter = setInterval(() => {
      setLiveCount(c => c + Math.floor(Math.random() * 3));
    }, 8000);
    return () => clearInterval(counter);
  }, []);

  useEffect(() => {
    if (allTokens.length === 0) return;

    const injectNew = () => {
      const token = getNextNewListing();
      setInjectedTokens(prev => [token, ...prev].slice(0, 30));
      setNewListing(token);
      setNewListingVisible(true);
      if (newListingTimerRef.current) clearTimeout(newListingTimerRef.current);
      newListingTimerRef.current = window.setTimeout(() => setNewListingVisible(false), 6000);

      if (priceManagerRef.current) {
        priceManagerRef.current.initTokens([token]);
      }
    };

    const delay = 15000 + Math.random() * 10000;
    const firstTimer = window.setTimeout(() => {
      injectNew();
      const interval = window.setInterval(injectNew, 22000 + Math.random() * 8000);
      return () => clearInterval(interval);
    }, delay);

    return () => {
      clearTimeout(firstTimer);
      if (newListingTimerRef.current) clearTimeout(newListingTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTokens.length]);

  const tokensWithLivePrices = useMemo(() =>
    allTokens.map(t => ({
      ...t,
      current_price: livePrices[t.id] ?? t.current_price,
    })),
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

  const handleTokenCreated = async (tokenId: string) => {
    const { data } = await supabase
      .from('alpha_tokens')
      .select('*')
      .eq('id', tokenId)
      .maybeSingle();
    if (data) {
      setSelectedToken(data);
      loadTokens();
    }
  };

  const bncTokens = allTokens.filter(t => t.network === 'BSC' || t.network === 'BNC');
  const kingToken = (bncTokens.length > 0 ? bncTokens : allTokens).reduce((best, t) => {
    if (!best || t.volume_24h > best.volume_24h) return t;
    return best;
  }, null as AlphaToken | null);

  const categoryCounts: Record<string, number> = { All: allTokens.length };
  CATEGORY_FILTERS.slice(1).forEach(c => {
    categoryCounts[c.id] = allTokens.filter(t => t.tag === c.id).length;
  });

  const isNewlyInjected = (tokenId: string) => injectedTokens.some(t => t.id === tokenId);

  return (
    <div>
      <AlphaLiveTicker tokens={allTokens} />

      {newListingVisible && newListing && (
        <div
          className="mx-4 mt-3 cursor-pointer active:scale-[0.99] transition-all duration-300"
          onClick={() => setSelectedToken(newListing)}
          style={{ animation: 'alphaSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div className="relative overflow-hidden bg-[#0B0E11] border border-[#0ECB81]/40 rounded-xl p-3">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0ECB81]/8 via-[#0ECB81]/4 to-transparent" />
            <div className="relative flex items-center gap-2.5">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0ECB81] animate-ping absolute" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#0ECB81]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[#0ECB81] text-[10px] font-black tracking-widest">🚀 NEW LISTING</span>
                  <span className="text-white text-xs font-bold truncate">{newListing.name}</span>
                  <span className="text-gray-500 text-[10px] font-semibold">${newListing.symbol}</span>
                </div>
                <span className="text-gray-500 text-[10px]">Just launched on Basonce Alpha</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded font-bold text-[#F0B90B]">
                  {newListing.network === 'BSC' ? 'BNC' : newListing.network}
                </span>
                <button onClick={e => { e.stopPropagation(); setNewListingVisible(false); }}>
                  <X className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-black text-base tracking-tight">Basonce Alpha</h2>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#0ECB81]/15 rounded-md border border-[#0ECB81]/20">
              <Activity className="w-2.5 h-2.5 text-[#0ECB81]" />
              <span className="text-[#0ECB81] text-[10px] font-bold">{allTokens.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-[#2B3139] rounded-lg transition-colors"
            >
              {showSearch ? <X className="w-4 h-4 text-gray-400" /> : <Search className="w-4 h-4 text-gray-400" />}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] rounded-lg active:scale-95 transition-transform shadow-lg shadow-[#F0B90B]/15"
            >
              <Plus className="w-3.5 h-3.5 text-[#0B0E11]" />
              <span className="text-[#0B0E11] text-xs font-black">Create</span>
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tokens by name or symbol..."
              autoFocus
              className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600"
            />
          </div>
        )}
      </div>

      <AlphaCompetition />

      {kingToken && !kingToken.is_graduated && (
        <div
          className="mx-4 mb-3 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => setSelectedToken(kingToken)}
        >
          <div className="relative overflow-hidden bg-[#0B0E11] border border-[#F0B90B]/25 rounded-xl p-3">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F0B90B]/6 via-transparent to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <Crown className="w-3.5 h-3.5 text-[#F0B90B]" />
                <span className="text-[#F0B90B] text-[10px] font-black tracking-widest">KING OF THE HILL</span>
                <Flame className="w-3 h-3 text-[#F6465D] animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full border-2 border-[#F0B90B]/40 overflow-hidden bg-gradient-to-br from-[#F0B90B] to-[#E8831D] flex items-center justify-center flex-shrink-0">
                    {kingToken.logo_url ? (
                      <img src={kingToken.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span className="text-white text-[11px] font-black">{kingToken.symbol.slice(0, 2)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-white text-[13px] font-bold">{kingToken.name}</span>
                    <span className="text-gray-500 text-[10px] ml-1.5">${kingToken.symbol}</span>
                    <div className="h-1.5 bg-[#181A20] rounded-full overflow-hidden mt-1 w-28">
                      <div
                        className="h-full bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] rounded-full"
                        style={{ width: `${Math.min((kingToken.raised_amount / kingToken.target_amount) * 100, 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[#0ECB81] text-xs font-bold">{formatVol(kingToken.volume_24h)}</span>
                  <span className="text-gray-600 text-[10px] block">24h vol</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mb-2 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {SORT_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                filter === f.id
                  ? 'bg-[#F0B90B] text-[#0B0E11] shadow-md shadow-[#F0B90B]/20'
                  : 'bg-[#181A20] text-gray-400 hover:text-gray-200 border border-[#2B3139]/60'
              }`}
            >
              <f.icon className="w-3 h-3" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {CATEGORY_FILTERS.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                category === c.id
                  ? 'bg-[#2B3139] text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <c.icon className="w-3 h-3" />
              {c.label}
              <span className="text-[9px] opacity-50 ml-0.5">({categoryCounts[c.id] ?? 0})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {NETWORKS.map(n => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1 ${
                network === n ? 'bg-[#2B3139] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {n !== 'All' && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NETWORK_COLORS[n] || '#666' }} />
              )}
              {n === 'All' ? 'All' : n === 'BNC' ? `BNC (${bncTokens.length})` : n}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 space-y-2.5">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#181A20] rounded-xl p-4 animate-pulse border border-[#2B3139]/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#2B3139]" />
                <div className="flex-1">
                  <div className="h-4 w-28 bg-[#2B3139] rounded mb-2" />
                  <div className="h-3 w-36 bg-[#2B3139]/50 rounded" />
                </div>
                <div className="w-16 h-7 bg-[#2B3139]/50 rounded" />
              </div>
              <div className="h-2.5 bg-[#2B3139] rounded-full mb-3" />
              <div className="flex gap-4 pt-1">
                <div className="h-3 w-14 bg-[#2B3139]/50 rounded" />
                <div className="h-3 w-14 bg-[#2B3139]/50 rounded" />
                <div className="h-3 w-14 bg-[#2B3139]/50 rounded" />
              </div>
            </div>
          ))
        ) : filteredTokens.length === 0 ? (
          <div className="py-16 text-center">
            <Sparkles className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <span className="text-gray-500 text-sm block">
              {searchQuery ? `No tokens found for "${searchQuery}"` : 'No tokens in this category'}
            </span>
          </div>
        ) : (
          filteredTokens.map(token => (
            <AlphaTokenCard
              key={token.id}
              token={token}
              onClick={() => setSelectedToken(token)}
              isNew={isNewlyInjected(token.id)}
            />
          ))
        )}
      </div>

      {selectedToken && (
        <AlphaTokenDetail
          token={selectedToken}
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}

      <AlphaCreateToken
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onTokenCreated={handleTokenCreated}
      />

      <style>{`
        @keyframes alphaSlideIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function formatVol(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}
