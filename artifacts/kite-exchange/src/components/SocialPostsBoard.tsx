import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Activity, Award, TrendingUp, Newspaper, Calendar, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SocialPost {
  id: string;
  username: string;
  avatar_url: string;
  content: string;
  image_url?: string;
  coin_symbol?: string;
  trade_type?: 'long' | 'short';
  entry_price?: number;
  exit_price?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  leverage?: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_bullish?: boolean;
  created_at: string;
  user_liked: boolean;
}

type FilterType = 'all' | 'news' | 'analysis' | 'winner' | 'event';

const FILTER_KEYWORDS = {
  news: ['BREAKING', 'breaking', 'announces', 'launches', 'surpasses', 'hits', 'reaches', 'approves', 'reports', 'alert:', 'crosses'],
  analysis: ['RSI', 'MACD', 'support', 'resistance', 'breakout', 'target', 'pattern', 'bullish', 'bearish', 'weekly', 'daily', 'chart', 'level', 'ratio', 'EMA', 'ATH', 'on-chain'],
  event: ['Competition', 'competition', 'Hackathon', 'hackathon', 'airdrop', 'Airdrop', 'countdown', 'conference', 'Conference', 'listing', 'Listing', 'launch', 'Launch', 'prize', 'grants', 'reward', 'Reward'],
  winner: [],
};

export default function SocialPostsBoard() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel('social_posts_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  const loadPosts = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) {
        let filtered = data;

        if (filter === 'winner') {
          filtered = data.filter(p => (p.profit_loss || 0) >= 1000);
        } else if (filter === 'news') {
          filtered = data.filter(p =>
            FILTER_KEYWORDS.news.some(kw => (p.content || '').includes(kw))
          );
        } else if (filter === 'analysis') {
          filtered = data.filter(p =>
            FILTER_KEYWORDS.analysis.some(kw => (p.content || '').includes(kw))
          );
        } else if (filter === 'event') {
          filtered = data.filter(p =>
            FILTER_KEYWORDS.event.some(kw => (p.content || '').includes(kw))
          );
        }

        setPosts(filtered.slice(0, 80).map(post => ({
          id: post.id,
          username: post.username || 'Trader',
          avatar_url: post.avatar_url || `https://i.pravatar.cc/150?u=${post.id}`,
          content: post.content || '',
          image_url: post.image_url,
          coin_symbol: post.coin_symbol,
          trade_type: post.trade_type,
          entry_price: post.entry_price,
          exit_price: post.exit_price,
          profit_loss: post.profit_loss,
          profit_loss_percent: post.profit_loss_percent,
          leverage: post.leverage,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          shares_count: post.shares_count || 0,
          is_bullish: post.is_bullish,
          created_at: post.created_at,
          user_liked: false,
        })));
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const newCount = post.likes_count + (post.user_liked ? -1 : 1);
    setPosts(posts.map(p => p.id === postId ? { ...p, user_liked: !p.user_liked, likes_count: newCount } : p));
    await supabase.from('social_posts').update({ likes_count: newCount }).eq('id', postId);
  };

  const formatTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const getPostBadge = (post: SocialPost) => {
    const content = post.content || '';
    if ((post.profit_loss || 0) >= 1000) return { label: 'Big Win', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    if (FILTER_KEYWORDS.news.some(kw => content.includes(kw))) return { label: 'News', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (FILTER_KEYWORDS.event.some(kw => content.includes(kw))) return { label: 'Event', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    if (FILTER_KEYWORDS.analysis.some(kw => content.includes(kw))) return { label: 'Analysis', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    return null;
  };

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'news', label: 'News', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: 'Analysis', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'event', label: 'Events', icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'winner', label: 'Big Wins', icon: <Award className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] pb-24">
      <div className="bg-[#0f1320] border-b border-gray-800/60 px-4 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#F0B90B]/10 rounded-xl border border-[#F0B90B]/20">
            <Activity className="w-6 h-6 text-[#F0B90B]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Crypto Feed</h1>
            <p className="text-xs text-gray-500">News, analysis & community</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                filter === f.key
                  ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                  : 'bg-[#1a1f2e] text-gray-400 border-gray-700/50 hover:text-white hover:border-gray-600'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="w-14 h-14 text-gray-700 mx-auto mb-3" />
            <div className="text-gray-400 font-semibold">No posts found</div>
            <div className="text-gray-600 text-sm mt-1">Try a different filter</div>
          </div>
        ) : (
          posts.map(post => {
            const badge = getPostBadge(post);
            const hasTradeData = (post.entry_price || 0) > 0 && (post.profit_loss || 0) !== 0;
            const isWin = (post.profit_loss || 0) >= 1000;

            return (
              <div key={post.id} className={`bg-[#131826] rounded-xl border overflow-hidden ${isWin ? 'border-yellow-500/30' : 'border-gray-800/60'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={post.avatar_url}
                      alt={post.username}
                      className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                      onError={e => { e.currentTarget.src = `https://i.pravatar.cc/150?u=${post.id}`; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{post.username}</span>
                        {post.coin_symbol && (
                          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{post.coin_symbol}</span>
                        )}
                        {badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badge.color}`}>{badge.label}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(post.created_at)}</div>
                    </div>
                    {isWin && <Award className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                  </div>

                  {post.content && (
                    <p className="text-gray-200 text-sm leading-relaxed mb-3">
                      {post.content.split(/(\$[A-Z][A-Z0-9]{1,9})/g).map((part: string, idx: number) =>
                        /^\$[A-Z][A-Z0-9]{1,9}$/.test(part)
                          ? <span key={idx} style={{ color: '#F0B90B' }} className="font-semibold">{part}</span>
                          : part
                      )}
                    </p>
                  )}

                  {hasTradeData && (
                    <div className={`rounded-xl p-3 border mb-3 ${isWin ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${post.trade_type === 'long' ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'bg-[#F6465D]/20 text-[#F6465D]'}`}>
                          {post.trade_type?.toUpperCase()} {post.coin_symbol}
                        </span>
                        {(post.leverage || 1) > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">{post.leverage}x</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <div className="text-xs text-gray-500">Entry</div>
                          <div className="text-white text-xs font-semibold">${fmt(post.entry_price || 0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Exit</div>
                          <div className="text-white text-xs font-semibold">${fmt(post.exit_price || 0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">PnL %</div>
                          <div className={`text-xs font-bold ${(post.profit_loss_percent || 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {(post.profit_loss_percent || 0) >= 0 ? '+' : ''}{fmt(post.profit_loss_percent || 0)}%
                          </div>
                        </div>
                      </div>
                      <div className={`text-center py-2 rounded-lg ${(post.profit_loss || 0) >= 0 ? 'bg-[#0ECB81]/10' : 'bg-[#F6465D]/10'}`}>
                        <div className={`text-xl font-black ${(post.profit_loss || 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {(post.profit_loss || 0) >= 0 ? '+' : ''}${fmt(post.profit_loss || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-5 px-4 py-2.5 border-t border-gray-800/60">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${post.user_liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'}`}
                  >
                    <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-red-400' : ''}`} />
                    <span className="text-xs font-semibold">{post.likes_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-gray-500 hover:text-blue-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">{post.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-gray-500 hover:text-[#0ECB81] transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">{post.shares_count}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
