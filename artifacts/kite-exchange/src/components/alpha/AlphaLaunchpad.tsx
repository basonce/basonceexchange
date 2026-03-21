import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, Sparkles, ThumbsUp, Award, Search, X, Crown, Flame } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';
import { fetchAlphaTokens } from '../../lib/alpha-service';
import AlphaLiveTicker from './AlphaLiveTicker';
import AlphaTokenCard from './AlphaTokenCard';
import AlphaTokenDetail from './AlphaTokenDetail';
import AlphaCreateToken from './AlphaCreateToken';
import AlphaCompetition from './AlphaCompetition';
import { supabase } from '../../lib/supabase';

const FILTERS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'voted', label: 'Top Voted', icon: ThumbsUp },
  { id: 'graduated', label: 'Graduated', icon: Award },
];

const NETWORKS = ['All', 'BNC', 'Ethereum', 'Solana', 'Base'];

const NETWORK_COLORS: Record<string, string> = {
  BNC: '#F0B90B', Ethereum: '#627EEA', Solana: '#00D1FF', Base: '#0052FF',
};

export default function AlphaLaunchpad() {
  const [tokens, setTokens] = useState<AlphaToken[]>([]);
  const [filter, setFilter] = useState('trending');
  const [network, setNetwork] = useState('All');
  const [selectedToken, setSelectedToken] = useState<AlphaToken | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTokens = useCallback(async () => {
    try {
      const data = await fetchAlphaTokens(filter, network);
      setTokens(data);
    } catch {
      /* */
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

  const filteredTokens = searchQuery
    ? tokens.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tokens;

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

  return (
    <div>
      <AlphaLiveTicker tokens={tokens} />

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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F0B90B] to-[#E8831D] flex items-center justify-center">
                <span className="text-white text-[10px] font-black">{kingToken.symbol.slice(0, 2)}</span>
              </div>
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
          {FILTERS.map(f => (
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
              {n === 'All' ? `All (${tokens.length})` : n === 'BNC' ? `BNC (${bncTokens.length})` : n}
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
    </div>
  );
}
