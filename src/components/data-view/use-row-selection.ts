"use client";

import { useCallback, useMemo, useState } from "react";

export interface UseRowSelectionResult {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  allSelected: boolean;
  someSelected: boolean;
  count: number;
}

/**
 * Row-selection state for a `DataView` page. Scoped to the *current page's*
 * ids — server-side pagination means we only ever hold the visible page's
 * selection in memory, not the whole result set. Selection is ephemeral (not
 * URL-synced, unlike `useDataView`'s list state) and auto-clears whenever the
 * underlying id set changes (new page, new filters/search/sort).
 */
export function useRowSelection(ids: string[]): UseRowSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // The page's id set changed (pagination/filter/sort/search/refetch) — drop any
  // selection that is no longer visible rather than carrying stale ids into a
  // bulk action.
  //
  // Adjusted during render rather than in an effect: an effect renders one frame
  // with the stale selection still counted, so the bulk bar flashes the wrong
  // number. This is the pattern React sanctions for "reset state when a prop
  // changes", and `react-hooks/set-state-in-effect` rejects the effect version.
  const idsKey = ids.join(",");
  const [lastIdsKey, setLastIdsKey] = useState(idsKey);
  if (lastIdsKey !== idsKey) {
    setLastIdsKey(idsKey);
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const idSet = new Set(ids);
      const next = new Set([...prev].filter((id) => idSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allOnPageSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allOnPageSelected ? new Set() : new Set(ids);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const { allSelected, someSelected } = useMemo(() => {
    if (ids.length === 0) return { allSelected: false, someSelected: false };
    const selectedOnPage = ids.filter((id) => selectedIds.has(id)).length;
    return {
      allSelected: selectedOnPage === ids.length,
      someSelected: selectedOnPage > 0 && selectedOnPage < ids.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, selectedIds]);

  return { selectedIds, toggle, toggleAll, clear, allSelected, someSelected, count: selectedIds.size };
}
