import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { prewarmAllPriceManagers } from './lib/price-init';

prewarmAllPriceManagers();

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason || '');
  if (
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically') ||
    msg.includes('dynamically imported module')
  ) {
    e.preventDefault();
    window.location.reload();
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
    window.location.reload();
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
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
