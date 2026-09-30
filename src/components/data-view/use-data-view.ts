"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks";
import { splitMulti, splitRange } from "./types";
import type { DataViewParams, FilterConfig, SortState } from "./types";

export interface UseDataViewConfig {
  /** Rows per page. Default 20. */
  pageSize?: number;
  /** Sort applied when the URL specifies none. */
  defaultSort?: SortState;
  /** Search debounce in ms. Default 300. */
  debounceMs?: number;
  /**
   * URL-key prefix so several tables on one page (e.g. Settings tabs) don't
   * collide. `namespace: "taxes"` produces keys like `taxes.q`, `taxes.sort`.
   */
  namespace?: string;
  /**
   * The same `FilterConfig[]` handed to `<DataView>`. **Needed only when a
   * filter's URL value is not its API value**: a multi-select or reference (one
   * comma-joined key becomes an array) or a range (one `"a|b"` key becomes two
   * backend params). A plain select or yes/no passes straight through.
   *
   * Only `key`, `type` and the range key names are read, never `options`, so a
   * filter whose options arrive from a query can still be declared once.
   */
  filters?: FilterConfig[];
}

/** How one filter key turns its URL string into backend params. */
type ParamSpec =
  | { kind: "scalar" }
  | { kind: "multi" }
  | { kind: "range"; fromKey: string; toKey: string };

function specFor(filter: FilterConfig): ParamSpec {
  switch (filter.type) {
    case "multiselect":
    case "reference":
      return { kind: "multi" };
    case "daterange":
      return { kind: "range", fromKey: filter.fromKey, toKey: filter.toKey };
    case "numberrange":
      return { kind: "range", fromKey: filter.minKey, toKey: filter.maxKey };
    default:
      return { kind: "scalar" };
  }
}

/**
 * The specs as a string, so they can be a memo dependency. `filters` is often
 * rebuilt every render (its options come from a query). Depending on the array
 * would rebuild `apiParams` every render and hand React Query a new key each
 * time, which refetches the list forever. The string changes only when a key or
 * a type does.
 */
function specsSignature(filters: FilterConfig[] | undefined): string {
  const entries = (filters ?? []).map((filter) => [filter.key, specFor(filter)]);
  return JSON.stringify(entries);
}

/** Adds one filter's backend params to `out`. An undeclared key is a plain select. */
function addFilterParams(
  out: Record<string, string | number | string[] | undefined>,
  key: string,
  value: string,
  spec: ParamSpec,
) {
  if (spec.kind === "scalar") {
    out[key] = value;
    return;
  }
  if (spec.kind === "multi") {
    const values = splitMulti(value);
    if (values.length) out[key] = values;
    return;
  }
  // Each half stands alone: "at least 10" with no upper bound is a whole filter.
  const [from, to] = splitRange(value);
  if (from) out[spec.fromKey] = from;
  if (to) out[spec.toKey] = to;
}

/**
 * The single source of list-view state: search, filters, sort and pagination,
 * all reflected in the URL query string (shareable, bookmarkable, back/forward
 * aware). The URL is the source of truth; `apiParams` derives from it.
 */
export function useDataView(config: UseDataViewConfig = {}): DataViewParams {
  const { pageSize = 20, defaultSort, debounceMs = 300, namespace, filters: filterConfigs } = config;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const prefix = namespace ? `${namespace}.` : "";
  const K = useMemo(
    () => ({
      q: `${prefix}q`,
      sort: `${prefix}sort`,
      order: `${prefix}order`,
      page: `${prefix}page`,
      filter: `${prefix}f_`,
    }),
    [prefix],
  );

  // ── committed state read from the URL ──
  const urlSearch = searchParams.get(K.q) ?? "";
  const sortBy = searchParams.get(K.sort) ?? defaultSort?.field ?? null;
  const rawOrder = searchParams.get(K.order);
  const sortOrder: "asc" | "desc" =
    rawOrder === "asc" || rawOrder === "desc"
      ? rawOrder
      : defaultSort?.order ?? "desc";
  const page = Math.max(0, Math.trunc(Number(searchParams.get(K.page) ?? "0")) || 0);

  const filters = useMemo(() => {
    const out: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith(K.filter) && value !== "") {
        out[key.slice(K.filter.length)] = value;
      }
    });
    return out;
  }, [searchParams, K.filter]);

  // ── merge updates into the current query string ──
  const writeUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // ── debounced search box → URL ──
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, debounceMs);

  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      writeUrl({ [K.q]: debouncedSearch || null, [K.page]: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ── external URL change (back/forward, a shared link) → restore the box ──
  // During render, not in an effect: an effect paints the old query once before
  // correcting it, so Back visibly flickers the previous search term.
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
  if (lastUrlSearch !== urlSearch) {
    setLastUrlSearch(urlSearch);
    // Skip when the URL is simply catching up with what the user just typed.
    if (urlSearch !== debouncedSearch) setSearchInput(urlSearch);
  }

  const setSearch = useCallback((value: string) => setSearchInput(value), []);

  const setFilter = useCallback(
    (key: string, value: string) => {
      writeUrl({ [`${K.filter}${key}`]: value || null, [K.page]: null });
    },
    [writeUrl, K],
  );

  const setFilters = useCallback(
    (updates: Record<string, string>) => {
      const out: Record<string, string | null> = { [K.page]: null };
      for (const [key, value] of Object.entries(updates)) {
        out[`${K.filter}${key}`] = value || null;
      }
      writeUrl(out);
    },
    [writeUrl, K],
  );

  const clearFilters = useCallback(() => {
    const updates: Record<string, null> = { [K.page]: null };
    searchParams.forEach((_value, key) => {
      if (key.startsWith(K.filter)) updates[key] = null;
    });
    writeUrl(updates);
  }, [writeUrl, searchParams, K]);

  const setSort = useCallback(
    (field: string, order?: "asc" | "desc") => {
      const nextOrder: "asc" | "desc" =
        order ?? (sortBy === field ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
      writeUrl({ [K.sort]: field, [K.order]: nextOrder, [K.page]: null });
    },
    [writeUrl, K, sortBy, sortOrder],
  );

  const setPage = useCallback(
    (next: number) => writeUrl({ [K.page]: next > 0 ? next : null }),
    [writeUrl, K],
  );

  const resetAll = useCallback(() => {
    setSearchInput("");
    const updates: Record<string, null> = {
      [K.q]: null,
      [K.sort]: null,
      [K.order]: null,
      [K.page]: null,
    };
    searchParams.forEach((_value, key) => {
      if (key.startsWith(K.filter)) updates[key] = null;
    });
    writeUrl(updates);
  }, [writeUrl, searchParams, K]);

  const activeFilterCount = Object.keys(filters).length;

  const signature = specsSignature(filterConfigs);
  const specs = useMemo(
    () => new Map<string, ParamSpec>(JSON.parse(signature)),
    [signature],
  );

  const apiParams = useMemo(() => {
    const out: Record<string, string | number | string[] | undefined> = {
      skip: page * pageSize,
      limit: pageSize,
    };
    if (urlSearch) out.search = urlSearch;
    if (sortBy) {
      out.sort_by = sortBy;
      out.sort_order = sortOrder;
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value === "") continue;
      addFilterParams(out, key, value, specs.get(key) ?? { kind: "scalar" });
    }
    return out;
  }, [page, pageSize, urlSearch, sortBy, sortOrder, filters, specs]);

  return {
    search: searchInput,
    setSearch,
    filters,
    setFilter,
    setFilters,
    clearFilters,
    activeFilterCount,
    sortBy,
    sortOrder,
    setSort,
    page,
    setPage,
    pageSize,
    apiParams,
    resetAll,
  };
}
