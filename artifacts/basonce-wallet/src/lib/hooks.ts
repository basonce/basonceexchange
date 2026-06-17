import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BNCPriceManager } from './bncPrice';
import { useAuth } from './auth';
import { getBalances, getProfile, getHistory, swapTokens } from './wallet';
import { fetchMarkets } from './markets';

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

// Live markets feed — real prices via the shared api-server, refreshed often.
export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: () => fetchMarkets(),
    refetchInterval: 15000,
  });
}

// In-wallet swap mutation. On success it refreshes balances + history so the
// portfolio reflects the converted assets immediately.
export function useSwap() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (vars: { from: string; to: string; fromAmount: number }) =>
      swapTokens(vars.from, vars.to, vars.fromAmount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances', user?.id] });
      qc.invalidateQueries({ queryKey: ['history', user?.id] });
    },
  });
}

export const queryKeys = {
  balances: (uid?: string) => ['balances', uid],
  profile: (uid?: string) => ['profile', uid],
  history: (uid?: string) => ['history', uid],
  markets: () => ['markets'],
};
