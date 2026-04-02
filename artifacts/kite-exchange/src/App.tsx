import { useState, useEffect, Component, ReactNode, Suspense, lazy } from 'react';
import { supabase } from './lib/supabase';
import { analyticsTracker } from './lib/analytics-tracker';
import { setActivityUserId, trackPageView as trackActivityPage } from './lib/activity-tracker';
import ExchangeModeProvider from './components/ExchangeModeProvider';
import ExchangeModeBanner from './components/ExchangeModeBanner';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import MarketsPage from './pages/MarketsPage';
import TradePage from './pages/TradePage';
import FuturesPage from './pages/FuturesPage';
import MiningPage from './pages/MiningPage';
import AssetsPage from './pages/AssetsPage';
import AIBotPage from './pages/AIBotPage';
import ProfilePage from './pages/ProfilePage';
import SocialProfilePage from './pages/SocialProfilePage';
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

function isChunkLoadError(msg: string) {
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported module')
  );
}

class PageErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; errorMsg: string; reloading: boolean }> {
  constructor(props: { children: ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: '', reloading: false };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, errorMsg: error?.message || 'Bilinmeyen hata' }; }
  componentDidCatch(error: Error) {
    const msg = error?.message || '';
    if (isChunkLoadError(msg)) {
      this.setState({ reloading: true });
      const reloadKey = `chunk_reload_${this.props.name}`;
      const lastReload = parseInt(localStorage.getItem(reloadKey) || '0');
      const now = Date.now();
      if (now - lastReload > 10000) {
        localStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
      return;
    }
    try {
      const logs = JSON.parse(localStorage.getItem('app_error_log') || '[]');
      logs.unshift({ page: this.props.name, msg, ts: Date.now() });
      localStorage.setItem('app_error_log', JSON.stringify(logs.slice(0, 20)));
    } catch {}
  }
  render() {
    if (this.state.reloading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[#848E9C] text-sm">Guncelleniyor...</p>
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-16 h-16 bg-[#F0B90B]/20 rounded-full flex items-center justify-center mb-4">
            <span className="text-[#F0B90B] text-2xl font-bold">!</span>
          </div>
          <p className="text-gray-400 mb-2">Sayfa yuklenirken hata olustu</p>
          <p className="text-[#848E9C] text-xs mb-4 max-w-xs">{this.state.errorMsg}</p>
          <button
            onClick={() => { window.location.reload(); }}
            className="bg-[#F0B90B] text-black px-6 py-2 rounded-lg font-semibold"
          >
            Tekrar Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Page = 'markets' | 'trade' | 'wallet' | 'admin';

const VALID_TABS = new Set(['home', 'markets', 'trade', 'futures', 'aibot', 'mining', 'assets', 'profile', 'social-profile']);

function getTabFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().split('?')[0];
  return VALID_TABS.has(hash) ? hash : 'home';
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('markets');
  const [mobileTab, setMobileTab] = useState(getTabFromHash);
  const [prevTab, setPrevTab] = useState('home');
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [futuresInitialSymbol, setFuturesInitialSymbol] = useState<string | undefined>(undefined);
  useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get('ref');
    if (refCode) {
      sessionStorage.setItem('pending_referral_code', refCode);
    }
  }, []);

  useEffect(() => {
    analyticsTracker.initialize();
    return () => {
      analyticsTracker.cleanup();
    };
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsAdmin(false);
          setUser(null);
          return;
        }

        setUser(session.user);

        const { data, error } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          setIsAdmin(false);
          return;
        }

        if (data) {
          setIsAdmin(data.is_admin || false);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus();
        analyticsTracker.updateUserRegistration(session.user.id);

        if (event === 'SIGNED_IN') {
          setActivityUserId(session.user.id);
          (async () => {
            try {
              // Track login event in user_profiles
              const ua = navigator.userAgent;
              const device = /mobile/i.test(ua) ? 'Mobile' : /tablet|ipad/i.test(ua) ? 'Tablet' : 'Desktop';
              const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other';
              const os = ua.includes('Android') ? 'Android' : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : 'Other';
              await supabase.from('user_profiles').update({
                last_login_at: new Date().toISOString(),
              }).eq('id', session.user.id);
            } catch {}
            try {
              const pendingCode = sessionStorage.getItem('pending_referral_code');
              if (pendingCode) {
                sessionStorage.removeItem('pending_referral_code');
                await supabase.rpc('register_referral', {
                  p_referral_code: pendingCode,
                  p_new_user_id: session.user.id,
                });
              }
            } catch {}
          })();
        }
      } else {
        setIsAdmin(false);
        setActivityUserId(null);
      }
    });

    // Restore user id for activity tracking on reload
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setActivityUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('currentTab', mobileTab);
    analyticsTracker.trackPageView(`/${mobileTab}`);
    trackActivityPage(mobileTab);
    const newHash = `#${mobileTab}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [mobileTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash();
      setMobileTab(prev => {
        if (prev !== tab) setPrevTab(prev);
        return tab;
      });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleNavigateToTrade = async (e: any) => {
      try {
        const coinSymbol = e.detail?.symbol || localStorage.getItem('selectedCoinSymbol');

        if (coinSymbol) {
          const { data: coin } = await supabase
            .from('supported_coins')
            .select('*')
            .eq('symbol', coinSymbol)
            .maybeSingle();

          if (coin) {
            setSelectedCrypto(coin);
          }
        }
      } catch {
      }
      setPrevTab(prev => prev !== 'trade' ? prev : 'markets');
      setMobileTab('trade');
    };

    window.addEventListener('navigate-to-trade', handleNavigateToTrade);
    return () => window.removeEventListener('navigate-to-trade', handleNavigateToTrade);
  }, []);

  useEffect(() => {
    const handleNavigateToFutures = (e: any) => {
      const symbol = e.detail?.symbol;
      if (symbol) {
        const normalized = symbol.endsWith('USDT') ? symbol : symbol + 'USDT';
        setFuturesInitialSymbol(normalized);
      }
      setPrevTab(prev => prev !== 'futures' ? prev : 'markets');
      setMobileTab('futures');
    };

    window.addEventListener('navigate-to-futures', handleNavigateToFutures);
    return () => window.removeEventListener('navigate-to-futures', handleNavigateToFutures);
  }, []);

  const handleNavigate = (page: Page) => {
    if (page === 'admin' && !isAdmin) {
      alert('Erişim reddedildi. Admin yetkisi gerekli.');
      return;
    }
    setCurrentPage(page);
    if (page !== 'trade') {
      setSelectedCrypto(null);
    }
  };

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      home: 'BASONCE Exchange - Kripto Para Borsasi | Bitcoin, Ethereum Al Sat',
      markets: 'Piyasalar | BASONCE Exchange - Kripto Para Borsasi',
      trade: 'Spot Trading | BASONCE Exchange - Kripto Para Borsasi',
      futures: 'Vadeli Islem | BASONCE Exchange - Kripto Para Borsasi',
      aibot: 'AI Trading Bot | BASONCE Exchange - Kripto Para Borsasi',
      mining: 'Mining | BASONCE Exchange - Kripto Para Borsasi',
      assets: 'Varliklar | BASONCE Exchange - Kripto Para Borsasi',
      profile: 'Profil | BASONCE Exchange - Kripto Para Borsasi',
    };
    document.title = pageTitles[mobileTab] || pageTitles.home;
  }, [mobileTab]);

  if (currentPage === 'admin' && isAdmin) {
    return (
      <ExchangeModeProvider>
        <div className="min-h-screen bg-[#181A20] flex justify-center">
          <div className="w-full max-w-[428px]">
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0B0E11]"><div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminDashboard onBack={() => setCurrentPage('markets')} />
            </Suspense>
          </div>
        </div>
      </ExchangeModeProvider>
    );
  }

  const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0E11]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#848E9C] text-sm">Yukleniyor...</span>
      </div>
    </div>
  );

  return (
    <ExchangeModeProvider>
      <ExchangeModeBanner />
      <div className="min-h-screen bg-[#181A20] flex justify-center">
        <div className="w-full max-w-[428px] relative">
          <main
            role="main"
            style={{ paddingBottom: mobileTab === 'social-profile' ? 0 : 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
          >
            {mobileTab === 'home' && <PageErrorBoundary name="home"><HomePage /></PageErrorBoundary>}
            {mobileTab === 'markets' && <PageErrorBoundary name="markets"><MarketsPage /></PageErrorBoundary>}
            {mobileTab === 'trade' && <PageErrorBoundary name="trade"><TradePage onBack={() => { setMobileTab(prevTab !== 'trade' ? prevTab : 'markets'); }} /></PageErrorBoundary>}
            {mobileTab === 'futures' && <PageErrorBoundary name="futures"><FuturesPage initialSymbol={futuresInitialSymbol} /></PageErrorBoundary>}
            {mobileTab === 'aibot' && <PageErrorBoundary name="aibot"><AIBotPage /></PageErrorBoundary>}
            {mobileTab === 'mining' && <PageErrorBoundary name="mining"><MiningPage /></PageErrorBoundary>}
            {mobileTab === 'assets' && <PageErrorBoundary name="assets"><AssetsPage /></PageErrorBoundary>}
            {mobileTab === 'profile' && (
              <PageErrorBoundary name="profile">
                <ProfilePage
                  onNavigateToAdmin={() => handleNavigate('admin')}
                  onBack={() => setMobileTab(prevTab !== 'profile' ? prevTab : 'home')}
                />
              </PageErrorBoundary>
            )}
            {mobileTab === 'social-profile' && (
              <PageErrorBoundary name="social-profile">
                <SocialProfilePage
                  onBack={() => {
                    const back = prevTab !== 'social-profile' ? prevTab : 'home';
                    setMobileTab(back);
                  }}
                />
              </PageErrorBoundary>
            )}
          </main>

          {mobileTab !== 'social-profile' && (
            <BottomNav activeTab={mobileTab} onTabChange={(tab) => { setPrevTab(mobileTab); setMobileTab(tab); }} />
          )}
        </div>
      </div>
    </ExchangeModeProvider>
  );
}

export default App;
