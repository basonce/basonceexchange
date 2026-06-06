import { useState, useEffect, Suspense, lazy } from 'react';
import DesktopNav, { DeskTab } from './components/DesktopNav';
import DesktopFooter from './components/DesktopFooter';
import DesktopHome from './pages/DesktopHome';
import DesktopMarkets from './pages/DesktopMarkets';
import AuthModal from '../components/AuthModal';

const TradePage = lazy(() => import('../pages/TradePage'));
const FuturesPage = lazy(() => import('../pages/FuturesPage'));
const AIBotPage = lazy(() => import('../pages/AIBotPage'));
const MiningPage = lazy(() => import('../pages/MiningPage'));
const AssetsPage = lazy(() => import('../pages/AssetsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const HomePage = lazy(() => import('../pages/HomePage'));
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

    // Functional fallback pages (dedicated desktop layout coming next).
    // These reuse the exact mobile page components so real-money flows are untouched.
    const title = PAGE_LABELS[tab] || 'Basonce';
    switch (tab) {
      case 'trade':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><TradePage onBack={() => onNavigate('markets')} /></Suspense></FramedPage>;
      case 'futures':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><FuturesPage /></Suspense></FramedPage>;
      case 'aibot':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><AIBotPage /></Suspense></FramedPage>;
      case 'mining':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><MiningPage /></Suspense></FramedPage>;
      case 'assets':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><AssetsPage /></Suspense></FramedPage>;
      case 'sports':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><HomePage autoOpenSports /></Suspense></FramedPage>;
      case 'profile':
        return <FramedPage title={title}><Suspense fallback={<Loader />}><ProfilePage onNavigateToAdmin={onNavigateToAdmin} onBack={() => onNavigate('home')} /></Suspense></FramedPage>;
      case 'social-profile':
        return <FramedPage title="Social Profile"><Suspense fallback={<Loader />}><SocialProfilePage onBack={() => onNavigate('profile')} /></Suspense></FramedPage>;
      default:
        return <DesktopHome user={user} onNavigate={onNavigate} onAuth={openAuth} onDeposit={onDeposit} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <DesktopNav tab={tab} onNavigate={onNavigate} user={user} onAuth={openAuth} onDeposit={onDeposit} />
      <main className="flex-1">{renderPage()}</main>
      <DesktopFooter />
      <AuthModal
        isOpen={authMode !== null}
        onClose={() => setAuthMode(null)}
        mode={authMode || 'register'}
      />
    </div>
  );
}
