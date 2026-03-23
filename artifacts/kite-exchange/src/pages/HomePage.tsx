import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { Menu, Headphones, Shield, X, Gift, Zap, TrendingUp, Star, Users } from 'lucide-react';
import HomeMarketList from '../components/HomeMarketList';
import FuturesMarketList from '../components/FuturesMarketList';
import NewListingSection from '../components/NewListingSection';
import MenuDrawer from '../components/MenuDrawer';
import FuturesCampaignModal from '../components/FuturesCampaignModal';
import LaunchpoolModal from '../components/LaunchpoolModal';
import CampaignDetailModal, { type CampaignDetailData } from '../components/CampaignDetailModal';
import { supabase } from '../lib/supabase';

const SocialFeed = lazy(() => import('../components/SocialFeed'));
const BasonceAlpha = lazy(() => import('../components/BasonceAlpha'));
const SupportModal = lazy(() => import('../components/SupportModal'));
const AlphaEventsModal = lazy(() => import('../components/AlphaEventsModal'));
const ReferralModal = lazy(() => import('../components/ReferralModal'));
const EarnModal = lazy(() => import('../components/EarnModal'));
const DepositUSDModal = lazy(() => import('../components/DepositUSDModal'));
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
  const [activeTab, setActiveTab] = useState<'crypto' | 'spot' | 'futures' | 'new-listing'>('crypto');
  const [activeFilter, setActiveFilter] = useState<'gainers' | 'losers' | '24h-vol' | 'alpha'>('gainers');
  const [discoverTab, setDiscoverTab] = useState<'discover' | 'following' | 'campaign' | 'announcement'>('discover');
  const [mainTab, setMainTab] = useState<'exchange' | 'wallet'>('exchange');
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
      const { data: { user } } = await supabase.auth.getUser();
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
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <line x1="14" y1="4" x2="14" y2="19" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <polyline points="8,14 14,20 20,14" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="5" y1="24" x2="23" y2="24" stroke="#F0B90B" strokeWidth="2" strokeLinecap="round"/>
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
      <div className="bg-[#181A20] px-4 pt-8 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowMenuDrawer(true)}
            className="p-2 hover:bg-[#2B3139] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-300" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSupportModal(true)}
              className="p-2 hover:bg-[#2B3139] rounded-lg transition-colors"
            >
              <Headphones className="w-5 h-5 text-[#F0B90B]" />
            </button>
            <button className="p-2 rounded-lg transition-colors text-green-500 hover:text-green-400">
              <Shield className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex rounded-xl overflow-hidden mb-4" style={{ background: '#0B0E11' }}>
          <button
            onClick={() => setMainTab('exchange')}
            className={`flex-1 py-2.5 text-sm font-bold transition-all ${mainTab === 'exchange' ? 'bg-[#F0B90B] text-black rounded-xl' : 'text-gray-500'}`}
          >
            Exchange
          </button>
          <button
            onClick={() => setMainTab('wallet')}
            className={`flex-1 py-2.5 text-sm font-bold transition-all ${mainTab === 'wallet' ? 'bg-[#F0B90B] text-black rounded-xl' : 'text-gray-500'}`}
          >
            Wallet
          </button>
        </div>

      </div>

      <div className="bg-[#181A20] px-4 pb-4">
        <div className="flex items-center justify-around mb-2">
          {quickActions.map(({ icon, label, onClick }) => (
            <button key={label} onClick={onClick} className="flex flex-col items-center gap-1.5 group">
              <div className="w-12 h-12 bg-[#2B3139] rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-[#363C45]">
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
              <div className="mx-4 mt-3 mb-1 bg-[#1E2329] rounded-2xl px-4 pt-3 pb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
                  <svg viewBox="0 0 100 100" fill="none">
                    <line x1="80" y1="0" x2="0" y2="80" stroke="white" strokeWidth="12"/>
                    <line x1="100" y1="20" x2="20" y2="100" stroke="white" strokeWidth="12"/>
                  </svg>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#848E9C] text-[13px] font-medium">{slide.title}</span>
                  <button onClick={() => setShowPromoBanner(false)} className="text-[#848E9C] hover:text-gray-300 p-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">{slide.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-[15px] leading-snug">{slide.content}</div>
                    {slideParticipants && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-2.5 h-2.5 text-[#848E9C]" />
                        <span className="text-[#848E9C] text-[10px] font-semibold">{fmtParts(slideParticipants)} joined</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={slide.btnAction}
                    className="flex-shrink-0 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold text-[13px] px-4 py-2 rounded-lg active:scale-95 transition-all"
                  >
                    {slide.btnLabel}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-3">
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
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as typeof activeTab);
                    if (activeFilter === 'alpha') setActiveFilter('gainers');
                  }}
                  className={`relative text-[16px] font-bold whitespace-nowrap pb-1.5 transition-all flex items-center gap-1.5 ${ activeTab === id ? 'text-white border-b-2 border-[#F0B90B]' : 'text-[#848E9C] hover:text-[#B7BDC6]' }`}
                >
                  {label}
                </button>
              ))}

            </div>

            {activeTab !== 'new-listing' && activeTab !== 'futures' && (
              <div className="flex items-center gap-1.5 mb-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {[
                  { id: 'gainers', label: 'Gainers' },
                  { id: 'losers', label: 'Losers' },
                  { id: '24h-vol', label: '24h Vol' },
                  { id: 'alpha', label: 'Basonce Alpha', special: true },
                ].map(({ id, label, special }) => (
                  <button
                    key={id}
                    onClick={() => setActiveFilter(id as typeof activeFilter)}
                    className={`px-3 py-1 rounded text-[13px] font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                      activeFilter === id
                        ? special ? 'bg-transparent text-[#F0B90B] border border-[#F0B90B]' : 'bg-[#F0B90B] text-[#0B0E11]'
                        : special ? 'bg-transparent text-[#F0B90B] border border-[#F0B90B]/40' : 'bg-transparent text-[#848E9C] hover:text-[#B7BDC6]'
                    }`}
                  >
                    {label}
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
          ) : activeFilter === 'alpha' ? (
            <BasonceAlpha />
          ) : (
            <HomeMarketList activeFilter={activeFilter} marketType={activeTab} />
          )}
          </Suspense>
          </div>

          <div className="bg-[#181A20] mt-4">
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
      {showDepositUSD && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><DepositUSDModal isOpen={showDepositUSD} onClose={() => setShowDepositUSD(false)} /></Suspense>}
      {showMore && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><MoreModal isOpen={showMore} onClose={() => setShowMore(false)} /></Suspense>}
      {showPay && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><PayModal isOpen={showPay} onClose={() => setShowPay(false)} /></Suspense>}
      {showRewards && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><RewardsModal isOpen={showRewards} onClose={() => setShowRewards(false)} /></Suspense>}
      {showP2P && <Suspense fallback={<div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin"/></div>}><P2PModal isOpen={showP2P} onClose={() => setShowP2P(false)} /></Suspense>}

      <CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      <FuturesCampaignModal isOpen={showFuturesCampaign} onClose={() => setShowFuturesCampaign(false)} />
      <LaunchpoolModal isOpen={showLaunchpool} onClose={() => setShowLaunchpool(false)} />

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
