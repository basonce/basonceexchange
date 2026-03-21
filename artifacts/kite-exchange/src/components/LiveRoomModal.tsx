import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Users, Send, Link as LinkIcon, DollarSign, MoreHorizontal, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import {
  generateInitialMessages,
  generateNewMessage,
  generateParticipantSlots,
  generateSingleParticipant,
  setLoadedProfiles,
  type ChatMessage,
  type ParticipantSlot,
} from '../lib/live-chat-generator';

interface Room {
  id: string;
  title: string;
  description: string;
  topic: string;
  listener_count: number;
  host_id: string;
  is_vip: boolean;
  required_level: number;
  access_type: string;
  room_category: string;
  background_gradient: string;
  coin_symbol?: string;
  coin_logo?: string;
}

interface LiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  allRooms?: Room[];
  onRoomChange?: (roomId: string) => void;
}

interface CoinData {
  symbol: string;
  logo: string;
  price: number;
  change: number;
  chartData: number[];
}

function CoinLogoInline({ symbol, logo, coinLogos }: { symbol: string; logo: string; coinLogos: Record<string, string> }) {
  const resolvedLogo = logo || coinLogos[symbol] || '';
  const [src, setSrc] = useState(resolvedLogo);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const next = logo || coinLogos[symbol] || '';
    setSrc(next);
    setFailed(false);
  }, [logo, symbol, coinLogos]);

  if (!failed && src) {
    return (
      <img
        src={src}
        alt={symbol}
        className="w-4 h-4 rounded-full flex-shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-4 h-4 rounded-full bg-[#F0B90B] flex items-center justify-center text-black text-[8px] font-bold flex-shrink-0">
      {symbol[0]}
    </div>
  );
}

const COIN_TOPICS: Record<string, string> = {
  BTC: 'Bitcoin Price Action & Market Analysis',
  ETH: 'Ethereum DeFi & Smart Contracts',
  SOL: 'Solana Ecosystem & Speed',
  BNB: 'BNB Chain & Exchange Updates',
  XRP: 'XRP Payments & Regulation News',
  ADA: 'Cardano Development & Staking',
  DOGE: 'Dogecoin Community & Memes',
  DOT: 'Polkadot Parachains & Web3',
  MATIC: 'Polygon Scaling & L2 Solutions',
  EQ: 'EarnQuest Mining & Token Economy',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export default function LiveRoomModal({ isOpen, onClose, roomId, allRooms = [], onRoomChange }: LiveRoomModalProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participantSlots, setParticipantSlots] = useState<ParticipantSlot[]>([]);
  const [hostAvatar, setHostAvatar] = useState('/ber1.jpg');
  const [newMessage, setNewMessage] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showPriceCard, setShowPriceCard] = useState(true);
  const [showNote, setShowNote] = useState(true);
  const [coinData, setCoinData] = useState<CoinData>({
    symbol: 'BTC', logo: '', price: 0, change: 0, chartData: [],
  });
  const coinLogosRef = useRef<Record<string, string>>({});

  const [swipeDelta, setSwipeDelta] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  const [peekRoom, setPeekRoom] = useState<Room | null>(null);
  const [showToast, setShowToast] = useState('');
  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflePreviewIdx, setShufflePreviewIdx] = useState<number | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const intervalsRef = useRef<number[]>([]);
  const coinSymbolRef = useRef('BTC');
  const shuffleRafRef = useRef<number | null>(null);
  const [modalHeight, setModalHeight] = useState(() => window.innerHeight);
  const isUserScrollingRef = useRef(false);

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setModalHeight(vh);
    };
    updateHeight();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      return () => window.visualViewport!.removeEventListener('resize', updateHeight);
    } else {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  const currentRoomIndex = allRooms.findIndex(r => r.id === roomId);
  const prevRoom = currentRoomIndex > 0 ? allRooms[currentRoomIndex - 1] : allRooms[allRooms.length - 1];
  const nextRoom = currentRoomIndex < allRooms.length - 1 ? allRooms[currentRoomIndex + 1] : allRooms[0];

  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(id => clearInterval(id));
    intervalsRef.current = [];
    if ((window as any).__eqUnsub) {
      (window as any).__eqUnsub();
      delete (window as any).__eqUnsub;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const hostId = Math.floor(Math.random() * 70) + 1;
    setHostAvatar(`https://i.pravatar.cc/80?img=${hostId}`);
    setParticipantSlots(generateParticipantSlots(5, roomId));
    setChatMessages(generateInitialMessages('BTC', 15));
    loadRoomData();

    const listenerInt = window.setInterval(() => {
      setRoom(prev => {
        if (!prev) return prev;
        const delta = Math.floor(Math.random() * 30) - 10;
        return { ...prev, listener_count: Math.max(500, prev.listener_count + delta) };
      });
    }, 3000);
    intervalsRef.current.push(listenerInt);

    const slotInt = window.setInterval(() => {
      const newParticipant = generateSingleParticipant(roomId);
      setParticipantSlots(prev => {
        const replaceIdx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        next[replaceIdx] = newParticipant;
        setTimeout(() => {
          setParticipantSlots(slots =>
            slots.map(s => s.id === newParticipant.id ? { ...s, isNew: false } : s)
          );
        }, 1200);
        return next;
      });
    }, 13000);
    intervalsRef.current.push(slotInt);

    return () => {
      clearIntervals();
      setChatMessages([]);
      setRoom(null);
      setCoinData({ symbol: 'BTC', logo: '', price: 0, change: 0, chartData: [] });
      setShowPriceCard(true);
      setShowNote(true);
      setSwipeDelta(0);
      isHorizontalSwipe.current = null;
    };
  }, [isOpen, roomId]);

  const startChatEngine = useCallback((symbol: string) => {
    const initial = generateInitialMessages(symbol, 15);
    setChatMessages(initial);

    const baseDelay = 2500;
    const addMessage = () => {
      const msg = generateNewMessage(symbol);
      setChatMessages(prev => [...prev.slice(-40), msg]);
      const next = baseDelay + Math.random() * 3000;
      const tid = window.setTimeout(addMessage, next);
      intervalsRef.current.push(tid as unknown as number);
    };

    const firstId = window.setTimeout(addMessage, baseDelay + Math.random() * 2000);
    intervalsRef.current.push(firstId as unknown as number);
  }, []);

  const fetchRealCoinData = async (symbol: string, logo: string) => {
    coinSymbolRef.current = symbol;

    if (symbol === 'EQ') {
      const pm = EarnQuestPriceManager.getInstance();
      const price = pm.getPrice();
      const ch = pm.getChange();
      const pts: number[] = [];
      let p = price * 0.98;
      for (let i = 0; i < 50; i++) {
        p += (Math.random() - 0.48) * price * 0.008;
        pts.push(Math.max(p, price * 0.92));
      }
      pts[pts.length - 1] = price;
      setCoinData({ symbol: 'EQ', logo: logo || '/earnquest-logo-icon-2.png', price, change: ch, chartData: pts });
      startChatEngine('EQ');
      const unsub = pm.subscribe(() => {
        const np = pm.getPrice();
        const nch = pm.getChange();
        setCoinData(prev => ({ ...prev, price: np, change: nch, chartData: [...prev.chartData.slice(1), np] }));
      });
      const unsubId = window.setTimeout(() => {}, 0);
      intervalsRef.current.push(unsubId);
      (window as any).__eqUnsub = () => unsub();
      return;
    }

    try {
      const [tickerRes, klineRes] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`),
        fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=1h&limit=50`),
      ]);
      const ticker = await tickerRes.json();
      const klines = await klineRes.json();
      const realPrice = parseFloat(ticker.lastPrice);
      const realChange = parseFloat(ticker.priceChangePercent);
      const chartPts = Array.isArray(klines) ? klines.map((k: string[]) => parseFloat(k[4])) : [];
      setCoinData({ symbol, logo, price: realPrice, change: realChange, chartData: chartPts.length > 0 ? chartPts : [realPrice] });
      startChatEngine(symbol);

      const tid = window.setInterval(async () => {
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
          const d = await res.json();
          const np = parseFloat(d.price);
          setCoinData(prev => ({
            ...prev, price: np,
            change: ((np - realPrice) / realPrice) * 100 + realChange,
            chartData: [...prev.chartData.slice(1), np],
          }));
        } catch { /* ignore */ }
      }, 5000);
      intervalsRef.current.push(tid);
    } catch {
      setCoinData(prev => ({ ...prev, symbol, logo, price: 0, change: 0, chartData: [] }));
      startChatEngine(symbol);
    }
  };

  const loadRoomData = async () => {
    const [roomResult, profilesResult, coinsResult] = await Promise.all([
      supabase.from('live_rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('anonymous_profiles').select('username, avatar_url').limit(500),
      supabase.from('supported_coins').select('symbol, logo_url'),
    ]);

    if (coinsResult.data) {
      const logoMap: Record<string, string> = {};
      for (const c of coinsResult.data) {
        if (c.symbol && c.logo_url) logoMap[c.symbol] = c.logo_url;
      }
      logoMap['EQ'] = '/earnquest-logo-icon-2.png';
      coinLogosRef.current = logoMap;
    }

    if (profilesResult.data && profilesResult.data.length > 0) {
      const profiles = profilesResult.data
        .filter((p: { username: string; avatar_url: string | null }) => p.username && p.avatar_url)
        .map((p: { username: string; avatar_url: string | null }) => ({ username: p.username, avatar: p.avatar_url as string }));
      setLoadedProfiles(profiles);
    }

    if (roomResult.data) {
      setRoom(roomResult.data);
      const symbol = roomResult.data.coin_symbol || 'BTC';
      const logo = roomResult.data.coin_logo || coinLogosRef.current[symbol] || '';
      fetchRealCoinData(symbol, logo);
    }
  };

  useEffect(() => {
    if (isUserScrollingRef.current) return;
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  const navigateToRoom = useCallback((targetRoom: Room, direction: 'left' | 'right') => {
    if (isTransitioning || !onRoomChange) return;
    setIsTransitioning(true);
    setTransitionDirection(direction);
    setSwipeDelta(0);

    setTimeout(() => {
      onRoomChange(targetRoom.id);
      setIsTransitioning(false);
      setTransitionDirection(null);
      setSwipeDelta(0);
    }, 320);

    const toastMsg = `${targetRoom.title}`;
    setShowToast(toastMsg);
    setTimeout(() => setShowToast(''), 2000);

    if (navigator.vibrate) navigator.vibrate(40);
  }, [isTransitioning, onRoomChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isTransitioning || allRooms.length <= 1) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(dx) > Math.abs(dy) + 5) {
        isHorizontalSwipe.current = true;
      } else if (Math.abs(dy) > Math.abs(dx) + 5) {
        isHorizontalSwipe.current = false;
      }
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault();
      const resistance = 0.45;
      setSwipeDelta(dx * resistance);

      if (dx < -20 && nextRoom) {
        setPeekRoom(nextRoom);
      } else if (dx > 20 && prevRoom) {
        setPeekRoom(prevRoom);
      } else {
        setPeekRoom(null);
      }
    }
  }, [isTransitioning, allRooms.length, nextRoom, prevRoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isHorizontalSwipe.current || allRooms.length <= 1) {
      setSwipeDelta(0);
      setPeekRoom(null);
      return;
    }

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dx) / dt;

    const shouldNavigate = Math.abs(dx) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldNavigate) {
      if (dx < 0 && nextRoom) {
        navigateToRoom(nextRoom, 'left');
      } else if (dx > 0 && prevRoom) {
        navigateToRoom(prevRoom, 'right');
      } else {
        setSwipeDelta(0);
      }
    } else {
      setSwipeDelta(0);
    }
    setPeekRoom(null);
    isHorizontalSwipe.current = null;
  }, [allRooms.length, nextRoom, prevRoom, navigateToRoom]);

  const handleShuffle = useCallback(() => {
    if (allRooms.length <= 1 || isShuffling) return;
    setIsShuffling(true);

    if (navigator.vibrate) navigator.vibrate([30, 20, 30, 20, 60]);

    let count = 0;
    const maxFlashes = 12;
    const flash = () => {
      const randomIdx = Math.floor(Math.random() * allRooms.length);
      setShufflePreviewIdx(randomIdx);
      count++;
      if (count < maxFlashes) {
        const delay = 80 + count * 15;
        shuffleRafRef.current = window.setTimeout(flash, delay);
      } else {
        const available = allRooms.filter(r => r.id !== roomId);
        const target = available[Math.floor(Math.random() * available.length)];
        setShufflePreviewIdx(null);
        setIsShuffling(false);
        if (target && onRoomChange) {
          setTimeout(() => {
            onRoomChange(target.id);
            setShowToast(`Shuffled to: ${target.title}`);
            setTimeout(() => setShowToast(''), 2200);
          }, 200);
        }
      }
    };
    flash();
  }, [allRooms, roomId, isShuffling, onRoomChange]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages(prev => [...prev.slice(-40), {
      id: `user-${Date.now()}`,
      username: 'You',
      avatar: '',
      message: newMessage.trim(),
      timestamp: Date.now(),
    }]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!isOpen || !room) return null;

  const topic = COIN_TOPICS[coinData.symbol] || room.topic || 'Crypto Discussion';

  const miniChartPoints = coinData.chartData.length > 1
    ? (() => {
        const min = Math.min(...coinData.chartData);
        const max = Math.max(...coinData.chartData);
        const range = max - min || 1;
        return coinData.chartData.map((p, i) =>
          `${(i / (coinData.chartData.length - 1)) * 100},${28 - ((p - min) / range) * 22}`
        ).join(' ');
      })()
    : '';

  const totalRooms = allRooms.length;
  const maxDots = 7;
  const showDots = totalRooms > 1;

  let dotsStart = 0;
  let dotsEnd = Math.min(totalRooms, maxDots);
  if (currentRoomIndex >= 0 && totalRooms > maxDots) {
    dotsStart = Math.max(0, Math.min(currentRoomIndex - Math.floor(maxDots / 2), totalRooms - maxDots));
    dotsEnd = dotsStart + maxDots;
  }

  const contentTranslate = isTransitioning
    ? transitionDirection === 'left'
      ? -window.innerWidth
      : window.innerWidth
    : swipeDelta;

  const shufflePreviewRoom = shufflePreviewIdx !== null ? allRooms[shufflePreviewIdx] : null;

  return (
    <div
      className="fixed bg-[#0B0E11] z-[60] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: `${modalHeight}px`,
        maxHeight: `${modalHeight}px`,
        touchAction: 'pan-y',
        overflowX: 'hidden',
        overflowY: 'hidden',
      }}
    >
      {/* Basonce Logo Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(240, 185, 11, 0.12) 0%, rgba(240, 185, 11, 0.05) 35%, rgba(240, 185, 11, 0.02) 55%, transparent 75%)',
              transform: 'scale(2.2)',
            }}
          />
          <img
            src="/BASONCE_LOGO_SON_BITEN.png"
            alt=""
            className="w-[420px] h-[420px] object-contain opacity-[0.08]"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(240, 185, 11, 0.15)) drop-shadow(0 0 60px rgba(240, 185, 11, 0.08)) drop-shadow(0 0 100px rgba(240, 185, 11, 0.04))',
            }}
          />
        </div>
      </div>

      {/* Swipe Peek - Next Room (right edge when swiping left) */}
      {peekRoom && swipeDelta < -10 && nextRoom && (
        <div
          className="absolute inset-y-0 right-0 flex items-start pt-6 pl-3 pr-1 z-20 pointer-events-none"
          style={{ width: Math.min(Math.abs(swipeDelta) * 0.8 + 48, 160) }}
        >
          <div
            className="bg-[#1A1D26]/95 rounded-xl p-3 border border-[#F0B90B]/20 shadow-2xl"
            style={{ opacity: Math.min(Math.abs(swipeDelta) / 80, 1) }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ChevronRight className="w-3 h-3 text-[#F0B90B]" />
              <span className="text-[10px] text-[#F0B90B] font-bold">Next</span>
            </div>
            <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{nextRoom.title}</p>
            <div className="flex items-center gap-1 mt-1">
              <Users className="w-2.5 h-2.5 text-gray-400" />
              <span className="text-gray-400 text-[10px]">{nextRoom.listener_count?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Swipe Peek - Prev Room (left edge when swiping right) */}
      {peekRoom && swipeDelta > 10 && prevRoom && (
        <div
          className="absolute inset-y-0 left-0 flex items-start pt-6 pr-3 pl-1 z-20 pointer-events-none"
          style={{ width: Math.min(swipeDelta * 0.8 + 48, 160) }}
        >
          <div
            className="bg-[#1A1D26]/95 rounded-xl p-3 border border-[#F0B90B]/20 shadow-2xl"
            style={{ opacity: Math.min(swipeDelta / 80, 1) }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ChevronLeft className="w-3 h-3 text-[#F0B90B]" />
              <span className="text-[10px] text-[#F0B90B] font-bold">Prev</span>
            </div>
            <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{prevRoom.title}</p>
            <div className="flex items-center gap-1 mt-1">
              <Users className="w-2.5 h-2.5 text-gray-400" />
              <span className="text-gray-400 text-[10px]">{prevRoom.listener_count?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Swipeable Content */}
      <div
        className="flex flex-col relative z-10 flex-1"
        style={{
          height: '100%',
          overflow: 'hidden',
          transform: `translateX(${contentTranslate}px)`,
          transition: isTransitioning
            ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : swipeDelta === 0
            ? 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'none',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 z-10 bg-[#0B0E11]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-700">
                <img src={hostAvatar} alt="Host" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">LIVE</div>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{room.title}</h2>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3 h-3" />
                <span>{room.listener_count.toLocaleString()} listeners</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isFollowing ? 'bg-gray-700 text-gray-300' : 'bg-[#F0B90B] text-black'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Room Navigator Dots + Shuffle */}
        {showDots && (
          <div className="flex items-center justify-between px-4 py-2 z-10">
            <div className="flex items-center gap-1.5">
              {allRooms.slice(dotsStart, dotsEnd).map((r, i) => {
                const actualIdx = dotsStart + i;
                const isActive = actualIdx === currentRoomIndex;
                return (
                  <button
                    key={r.id}
                    onClick={() => onRoomChange && onRoomChange(r.id)}
                    className="transition-all duration-300 rounded-full"
                    style={{
                      width: isActive ? 20 : 6,
                      height: 6,
                      background: isActive ? '#F0B90B' : 'rgba(255,255,255,0.25)',
                    }}
                  />
                );
              })}
              {totalRooms > maxDots && (
                <span className="text-gray-500 text-[10px] ml-1">{currentRoomIndex + 1}/{totalRooms}</span>
              )}
            </div>

            <button
              onClick={handleShuffle}
              disabled={isShuffling || allRooms.length <= 1}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-90 ${
                isShuffling
                  ? 'bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/40'
                  : 'bg-[#1E2028] text-gray-300 border border-gray-700 hover:border-[#F0B90B]/50 hover:text-[#F0B90B]'
              }`}
            >
              <Shuffle className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
              {isShuffling && shufflePreviewRoom
                ? <span className="max-w-[80px] truncate">{shufflePreviewRoom.title}</span>
                : <span>Shuffle</span>
              }
            </button>
          </div>
        )}

        {/* Participants */}
        <div className="px-4 py-3 border-b border-gray-800/30 z-10">
          <div className="flex items-center gap-2 overflow-x-auto">
            {participantSlots.map((slot, si) => (
              <div
                key={slot.id}
                className="flex-shrink-0 relative"
                style={{
                  animation: slot.isNew ? 'participantEnter 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : undefined,
                }}
              >
                <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors ${slot.isNew ? 'border-[#F0B90B]' : 'border-gray-600 hover:border-[#F0B90B]'}`}>
                  <img
                    src={slot.avatar}
                    alt={slot.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      if (!t.src.includes('pravatar')) {
                        t.src = `https://i.pravatar.cc/80?img=${(si % 70) + 1}`;
                      }
                    }}
                  />
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0B0E11]"
                  style={{
                    background: '#22c55e',
                    animation: 'greenPulse 2s ease-in-out infinite',
                    animationDelay: `${si * 0.4}s`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto z-10 relative"
          style={{ minHeight: 0 }}
          onScroll={() => {
            const container = messagesContainerRef.current;
            if (!container) return;
            const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            isUserScrollingRef.current = distanceFromBottom > 80;
          }}
        >
          <div className="px-4 py-3 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#F0B90B]/20 flex items-center justify-center text-[#F0B90B] text-xs font-bold">
                      {msg.username[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold ${msg.username === 'You' ? 'text-[#F0B90B]' : 'text-white'}`}>
                    {msg.username}
                  </span>
                  <p className="text-gray-300 text-sm leading-relaxed break-words">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Note */}
        {showNote && (
          <div className="mx-4 mb-2 bg-[#1A1D26] rounded-lg p-3 border border-gray-800/50 relative z-10">
            <button onClick={() => setShowNote(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-400 pr-6">
              <span className="text-[#F0B90B] font-semibold">Note:</span> Please respect Basonce's community standards.
              Opinions expressed in the live room are personal and do not constitute financial advice.
            </p>
            <p className="text-xs mt-1.5">
              <span className="text-gray-400">Topic:</span>{' '}
              <span className="text-[#F0B90B] font-semibold">{topic}</span>
            </p>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="bg-[#0B0E11] border-t border-gray-800/50 px-4 pt-3 z-10 flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  boxShadow: newMessage.trim()
                    ? '0 0 0 1.5px #F0B90B, 0 0 10px rgba(240,185,11,0.5), 0 0 20px rgba(240,185,11,0.25)'
                    : '0 0 0 1.5px #F0B90B, 0 0 8px rgba(240,185,11,0.35), 0 0 16px rgba(240,185,11,0.15)',
                  borderRadius: 9999,
                }}
              />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Chat with everyone"
                className="w-full bg-[#12141a] rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none relative"
                style={{ border: 'none' }}
              />
            </div>
            <button
              onClick={sendMessage}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${newMessage.trim() ? 'bg-[#F0B90B] hover:bg-[#F0B90B]/80' : 'bg-[#1E2028] hover:bg-[#2A2D38]'}`}
            >
              <Send className={`w-5 h-5 ${newMessage.trim() ? 'text-black' : 'text-gray-400'}`} />
            </button>
            <button className="w-10 h-10 bg-[#1E2028] hover:bg-[#2A2D38] rounded-full flex items-center justify-center transition-colors flex-shrink-0">
              <LinkIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-10 h-10 bg-[#1E2028] hover:bg-[#2A2D38] rounded-full flex items-center justify-center transition-colors flex-shrink-0">
              <DollarSign className="w-5 h-5 text-[#F0B90B]" />
            </button>
            <button className="w-10 h-10 bg-[#1E2028] hover:bg-[#2A2D38] rounded-full flex items-center justify-center transition-colors flex-shrink-0">
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Coin Price Card */}
      {showPriceCard && coinData.price > 0 && (
        <div className="absolute bottom-24 right-3 w-36 bg-white rounded-xl shadow-2xl overflow-hidden z-20">
          <button onClick={() => setShowPriceCard(false)} className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600 z-10">
            <X className="w-3 h-3" />
          </button>
          <div className="absolute top-1.5 left-2 bg-[#F0B90B] text-[9px] font-bold px-1.5 py-0.5 rounded text-black">Pinned</div>
          <div className="pt-6 px-2.5 pb-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <CoinLogoInline symbol={coinData.symbol} logo={coinData.logo} coinLogos={coinLogosRef.current} />
              <span className="text-black font-bold text-xs">{coinData.symbol}</span>
            </div>
            <div className={`text-xs font-semibold mb-0.5 ${coinData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {coinData.change >= 0 ? '+' : ''}{coinData.change.toFixed(2)}%
            </div>
            {miniChartPoints && (
              <div className="h-8 mb-1">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 28">
                  <polyline fill="none" stroke={coinData.change >= 0 ? '#10b981' : '#ef4444'} strokeWidth="1.5" points={miniChartPoints} />
                </svg>
              </div>
            )}
            <div className="text-black text-base font-bold mb-1.5">${formatPrice(coinData.price)}</div>
            <button
              onClick={() => {
                onClose();
                localStorage.setItem('currentTab', 'trade');
                localStorage.setItem('selectedCoinSymbol', coinData.symbol);
                window.dispatchEvent(new CustomEvent('navigate-to-trade', { detail: { symbol: coinData.symbol } }));
              }}
              className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold py-1.5 rounded-lg text-[11px] transition-colors"
            >
              Trade
            </button>
          </div>
        </div>
      )}

      {/* Swipe Hint Overlay (first time) */}
      {allRooms.length > 1 && Math.abs(swipeDelta) === 0 && !isTransitioning && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 z-30 pointer-events-none"
          style={{ animation: 'swipeHintFade 3s ease-out 1s forwards', opacity: 0 }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-white/70" />
          <span className="text-white/70 text-[10px]">Swipe to browse rooms</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/70" />
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#F0B90B] text-black text-xs font-bold px-4 py-2 rounded-full shadow-xl z-50 whitespace-nowrap max-w-[240px] truncate"
          style={{ animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          {showToast}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.9); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes swipeHintFade {
          0% { opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes greenPulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          50% { opacity: 0.75; transform: scale(0.85); box-shadow: 0 0 0 3px rgba(34,197,94,0); }
        }
        @keyframes participantEnter {
          0% { opacity: 0; transform: scale(0.4) translateY(8px); }
          60% { opacity: 1; transform: scale(1.12) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
