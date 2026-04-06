import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Headphones, X, Gift, Zap, TrendingUp, Star, Users, Plus, PenLine, FileText, Video, Bell, LayoutDashboard, Pencil, Search, MessageSquare, ScanLine } from 'lucide-react';
import MegaphoneAnim from '../components/MegaphoneAnim';
import HotSearchOverlay from '../components/HotSearchOverlay';
import MessagesPage from './MessagesPage';
import HomeMarketList from '../components/HomeMarketList';
import FuturesMarketList from '../components/FuturesMarketList';
import NewListingSection from '../components/NewListingSection';
import HomeTradFiList from '../components/HomeTradFiList';
import GamesSection from '../components/GamesSection';
import MenuDrawer from '../components/MenuDrawer';
import FuturesCampaignModal from '../components/FuturesCampaignModal';
import LaunchpoolModal from '../components/LaunchpoolModal';
import CampaignDetailModal, { type CampaignDetailData } from '../components/CampaignDetailModal';
import { supabase, getCurrentUser } from '../lib/supabase';

const SocialFeed = lazy(() => import('../components/SocialFeed'));
const BasonceAlpha = lazy(() => import('../components/BasonceAlpha'));
const SupportModal = lazy(() => import('../components/SupportModal'));
const AlphaEventsModal = lazy(() => import('../components/AlphaEventsModal'));
const ReferralModal = lazy(() => import('../components/ReferralModal'));
const EarnModal = lazy(() => import('../components/EarnModal'));
const DepositMethodModal = lazy(() => import('../components/DepositMethodModal'));
const MoreModal = lazy(() => import('../components/MoreModal'));
const PayModal = lazy(() => import('../components/PayModal'));
const RewardsModal = lazy(() => import('../components/RewardsModal'));
const P2PModal = lazy(() => import('../components/P2PModal'));
const CampaignTab = lazy(() => import('../components/CampaignTab'));
const AnnouncementTab = lazy(() => import('../components/AnnouncementTab'));
const FollowingTab = lazy(() => import('../components/FollowingTab'));
const Wallet = lazy(() => import('../components/Wallet'));

interface HomePageProps {
  onNavigate?: (tab: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [activeTab, setActiveTab] = useState<'crypto' | 'spot' | 'futures' | 'new-listing' | 'alpha' | 'games'>('crypto');
  const [activeFilter, setActiveFilter] = useState<'gainers' | 'losers' | '24h-vol' | 'tradfi'>('gainers');
  const [discoverTab, setDiscoverTab] = useState<'discover' | 'following' | 'campaign' | 'announcement'>('discover');
  const [showFAB, setShowFAB] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const socialSectionRef = useRef<HTMLDivElement>(null);
  const [myProfile, setMyProfile] = useState<{ avatar_url: string | null; username: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) return;
      supabase.from('user_profiles').select('avatar_url, username').eq('id', uid).maybeSingle()
        .then(({ data: p }) => { if (p) setMyProfile(p); });
    });
  }, []);

  useEffect(() => {
    const el = socialSectionRef.current;
    if (!el) return;
    const checkVisibility = () => {
      const rect = el.getBoundingClientRect();
      // FAB sadece social section yukarı kaçmışken (kullanıcı içine kaymışken) görünür
      setShowFAB(rect.top < -40 && rect.bottom > 60);
    };
    checkVisibility();
    window.addEventListener('scroll', checkVisibility, { passive: true });
    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);
  const [mainTab, setMainTab] = useState<'exchange' | 'wallet'>('exchange');
  const [showSearch, setShowSearch] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [hotSearchIdx, setHotSearchIdx] = useState(0);
  const [hotSearchFade, setHotSearchFade] = useState(true);

  const HOT_SEARCHES = [
    '🔥 BTC hot search',
    '🔥 ETH top gainer',
    '🔥 KERNEL top gainer',
    '🔥 EQ surging now',
    '🔥 SOL trending',
    '🔥🔥🔥 BNC top volume',
    '🔥 KITE hot pick',
    '🔥 WIF meme wave',
    '🔥🔥🔥 BNC all-time high',
    '🔥 AI Agent volume',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHotSearchFade(false);
      setTimeout(() => {
        setHotSearchIdx(prev => (prev + 1) % HOT_SEARCHES.length);
        setHotSearchFade(true);
      }, 250);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportUserInfo, setSupportUserInfo] = useState<{ userId: string; email: string } | null>(null);
  const [showAlphaEvents, setShowAlphaEvents] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showEarn, setShowEarn] = useState(false);
  const [showDepositUSD, setShowDepositUSD] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showP2P, setShowP2P] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [promoSlide, setPromoSlide] = useState(0);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showFuturesCampaign, setShowFuturesCampaign] = useState(false);
  const [showLaunchpool, setShowLaunchpool] = useState(false);
  const [dbCampaigns, setDbCampaigns] = useState<CampaignDetailData[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetailData | null>(null);

  const SLIDE_BASE = useRef(Date.now()).current;

  const promoSlides = [
    {
      title: 'Trade Futures & Win',
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="transparent"/>
          <rect x="9" y="14" width="5" height="12" rx="1.5" stroke="white" strokeWidth="1.8"/>
          <rect x="26" y="14" width="5" height="12" rx="1.5" stroke="white" strokeWidth="1.8"/>
          <line x1="14" y1="20" x2="26" y2="20" stroke="white" strokeWidth="1.8"/>
          <circle cx="20" cy="24" r="4" fill="#F0B90B"/>
          <circle cx="20" cy="24" r="2" fill="#181A20"/>
        </svg>
      ),
      content: 'Share 110M PUMP & 920K KITE!',
      participants: 778432,
      endsAt: SLIDE_BASE + 6 * 86400000 + 2 * 3600000,
      btnLabel: 'Join',
      btnAction: () => setShowFuturesCampaign(true),
    },
    {
      title: 'Save on TradFi Perp Fees',
      icon: (
        <div className="w-10 h-10 rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <ellipse cx="11" cy="7" rx="7" ry="3" stroke="#1A1200" strokeWidth="1.8"/>
            <path d="M4 7v4c0 1.66 3.13 3 7 3s7-1.34 7-3V7" stroke="#1A1200" strokeWidth="1.8"/>
            <path d="M4 11v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4" stroke="#1A1200" strokeWidth="1.8"/>
            <ellipse cx="11" cy="7" rx="4" ry="1.5" fill="#1A1200" fillOpacity="0.3"/>
          </svg>
        </div>
      ),
      content: 'Zero Maker Fees & 50% Off Taker Fees',
      participants: 1243890,
      endsAt: SLIDE_BASE + 3 * 86400000 + 20 * 3600000,
      btnLabel: 'Trade',
      btnAction: () => { if (onNavigate) onNavigate('futures'); },
    },
    {
      title: 'Launchpool',
      icon: (
        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            {[...Array(8)].map((_, i) => (
              <rect key={i} x={4 + i * 3} y={8 + Math.abs(4 - i) * 1.5} width="2" height={16 - Math.abs(4 - i) * 3} rx="1" fill="white" fillOpacity="0.9"/>
            ))}
          </svg>
        </div>
      ),
      content: 'OPN',
      participants: 892340,
      endsAt: SLIDE_BASE + 4 * 86400000 + 6 * 3600000,
      btnLabel: 'Join',
      btnAction: () => setShowLaunchpool(true),
    },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setSupportUserInfo({ userId: String(profile.user_id || ''), email: profile.email || user.email || '' });
      } else {
        setSupportUserInfo({ userId: '', email: user.email || '' });
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('*, claim_type, claim_condition, claim_reward_usdt, claim_reward_eq, duration_hours')
      .eq('is_active', true)
      .in('claim_type', ['instant', 'milestone'])
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setDbCampaigns(data.map(c => ({ ...c, requirements: Array.isArray(c.requirements) ? c.requirements : [] })));
      });
  }, []);

  useEffect(() => {
    if (!showPromoBanner) return;
    const totalSlides = 3 + dbCampaigns.length;
    const timer = setInterval(() => {
      setPromoSlide(prev => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(timer);
  }, [showPromoBanner, dbCampaigns.length]);

  const quickActions = [
    {
      label: 'Alpha\nEvents',
      onClick: () => setShowAlphaEvents(true),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="4" width="22" height="20" rx="3" stroke="white" strokeWidth="1.8"/>
          <line x1="3" y1="10" x2="25" y2="10" stroke="white" strokeWidth="1.8"/>
          <line x1="9" y1="2" x2="9" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="19" y1="2" x2="19" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <rect x="8" y="13" width="5" height="4" rx="1" fill="#F0B90B"/>
          <text x="9.5" y="17.2" fontSize="4.5" fill="#1A1200" fontWeight="bold" fontFamily="serif">a</text>
        </svg>
      ),
    },
    {
      label: 'Referral',
      onClick: () => setShowReferral(true),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="11" cy="10" r="4" stroke="white" strokeWidth="1.8"/>
          <path d="M3 22c0-4.42 3.58-8 8-8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="21" y1="8" x2="21" y2="16" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="17" y1="12" x2="25" y2="12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Earn',
      onClick: () => setShowEarn(true),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 4C10.5 4 7 6.5 7 11c0 4 2.5 6 4.5 7.5L14 24l2.5-5.5C18.5 17 21 15 21 11c0-4.5-3.5-7-7-7z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
          <circle cx="14" cy="11" r="2.5" fill="#F0B90B"/>
        </svg>
      ),
    },
    {
      label: 'Deposit',
      onClick: () => setShowDepositUSD(true),
      bg: '#F0B90B',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <line x1="14" y1="4" x2="14" y2="19" stroke="#1A1200" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="8,14 14,20 20,14" stroke="#1A1200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="5" y1="24" x2="23" y2="24" stroke="#1A1200" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'More',
      onClick: () => setShowMore(true),
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.8"/>
          <rect x="16" y="4" width="8" height="8" rx="1.5" fill="#F0B90B"/>
          <rect x="4" y="16" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.8"/>
          <rect x="16" y="16" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.8"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E11] pb-20">
      {showSearch && createPortal(
        <HotSearchOverlay
          onClose={() => setShowSearch(false)}
        />,
        document.body
      )}
      {showMessages && createPortal(
        <MessagesPage onClose={() => setShowMessages(false)} />,
        document.body
      )}
      <div className="bg-[#181A20] px-4 pt-3 pb-2 sticky top-0 z-10">
        {/* Row 1 — birebir Binance: [≡][💬] [Exchange Wallet] [🎧][🔗] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>

          {/* Sol: hamburger + mesaj */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button
              onClick={() => setShowMenuDrawer(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 6px', display: 'flex', alignItems: 'center' }}
            >
              <Menu size={20} color="#C6CBD4" />
            </button>
            <button
              onClick={() => setShowMessages(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 6px', display: 'flex', alignItems: 'center' }}
            >
              {/* Binance mesaj ikonu: balon + içinde 3 çizgi */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 3V6a2 2 0 0 1 2-2z" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <line x1="8" y1="11" x2="16" y2="11" />
                <line x1="8" y1="14" x2="13" y2="14" />
              </svg>
            </button>
          </div>

          {/* Orta: Exchange / Wallet */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: '#2B3139', borderRadius: 20, padding: '3px',
            justifyContent: 'center',
          }}>
            <button
              onClick={() => setMainTab('exchange')}
              style={{
                flex: 1, textAlign: 'center',
                background: mainTab === 'exchange' ? '#F0B90B' : 'transparent',
                border: 'none', borderRadius: 17, padding: '5px 12px',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                color: mainTab === 'exchange' ? '#000' : '#848E9C',
                transition: 'all 0.15s',
              }}
            >
              Exchange
            </button>
            <button
              onClick={() => setMainTab('wallet')}
              style={{
                flex: 1, textAlign: 'center',
                background: mainTab === 'wallet' ? '#F0B90B' : 'transparent',
                border: 'none', borderRadius: 17, padding: '5px 12px',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                color: mainTab === 'wallet' ? '#000' : '#848E9C',
                transition: 'all 0.15s',
              }}
            >
              Wallet
            </button>
          </div>

          {/* Sağ: headphones + scan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button
              onClick={() => setShowSupportModal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 6px', display: 'flex', alignItems: 'center' }}
            >
              {/* Headset: yay + iki kulak kasası + aşağı kıvrılan mikrofon kolu */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0B90B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {/* Headband arc */}
                <path d="M5 11a7 7 0 0 1 14 0" />
                {/* Left ear cup */}
                <rect x="3" y="11" width="4" height="6" rx="2" />
                {/* Right ear cup */}
                <rect x="17" y="11" width="4" height="6" rx="2" />
                {/* Mic arm: right ear cup bottom → curves down-left → small circle */}
                <path d="M21 17v1a3 3 0 0 1-3 3h-3" />
                <circle cx="14" cy="21" r="1" fill="#F0B90B" stroke="none" />
              </svg>
            </button>
            <button
              onClick={() => { if (onNavigate) onNavigate('assets'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 6px', display: 'flex', alignItems: 'center' }}
            >
              <ScanLine size={19} color="#C6CBD4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Row 2: Animated Hot Search Bar */}
        <button
          onClick={() => setShowSearch(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            background: '#2B3139', borderRadius: 10, padding: '8px 12px',
            border: 'none', cursor: 'pointer',
          }}
        >
          <span
            style={{
              flex: 1, textAlign: 'left', fontSize: 14,
              color: '#9B9EA4',
              opacity: hotSearchFade ? 1 : 0,
              transition: 'opacity 0.25s ease',
            }}
          >
            {HOT_SEARCHES[hotSearchIdx]}
          </span>
          <Search size={16} color="#848E9C" />
        </button>

      </div>

      <div className="bg-[#181A20] px-4 pb-3 pt-3">
        <div className="flex items-center justify-around mb-2">
          {quickActions.map(({ icon, label, onClick, bg }) => (
            <button key={label} onClick={onClick} className="flex flex-col items-center gap-1.5 group">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
                style={{ background: bg ?? '#2B3139' }}
              >
                {icon}
              </div>
              <span className="text-white text-[11px] font-medium text-center leading-tight whitespace-pre-line">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {mainTab === 'wallet' ? (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" /></div>}>
          <Wallet />
        </Suspense>
      ) : (
        <>
          {showPromoBanner && (() => {
            const CAMPAIGN_ICON_MAP: Record<string, React.ReactNode> = {
              trading: <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#F0B90B]" /></div>,
              deposit: <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/20 flex items-center justify-center"><Gift className="w-5 h-5 text-[#0ECB81]" /></div>,
              referral: <div className="w-10 h-10 rounded-xl bg-[#F97316]/20 flex items-center justify-center"><Users className="w-5 h-5 text-[#F97316]" /></div>,
              mining: <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/20 flex items-center justify-center"><Zap className="w-5 h-5 text-[#06B6D4]" /></div>,
              social: <div className="w-10 h-10 rounded-xl bg-[#EC4899]/20 flex items-center justify-center"><Star className="w-5 h-5 text-[#EC4899]" /></div>,
            };
            const allSlides = [
              ...promoSlides,
              ...dbCampaigns.map(c => {
                const u = c.claim_reward_usdt ?? 0;
                const e = c.claim_reward_eq ?? 0;
                const rewardStr = u > 0 && e > 0 ? `$${u} USDT + ${e} EQ` : u > 0 ? `$${u} USDT` : e > 0 ? `${e} EQ` : c.reward_label;
                return {
                  title: c.campaign_type.charAt(0).toUpperCase() + c.campaign_type.slice(1) + ' Campaign',
                  icon: CAMPAIGN_ICON_MAP[c.campaign_type] ?? CAMPAIGN_ICON_MAP.trading,
                  content: c.title,
                  subContent: `Claim ${rewardStr} instantly`,
                  btnLabel: 'Claim',
                  btnAction: () => setSelectedCampaign(c),
                };
              }),
            ];
            const totalSlides = allSlides.length;
            const slide = allSlides[promoSlide % totalSlides] as any;
            const slideParticipants: number | null = slide.participants ?? null;
            const fmtParts = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : `${n}`;
            return (
              <div className="mx-4 mt-2 mb-1 bg-[#1E2329] rounded-2xl px-3 pt-2 pb-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
                  <svg viewBox="0 0 100 100" fill="none">
                    <line x1="80" y1="0" x2="0" y2="80" stroke="white" strokeWidth="12"/>
                    <line x1="100" y1="20" x2="20" y2="100" stroke="white" strokeWidth="12"/>
                  </svg>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[#848E9C] text-[12px] font-medium">{slide.title}</span>
                  <button onClick={() => setShowPromoBanner(false)} className="text-[#848E9C] hover:text-gray-300 p-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0">{slide.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-[14px] leading-snug">{slide.content}</div>
                    {slideParticipants && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="w-2.5 h-2.5 text-[#848E9C]" />
                        <span className="text-[#848E9C] text-[10px] font-semibold">{fmtParts(slideParticipants)} joined</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={slide.btnAction}
                    className="flex-shrink-0 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold text-[13px] px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                  >
                    {slide.btnLabel}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {allSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPromoSlide(i)}
                      className={`transition-all duration-300 rounded-full ${i === promoSlide % totalSlides ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-[#474D57]'}`}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="bg-[#0B0E11] px-4 pt-2">
            <div className="flex items-center gap-5 mb-2 overflow-x-auto scrollbar-hide">
              {[
                { id: 'crypto', label: 'Crypto' },
                { id: 'spot', label: 'Spot' },
                { id: 'futures', label: 'Futures' },
                { id: 'new-listing', label: 'New' },
                { id: 'alpha', label: 'Basonce Alpha', special: true },
                { id: 'games', label: '🎮 Games', special: false },
              ].map(({ id, label, special }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`relative text-[16px] font-bold whitespace-nowrap pb-1.5 transition-all flex items-center gap-1.5 ${
                    activeTab === id
                      ? special ? 'text-[#F0B90B] border-b-2 border-[#F0B90B]' : 'text-white border-b-2 border-[#F0B90B]'
                      : special ? 'text-[#F0B90B]/60 hover:text-[#F0B90B]' : 'text-[#848E9C] hover:text-[#B7BDC6]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab !== 'new-listing' && activeTab !== 'futures' && activeTab !== 'alpha' && activeTab !== 'games' && (
              <div className="flex items-center gap-1.5 mb-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {[
                  { id: 'gainers', label: 'Gainers' },
                  { id: 'losers', label: 'Losers' },
                  { id: '24h-vol', label: '24h Vol' },
                  { id: 'tradfi', label: 'TradFi' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveFilter(id as typeof activeFilter)}
                    className={`px-3 py-1 rounded text-[13px] font-bold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                      activeFilter === id
                        ? 'bg-[#F0B90B] text-[#0B0E11]'
                        : 'bg-transparent text-[#848E9C] hover:text-[#B7BDC6]'
                    }`}
                  >
                    {label}
                    {id === 'tradfi' && <MegaphoneAnim size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0B0E11]">
          <Suspense fallback={null}>
          {activeTab === 'new-listing' ? (
            <NewListingSection />
          ) : activeTab === 'futures' ? (
            <FuturesMarketList />
          ) : activeTab === 'alpha' ? (
            <BasonceAlpha />
          ) : activeTab === 'games' ? (
            <GamesSection />
          ) : activeFilter === 'tradfi' ? (
            <HomeTradFiList />
          ) : (
            <HomeMarketList activeFilter={activeFilter} marketType={activeTab as 'crypto' | 'spot' | 'futures'} />
          )}
          </Suspense>
          </div>

          <div ref={socialSectionRef} className="bg-[#181A20] mt-4">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2B3139] overflow-x-auto scrollbar-hide bg-[#181A20]">
              {[
                { id: 'discover', label: 'Discover', color: 'from-[#F0B90B] to-[#F8D347]', dot: null },
                { id: 'following', label: 'Following', color: 'from-[#0ECB81] to-[#05A660]', dot: '#0ECB81' },
                { id: 'campaign', label: 'Campaigns', color: 'from-[#F6465D] to-[#C7334A]', dot: null },
                { id: 'announcement', label: 'Announcements', color: 'from-[#3B82F6] to-[#1D4ED8]', dot: null }
              ].map(({ id, label, color, dot }) => (
                <button
                  key={id}
                  onClick={() => setDiscoverTab(id as any)}
                  className={`relative text-sm font-semibold whitespace-nowrap px-3 py-1.5 rounded-full transition-all duration-200 ${
                    discoverTab === id
                      ? `bg-gradient-to-r ${color} text-[#0B0E11] shadow-md scale-105`
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {label}
                  {dot && discoverTab !== id && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: dot }} />
                  )}
                </button>
              ))}
            </div>

            <Suspense fallback={<div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" /></div>}>
              {discoverTab === 'discover' && <SocialFeed />}
              {discoverTab === 'following' && <FollowingTab />}
              {discoverTab === 'campaign' && <CampaignTab />}
              {discoverTab === 'announcement' && <AnnouncementTab />}
            </Suspense>
          </div>
        </>
      )}

      {showSupportModal && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} prefillData={supportUserInfo ? { customerId: supportUserInfo.userId, email: supportUserInfo.email, skipToForm: true } : undefined} /></Suspense>}
      {showAlphaEvents && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><AlphaEventsModal isOpen={showAlphaEvents} onClose={() => setShowAlphaEvents(false)} /></Suspense>}
      {showReferral && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><ReferralModal isOpen={showReferral} onClose={() => setShowReferral(false)} /></Suspense>}
      {showEarn && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><EarnModal isOpen={showEarn} onClose={() => setShowEarn(false)} /></Suspense>}
      {showDepositUSD && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><DepositMethodModal isOpen={showDepositUSD} onClose={() => setShowDepositUSD(false)} /></Suspense>}
      {showMore && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><MoreModal isOpen={showMore} onClose={() => setShowMore(false)} /></Suspense>}
      {showPay && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><PayModal isOpen={showPay} onClose={() => setShowPay(false)} /></Suspense>}
      {showRewards && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><RewardsModal isOpen={showRewards} onClose={() => setShowRewards(false)} /></Suspense>}
      {showP2P && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><P2PModal isOpen={showP2P} onClose={() => setShowP2P(false)} /></Suspense>}

      <CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      <FuturesCampaignModal isOpen={showFuturesCampaign} onClose={() => setShowFuturesCampaign(false)} />
      <LaunchpoolModal isOpen={showLaunchpool} onClose={() => setShowLaunchpool(false)} />

      {/* Social Feed FAB - yalnızca social feed görünürken çıkar, createPortal ile sabit konumda */}
      {createPortal(
        <>
          {showFAB && (
            <button
              onClick={() => setShowCreateMenu(true)}
              style={{
                position: 'fixed',
                bottom: '72px',
                right: '18px',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#F0B90B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus style={{ width: 26, height: 26, color: '#000', strokeWidth: 2 }} />
            </button>
          )}

          {showCreateMenu && (
            <div
              onClick={() => setShowCreateMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#1E2026', borderRadius: '20px 20px 0 0', padding: '20px 16px 36px' }}
              >
                <div
                  onClick={() => {
                    setShowCreateMenu(false);
                    window.history.pushState(null, '', '#social-profile');
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {myProfile?.avatar_url ? (
                      <img
                        src={myProfile.avatar_url}
                        alt="profile"
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #F0B90B' }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#F0B90B,#E8831D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#000', fontWeight: 900, fontSize: 16 }}>
                          {myProfile?.username ? myProfile.username[0].toUpperCase() : 'B'}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                        {myProfile?.username || 'My Profile'}
                      </span>
                      <span style={{ color: '#848E9C', fontSize: 12 }}>View your profile →</span>
                    </div>
                  </div>
                  <button
                    onClick={e => e.stopPropagation()}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: '#2B3139', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                  >
                    <Bell style={{ width: 18, height: 18, color: '#aaa' }} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {([{ icon: PenLine, label: 'Post' }, { icon: FileText, label: 'Article' }, { icon: Video, label: 'Video' }] as const).map(({ icon: Icon, label }) => (
                    <button key={label} style={{ background: '#2B3139', border: 'none', borderRadius: 16, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#3A3F4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon style={{ width: 22, height: 22, color: '#F0B90B' }} />
                      </div>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {([{ icon: LayoutDashboard, label: 'Creator Center' }, { icon: Pencil, label: 'CreatorPad' }] as const).map(({ icon: Icon, label }) => (
                    <button key={label} style={{ background: '#2B3139', border: 'none', borderRadius: 16, padding: '14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
                      <Icon style={{ width: 20, height: 20, color: '#aaa' }} />
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}

      <MenuDrawer
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        onOpenDeposit={() => setShowDepositUSD(true)}
        onOpenReferral={() => setShowReferral(true)}
        onOpenEarn={() => setShowEarn(true)}
        onOpenAlphaEvents={() => setShowAlphaEvents(true)}
        onOpenP2P={() => setShowP2P(true)}
        onOpenPay={() => setShowPay(true)}
      />
    </div>
  );
}
