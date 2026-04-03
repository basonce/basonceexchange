import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import StableCoinLogo from './CoinLogo';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  logo_url: string | null;
  is_trending: boolean;
}

interface CoinSelectorProps {
  onClose: () => void;
  onSelectCoin: (coin: Coin) => void;
}

const PRIORITY = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'EQ'];

export default function CoinSelector({ onClose, onSelectCoin }: CoinSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCoins, setAllCoins] = useState<Coin[]>([]);
  const [historyCoins, setHistoryCoins] = useState<Coin[]>([]);
  const COIN_CACHE_KEY = 'basonce_coins_cache_v1';
  const [loading, setLoading] = useState(() => {
    try {
      const raw = localStorage.getItem(COIN_CACHE_KEY);
      if (raw) {
        const { ts, coins } = JSON.parse(raw);
        if (Date.now() - ts < 10 * 60 * 1000 && Array.isArray(coins) && coins.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Cache'den anında yükle
    try {
      const raw = localStorage.getItem(COIN_CACHE_KEY);
      if (raw) {
        const { ts, coins } = JSON.parse(raw);
        if (Date.now() - ts < 10 * 60 * 1000 && Array.isArray(coins) && coins.length > 0) {
          setAllCoins(coins);
          setLoading(false);
        }
      }
    } catch {}
    loadCoins();
  }, []);

  const loadCoins = async () => {
    try {
      // Auth ve coins paralel çalışır
      const [user, { data: coins, error }] = await Promise.all([
        getCurrentUser(),
        supabase.from('supported_coins').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      ]);

      if (error) throw error;

      const eqCoin: Coin = {
        id: 'eq-earnquest',
        symbol: 'EQ',
        name: 'EarnQuest',
        logo_url: '/earnquest-logo-icon-2.png',
        is_trending: false,
      };
      const hasEQ = coins?.some(c => c.symbol === 'EQ');
      const finalCoins = hasEQ ? (coins || []) : [eqCoin, ...(coins || [])];
      setAllCoins(finalCoins);
      // 10 dakika cache
      try { localStorage.setItem(COIN_CACHE_KEY, JSON.stringify({ ts: Date.now(), coins: finalCoins })); } catch {}

      if (user) {
        const { data: history } = await supabase
          .from('user_coin_history')
          .select(`coin_id, last_used_at, supported_coins (id, symbol, name, icon_url, is_trending)`)
          .eq('user_id', user.id)
          .order('last_used_at', { ascending: false })
          .limit(5);

        if (history) {
          const list = history.map(h => h.supported_coins).filter(Boolean) as Coin[];
          setHistoryCoins(list);
        }
      }
    } catch (err) {
      console.error('Error loading coins:', err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(() => {
    const priorityCoins = PRIORITY.map(s => allCoins.find(c => c.symbol === s)).filter(Boolean) as Coin[];
    const rest = allCoins.filter(c => !PRIORITY.includes(c.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol));
    return [...priorityCoins, ...rest];
  }, [allCoins]);

  const filtered = useMemo(() => {
    if (!searchQuery) return sorted;
    const q = searchQuery.toLowerCase();
    return allCoins.filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [searchQuery, allCoins, sorted]);

  const sections = useMemo(() => {
    if (searchQuery) return null;
    const priorityCoins = PRIORITY.map(s => allCoins.find(c => c.symbol === s)).filter(Boolean) as Coin[];
    const rest = allCoins.filter(c => !PRIORITY.includes(c.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol));

    const map: Record<string, Coin[]> = {};
    for (const coin of rest) {
      const letter = coin.symbol[0].toUpperCase();
      const key = /[0-9]/.test(letter) ? letter : letter;
      if (!map[key]) map[key] = [];
      map[key].push(coin);
    }

    const result: { key: string; coins: Coin[] }[] = [];
    if (priorityCoins.length) result.push({ key: '__priority__', coins: priorityCoins });
    const sortedKeys = Object.keys(map).sort();
    for (const k of sortedKeys) {
      result.push({ key: k, coins: map[k] });
    }
    return result;
  }, [allCoins, searchQuery]);

  const alphabetIndex = useMemo(() => {
    if (!sections) return [];
    return sections.map(s => s.key === '__priority__' ? '' : s.key).filter(Boolean);
  }, [sections]);

  const scrollToSection = (key: string) => {
    const el = sectionRefs.current[key];
    if (el && listRef.current) {
      listRef.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0b0e11] z-[200] flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-4 gap-3">
        <button onClick={onClose} className="p-1 text-gray-300">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-white">Select Coin</h1>
        <div className="w-7" />
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-[#1e2329] rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Coins"
            className="flex-1 bg-transparent text-white text-[15px] placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {historyCoins.length > 0 && !searchQuery && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {historyCoins.map(coin => (
            <button
              key={coin.id}
              onClick={() => onSelectCoin(coin)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2329] rounded-lg text-sm text-gray-300"
            >
              <div className="w-4 h-4">
                <StableCoinLogo symbol={coin.symbol} dbUrl={coin.logo_url} />
              </div>
              {coin.symbol}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <div ref={listRef} className="flex-1 overflow-y-auto pr-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchQuery ? (
            <div>
              {filtered.length === 0 ? (
                <div className="text-center text-gray-500 py-12 text-sm">No coins found</div>
              ) : filtered.map(coin => (
                <CoinRow key={coin.id} coin={coin} onClick={() => onSelectCoin(coin)} />
              ))}
            </div>
          ) : sections ? (
            <div>
              {sections.map(section => (
                <div
                  key={section.key}
                  ref={el => { sectionRefs.current[section.key] = el; }}
                >
                  {section.key !== '__priority__' && (
                    <div className="px-4 py-1 text-[13px] text-gray-500 font-medium">
                      {section.key}
                    </div>
                  )}
                  {section.coins.map(coin => (
                    <CoinRow key={coin.id} coin={coin} onClick={() => onSelectCoin(coin)} />
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {!searchQuery && alphabetIndex.length > 0 && (
          <div className="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center py-2 w-6">
            {alphabetIndex.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToSection(letter)}
                className="text-[10px] text-gray-500 leading-[1.6] hover:text-[#F0B90B] active:text-[#F0B90B] transition-colors"
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CoinRow({ coin, onClick }: { coin: Coin; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
    >
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-[#1e2329] flex items-center justify-center">
        <StableCoinLogo symbol={coin.symbol} dbUrl={coin.logo_url} />
      </div>
      <div className="flex-1 text-left">
        <div className="text-[15px] font-semibold text-white leading-tight">{coin.symbol}</div>
        <div className="text-[13px] text-gray-500 leading-tight truncate">{coin.name}</div>
      </div>
    </button>
  );
}
