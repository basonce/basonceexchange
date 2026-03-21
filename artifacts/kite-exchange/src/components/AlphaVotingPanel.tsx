import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, X, Flame, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Token {
  id: string;
  symbol: string;
  name: string;
  logo_url: string;
  description: string;
  current_price: number;
  market_cap: number;
  total_votes: number;
  bullish_votes: number;
  bearish_votes: number;
  price_change_24h: number;
}

interface Vote {
  token_id: string;
  direction: 'bullish' | 'bearish';
  user_vote?: 'bullish' | 'bearish' | null;
}

interface AlphaVotingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlphaVotingPanel({ isOpen, onClose }: AlphaVotingPanelProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [userVotes, setUserVotes] = useState<Map<string, 'bullish' | 'bearish'>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTokens();
      loadUserVotes();
    }
  }, [isOpen]);

  const loadTokens = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from('alpha_tokens')
        .select('*')
        .eq('is_active', true)
        .order('total_votes', { ascending: false })
        .limit(20);

      if (data) {
        const mappedTokens: Token[] = data.map(token => {
          const totalVotes = (token.bullish_votes || 0) + (token.bearish_votes || 0);
          return {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            logo_url: token.logo_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${token.symbol}`,
            description: token.description || 'Next-gen crypto token',
            current_price: token.current_price || 0,
            market_cap: token.market_cap || 0,
            total_votes: totalVotes,
            bullish_votes: token.bullish_votes || 0,
            bearish_votes: token.bearish_votes || 0,
            price_change_24h: token.price_change_24h || 0
          };
        });
        setTokens(mappedTokens);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading tokens:', error);
      setLoading(false);
    }
  };

  const loadUserVotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('alpha_votes')
        .select('token_id, direction')
        .eq('user_id', user.id);

      if (data) {
        const votesMap = new Map<string, 'bullish' | 'bearish'>();
        data.forEach(vote => {
          votesMap.set(vote.token_id, vote.direction);
        });
        setUserVotes(votesMap);
      }
    } catch (error) {
      console.error('Error loading user votes:', error);
    }
  };

  const handleVote = async (tokenId: string, direction: 'bullish' | 'bearish') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to vote');
        return;
      }

      const existingVote = userVotes.get(tokenId);

      if (existingVote === direction) {
        await supabase
          .from('alpha_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('token_id', tokenId);

        const newVotes = new Map(userVotes);
        newVotes.delete(tokenId);
        setUserVotes(newVotes);

        setTokens(tokens.map(t => {
          if (t.id === tokenId) {
            return {
              ...t,
              [direction === 'bullish' ? 'bullish_votes' : 'bearish_votes']: Math.max(0, t[direction === 'bullish' ? 'bullish_votes' : 'bearish_votes'] - 1),
              total_votes: Math.max(0, t.total_votes - 1)
            };
          }
          return t;
        }));
      } else {
        if (existingVote) {
          await supabase
            .from('alpha_votes')
            .delete()
            .eq('user_id', user.id)
            .eq('token_id', tokenId);
        }

        await supabase
          .from('alpha_votes')
          .insert({
            user_id: user.id,
            token_id: tokenId,
            direction: direction
          });

        const newVotes = new Map(userVotes);
        newVotes.set(tokenId, direction);
        setUserVotes(newVotes);

        setTokens(tokens.map(t => {
          if (t.id === tokenId) {
            const changes: any = {
              [direction === 'bullish' ? 'bullish_votes' : 'bearish_votes']: t[direction === 'bullish' ? 'bullish_votes' : 'bearish_votes'] + 1
            };

            if (existingVote) {
              changes[existingVote === 'bullish' ? 'bullish_votes' : 'bearish_votes'] = Math.max(0, t[existingVote === 'bullish' ? 'bullish_votes' : 'bearish_votes'] - 1);
            } else {
              changes.total_votes = t.total_votes + 1;
            }

            return { ...t, ...changes };
          }
          return t;
        }));
      }

      await loadTokens();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  const getBullishPercentage = (token: Token) => {
    if (token.total_votes === 0) return 50;
    return Math.round((token.bullish_votes / token.total_votes) * 100);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-800 shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-br from-[#1a1f2e] to-[#0a0e1a] px-6 py-4 border-b border-gray-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-black text-white">Alpha Voting</h2>
            <p className="text-sm text-gray-400">Vote on the hottest tokens</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white">Loading tokens...</div>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {tokens.map((token) => {
                const bullishPercent = getBullishPercentage(token);
                const userVote = userVotes.get(token.id);

                return (
                  <div
                    key={token.id}
                    className="bg-[#0a0e1a] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4 mb-4">
                        <img
                          src={token.logo_url}
                          alt={token.symbol}
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${token.symbol}`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-white">{token.symbol}</h3>
                            <span className="text-sm text-gray-400">{token.name}</span>
                            {token.total_votes > 50 && (
                              <Flame className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{token.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatNumber(token.current_price)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              MC: {formatNumber(token.market_cap)}
                            </span>
                            <span className={`flex items-center gap-1 font-bold ${
                              token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {token.price_change_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-green-400 font-bold">{bullishPercent}% Bullish</span>
                          <span className="text-gray-500">{token.total_votes} votes</span>
                          <span className="text-red-400 font-bold">{100 - bullishPercent}% Bearish</span>
                        </div>
                        <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${bullishPercent}%` }}
                          />
                          <div
                            className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-rose-400 transition-all duration-500"
                            style={{ width: `${100 - bullishPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(token.id, 'bullish')}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            userVote === 'bullish'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                          }`}
                        >
                          <ThumbsUp className="w-5 h-5" />
                          Bullish
                        </button>
                        <button
                          onClick={() => handleVote(token.id, 'bearish')}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            userVote === 'bearish'
                              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                          }`}
                        >
                          <ThumbsDown className="w-5 h-5" />
                          Bearish
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
