import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { PriceCache } from '../lib/price-cache';
import { ExchangeModeContext, ExchangeMode, FrozenPrice, ExchangeModeState } from '../lib/exchange-mode';

interface ExchangeModeProviderProps {
  children: ReactNode;
}

export default function ExchangeModeProvider({ children }: ExchangeModeProviderProps) {
  const [state, setState] = useState<ExchangeModeState>({
    mode: 'live',
    frozenAt: null,
    frozenPrices: {},
    isTransitioning: false,
  });

  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyModeConfig = useCallback((row: any, transitioning = false) => {
    const mode: ExchangeMode = row.mode === 'frozen' ? 'frozen' : 'live';
    const frozenPrices: Record<string, FrozenPrice> = {};
    const priceCache = PriceCache.getInstance();

    if (mode === 'frozen' && row.frozen_prices) {
      const raw = typeof row.frozen_prices === 'string'
        ? JSON.parse(row.frozen_prices)
        : row.frozen_prices;

      for (const [sym, val] of Object.entries(raw as Record<string, any>)) {
        frozenPrices[sym] = {
          symbol: sym,
          price: val.price ?? 0,
          change24h: val.change24h ?? 0,
          high24h: val.high24h ?? 0,
          low24h: val.low24h ?? 0,
          volume: val.volume ?? 0,
        };
      }

      priceCache.freeze(raw);
    } else {
      priceCache.unfreeze();
    }

    setState({
      mode,
      frozenAt: row.frozen_at ? new Date(row.frozen_at) : null,
      frozenPrices,
      isTransitioning: transitioning,
    });

    if (transitioning) {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        setState(prev => ({ ...prev, isTransitioning: false }));
      }, 3000);
    }
  }, []);

  useEffect(() => {
    let channel: any;

    const loadInitial = async () => {
      const { data } = await supabase
        .from('exchange_mode_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) applyModeConfig(data, false);
    };

    loadInitial();

    channel = supabase
      .channel('exchange_mode_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'exchange_mode_config' },
        (payload) => {
          applyModeConfig(payload.new, true);
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, [applyModeConfig]);

  const getPrice = useCallback((symbol: string): FrozenPrice | null => {
    if (state.mode !== 'frozen') return null;
    return state.frozenPrices[symbol] ?? null;
  }, [state.mode, state.frozenPrices]);

  return (
    <ExchangeModeContext.Provider
      value={{
        ...state,
        isFrozen: state.mode === 'frozen',
        getPrice,
      }}
    >
      {children}
    </ExchangeModeContext.Provider>
  );
}
