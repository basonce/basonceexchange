import { useState, useEffect, Suspense, lazy } from 'react';
import { Headphones } from 'lucide-react';
import DesktopNav, { DeskTab } from './components/DesktopNav';
import DesktopFooter from './components/DesktopFooter';
import DesktopHome from './pages/DesktopHome';
import DesktopMarkets from './pages/DesktopMarkets';
import DesktopTrade from './pages/DesktopTrade';
import DesktopFutures from './pages/DesktopFutures';
import DesktopMorePage from './pages/DesktopMorePage';
import { MORE_PAGES } from './pages/morePagesData';
import { MORE_PAGE_COMPONENTS } from './pages/more';
import AuthModal from '../components/AuthModal';
import { LanguageProvider } from './i18n/LanguageContext';
import DesktopP2P from './pages/DesktopP2P';

const DesktopAIBot = lazy(() => import('./pages/DesktopAIBot'));
const DesktopMiningPage = lazy(() => import('./pages/DesktopMiningPage'));
const DesktopDex = lazy(() => import('./pages/DesktopDex'));
const DesktopAlpha = lazy(() => import('./pages/DesktopAlpha'));
const DesktopStock = lazy(() => import('./pages/DesktopStock'));
const DesktopCopyTrading = lazy(() => import('./pages/DesktopCopyTrading'));
const DesktopConvert = lazy(() => import('./pages/DesktopConvert'));
const DesktopApiKeys = lazy(() => import('./pages/DesktopApiKeys'));
const DesktopAssets = lazy(() => import('./pages/DesktopAssets'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const GamesSection = lazy(() => import('../components/GamesSection'));
const SocialProfilePage = lazy(() => import('../pages/SocialProfilePage'));
const SupportModal = lazy(() => import('../components/SupportModal'));

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
  stock: 'Stocks & ETFs',
  p2p: 'P2P Trading',
  convert: 'Convert',
  dex: 'DEX',
  alpha: 'Alpha',
  copytrading: 'Copy Trading',
  apikeys: 'API Management',
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
 * Desktop-only Sports wrapper. Renders the EXACT mobile Sports UI (same look
 * the user prefers) inside a wide, web-friendly centered frame so it's more
 * usable on big screens. A hidden goal-sound engine plays only the goal sound
 * on real goals — no other sounds. Mobile is untouched.
 */
function DesktopSports(_props: { title: string; onNavigate: (tab: DeskTab) => void }) {
  return (
    <div className="bg-[#0B0E11] min-h-screen">
      {/* Mobile Sports UI, widened for web — all audio disabled */}
      <div className="w-full max-w-[1760px] mx-auto px-6 py-6">
        <Suspense fallback={<Loader />}><GamesSection /></Suspense>
      </div>
    </div>
  );
}

export default function DesktopApp({ tab, onNavigate, user, onNavigateToAdmin }: DesktopAppProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    const onOpenAuth = (e: any) => setAuthMode(e?.detail?.mode === 'login' ? 'login' : 'register');
    window.addEventListener('open-auth', onOpenAuth);
    return () => window.removeEventListener('open-auth', onOpenAuth);
  }, []);

  const openAuth = (mode: 'login' | 'register') => setAuthMode(mode);
  const onDeposit = () => {
    (window as any).__deskAssetsIntent = 'deposit';
    onNavigate('assets');
    window.dispatchEvent(new CustomEvent('desk-open-deposit'));
  };

  const renderPage = () => {
    // Dedicated desktop layouts
    if (tab === 'home') return <DesktopHome user={user} onNavigate={onNavigate} onAuth={openAuth} onDeposit={onDeposit} />;
    if (tab === 'markets') return <DesktopMarkets onNavigate={onNavigate} />;
    if (tab === 'trade') return <DesktopTrade user={user} onAuth={openAuth} onDeposit={onDeposit} />;
    if (tab === 'futures') return <DesktopFutures user={user} onAuth={openAuth} onDeposit={onDeposit} />;

    // "More" menu landing pages (VIP, Affiliate, Academy, etc.) — desktop only.
    // Each slug has its own bespoke page; fall back to the generic template if missing.
    const BespokeMorePage = MORE_PAGE_COMPONENTS[tab];
    if (BespokeMorePage) return <BespokeMorePage onNavigate={onNavigate} />;
    if (MORE_PAGES[tab]) return <DesktopMorePage slug={tab} onNavigate={onNavigate} />;

    // Functional fallback pages (dedicated desktop layout coming next).
    // These reuse the exact mobile page components so real-money flows are untouched.
    const title = PAGE_LABELS[tab] || 'Basonce';
    switch (tab) {
      case 'aibot':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopAIBot /></Suspense></div>;
      case 'mining':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopMiningPage /></Suspense></div>;
      case 'dex':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopDex user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></Suspense></div>;
      case 'alpha':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopAlpha user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></Suspense></div>;
      case 'p2p':
        return <div className="bg-[#0B0E11] min-h-screen"><DesktopP2P user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></div>;
      case 'stock':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopStock user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></Suspense></div>;
      case 'copytrading':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopCopyTrading user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></Suspense></div>;
      case 'convert':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopConvert user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></Suspense></div>;
      case 'apikeys':
        return <div className="bg-[#0B0E11] min-h-screen"><Suspense fallback={<Loader />}><DesktopApiKeys user={user} onAuth={openAuth} onDeposit={onDeposit} onNavigate={onNavigate} /></Suspense></div>;
      case 'assets':
        return <Suspense fallback={<Loader />}><DesktopAssets onNavigate={onNavigate} /></Suspense>;
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

        {/* Floating support button */}
        <button
          onClick={() => setShowSupport(true)}
          aria-label="Customer support"
          className="fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-full bg-[#F0B90B] hover:bg-[#FCD535] text-black shadow-2xl shadow-black/50 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <Headphones className="w-6 h-6" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0ECB81] border-2 border-[#0B0E11]" />
        </button>

        {showSupport && (
          <Suspense fallback={null}>
            <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />
          </Suspense>
        )}
      </div>
    </LanguageProvider>
  );
}
