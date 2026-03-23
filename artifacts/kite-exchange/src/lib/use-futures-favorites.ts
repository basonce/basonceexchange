import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

const LS_KEY = 'futures_favorites_v2';
const LS_TRADFI_KEY = 'tradfi_favorites_v2';

function loadFromLS(): { symbols: string[]; tradfi: string[] } {
  try {
    const sym = localStorage.getItem(LS_KEY);
    const tradfi = localStorage.getItem(LS_TRADFI_KEY);

    const oldSym = localStorage.getItem('futures_favorites');
    const oldTradfi = localStorage.getItem('tradfi_favorites');

    return {
      symbols: sym ? JSON.parse(sym) : (oldSym ? JSON.parse(oldSym) : []),
      tradfi: tradfi ? JSON.parse(tradfi) : (oldTradfi ? JSON.parse(oldTradfi) : []),
    };
  } catch {
    return { symbols: [], tradfi: [] };
  }
}

function saveToLS(symbols: string[], tradfi: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(symbols));
  localStorage.setItem(LS_TRADFI_KEY, JSON.stringify(tradfi));
}

export function useFuturesFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tradFiFavorites, setTradFiFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    const ls = loadFromLS();
    setFavorites(ls.symbols);
    setTradFiFavorites(ls.tradfi);

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid && !syncedRef.current) {
        syncedRef.current = true;
        loadFromDB(uid).then(({ symbols, tradfi }) => {
          const mergedSym = Array.from(new Set([...ls.symbols, ...symbols]));
          const mergedTradfi = Array.from(new Set([...ls.tradfi, ...tradfi]));
          setFavorites(mergedSym);
          setTradFiFavorites(mergedTradfi);
          saveToLS(mergedSym, mergedTradfi);

          const newInDB = [...symbols.filter(s => !ls.symbols.includes(s)), ...tradfi.filter(s => !ls.tradfi.includes(s))];
          const newInLS = [...ls.symbols.filter(s => !symbols.includes(s)), ...ls.tradfi.filter(s => !tradfi.includes(s))];
          if (newInLS.length > 0) {
            const toInsert = [
              ...ls.symbols.filter(s => !symbols.includes(s)).map(s => ({ user_id: uid, symbol: s, is_tradfi: false })),
              ...ls.tradfi.filter(s => !tradfi.includes(s)).map(s => ({ user_id: uid, symbol: s, is_tradfi: true })),
            ];
            if (toInsert.length > 0) {
              supabase.from('user_futures_favorites').upsert(toInsert, { onConflict: 'user_id,symbol' });
            }
          }
          void newInDB;
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid && !syncedRef.current) {
        syncedRef.current = true;
        loadFromDB(uid).then(({ symbols, tradfi }) => {
          setFavorites(prev => Array.from(new Set([...prev, ...symbols])));
          setTradFiFavorites(prev => Array.from(new Set([...prev, ...tradfi])));
        });
      }
      if (!uid) syncedRef.current = false;
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const loadFromDB = async (uid: string): Promise<{ symbols: string[]; tradfi: string[] }> => {
    try {
      const { data, error } = await supabase
        .from('user_futures_favorites')
        .select('symbol, is_tradfi')
        .eq('user_id', uid);

      if (error || !data) return { symbols: [], tradfi: [] };

      return {
        symbols: data.filter(d => !d.is_tradfi).map(d => d.symbol),
        tradfi: data.filter(d => d.is_tradfi).map(d => d.symbol),
      };
    } catch {
      return { symbols: [], tradfi: [] };
    }
  };

  const toggleFavorite = useCallback(async (symbol: string, isTradFi = false) => {
    if (isTradFi) {
      setTradFiFavorites(prev => {
        const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
        saveToLS(favorites, next);
        if (userId) {
          if (next.includes(symbol)) {
            supabase.from('user_futures_favorites').upsert({ user_id: userId, symbol, is_tradfi: true }, { onConflict: 'user_id,symbol' });
          } else {
            supabase.from('user_futures_favorites').delete().eq('user_id', userId).eq('symbol', symbol);
          }
        }
        return next;
      });
    } else {
      setFavorites(prev => {
        const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
        saveToLS(next, tradFiFavorites);
        if (userId) {
          if (next.includes(symbol)) {
            supabase.from('user_futures_favorites').upsert({ user_id: userId, symbol, is_tradfi: false }, { onConflict: 'user_id,symbol' });
          } else {
            supabase.from('user_futures_favorites').delete().eq('user_id', userId).eq('symbol', symbol);
          }
        }
        return next;
      });
    }
  }, [userId, favorites, tradFiFavorites]);

  const isFavorite = useCallback((symbol: string) => favorites.includes(symbol), [favorites]);
  const isTradFiFavorite = useCallback((symbol: string) => tradFiFavorites.includes(symbol), [tradFiFavorites]);

  return {
    favorites,
    tradFiFavorites,
    toggleFavorite,
    isFavorite,
    isTradFiFavorite,
  };
}
