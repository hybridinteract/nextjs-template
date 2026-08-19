"use client";

import type { ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { DataToolbar } from "./data-toolbar";
import { DataPagination } from "./data-pagination";
import { BulkActionBar } from "./bulk-action-bar";
import { useRowSelection } from "./use-row-selection";
import type {
  BulkConfig,
  BulkFieldAction,
  DataViewParams,
  FilterConfig,
  SelectFilterConfig,
  SortOption,
} from "./types";

export interface DataViewProps<T> {
  /** State from {@link useDataView}. */
  params: DataViewParams;

  // table
  columns: Column<T>[];
  data: T[];
  total: number;
  isLoading?: boolean;
  /**
   * The query's `isPending` — "this query has never resolved". Pass it; it is not
   * optional in spirit.
   *
   * List hooks use `placeholderData: (prev) => prev` so the table does not flicker
   * on a param change. The cost is that `isLoading` is **false from the very first
   * render**, so on a cold load there is a window with no data, no error and no
   * skeleton, which renders as "no results" — a list that is slow, or retrying a
   * failure for six seconds, tells the user their data is gone.
   *
   * `isFetching` does not close that window: a query whose fetch is *paused*
   * (offline, or a retry backing off) reports `isFetching: false` while still
   * having nothing to show. `isPending` covers both.
   */
  isPending?: boolean;
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;

  /**
   * The list query's error, threaded straight from the hook.
   *
   * Without this a failed query renders as an empty table, which reads as "there
   * is no data" — the one message that is definitely wrong. Pass `refetch` as
   * `onRetry` and the user gets a way out.
   */
  error?: unknown;
  onRetry?: () => void;

  /**
   * What an empty list says. A plain "No results found." is a dead end on a fresh
   * install; give it the module's own sentence and its create button.
   *
   * Only shown when nothing is filtered — an empty result under an active search
   * keeps the plain message, because the fix there is to clear the filter, not to
   * create a record.
   */
  emptyState?: ReactNode;
  emptyMessage?: string;

  // toolbar
  filters?: FilterConfig[];
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
  leading?: ReactNode;
  actions?: ReactNode;
  entityName?: string;

  /**
   * Enables row-selection checkboxes and the floating bulk action bar. Lives on
   * `<DataView>` rather than being a separate opt-in per table, so selection is
   * available wherever a view wires it up.
   */
  bulk?: BulkConfig;
}

/**
 * One-stop list surface: a server-driven search/filter/sort toolbar, a sortable
 * table, and pagination — all wired to a {@link useDataView} instance.
 *
 * Feed `params.apiParams` into your list hook and pass the returned `items` and
 * `total` back here. Do not hand-roll page/search/filter state on a list page;
 * this exists so every list in the app behaves the same and stays shareable by URL.
 */
export function DataView<T>({
  params,
  columns,
  data,
  total,
  isLoading,
  isPending,
  keyExtractor,
  onRowClick,
  error,
  onRetry,
  emptyState,
  emptyMessage,
  filters,
  sortOptions,
  searchPlaceholder,
  leading,
  actions,
  entityName,
  bulk,
}: DataViewProps<T>) {
  const pageIds = data.map(keyExtractor);
  const selection = useRowSelection(bulk ? pageIds : []);

  // Fields the view did not special-case are derived from the toolbar's select
  // filters, so adding a filter automatically offers a matching bulk edit.
  const bulkFields: BulkFieldAction[] = bulk
    ? [
        ...(bulk.fields ?? []),
        ...(bulk.applyField
          ? (filters ?? [])
              .filter(
                (f): f is SelectFilterConfig =>
                  (f.type ?? "select") === "select" &&
                  !(bulk.excludeFields ?? []).includes(f.key) &&
                  !(bulk.fields ?? []).some((bf) => bf.key === f.key),
              )
              .map((f) => ({
                key: f.key,
                label: f.label,
                options: f.options,
                apply: (value: string, ids: string[]) => bulk.applyField!(f.key, value, ids),
              }))
          : []),
      ]
    : [];

  const isFiltered = Boolean(params.search) || params.activeFilterCount > 0;

  // Nothing resolved yet is a *load*, not an empty result.
  const coldLoad = Boolean(isLoading) || (Boolean(isPending) && !error);
  const showEmptyState =
    !coldLoad && !error && data.length === 0 && !isFiltered && Boolean(emptyState);

  return (
    <div className="space-y-4">
      <DataToolbar
        params={params}
        filters={filters}
        sortOptions={sortOptions}
        searchPlaceholder={searchPlaceholder}
        leading={leading}
        actions={actions}
        totalCount={total}
        entityName={entityName}
      />

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center"
        >
          <AlertCircle className="size-6 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              This list could not be loaded.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Something went wrong."}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw className="size-4" />
              Try again
            </Button>
          )}
        </div>
      ) : showEmptyState ? (
        <div className="rounded-xl border bg-card px-6 py-16 text-center">{emptyState}</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            isLoading={coldLoad}
            keyExtractor={keyExtractor}
            onRowClick={onRowClick}
            emptyMessage={emptyMessage}
            sort={{ field: params.sortBy, order: params.sortOrder }}
            onSortChange={(field) => params.setSort(field)}
            selectable={!!bulk}
            selectedIds={selection.selectedIds}
            onToggleRow={selection.toggle}
            onToggleAll={selection.toggleAll}
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
          />
          <DataPagination
            page={params.page}
            pageSize={params.pageSize}
            total={total}
            onPageChange={params.setPage}
          />
        </>
      )}

      {bulk && (
        <BulkActionBar
          bulk={{ ...bulk, fields: bulkFields }}
          selectedIds={[...selection.selectedIds]}
          entityName={entityName}
          onDone={selection.clear}
        />
      )}
    </div>
  );
}
