import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Pencil, Share2, MessageCircle, Repeat2, Heart, BarChart2, Share } from 'lucide-react';

interface SocialProfilePageProps {
  onBack?: () => void;
}

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  following_count?: number;
  followers_count?: number;
  liked_count?: number;
  shared_count?: number;
}

interface Post {
  id: string;
  content: string | null;
  post_type: string;
  coin_symbol: string | null;
  coin_tags: any[];
  created_at: string;
  image_url: string | null;
  sentiment: string | null;
  view_count?: number;
  like_count?: number;
  reply_count?: number;
  retweet_count?: number;
}

const MAIN_TABS = ['Content', 'Replies', 'Portfolio', 'Live Futures'] as const;
const SUB_TABS = ['All', 'Quotes', 'Videos', 'Live'] as const;

function formatTimeAgo(ts: string) {
  const now = Date.now();
  const diff = now - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 30) return `${d}d`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function renderContent(text: string) {
  return text.split(/(\$[A-Z][A-Z0-9]{1,9})/g).map((part, i) =>
    /^\$[A-Z][A-Z0-9]{1,9}$/.test(part)
      ? <span key={i} style={{ color: '#F0B90B', fontWeight: 800, letterSpacing: '0.01em' }}>{part}</span>
      : part
  );
}

function getSentimentColor(s: string | null) {
  if (!s) return '#848E9C';
  if (s.toLowerCase() === 'bullish') return '#0ECB81';
  if (s.toLowerCase() === 'bearish') return '#F6465D';
  return '#F0B90B';
}

export default function SocialProfilePage({ onBack }: SocialProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [mainTab, setMainTab] = useState<typeof MAIN_TABS[number]>('Content');
  const [subTab, setSubTab] = useState<typeof SUB_TABS[number]>('All');
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);

      const { data: prof } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setProfile(prof ?? { id: session.user.id, username: session.user.email?.split('@')[0] ?? 'User', avatar_url: null, bio: null });
      setLoading(false);

      const { data: postsData } = await supabase
        .from('social_posts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setPosts(postsData ?? []);
      setPostsLoading(false);
    };
    load();
  }, []);

  const filteredPosts = posts.filter(p => {
    if (subTab === 'All') return true;
    if (subTab === 'Quotes') return p.post_type === 'quote' || (p.content && p.content.length > 200);
    if (subTab === 'Videos') return p.post_type === 'video' || !!p.image_url;
    if (subTab === 'Live') return p.post_type === 'live';
    return true;
  });

  const displayName = profile?.username || 'User';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  const stats = [
    { label: 'Following', value: profile?.following_count ?? 0 },
    { label: 'Followers', value: profile?.followers_count ?? 0 },
    { label: 'Liked', value: profile?.liked_count ?? 0 },
    { label: 'Shared', value: profile?.shared_count ?? 0 },
  ];

  if (loading) {
    return (
      <div style={{ background: '#0B0E11', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ background: '#0B0E11', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#2B3139', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, color: '#848E9C' }}>👤</span>
        </div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Login Required</p>
        <p style={{ color: '#848E9C', fontSize: 14 }}>Please sign in to view your profile</p>
        <button onClick={onBack} style={{ marginTop: 8, background: '#F0B90B', color: '#000', fontWeight: 700, borderRadius: 8, padding: '12px 32px', border: 'none', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div ref={scrollRef} style={{ background: '#0B0E11', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Yellow Header */}
      <div style={{ background: '#F0B90B', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="#000" />
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Search size={18} color="#000" />
          </button>
          <button style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Pencil size={18} color="#000" />
          </button>
          <button style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Share2 size={18} color="#000" />
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div style={{ background: '#1E2026', padding: '20px 16px 0' }}>
        {/* Avatar */}
        <div style={{ marginBottom: 12 }}>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="avatar"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #F0B90B' }}
            />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#F0B90B,#E8831D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 28 }}>{avatarLetter}</span>
            </div>
          )}
        </div>

        {/* Name */}
        <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 4, letterSpacing: '-0.3px' }}>{displayName}</p>
        {profile?.bio && (
          <p style={{ color: '#848E9C', fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{profile.bio}</p>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <button key={s.label} style={{ display: 'flex', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{formatCount(s.value)}</span>
              <span style={{ color: '#848E9C', fontSize: 14 }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Main Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2B3139', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {MAIN_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 14px',
                fontSize: 13,
                fontWeight: mainTab === tab ? 700 : 400,
                color: mainTab === tab ? '#fff' : '#848E9C',
                borderBottom: mainTab === tab ? '2px solid #F0B90B' : '2px solid transparent',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs (only for Content) */}
      {mainTab === 'Content' && (
        <div style={{ background: '#1E2026', display: 'flex', gap: 0, padding: '8px 16px', borderBottom: '1px solid #2B3139', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SUB_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              style={{
                flexShrink: 0,
                background: subTab === tab ? '#2B3139' : 'none',
                border: 'none',
                borderRadius: 20,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: subTab === tab ? 600 : 400,
                color: subTab === tab ? '#fff' : '#848E9C',
                marginRight: 4,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div style={{ background: '#0B0E11' }}>
        {mainTab === 'Content' && (
          <>
            {postsLoading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1E2026', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ fontSize: 24 }}>✍️</span>
                </div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No posts yet</p>
                <p style={{ color: '#848E9C', fontSize: 13 }}>Share your first trade idea with the community</p>
              </div>
            ) : (
              filteredPosts.map(post => (
                <PostCard key={post.id} post={post} username={displayName} avatarUrl={profile?.avatar_url ?? null} />
              ))
            )}
          </>
        )}

        {mainTab === 'Replies' && (
          <EmptyTabState icon="💬" title="No replies yet" sub="Replies to other posts will appear here" />
        )}

        {mainTab === 'Portfolio' && (
          <EmptyTabState icon="📊" title="Portfolio not public" sub="Enable portfolio sharing in settings" />
        )}

        {mainTab === 'Live Futures' && (
          <EmptyTabState icon="⚡" title="No live futures" sub="Live futures positions will appear here" />
        )}
      </div>
    </div>
  );
}

function EmptyTabState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1E2026', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{title}</p>
      <p style={{ color: '#848E9C', fontSize: 13 }}>{sub}</p>
    </div>
  );
}

function PostCard({ post, username, avatarUrl }: { post: Post; username: string; avatarUrl: string | null }) {
  const avatarLetter = username[0]?.toUpperCase() ?? 'U';

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #1E2026', background: '#0B0E11' }}>
      {/* Post Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#F0B90B,#E8831D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: 14 }}>{avatarLetter}</span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{username}</span>
            <span style={{ color: '#848E9C', fontSize: 12 }}>{formatTimeAgo(post.created_at)}</span>
            {post.sentiment && (
              <span style={{ fontSize: 11, fontWeight: 700, color: getSentimentColor(post.sentiment), background: getSentimentColor(post.sentiment) + '20', borderRadius: 4, padding: '1px 6px' }}>
                {post.sentiment.charAt(0).toUpperCase() + post.sentiment.slice(1)}
              </span>
            )}
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', color: '#848E9C', cursor: 'pointer', padding: '2px 4px', fontSize: 18, lineHeight: 1 }}>···</button>
      </div>

      {/* Content */}
      {post.content && (
        <p style={{ color: '#eee', fontSize: 15, lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-line' }}>
          {renderContent(post.content)}
        </p>
      )}

      {/* Image */}
      {post.image_url && (
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
          <img src={post.image_url} alt="post" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Coin Tags */}
      {post.coin_tags && Array.isArray(post.coin_tags) && post.coin_tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {post.coin_tags.map((tag: any, i: number) => (
            <span key={i} style={{
              background: '#1E2026',
              border: '1px solid #3A3F4A',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: (tag.change ?? 0) >= 0 ? '#0ECB81' : '#F6465D',
              minWidth: 80,
              textAlign: 'center',
            }}>
              {tag.symbol} {(tag.change ?? 0) >= 0 ? '+' : ''}{(tag.change ?? 0).toFixed(2)}%
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
        <ActionBtn icon={<MessageCircle size={15} />} count={post.reply_count ?? 0} />
        <ActionBtn icon={<Repeat2 size={15} />} count={post.retweet_count ?? 0} />
        <ActionBtn icon={<Heart size={15} />} count={post.like_count ?? 0} />
        <ActionBtn icon={<BarChart2 size={15} />} count={post.view_count ?? 0} />
        <ActionBtn icon={<Share size={15} />} count={0} noCount />
      </div>
    </div>
  );
}

function ActionBtn({ icon, count, noCount }: { icon: React.ReactNode; count: number; noCount?: boolean }) {
  return (
    <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4, color: '#848E9C', cursor: 'pointer', padding: 0, fontSize: 12 }}>
      {icon}
      {!noCount && <span>{formatCount(count)}</span>}
    </button>
  );
}
