import { useState, useEffect, Component, ReactNode, Suspense, lazy } from 'react';
import { supabase } from './lib/supabase';
import { analyticsTracker } from './lib/analytics-tracker';
import { setActivityUserId, trackPageView as trackActivityPage, initGlobalTracking, destroyGlobalTracking } from './lib/activity-tracker';
import { initAnonTracker, stopAnonTracker, setTrackerIdentity } from './lib/anonymous-tracker';
import { fireDepositConversion } from './lib/google-ads';
import ExchangeModeProvider from './components/ExchangeModeProvider';
import ExchangeModeBanner from './components/ExchangeModeBanner';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import MarketsPage from './pages/MarketsPage';
import TradePage from './pages/TradePage';
import FuturesPage from './pages/FuturesPage';
import MiningPage from './pages/MiningPage';
import MinerMiniAppPage from './pages/MinerMiniAppPage';
import AssetsPage from './pages/AssetsPage';
import AIBotPage from './pages/AIBotPage';
import ProfilePage from './pages/ProfilePage';
import SocialProfilePage from './pages/SocialProfilePage';
import ResetPasswordModal from './components/ResetPasswordModal';
import WelcomeChest from './components/WelcomeChest';
import { useIsDesktop } from './hooks/use-desktop';
import { MORE_PAGES } from './desktop/pages/morePagesData';
import { MORE_PAGE_COMPONENTS } from './desktop/pages/more';
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const DesktopApp = lazy(() => import('./desktop/DesktopApp'));

// ── Güvenlik: Admin paneline erişebilecek UUID listesi ──────
// is_admin flag'i ne olursa olsun, UUID bu listede değilse admin erişimi verilmez
const ADMIN_UUIDS = new Set([
  '88292f59-898a-4fef-a1c8-8813d7b60b61',
]);

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
      const reloadKey = `chunk_reload_${this.props.name}`;
      const now = Date.now();
      let count = 0;
      let last = 0;
      try {
        const raw = sessionStorage.getItem(reloadKey);
        if (raw) { const p = JSON.parse(raw); count = p.n || 0; last = p.t || 0; }
      } catch {}
      // Reset the attempt window once the failures stop for a while.
      if (now - last > 30000) count = 0;
      // After repeated failures, stop reloading and show an actionable error UI
      // instead of looping forever on the spinner.
      if (count >= 2) {
        this.setState({ hasError: true, reloading: false });
        return;
      }
      try { sessionStorage.setItem(reloadKey, JSON.stringify({ n: count + 1, t: now })); } catch {}
      this.setState({ reloading: true });
      // Best-effort: clear caches + unregister SW so the next load fetches fresh assets
      try {
        if ('caches' in window) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations()
            .then(regs => regs.forEach(r => r.unregister()))
            .catch(() => {});
        }
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', String(now));
      window.location.replace(url.toString());
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

const VALID_TABS = new Set(['home', 'sports', 'markets', 'trade', 'futures', 'aibot', 'mining', 'assets', 'profile', 'social-profile', 'miner', 'stock', 'p2p', 'convert', 'dex', 'alpha', 'copytrading', 'apikeys']);

// Desktop-only "More" landing pages (VIP, Affiliate, Academy, NFT, …) are
// intentionally kept out of VALID_TABS so a mobile deep-link to one of them
// falls back to home instead of rendering a blank mobile screen. On desktop we
// still want them to be directly linkable/refreshable, so we allow the slug only
// when the viewport is desktop-width.
const DESKTOP_BREAKPOINT = 1024;
function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT;
}

function getTabFromHash(): string {
  const rawHash = window.location.hash;
  // Telegram Mini App: detect via hash containing tgWebApp params OR the flag set in index.html
  const inTelegram =
    (window as any).__IS_TELEGRAM_MINIAPP__ === true ||
    rawHash.indexOf('tgWebApp') !== -1 ||
    !!(window as any).Telegram?.WebApp?.initData;
  if (inTelegram) return 'miner';
  // Path-based route, e.g. https://basonce.com/miner — works in Safari/Chrome
  const isMore = (slug: string) => !!MORE_PAGES[slug] || !!MORE_PAGE_COMPONENTS[slug];
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (path && VALID_TABS.has(path)) return path;
  if (path && isMore(path) && isDesktopViewport()) return path;
  const hash = rawHash.replace(/^#\/?/, '').toLowerCase().split('?')[0];
  if (VALID_TABS.has(hash)) return hash;
  if (hash && isMore(hash) && isDesktopViewport()) return hash;
  return 'home';
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('markets');
  const [mobileTab, setMobileTab] = useState(getTabFromHash);
  const [prevTab, setPrevTab] = useState('home');
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [futuresInitialSymbol, setFuturesInitialSymbol] = useState<string | undefined>(undefined);
  const isDesktop = useIsDesktop();
  useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get('ref');
    if (refCode) {
      sessionStorage.setItem('pending_referral_code', refCode);
    }
  }, []);

  useEffect(() => {
    analyticsTracker.initialize();
    initGlobalTracking();
    return () => {
      analyticsTracker.cleanup();
      destroyGlobalTracking();
    };
  }, []);

  // 💳 KART ÖDEMESİ TAKİBİ — son 1 saat içinde "Card Payment Started" varsa,
  // sayfada olduğu sürece her 60sn'de bir TRC20 deposit scanner'ını tetikle.
  // Scanner yeni deposit yakalarsa zaten Telegram'a otomatik alert gönderir.
  useEffect(() => {
    const apiBase = window.location.hostname.includes('basonce.com')
      ? 'https://basonce.com/api'
      : '/api';
    const triggerScan = () => {
      try {
        const pending = JSON.parse(localStorage.getItem('basonce_pending_card_payments') || '[]');
        // Son 1 saatte gerçekleşmiş ödeme var mı?
        const fresh = pending.filter((p: any) => Date.now() - p.startedAt < 3600_000);
        if (fresh.length === 0) {
          if (pending.length > 0) localStorage.setItem('basonce_pending_card_payments', JSON.stringify([]));
          return;
        }
        // Listeyi temizle (sadece taze olanlar kalsın)
        if (fresh.length !== pending.length) {
          localStorage.setItem('basonce_pending_card_payments', JSON.stringify(fresh));
        }
        // TRC20 scanner'ı tetikle (fire-and-forget)
        fetch(`${apiBase}/scan-deposits-trx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 12, offset: 0 }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };
    // Sayfa açılır açılmaz bir kez tetikle, sonra her 60 saniyede
    triggerScan();
    const interval = setInterval(triggerScan, 60_000);
    return () => clearInterval(interval);
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
          // Çift kontrol: hem DB'de is_admin=true hem de UUID izin listesinde olmalı
          setIsAdmin((data.is_admin === true) && ADMIN_UUIDS.has(session.user.id));
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();

    // Start anon tracker for visitors before session resolves
    initAnonTracker(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Email + UID'yi tracker'a yapıştır → bildirimlerde kim olduğu görünür
        setTrackerIdentity(session.user.email, session.user.id);
        // Tracker'ı durdurmuyoruz: giriş yapmış kullanıcıların tıkları da bildirimlerde gözüksün
        checkAdminStatus();
        analyticsTracker.updateUserRegistration(session.user.id);

        if (event === 'SIGNED_IN') {
          setActivityUserId(session.user.id);
          (window as any).__currentUserEmail = session.user.email || '';
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
            // Auto-assign BSC + TRC wallet if user doesn't have one
            try {
              const apiBase = /replit\.dev|localhost/.test(window.location.host) ? 'https://basonce.com/api' : '/api';
              fetch(`${apiBase}/assign-wallet-self`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-requester-id': session.user.id },
                body: '{}',
              }).catch(() => {});
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
        initAnonTracker(false);
      }
    });

    // Restore user id for activity tracking on reload
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setActivityUserId(session.user.id);
        // Tracker'a kimlik yapıştır — bildirimlerde email görünür
        setTrackerIdentity(session.user.email, session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Google Ads — "Para Yatırma" dönüşümü: kullanıcı sitedeyken gerçek bir
  // kripto yatırma onaylandığında (NOWPayments IPN, user_balances'a NOWPAY_*
  // sentinel satırı INSERT eder) yatırılan tutarla dönüşüm tetiklenir.
  useEffect(() => {
    if (!user?.id) return;
    const fired = new Set<string>();
    const channel = supabase
      .channel(`deposit-conv-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload?.new;
          const symbol: string = row?.symbol || '';
          if (!symbol.startsWith('NOWPAY_')) return;
          if (fired.has(symbol)) return;
          fired.add(symbol);
          const amount = Number(row?.balance) || 0;
          fireDepositConversion(amount);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem('currentTab', mobileTab);
    analyticsTracker.trackPageView(`/${mobileTab}`);
    trackActivityPage(mobileTab);
    // Telegram Mini App: do NOT touch the hash — Telegram stores tgWebAppData there.
    // Overwriting it (#miner) wipes Telegram's session data and causes the Mini App to restart in a loop.
    const inTelegram =
      (window as any).__IS_TELEGRAM_MINIAPP__ === true ||
      window.location.hash.indexOf('tgWebApp') !== -1 ||
      !!(window as any).Telegram?.WebApp?.initData;
    if (!inTelegram) {
      const newHash = `#${mobileTab}`;
      if (window.location.hash !== newHash) {
        window.history.pushState({ tab: mobileTab }, '', newHash);
      }
    }
  }, [mobileTab]);

  // Sync state back when user uses browser/OS back/forward buttons
  useEffect(() => {
    const onPop = () => {
      const t = getTabFromHash();
      setMobileTab(prev => (prev === t ? prev : t));
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
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
      sports: 'Alpha Sports | BASONCE Exchange - Canli Spor Bahis',
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

  if (mobileTab === 'miner') {
    return <MinerMiniAppPage />;
  }

  // ── DESKTOP (>=1024px): completely separate Binance-style layout. ──
  // The mobile render path below is intentionally left byte-for-byte untouched.
  if (isDesktop) {
    return (
      <ExchangeModeProvider>
        <Suspense fallback={<PageLoader />}>
          <DesktopApp
            tab={mobileTab}
            onNavigate={(t) => {
              setPrevTab(mobileTab);
              if (t !== 'trade') setSelectedCrypto(null);
              setMobileTab(t);
            }}
            user={user}
            onNavigateToAdmin={() => handleNavigate('admin')}
          />
        </Suspense>
        <ResetPasswordModal />
      </ExchangeModeProvider>
    );
  }

  return (
    <ExchangeModeProvider>
      <ExchangeModeBanner />
      <div className="min-h-screen bg-[#181A20] flex justify-center">
        <div className="w-full max-w-[428px] relative">
          <main
            role="main"
            style={{ paddingBottom: mobileTab === 'social-profile' ? 0 : 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
          >
            {(mobileTab === 'home' || mobileTab === 'sports') && <PageErrorBoundary name="home"><HomePage autoOpenSports={mobileTab === 'sports'} /></PageErrorBoundary>}
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
      <ResetPasswordModal />
      <div className="fixed inset-x-0 top-0 z-[60] mx-auto max-w-[480px] pointer-events-none">
        <div className="pointer-events-auto">
          <WelcomeChest />
        </div>
      </div>
    </ExchangeModeProvider>
  );
}

export default App;
