'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { apiRequest } from '@/lib/api/client';
import {
  ScanHistorySchema,
  ScanResponseSchema,
  TrendingSchema,
  WeeklyStatsSchema,
} from '@/lib/api/schemas';
import { isScanDone } from './summary';

export const HISTORY_PAGE = 20;

/** Poll interval: 1.5 s like mobile for the first ~15 s, then back off gently up to 5 s. */
export function pollDelay(attempts: number): number {
  return Math.min(1500 * 1.15 ** Math.max(0, attempts - 10), 5000);
}

export function useScan(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: ({ signal }) =>
      apiRequest(`scans/${encodeURIComponent(id)}`, ScanResponseSchema, { signal }),
    staleTime: 0,
    retry: false, // polling itself retries; see refetchInterval
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      if (q.state.data && isScanDone(q.state.data)) return false;
      // A definitive client error (404, 403…) won't fix itself; transient ones keep polling like mobile does.
      if (
        q.state.error instanceof ApiError &&
        q.state.error.statusCode >= 400 &&
        q.state.error.statusCode < 500 &&
        q.state.error.statusCode !== 429
      ) {
        return false;
      }
      return pollDelay(q.state.dataUpdateCount + q.state.errorUpdateCount);
    },
  });
}

export function useHistory() {
  return useInfiniteQuery({
    queryKey: ['history'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        `scans/history?limit=${HISTORY_PAGE}${pageParam ? `&offset=${pageParam}` : ''}`,
        ScanHistorySchema,
        { signal },
      ),
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.items.length : undefined),
  });
}

export function useRecentScans(limit = 4) {
  return useQuery({
    queryKey: ['history', 'recent', limit],
    queryFn: async () =>
      (await apiRequest(`scans/history?limit=${limit}`, ScanHistorySchema)).items,
  });
}

export const useWeeklyStats = () =>
  useQuery({
    queryKey: ['stats', 'weekly'],
    queryFn: () => apiRequest('stats/weekly', WeeklyStatsSchema),
  });

/** Best-effort, like mobile: failures just mean no carousel. */
export const useTrending = (limit = 3) =>
  useQuery({
    queryKey: ['trending', limit],
    queryFn: async () => (await apiRequest(`scans/trending?limit=${limit}`, TrendingSchema)).items,
    retry: false,
    staleTime: 5 * 60_000,
  });
