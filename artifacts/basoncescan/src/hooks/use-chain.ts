import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { chainData } from '@/lib/chain';

export function useNetworkStats() {
  return useQuery({
    queryKey: ['networkStats'],
    queryFn: () => chainData.getNetworkStats(),
    refetchInterval: 5000, // Update every 5s
  });
}

export function useHomeAnalytics() {
  return useQuery({
    queryKey: ['homeAnalytics'],
    queryFn: () => chainData.getHomeAnalytics(),
    refetchInterval: 30000,
  });
}

export function useLatestBlocks(count = 10) {
  return useQuery({
    queryKey: ['latestBlocks', count],
    queryFn: () => chainData.getLatestBlocks(count),
    refetchInterval: 3000,
  });
}

export function useLatestTransactions(count = 10) {
  return useQuery({
    queryKey: ['latestTransactions', count],
    queryFn: () => chainData.getLatestTransactions(count),
    refetchInterval: 3000,
  });
}

export function useTransactionsPage(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['transactions', page, pageSize],
    queryFn: () => chainData.getTransactionsPage(page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function useBlocksPage(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['blocks', page, pageSize],
    queryFn: () => chainData.getBlocksPage(page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function useBlock(numberOrHash: string | number) {
  return useQuery({
    queryKey: ['block', numberOrHash],
    queryFn: () => chainData.getBlock(numberOrHash),
    enabled: !!numberOrHash,
  });
}

export function useTransaction(hash: string) {
  return useQuery({
    queryKey: ['transaction', hash],
    queryFn: () => chainData.getTransaction(hash),
    enabled: !!hash,
  });
}

export function useAddress(hash: string) {
  return useQuery({
    queryKey: ['address', hash],
    queryFn: () => chainData.getAddress(hash),
    enabled: !!hash,
  });
}

export function useAddressTransactions(hash: string, page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['addressTransactions', hash, page, pageSize],
    queryFn: () => chainData.getAddressTransactions(hash, page, pageSize),
    enabled: !!hash,
    placeholderData: keepPreviousData,
  });
}

export function useToken(address: string) {
  return useQuery({
    queryKey: ['token', address],
    queryFn: () => chainData.getToken(address),
    enabled: !!address,
  });
}

export function useTokenTransfers(address: string, page: number, pageSize = 25) {
  return useQuery({
    queryKey: ['tokenTransfers', address, page, pageSize],
    queryFn: () => chainData.getTokenTransfers(address, page, pageSize),
    enabled: !!address,
    placeholderData: keepPreviousData,
    refetchInterval: 4000,
  });
}

export function useTokenHolders(address: string, page: number, pageSize = 25) {
  return useQuery({
    queryKey: ['tokenHolders', address, page, pageSize],
    queryFn: () => chainData.getTokenHolders(address, page, pageSize),
    enabled: !!address,
    placeholderData: keepPreviousData,
  });
}

// Global live subscription hook
export function useLiveChainUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = chainData.subscribe((event) => {
      if (event.type === 'new_block') {
        // Optimistically update every latest-blocks query regardless of its count
        queryClient.setQueriesData({ queryKey: ['latestBlocks'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return [event.data, ...old].slice(0, old.length);
        });
        // Invalidate full lists slightly delayed to avoid jumping if not on page
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['blocks', 1] }), 1000);
        queryClient.invalidateQueries({ queryKey: ['networkStats'] });
      } else if (event.type === 'new_transaction') {
        // Optimistically update every latest-transactions query regardless of its count
        queryClient.setQueriesData({ queryKey: ['latestTransactions'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return [event.data, ...old].slice(0, old.length);
        });
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['transactions', 1] }), 1000);
      }
    });

    return unsubscribe;
  }, [queryClient]);
}
