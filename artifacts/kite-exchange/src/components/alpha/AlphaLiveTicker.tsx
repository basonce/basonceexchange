import { useState, useEffect } from 'react';
import type { AlphaToken, AlphaTransaction } from '../../types/alpha';
import { fetchRecentTransactions, generateFakeTransaction } from '../../lib/alpha-service';
import { supabase } from '../../lib/supabase';

const GRADIENT_COLORS = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#627EEA', '#00D1FF', '#FF6B35'];

function TokenLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const idx = symbol.charCodeAt(0) % GRADIENT_COLORS.length;
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[idx]}, ${GRADIENT_COLORS[(idx + 2) % GRADIENT_COLORS.length]})` }}
    >
      <span className="text-white text-[7px] font-black absolute">{symbol.slice(0, 2)}</span>
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="w-full h-full object-cover absolute inset-0 z-10"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
  );
}

interface Props {
  tokens: AlphaToken[];
}

export default function AlphaLiveTicker({ tokens }: Props) {
  const [transactions, setTransactions] = useState<AlphaTransaction[]>([]);

  useEffect(() => {
    fetchRecentTransactions(30).then(data => {
      setTransactions(data);
    }).catch(() => {});

    const channel = supabase
      .channel('alpha-ticker-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alpha_transactions' },
        payload => {
          const tx = payload.new as AlphaTransaction;
          setTransactions(prev => [tx, ...prev].slice(0, 60));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (tokens.length === 0) return;
    const interval = setInterval(() => {
      const fake = generateFakeTransaction(tokens);
      setTransactions(prev => [fake, ...prev].slice(0, 60));
    }, 2500 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [tokens]);

  const tokenLogoMap: Record<string, string | null> = {};
  tokens.forEach(t => { tokenLogoMap[t.symbol] = t.logo_url; });

  if (transactions.length === 0) return null;

  const doubled = [...transactions, ...transactions];

  return (
    <div className="relative overflow-hidden bg-[#0B0E11] border-b border-[#2B3139]/50">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0B0E11] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0B0E11] to-transparent z-10 pointer-events-none" />
      <div
        className="flex items-center gap-4 py-2 px-4 ticker-scroll"
        style={{
          animation: `ticker-scroll ${Math.max(transactions.length * 3, 20)}s linear infinite`,
          width: 'max-content',
        }}
      >
        {doubled.map((tx, idx) => (
          <div key={`${tx.id}-${idx}`} className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.tx_type === 'buy' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
            <TokenLogo symbol={tx.token_symbol} logoUrl={tokenLogoMap[tx.token_symbol]} />
            <span className="text-gray-500 text-[11px] font-mono">{tx.wallet_address}</span>
            <span className={`text-[11px] font-bold ${tx.tx_type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {tx.tx_type === 'buy' ? 'Bought' : 'Sold'}
            </span>
            <span className="text-white text-[11px] font-bold">
              {typeof tx.total_value === 'number' ? tx.total_value.toFixed(2) : tx.total_value} {tx.raised_token}
            </span>
            <span className="text-[#F0B90B] text-[11px] font-bold">{tx.token_symbol}</span>
            <span className="text-[#2B3139] text-[10px]">|</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
