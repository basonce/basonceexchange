import { useState, useRef, useEffect } from 'react';

/* ─── Fake profiles ────────────────────────────────────────── */
const PROFILES = [
  { id: 'jm', name: 'Jake_Maverick',     initials: 'JM', color: '#3B82F6', flag: '🇺🇸' },
  { id: 'ao', name: 'Amara_Osei',        initials: 'AO', color: '#EF4444', flag: '🇬🇭' },
  { id: 'fb', name: 'Fatima_B',          initials: 'FB', color: '#EC4899', flag: '🇿🇦' },
  { id: 'tb', name: 'Tony_Bets',         initials: 'TB', color: '#F97316', flag: '🇳🇬' },
  { id: 'rk', name: 'RajKing_',          initials: 'RK', color: '#06B6D4', flag: '🇮🇳' },
  { id: 'cl', name: 'Carlos_L',          initials: 'CL', color: '#EAB308', flag: '🇧🇷' },
  { id: 'mw', name: 'Mike_Wins',         initials: 'MW', color: '#10B981', flag: '🇺🇸' },
  { id: 'sd', name: 'Sandra_D',          initials: 'SD', color: '#8B5CF6', flag: '🇰🇪' },
  { id: 'dk', name: 'DKing_Crypto',      initials: 'DK', color: '#F59E0B', flag: '🇿🇦' },
  { id: 'pm', name: 'PhilM_',            initials: 'PM', color: '#14B8A6', flag: '🇨🇲' },
  { id: 'ns', name: 'Nadia_Sports',      initials: 'NS', color: '#F43F5E', flag: '🇲🇦' },
  { id: 'bw', name: 'BigWin_Emeka',      initials: 'BE', color: '#22C55E', flag: '🇳🇬' },
];

function getProfile(id: string) {
  return PROFILES.find(p => p.id === id) || PROFILES[0];
}

/* ─── Avatar ────────────────────────────────────────────────── */
function Avatar({ profileId, size = 34 }: { profileId: string; size?: number }) {
  const p = getProfile(profileId);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em',
      boxShadow: `0 0 0 2px #0B0E11, 0 0 0 3.5px ${p.color}66`,
    }}>
      {p.initials}
    </div>
  );
}

/* ─── Card types ────────────────────────────────────────────── */
type CardType =
  | { type: 'win';    profile: string; amount: string; match: string; pick: string; time: string }
  | { type: 'chat';   profile: string; text: string; time: string; likes: number }
  | { type: 'match';  profile: string; home: string; away: string; pick: string; odds: string; time: string; comment: string }
  | { type: 'qa';     asker: string;   question: string; answerer: string; answer: string; time: string }
  | { type: 'deposit';profile: string; text: string; replyTo: string; replyText: string; time: string };

const CARDS: CardType[] = [
  {
    type: 'win',
    profile: 'mw',
    amount: '+$47,200 USDT',
    match: 'Kaizer Chiefs vs Orlando Pirates',
    pick: 'Under 3.5 @ 1.65',
    time: '2m ago',
  },
  {
    type: 'chat',
    profile: 'tb',
    text: 'Anyone watching the PSL tonight? Kaizer Chiefs looking strong 🔥 going W1 on this one no cap',
    time: '5m ago',
    likes: 34,
  },
  {
    type: 'qa',
    asker: 'sd',
    question: 'Hey guys how do I deposit USDT here? First time user',
    answerer: 'rk',
    answer: 'Go to Wallet → Deposit → select USDT TRC20 and copy the address. Fast and easy 👌',
    time: '8m ago',
  },
  {
    type: 'match',
    profile: 'ao',
    home: 'Kaizer Chiefs',
    away: 'Orlando Pirates',
    pick: 'Over 4.5',
    odds: '× 2.51',
    time: '11m ago',
    comment: "72nd min and it's 2-2 already 😤 this one's gonna go OVER trust me",
  },
  {
    type: 'win',
    profile: 'bw',
    amount: '+$12,800 USDT',
    match: 'SuperSport vs Golden Arrows',
    pick: 'W1 @ 1.13',
    time: '15m ago',
  },
  {
    type: 'chat',
    profile: 'fb',
    text: "Just hit my 3rd win in a row this week 🏆 gonna use the profits to clear my loan finally. This platform is legit",
    time: '18m ago',
    likes: 91,
  },
  {
    type: 'deposit',
    profile: 'cl',
    text: 'I just deposited 1000 USDT and it showed up in 2 minutes 🙌',
    replyTo: 'jm',
    replyText: "Same for me bro, mine hit in under 5 mins. Way faster than other platforms",
    time: '22m ago',
  },
  {
    type: 'qa',
    asker: 'ns',
    question: 'How long does withdrawal take? I just requested 3500 USDT',
    answerer: 'dk',
    answer: 'Usually 1-3 hours. Mine processed in about 2h last time. Make sure your address is TRC20',
    time: '26m ago',
  },
  {
    type: 'match',
    profile: 'pm',
    home: 'Adama City',
    away: 'Dire Dawa Ketema',
    pick: 'W2',
    odds: '× 9.74',
    time: '31m ago',
    comment: "Taking the long shot here. Ethiopia Premier always unpredictable 👀",
  },
  {
    type: 'win',
    profile: 'jm',
    amount: '+$24,750,000 USDT',
    match: 'Kaizer Chiefs vs Orlando Pirates',
    pick: 'Under 3.5 @ 1.65',
    time: '35m ago',
  },
  {
    type: 'chat',
    profile: 'rk',
    text: "My wife asked where the new car came from 😂 told her a 'savings plan'. She doesn't need to know about the Over 4.5",
    time: '41m ago',
    likes: 247,
  },
  {
    type: 'qa',
    asker: 'ao',
    question: "Can you withdraw directly to a mobile wallet or only crypto?",
    answerer: 'mw',
    answer: "Withdrawal is USDT on TRC20. You can then swap on P2P for local currency — works great in ZA and NG",
    time: '48m ago',
  },
  {
    type: 'deposit',
    profile: 'sd',
    text: 'Deposited 200 USDT to test it out. Interface is clean, loving it so far',
    replyTo: 'tb',
    replyText: "Welcome 🙌 start small and feel how it works. PSL matches are the best to learn on",
    time: '52m ago',
  },
  {
    type: 'win',
    profile: 'ns',
    amount: '+$8,340 USDT',
    match: 'Gor Mahia vs AFC Leopards',
    pick: 'W1 @ 2.05',
    time: '58m ago',
  },
  {
    type: 'chat',
    profile: 'dk',
    text: "Pro tip: always check the 60'+ odds shift. If W1 drops hard it means goals incoming. Made $40K this month from that alone",
    time: '1h ago',
    likes: 183,
  },
];

/* ─── Individual card renders ───────────────────────────────── */
function WinCard({ card }: { card: Extract<CardType, { type: 'win' }> }) {
  const p = getProfile(card.profile);
  return (
    <div style={{
      minWidth: 230, background: 'linear-gradient(135deg, #0D2B1A 0%, #0B1E13 100%)',
      border: '1px solid #0ECB8133', borderRadius: 14, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar profileId={card.profile} size={30} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.name} {p.flag}</div>
          <div style={{ fontSize: 10, color: '#848E9C' }}>{card.time}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 16 }}>🏆</div>
      </div>
      <div style={{
        background: '#0ECB8120', borderRadius: 8, padding: '6px 10px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#0ECB81', letterSpacing: '-0.02em' }}>{card.amount}</div>
        <div style={{ fontSize: 10, color: '#0ECB81AA', marginTop: 2 }}>Profit</div>
      </div>
      <div style={{ fontSize: 10, color: '#848E9C', lineHeight: 1.4 }}>
        <span style={{ color: '#B7BDC6' }}>{card.match}</span>
        <br />
        <span style={{ color: '#F0B90B', fontWeight: 700 }}>{card.pick}</span>
      </div>
    </div>
  );
}

function ChatCard({ card }: { card: Extract<CardType, { type: 'chat' }> }) {
  const p = getProfile(card.profile);
  const [liked, setLiked] = useState(false);
  const count = card.likes + (liked ? 1 : 0);
  return (
    <div style={{
      minWidth: 240, background: '#1E2329', border: '1px solid #2B3139',
      borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column',
      gap: 8, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar profileId={card.profile} size={30} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.name} {p.flag}</div>
          <div style={{ fontSize: 10, color: '#848E9C' }}>{card.time}</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: '#D4D4D8', lineHeight: 1.5, flex: 1 }}>
        {card.text}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setLiked(l => !l)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
        >
          <span style={{ fontSize: 14, filter: liked ? 'none' : 'grayscale(1)' }}>❤️</span>
          <span style={{ fontSize: 11, color: liked ? '#F43F5E' : '#848E9C', fontWeight: 600 }}>{count}</span>
        </button>
        <span style={{ fontSize: 11, color: '#4B5563' }}>💬 Reply</span>
      </div>
    </div>
  );
}

function MatchCard({ card }: { card: Extract<CardType, { type: 'match' }> }) {
  const p = getProfile(card.profile);
  return (
    <div style={{
      minWidth: 240, background: '#1E2329', border: '1px solid #2B3139',
      borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column',
      gap: 7, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar profileId={card.profile} size={30} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.name} {p.flag}</div>
          <div style={{ fontSize: 10, color: '#848E9C' }}>shared a pick · {card.time}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>⚽</span>
      </div>
      <div style={{
        background: '#2B3139', borderRadius: 8, padding: '7px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
      }}>
        <span style={{ fontSize: 11, color: '#E5E7EB', fontWeight: 600, flex: 1 }}>{card.home}</span>
        <span style={{ fontSize: 10, color: '#848E9C', padding: '0 4px' }}>vs</span>
        <span style={{ fontSize: 11, color: '#E5E7EB', fontWeight: 600, flex: 1, textAlign: 'right' }}>{card.away}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: '#848E9C' }}>Pick:</span>
        <span style={{ fontSize: 12, color: '#F0B90B', fontWeight: 800 }}>{card.pick}</span>
        <span style={{ fontSize: 11, color: '#0ECB81', fontWeight: 700, marginLeft: 4 }}>{card.odds}</span>
      </div>
      <div style={{ fontSize: 11.5, color: '#9CA3AF', lineHeight: 1.45 }}>{card.comment}</div>
    </div>
  );
}

function QACard({ card }: { card: Extract<CardType, { type: 'qa' }> }) {
  const asker = getProfile(card.asker);
  const answerer = getProfile(card.answerer);
  return (
    <div style={{
      minWidth: 250, background: '#1E2329', border: '1px solid #2B3139',
      borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column',
      gap: 8, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Avatar profileId={card.asker} size={28} />
        <div style={{ flex: 1, background: '#2B3139', borderRadius: '4px 10px 10px 10px', padding: '7px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: asker.color, marginBottom: 3 }}>{asker.name}</div>
          <div style={{ fontSize: 12, color: '#D4D4D8', lineHeight: 1.4 }}>{card.question}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 8 }}>
        <div style={{ flex: 1, background: '#0ECB8112', border: '1px solid #0ECB8125', borderRadius: '10px 10px 10px 4px', padding: '7px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0ECB81', marginBottom: 3 }}>{answerer.name} ✓</div>
          <div style={{ fontSize: 12, color: '#D4D4D8', lineHeight: 1.4 }}>{card.answer}</div>
        </div>
        <Avatar profileId={card.answerer} size={28} />
      </div>
      <div style={{ fontSize: 10, color: '#4B5563', textAlign: 'right' }}>{card.time}</div>
    </div>
  );
}

function DepositCard({ card }: { card: Extract<CardType, { type: 'deposit' }> }) {
  const p = getProfile(card.profile);
  const rp = getProfile(card.replyTo);
  return (
    <div style={{
      minWidth: 240, background: '#1E2329', border: '1px solid #2B3139',
      borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column',
      gap: 8, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Avatar profileId={card.profile} size={28} />
        <div style={{ flex: 1, background: '#2B3139', borderRadius: '4px 10px 10px 10px', padding: '7px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: p.color, marginBottom: 3 }}>{p.name} {p.flag}</div>
          <div style={{ fontSize: 12, color: '#D4D4D8', lineHeight: 1.4 }}>{card.text}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 8 }}>
        <div style={{ flex: 1, background: '#2B3139', borderRadius: '10px 10px 10px 4px', padding: '7px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: rp.color, marginBottom: 3 }}>{rp.name} {rp.flag}</div>
          <div style={{ fontSize: 12, color: '#D4D4D8', lineHeight: 1.4 }}>{card.replyText}</div>
        </div>
        <Avatar profileId={card.replyTo} size={28} />
      </div>
      <div style={{ fontSize: 10, color: '#4B5563', textAlign: 'right' }}>{card.time}</div>
    </div>
  );
}

function FeedCard({ card }: { card: CardType }) {
  if (card.type === 'win')     return <WinCard card={card} />;
  if (card.type === 'chat')    return <ChatCard card={card} />;
  if (card.type === 'match')   return <MatchCard card={card} />;
  if (card.type === 'qa')      return <QACard card={card} />;
  if (card.type === 'deposit') return <DepositCard card={card} />;
  return null;
}

/* ─── Main component ────────────────────────────────────────── */
export default function SportsCommunityFeed({ compact = false }: { compact?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const posRef = useRef(0);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tick = () => {
      if (!pausedRef.current && el) {
        posRef.current += 0.45;
        const halfW = el.scrollWidth / 2;
        if (posRef.current >= halfW) posRef.current = 0;
        el.scrollLeft = posRef.current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const doubled = [...CARDS, ...CARDS];

  /* ── Compact mode: slim strip inside Alpha Sports modal ── */
  if (compact) {
    return (
      <div style={{ background: '#0B0E11', paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #1C2128' }}>
        {/* Mini header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#B7BDC6' }}>Community</span>
          <span style={{
            fontSize: 8, fontWeight: 800, color: '#0ECB81', background: '#0ECB8118',
            border: '1px solid #0ECB8133', borderRadius: 3, padding: '1px 4px', letterSpacing: '0.05em',
          }}>LIVE</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#F0B90B66', fontWeight: 700 }}>💬 10,247 chatting</span>
        </div>
        {/* Compact scrolling cards */}
        <div
          ref={scrollRef}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => { setTimeout(() => setPaused(false), 2000); }}
          style={{
            display: 'flex', gap: 8, overflowX: 'hidden',
            paddingLeft: 12, paddingRight: 12,
            scrollbarWidth: 'none', alignItems: 'stretch',
          }}
        >
          {doubled.map((card, i) => (
            <CompactFeedCard key={i} card={card} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Full mode: standalone section on home page ── */
  return (
    <div style={{ background: '#0B0E11', paddingTop: 10, paddingBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Community</span>
          <span style={{
            fontSize: 9, fontWeight: 800, color: '#0ECB81', background: '#0ECB8118',
            border: '1px solid #0ECB8133', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em',
          }}>LIVE</span>
        </div>
        <span style={{ fontSize: 11, color: '#F0B90B', fontWeight: 700 }}>10,247 online</span>
      </div>
      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => { setTimeout(() => setPaused(false), 2000); }}
        style={{
          display: 'flex', gap: 10, overflowX: 'hidden',
          paddingLeft: 16, paddingRight: 16,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab', alignItems: 'stretch',
        }}
      >
        {doubled.map((card, i) => (
          <FeedCard key={i} card={card} />
        ))}
      </div>
    </div>
  );
}

/* ── Compact card: shows a small bubble (win or chat) ── */
function CompactFeedCard({ card }: { card: CardType }) {
  const profileId = 'profile' in card ? card.profile : ('asker' in card ? card.asker : 'jm');
  const p = getProfile(profileId);

  if (card.type === 'win') {
    return (
      <div style={{
        minWidth: 180, background: 'linear-gradient(135deg, #0D2B1A 0%, #0B1E13 100%)',
        border: '1px solid #0ECB8130', borderRadius: 10, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar profileId={card.profile} size={22} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0' }}>{p.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12 }}>🏆</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#0ECB81', letterSpacing: '-0.02em', textAlign: 'center' }}>{card.amount}</div>
        <div style={{ fontSize: 9.5, color: '#848E9C', lineHeight: 1.3 }}>
          {card.match} · <span style={{ color: '#F0B90B', fontWeight: 700 }}>{card.pick}</span>
        </div>
      </div>
    );
  }

  const text = card.type === 'chat' ? card.text
    : card.type === 'qa' ? card.question
    : card.type === 'deposit' ? card.text
    : card.type === 'match' ? card.comment : '';

  return (
    <div style={{
      minWidth: 190, background: '#1A1E26', border: '1px solid #2B3139',
      borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column',
      gap: 5, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Avatar profileId={profileId} size={22} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0' }}>{p.name} {p.flag}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#4B5563' }}>{card.time}</span>
      </div>
      <div style={{
        fontSize: 11, color: '#9CA3AF', lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{text}</div>
      {'likes' in card && (
        <div style={{ fontSize: 10, color: '#4B5563' }}>❤️ {card.likes}</div>
      )}
    </div>
  );
}
