import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';
import { prewarmAllPriceManagers } from './lib/price-init';

prewarmAllPriceManagers();

// Reload at most a few times within a short window when a code chunk fails to
// load (stale/poisoned cache after a deploy). Without this cap a persistently
// failing chunk produces an infinite reload loop -> perpetual loading spinner.
function reloadOnceForChunkError() {
  const KEY = 'chunk_reload_global';
  const now = Date.now();
  let n = 0;
  let last = 0;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); n = p.n || 0; last = p.t || 0; }
  } catch {}
  if (now - last > 30000) n = 0;
  if (n >= 2) return false;
  try { sessionStorage.setItem(KEY, JSON.stringify({ n: n + 1, t: now })); } catch {}
  try {
    if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  } catch {}
  window.location.reload();
  return true;
}

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason || '');
  if (
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically') ||
    msg.includes('dynamically imported module')
  ) {
    e.preventDefault();
    reloadOnceForChunkError();
    return;
  }
  try {
    const logs = JSON.parse(localStorage.getItem('app_error_log') || '[]');
    logs.unshift({ type: 'unhandledrejection', msg, ts: Date.now() });
    localStorage.setItem('app_error_log', JSON.stringify(logs.slice(0, 20)));
  } catch {}
  e.preventDefault();
});

window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically')) {
    reloadOnceForChunkError();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0B0E11',
          color: '#EAECEF',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            width: 64,
            height: 64,
            background: '#F0B90B',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 32
          }}>B</div>
          <h1 style={{ fontSize: 24, marginBottom: 12, color: '#F0B90B' }}>BASONCE Exchange</h1>
          <p style={{ color: '#848E9C', marginBottom: 24 }}>Sayfa yuklenirken bir hata olustu. Lutfen yenileyin.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#F0B90B',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '12px 32px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const loader = document.getElementById('initial-loader');
if (loader) loader.remove();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TonConnectUIProvider manifestUrl="https://basonce.com/tonconnect-manifest.json">
          <App />
        </TonConnectUIProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
