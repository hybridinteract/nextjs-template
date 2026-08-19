"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

/** The envelope every paged child endpoint returns. */
interface Page<T> {
  items: T[];
  total: number;
}

interface UseOlderPagesOptions<T> {
  /** The child collection's query key — `"older"` and `startAfter` are appended. */
  queryKey: readonly unknown[];
  fetchPage: (args: { skip: number; limit: number }) => Promise<Page<T>>;
  pageSize: number;
  /**
   * How many rows the parent already embedded. Paging starts *after* them, so the
   * embedded window and the fetched pages don't overlap.
   */
  startAfter: number;
  enabled: boolean;
}

/**
 * Pages backwards through an append-only child collection that its parent embeds
 * only the newest window of — lead activities, instrument history, work-order
 * history. The parent detail renders instantly from the embedded window and the
 * older rows load on demand, so a long-lived record never ships its whole trail
 * in one response.
 *
 * Callers merge the embedded window with `data.pages.flatMap(p => p.items)`,
 * de-duping by id: a row written between the parent read and the first page
 * fetch shifts the offset and would otherwise appear twice.
 */
export function useOlderPages<T>({
  queryKey,
  fetchPage,
  pageSize,
  startAfter,
  enabled,
}: UseOlderPagesOptions<T>) {
  return useInfiniteQuery({
    queryKey: [...queryKey, "older", startAfter] as const,
    queryFn: ({ pageParam }) => fetchPage({ skip: pageParam, limit: pageSize }),
    initialPageParam: startAfter,
    getNextPageParam: (lastPage, allPages) => {
      const loaded =
        startAfter + allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled,
    staleTime: 30_000,
  });
}
