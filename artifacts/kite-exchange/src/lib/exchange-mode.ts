import { createContext, useContext } from 'react';

export type ExchangeMode = 'live' | 'frozen';

export interface FrozenPrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

export interface ExchangeModeState {
  mode: ExchangeMode;
  frozenAt: Date | null;
  frozenPrices: Record<string, FrozenPrice>;
  isTransitioning: boolean;
}

export interface ExchangeModeContextValue extends ExchangeModeState {
  getPrice: (symbol: string) => FrozenPrice | null;
  isFrozen: boolean;
}

export const ExchangeModeContext = createContext<ExchangeModeContextValue>({
  mode: 'live',
  frozenAt: null,
  frozenPrices: {},
  isTransitioning: false,
  isFrozen: false,
  getPrice: () => null,
});

export function useExchangeMode() {
  return useContext(ExchangeModeContext);
}
