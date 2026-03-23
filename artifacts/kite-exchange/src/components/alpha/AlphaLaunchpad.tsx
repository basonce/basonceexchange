import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, TrendingUp, Sparkles, ThumbsUp, Award, Search, X, Crown, Flame, Zap, Bot, Gamepad2, Layers, Coins, Globe } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';
import { fetchAlphaTokens } from '../../lib/alpha-service';
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

export default function AlphaLaunchpad() {
  const [tokens, setTokens] = useState<AlphaToken[]>([]);
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
  const prevTokenIdsRef = useRef<Set<string>>(new Set());
  const newListingTimerRef = useRef<number | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      const data = await fetchAlphaTokens(filter, network);

      const prevIds = prevTokenIdsRef.current;
      if (prevIds.size > 0) {
        const fresh = data.find(t => !prevIds.has(t.id));
        if (fresh) {
          setNewListing(fresh);
          setNewListingVisible(true);
          if (newListingTimerRef.current) clearTimeout(newListingTimerRef.current);
          newListingTimerRef.current = window.setTimeout(() => setNewListingVisible(false), 5000);
        }
      }

      prevTokenIdsRef.current = new Set(data.map(t => t.id));
      setTokens(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filter, network]);

  useEffect(() => {
    setLoading(true);
    loadTokens();
    const interval = setInterval(loadTokens, 15000);
    return () => clearInterval(interval);
  }, [loadTokens]);

  useEffect(() => {
    const manager = AlphaPriceManager.getInstance();
    const unsub = manager.subscribe(prices => setLivePrices(prices));
    return unsub;
  }, []);

  useEffect(() => {
    return () => {
      if (newListingTimerRef.current) clearTimeout(newListingTimerRef.current);
    };
  }, []);

  const tokensWithLivePrices = tokens.map(t => ({
    ...t,
    current_price: livePrices[t.id] ?? t.current_price,
  }));

  const filteredByCategory = category === 'All'
    ? tokensWithLivePrices
    : tokensWithLivePrices.filter(t => t.tag === category);

  const filteredTokens = searchQuery
    ? filteredByCategory.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByCategory;

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

  const bncTokens = tokens.filter(t => t.network === 'BSC' || t.network === 'BNC');
  const kingToken = (bncTokens.length > 0 ? bncTokens : tokens).reduce((best, t) => {
    if (!best || t.volume_24h > best.volume_24h) return t;
    return best;
  }, null as AlphaToken | null);

  const categoryCounts: Record<string, number> = { All: tokens.length };
  CATEGORY_FILTERS.slice(1).forEach(c => {
    categoryCounts[c.id] = tokens.filter(t => t.tag === c.id).length;
  });

  return (
    <div>
      <AlphaLiveTicker tokens={tokens} />

      {newListingVisible && newListing && (
        <div
          className="mx-4 mt-3 bg-gradient-to-r from-[#0ECB81]/10 to-[#00D1FF]/10 border border-[#0ECB81]/30 rounded-xl p-3 cursor-pointer active:scale-[0.99] transition-all duration-300 animate-slide-in"
          onClick={() => setSelectedToken(newListing)}
          style={{ animation: 'fadeSlideIn 0.4s ease-out' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#0ECB81] animate-ping" />
            <span className="text-[#0ECB81] text-[10px] font-black tracking-widest">NEW LISTING</span>
            <div className="flex items-center gap-1.5 ml-1">
              {newListing.logo_url ? (
                <img src={newListing.logo_url} alt="" className="w-5 h-5 rounded-full" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#0ECB81]/30 flex items-center justify-center">
                  <span className="text-[#0ECB81] text-[8px] font-black">{newListing.symbol.slice(0, 2)}</span>
                </div>
              )}
              <span className="text-white text-xs font-bold">{newListing.name}</span>
              <span className="text-gray-400 text-[10px]">${newListing.symbol}</span>
            </div>
            <button className="ml-auto" onClick={e => { e.stopPropagation(); setNewListingVisible(false); }}>
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-base">Alpha Launchpad</h2>
            <div className="px-1.5 py-0.5 bg-[#0ECB81]/15 rounded">
              <span className="text-[#0ECB81] text-[10px] font-bold">{tokens.length} tokens</span>
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
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] rounded-lg active:scale-95 transition-transform shadow-lg shadow-[#F0B90B]/10"
            >
              <Plus className="w-3.5 h-3.5 text-[#0B0E11]" />
              <span className="text-[#0B0E11] text-xs font-bold">Create</span>
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
          className="mx-4 mb-3 bg-gradient-to-r from-[#F0B90B]/5 via-[#F0B90B]/10 to-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-xl p-3 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => setSelectedToken(kingToken)}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-[#F0B90B] text-[11px] font-bold">KING OF THE HILL</span>
            <Flame className="w-3.5 h-3.5 text-[#F6465D] animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {kingToken.logo_url ? (
                <img src={kingToken.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F0B90B] to-[#E8831D] flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">{kingToken.symbol.slice(0, 2)}</span>
                </div>
              )}
              <div>
                <span className="text-white text-xs font-bold">{kingToken.name}</span>
                <span className="text-gray-500 text-[10px] ml-1">${kingToken.symbol}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-white text-xs font-bold">${(kingToken.volume_24h / 1000).toFixed(1)}K</span>
              <span className="text-gray-500 text-[10px] block">24h vol</span>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mb-2">
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {SORT_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                filter === f.id
                  ? 'bg-[#F0B90B] text-[#0B0E11]'
                  : 'bg-[#181A20] text-gray-400 hover:text-gray-300 border border-[#2B3139]/50'
              }`}
            >
              <f.icon className="w-3 h-3" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {CATEGORY_FILTERS.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                category === c.id
                  ? 'bg-[#2B3139] text-white'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <c.icon className="w-3 h-3" />
              {c.label}
              {categoryCounts[c.id] !== undefined && (
                <span className="text-[9px] opacity-60">({categoryCounts[c.id]})</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {NETWORKS.map(n => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1 ${
                network === n
                  ? 'bg-[#2B3139] text-white'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              {n !== 'All' && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: NETWORK_COLORS[n] || '#666' }} />
              )}
              {n === 'All' ? `All` : n === 'BNC' ? `BNC (${bncTokens.length})` : n}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#181A20] rounded-xl p-4 animate-pulse border border-[#2B3139]/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[#2B3139]" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-[#2B3139] rounded mb-1" />
                  <div className="h-3 w-32 bg-[#2B3139]/50 rounded" />
                </div>
              </div>
              <div className="h-2 bg-[#2B3139] rounded-full mb-3" />
              <div className="flex gap-3">
                <div className="h-3 w-16 bg-[#2B3139]/50 rounded" />
                <div className="h-3 w-16 bg-[#2B3139]/50 rounded" />
                <div className="h-3 w-16 bg-[#2B3139]/50 rounded" />
              </div>
            </div>
          ))
        ) : filteredTokens.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-gray-500 text-sm">
              {searchQuery ? `No tokens found for "${searchQuery}"` : 'No tokens in this category'}
            </span>
          </div>
        ) : (
          filteredTokens.map(token => (
            <AlphaTokenCard
              key={token.id}
              token={token}
              onClick={() => setSelectedToken(token)}
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
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
