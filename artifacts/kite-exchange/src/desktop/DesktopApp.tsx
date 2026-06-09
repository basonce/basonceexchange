import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import DesktopNav, { DeskTab } from './components/DesktopNav';
import DesktopFooter from './components/DesktopFooter';
import DesktopHome from './pages/DesktopHome';
import DesktopMarkets from './pages/DesktopMarkets';
import DesktopTrade from './pages/DesktopTrade';
import DesktopFutures from './pages/DesktopFutures';
import DesktopMorePage from './pages/DesktopMorePage';
import DesktopSportsFx from './components/DesktopSportsFx';
import { MORE_PAGES } from './pages/morePagesData';
import AuthModal from '../components/AuthModal';
import { LanguageProvider } from './i18n/LanguageContext';

const AIBotPage = lazy(() => import('../pages/AIBotPage'));
const MiningPage = lazy(() => import('../pages/MiningPage'));
const AssetsPage = lazy(() => import('../pages/AssetsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const GamesSection = lazy(() => import('../components/GamesSection'));
const SocialProfilePage = lazy(() => import('../pages/SocialProfilePage'));

interface DesktopAppProps {
  tab: string;
  onNavigate: (tab: DeskTab) => void;
  user: any;
  onNavigateToAdmin: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  trade: 'Spot Trading',
  futures: 'Futures',
  aibot: 'AI Trading Bot',
  mining: 'Mining',
  assets: 'Assets',
  profile: 'Profile',
  sports: 'Alpha Sports',
};

/**
 * Centered frame for pages whose dedicated desktop layout is not built yet.
 * Keeps full mobile functionality working on desktop with no errors.
 */
function FramedPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <h1 className="text-white font-bold text-2xl mb-6">{title}</h1>
        <div className="flex justify-center">
          <div className="w-full max-w-[480px] bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const Loader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Desktop-only Sports wrapper. Renders the mobile HomePage with the Sports
 * sheet auto-opened. When the user closes that sheet (the `.sports-modal-sheet`
 * element is removed from the DOM), navigate back to the desktop home instead
 * of showing the framed mobile home. Pure desktop code — mobile is untouched.
 */
function DesktopSports(_props: { title: string; onNavigate: (tab: DeskTab) => void }) {
  return (
    <div className="fx-stadium min-h-screen relative">
      <div className="fx-pitch-stripes absolute inset-0 pointer-events-none" />

      {/* Broadcast header */}
      <div className="relative max-w-[1600px] mx-auto px-6 pt-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F6465D]/15 border border-[#F6465D]/40 text-[#F6465D] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#F6465D] animate-pulse" /> Live
          </span>
          <h1 className="text-white font-extrabold text-3xl tracking-tight">Alpha Sports</h1>
        </div>
        <p className="text-[#848E9C] text-sm mt-2">
          Real-time match action with stadium sound — goals roar, the whistle blows. Place your bets as it happens.
        </p>
      </div>

      {/* Sound engine + live ticker + event banners (desktop only) */}
      <div className="relative max-w-[1600px] mx-auto px-6 mt-5">
        <div className="rounded-2xl overflow-hidden border border-[#2B3139]">
          <DesktopSportsFx />
        </div>
      </div>

      {/* Functional betting experience */}
      <div className="relative max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex justify-center">
          <div className="w-full max-w-[560px] bg-[#0B0E11]/80 backdrop-blur border border-[#2B3139] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <Suspense fallback={<Loader />}><GamesSection /></Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesktopApp({ tab, onNavigate, user, onNavigateToAdmin }: DesktopAppProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);

  useEffect(() => {
    const onOpenAuth = (e: any) => setAuthMode(e?.detail?.mode === 'login' ? 'login' : 'register');
    window.addEventListener('open-auth', onOpenAuth);
    return () => window.removeEventListener('open-auth', onOpenAuth);
  }, []);

  const openAuth = (mode: 'login' | 'register') => setAuthMode(mode);
  const onDeposit = () => onNavigate('assets');

  const renderPage = () => {
    // Dedicated desktop layouts
    if (tab === 'home') return <DesktopHome user={user} onNavigate={onNavigate} onAuth={openAuth} onDeposit={onDeposit} />;
    if (tab === 'markets') return <DesktopMarkets onNavigate={onNavigate} />;
    if (tab === 'trade') return <DesktopTrade user={user} onAuth={openAuth} onDeposit={onDeposit} />;
    if (tab === 'futures') return <DesktopFutures user={user} onAuth={openAuth} onDeposit={onDeposit} />;

    // "More" menu landing pages (VIP, Affiliate, Academy, etc.) — desktop only.
    if (MORE_PAGES[tab]) return <DesktopMorePage slug={tab} onNavigate={onNavigate} />;

    // Functional fallback pages (dedicated desktop layout coming next).
    // These reuse the exact mobile page components so real-money flows are untouched.
    const title = PAGE_LABELS[tab] || 'Basonce';
    switch (tab) {
      case 'aibot':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><AIBotPage /></Suspense></FramedPage>;
      case 'mining':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><MiningPage /></Suspense></FramedPage>;
      case 'assets':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><AssetsPage /></Suspense></FramedPage>;
      case 'sports':
        return <DesktopSports title={title} onNavigate={onNavigate} />;
      case 'profile':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><ProfilePage onNavigateToAdmin={onNavigateToAdmin} onBack={() => onNavigate('home')} /></Suspense></FramedPage>;
      case 'social-profile':
        return <FramedPage title="Social Profile"><Suspense fallback={<Loader />}><SocialProfilePage onBack={() => onNavigate('profile')} /></Suspense></FramedPage>;
      default:
        return <DesktopHome user={user} onNavigate={onNavigate} onAuth={openAuth} onDeposit={onDeposit} />;
    }
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-[#0B0E11] flex flex-col">
        <DesktopNav tab={tab} onNavigate={onNavigate} user={user} onAuth={openAuth} onDeposit={onDeposit} />
        <main className="flex-1">{renderPage()}</main>
        <DesktopFooter onNavigate={onNavigate} />
        <AuthModal
          isOpen={authMode !== null}
          onClose={() => setAuthMode(null)}
          mode={authMode || 'register'}
        />
      </div>
    </LanguageProvider>
  );
}
