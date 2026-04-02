import { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Lock, Send, ChevronDown, Award } from 'lucide-react';

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  isVerified: boolean;
  isLiked?: boolean;
  replies?: SubComment[];
}

interface SubComment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  isVerified: boolean;
}

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  commentsCount: number;
  postUsername: string;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

const POSITIVE_COMMENTS: Omit<Comment, 'id' | 'isLiked'>[] = [
  {
    username: 'AlphaTrader77',
    avatar: 'https://randomuser.me/api/portraits/men/21.jpg',
    text: 'Absolutely nailed this one. I\'ve been watching that support level for 3 weeks and you called the bounce perfectly. This is exactly the kind of analysis that separates real traders from gamblers.',
    time: '2h ago',
    likes: 284,
    isVerified: true,
    replies: [
      {
        id: 'r1',
        username: 'FuturesKing',
        avatar: 'https://randomuser.me/api/portraits/men/26.jpg',
        text: 'Agreed 100%. Entry was textbook perfect.',
        time: '1h ago',
        likes: 47,
        isVerified: true,
      }
    ]
  },
  {
    username: 'CryptoWhale88',
    avatar: 'https://randomuser.me/api/portraits/men/24.jpg',
    text: 'This is why I follow you. Transparent positions, clear TP/SL levels, and consistent results. Portfolio up 61% this month using these signals. Keep it up 🔥',
    time: '3h ago',
    likes: 531,
    isVerified: true,
    replies: []
  },
  {
    username: 'VolumeProfile',
    avatar: 'https://randomuser.me/api/portraits/men/23.jpg',
    text: 'Executed this exact trade at your entry. Already +18% in profit. Thank you for sharing this publicly — most people keep alpha like this private.',
    time: '4h ago',
    likes: 193,
    isVerified: true,
    replies: [
      {
        id: 'r2',
        username: 'OnChainOG',
        avatar: 'https://randomuser.me/api/portraits/men/27.jpg',
        text: 'Same here, entered at 0.856 and looking great.',
        time: '3h ago',
        likes: 29,
        isVerified: false,
      }
    ]
  },
  {
    username: 'DoktorProfit',
    avatar: 'https://randomuser.me/api/portraits/men/42.jpg',
    text: 'Been in crypto since 2017. Content like this is rare. The technical breakdown is clean, the risk management is solid. This is what professional trading looks like.',
    time: '5h ago',
    likes: 418,
    isVerified: true,
    replies: []
  },
  {
    username: 'BullishSignals',
    avatar: 'https://randomuser.me/api/portraits/men/37.jpg',
    text: 'Pure alpha right here. That RSI divergence was textbook. Don\'t sleep on this, I\'ve been following for 6 months and the win rate is exceptional.',
    time: '5h ago',
    likes: 267,
    isVerified: true,
    replies: []
  },
  {
    username: 'SwingMaster9',
    avatar: 'https://randomuser.me/api/portraits/women/20.jpg',
    text: 'Added to watchlist immediately. Your track record on BASONCE is unmatched. Love how you always show the full position, not just the winners.',
    time: '6h ago',
    likes: 155,
    isVerified: false,
    replies: []
  },
  {
    username: 'SyndicateOfficial',
    avatar: 'https://randomuser.me/api/portraits/women/21.jpg',
    text: 'The risk/reward ratio on this setup was incredible — 1:4.7. This is exactly how institutional traders think. BASONCE community is on another level.',
    time: '7h ago',
    likes: 342,
    isVerified: true,
    replies: [
      {
        id: 'r3',
        username: 'DeltaNeutral',
        avatar: 'https://randomuser.me/api/portraits/men/64.jpg',
        text: 'Exactly what I thought when I saw the setup. Rare to find R:R like this.',
        time: '6h ago',
        likes: 61,
        isVerified: true,
      }
    ]
  },
  {
    username: 'WhaleWatcher99',
    avatar: 'https://randomuser.me/api/portraits/men/38.jpg',
    text: 'On-chain data was screaming accumulation for days before this. You read the market perfectly. Shared this with my trading group and everyone executed.',
    time: '8h ago',
    likes: 209,
    isVerified: true,
    replies: []
  },
  {
    username: 'AltSeasonTracker',
    avatar: 'https://randomuser.me/api/portraits/men/40.jpg',
    text: 'My third profitable trade this week following your analysis. The consistency is mind-blowing. Most analysts are wrong 50% of the time — you\'re different.',
    time: '9h ago',
    likes: 178,
    isVerified: true,
    replies: []
  },
  {
    username: 'BlockchainEmpire',
    avatar: 'https://randomuser.me/api/portraits/men/33.jpg',
    text: 'That Fibonacci extension target hit perfectly. I\'ve never seen someone call these levels with this accuracy. Followed and notifications on.',
    time: '10h ago',
    likes: 394,
    isVerified: true,
    replies: []
  },
  {
    username: 'HodlNation',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
    text: 'BASONCE is the only exchange where I actually learn something from the community. The quality of traders here is insane. Thank you for this post ❤️',
    time: '11h ago',
    likes: 127,
    isVerified: false,
    replies: []
  },
  {
    username: 'RiskRewardKing',
    avatar: 'https://randomuser.me/api/portraits/men/31.jpg',
    text: 'Shared this with my 12k follower group. Everyone executed at that support zone. Clean, simple, profitable. This is real trading education.',
    time: '12h ago',
    likes: 487,
    isVerified: true,
    replies: [
      {
        id: 'r4',
        username: 'BullRunKing',
        avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
        text: 'Glad you shared! Just entered, hope it continues 🚀',
        time: '11h ago',
        likes: 38,
        isVerified: false,
      }
    ]
  },
  {
    username: 'MomentumRider',
    avatar: 'https://randomuser.me/api/portraits/men/50.jpg',
    text: 'The volume confirmation before entry was the key detail most people missed. You caught it. That\'s what makes this post gold.',
    time: '13h ago',
    likes: 213,
    isVerified: true,
    replies: []
  },
  {
    username: 'CryptoMarketLens',
    avatar: 'https://randomuser.me/api/portraits/men/34.jpg',
    text: 'Been copy trading you on BASONCE for 2 months. Best decision I\'ve made in crypto. Returns are consistent and drawdowns are minimal. Real professional.',
    time: '14h ago',
    likes: 561,
    isVerified: true,
    replies: []
  },
  {
    username: 'TrendFollower22',
    avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
    text: 'This is what happens when you combine technical analysis with solid risk management. Textbook execution. Bookmarked and studying this setup for next time.',
    time: '15h ago',
    likes: 144,
    isVerified: false,
    replies: []
  },
  {
    username: 'PnL_Printer99',
    avatar: 'https://randomuser.me/api/portraits/men/58.jpg',
    text: 'Incredible entry timing. +43% on this position. My best trade in months and I owe it to your analysis. BASONCE community is real 🙏',
    time: '16h ago',
    likes: 329,
    isVerified: true,
    replies: []
  },
  {
    username: 'EntryMasterX',
    avatar: 'https://randomuser.me/api/portraits/men/60.jpg',
    text: 'The way you identified that hidden bullish divergence on the 4H is next level. I\'ve been trading for 4 years and still learning from posts like this.',
    time: '17h ago',
    likes: 256,
    isVerified: true,
    replies: []
  },
  {
    username: 'SatoshiDisciple',
    avatar: 'https://randomuser.me/api/portraits/men/46.jpg',
    text: 'This setup will be in trading textbooks one day. Perfect confluence of EMA, volume, and market structure. Executed with full confidence. Thank you!',
    time: '18h ago',
    likes: 184,
    isVerified: false,
    replies: []
  },
  {
    username: 'NightOwlTrader',
    avatar: 'https://randomuser.me/api/portraits/men/47.jpg',
    text: 'Stayed up all night monitoring this position based on your alert. Hit TP2 at 4am. Worth every minute. BASONCE notifications are life-changing.',
    time: '19h ago',
    likes: 311,
    isVerified: false,
    replies: []
  },
  {
    username: 'DegenTrader9000',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    text: 'First time commenting but I have to say — this post alone has made me more money than 6 months of courses I paid for. Real knowledge, real results.',
    time: '20h ago',
    likes: 429,
    isVerified: false,
    replies: []
  },
];

function hashPostId(postId: string): number {
  let h = 0;
  for (let i = 0; i < postId.length; i++) h = (h * 31 + postId.charCodeAt(i)) >>> 0;
  return h;
}

function getCommentsForPost(postId: string, count: number): Comment[] {
  const h = hashPostId(postId);
  const pool = [...POSITIVE_COMMENTS];
  // Shuffle deterministically by postId
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (h + i * 7919) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const n = Math.min(count, pool.length);
  return pool.slice(0, n).map((c, i) => ({
    ...c,
    id: `${postId}_c${i}`,
    isLiked: false,
  }));
}

const VERIFIED_USERNAMES = new Set([
  'AlphaTrader77','FuturesKing','CryptoWhale88','OnChainOG','BlockchainEmpire',
  'CryptoMarketLens','SyndicateOfficial','BullishSignals','WhaleWatcher99',
  'BasonceOfficial','DoktorProfit','RiskRewardKing','DeltaNeutral','PnL_Printer99',
  'EntryMasterX','MomentumRider','TrendFollower22','VolumeProfile','AltSeasonTracker',
]);

function VerifiedBadge() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" shapeRendering="geometricPrecision">
      <path d="M10,0.5 L12.07,2.27 L14.75,1.77 L15.66,4.34 L18.23,5.25 L17.73,7.93 L19.5,10 L17.73,12.07 L18.23,14.75 L15.66,15.66 L14.75,18.23 L12.07,17.73 L10,19.5 L7.93,17.73 L5.25,18.23 L4.34,15.66 L1.77,14.75 L2.27,12.07 L0.5,10 L2.27,7.93 L1.77,5.25 L4.34,4.34 L5.25,1.77 L7.93,2.27 Z" fill="#F0B90B"/>
      <path d="M6.5 10.3L8.9 12.7L14 7.3" stroke="#0D0F14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function CommentsDrawer({ isOpen, onClose, postId, commentsCount, postUsername, isLoggedIn, onLoginRequired }: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && postId) {
      const displayCount = Math.min(commentsCount, 20);
      setComments(getCommentsForPost(postId, displayCount));
    }
  }, [isOpen, postId, commentsCount]);

  const handleLikeComment = (commentId: string) => {
    if (!isLoggedIn) { onLoginRequired(); return; }
    setLikedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleSendComment = () => {
    if (!isLoggedIn) { onLoginRequired(); return; }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  if (!isOpen) return null;

  const displayTotal = commentsCount;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#12151A] rounded-t-2xl border-t border-[#2B3139]/60 flex flex-col"
        style={{ maxHeight: '82vh', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2B3139]/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-white font-bold text-[15px]">{displayTotal.toLocaleString()} Comments</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {comments.map((comment) => {
            const isLiked = likedComments.has(comment.id);
            const likeCount = isLiked ? comment.likes + 1 : comment.likes;
            const hasReplies = comment.replies && comment.replies.length > 0;
            const showReplies = expandedReplies.has(comment.id);

            return (
              <div key={comment.id}>
                <div className="flex gap-3">
                  <img
                    src={comment.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-white text-[13px] font-semibold">{comment.username}</span>
                      {(comment.isVerified || VERIFIED_USERNAMES.has(comment.username)) && <VerifiedBadge />}
                      {comment.username === postUsername && (
                        <span className="text-[10px] font-bold text-[#F0B90B] bg-[#F0B90B]/10 px-1.5 py-0.5 rounded-full">Author</span>
                      )}
                      <span className="text-gray-600 text-[11px] ml-auto">{comment.time}</span>
                    </div>
                    <p className="text-gray-200 text-[13px] leading-relaxed">{comment.text}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1 text-[12px] transition-colors ${isLiked ? 'text-[#F6465D]' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#F6465D]' : ''}`} />
                        <span>{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}</span>
                      </button>
                      <button
                        onClick={() => isLoggedIn ? null : onLoginRequired()}
                        className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                      {hasReplies && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="flex items-center gap-1 text-[12px] text-[#F0B90B] font-medium"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showReplies ? 'rotate-180' : ''}`} />
                          <span>{showReplies ? 'Hide' : `${comment.replies!.length} ${comment.replies!.length === 1 ? 'reply' : 'replies'}`}</span>
                        </button>
                      )}
                    </div>

                    {hasReplies && showReplies && (
                      <div className="mt-3 pl-3 border-l-2 border-[#2B3139] space-y-3">
                        {comment.replies!.map((reply) => (
                          <div key={reply.id} className="flex gap-2.5">
                            <img
                              src={reply.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-white text-[12px] font-semibold">{reply.username}</span>
                                {(reply.isVerified || VERIFIED_USERNAMES.has(reply.username)) && <VerifiedBadge />}
                                <span className="text-gray-600 text-[10px] ml-auto">{reply.time}</span>
                              </div>
                              <p className="text-gray-300 text-[12px] leading-relaxed">{reply.text}</p>
                              <div className="flex items-center gap-1 mt-1.5">
                                <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#F6465D] transition-colors">
                                  <Heart className="w-3 h-3" />
                                  <span>{reply.likes}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {commentsCount > 20 && (
            <div className="text-center py-3">
              <span className="text-gray-500 text-[13px]">Showing top 20 of {commentsCount.toLocaleString()} comments</span>
            </div>
          )}

          <div className="h-4" />
        </div>

        <div className="flex-shrink-0 border-t border-[#2B3139]/50 px-4 py-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F0B90B] to-[#E8831D] flex items-center justify-center flex-shrink-0">
                <span className="text-black text-xs font-black">Y</span>
              </div>
              <div className="flex-1 flex items-center bg-[#1E2229] border border-[#2B3139] rounded-full px-4 py-2">
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-white text-[13px] outline-none placeholder-gray-600"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!inputText.trim()}
                  className={`ml-2 transition-colors ${inputText.trim() ? 'text-[#F0B90B]' : 'text-gray-600'}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLoginRequired}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-[#F0B90B] to-[#E8831D] rounded-xl"
            >
              <Lock className="w-4 h-4 text-black" />
              <span className="text-black font-bold text-[14px]">Sign in to comment or like</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
