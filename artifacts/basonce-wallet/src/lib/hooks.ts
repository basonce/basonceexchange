import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BNCPriceManager } from './bncPrice';
import { useAuth } from './auth';
import { getBalances, getProfile, getHistory } from './wallet';

export interface BncLive {
  price: number;
  change: number;
  high24h: number;
  low24h: number;
  volume: number;
}

// Live BNC price — re-renders ~1.4×/sec from the shared deterministic engine.
export function useBncPrice(): BncLive {
  const [state, setState] = useState<BncLive>(() => {
    const m = BNCPriceManager.getInstance();
    return { price: m.getPrice(), change: m.getChange(), high24h: m.getHigh24h(), low24h: m.getLow24h(), volume: m.getVolume() };
  });

  useEffect(() => {
    const m = BNCPriceManager.getInstance();
    const unsub = m.subscribe(() => {
      setState({ price: m.getPrice(), change: m.getChange(), high24h: m.getHigh24h(), low24h: m.getLow24h(), volume: m.getVolume() });
    });
    return unsub;
  }, []);

  return state;
}

export function useBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['balances', user?.id],
    queryFn: () => getBalances(user!.id),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });
}

export function useHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['history', user?.id],
    queryFn: () => getHistory(user!.id),
    enabled: !!user?.id,
    refetchInterval: 20000,
  });
}

export const queryKeys = {
  balances: (uid?: string) => ['balances', uid],
  profile: (uid?: string) => ['profile', uid],
  history: (uid?: string) => ['history', uid],
};
