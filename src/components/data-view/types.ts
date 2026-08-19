import type { ReactNode } from "react";

export interface SortState {
  field: string | null;
  order: "asc" | "desc";
}

/** A sortable backend field surfaced in the toolbar's Sort menu. */
export interface SortOption {
  field: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfigBase {
  /** Sent to the API verbatim as a query param, and used as the URL filter key. */
  key: string;
  label: string;
}

/** A single dropdown filter. */
export interface SelectFilterConfig extends FilterConfigBase {
  type?: "select";
  options: FilterOption[];
  placeholder?: string;
}

/**
 * A from/to date-range filter. Both dates are stored in one filter value as
 * `"<from>|<to>"` (either side may be empty). Page code reads
 * `params.filters[key]` and splits on `"|"`.
 */
export interface DateRangeFilterConfig extends FilterConfigBase {
  type: "daterange";
}

/** A toolbar filter — either a dropdown or a date range. */
export type FilterConfig = SelectFilterConfig | DateRangeFilterConfig;

/**
 * Public surface of {@link useDataView}. Passed wholesale to `<DataView>` and
 * `<DataToolbar>`. `apiParams` is shaped to match the backend's `ListParams`
 * (`skip` / `limit` / `search` / `sort_by` / `sort_order` + spread filters) and
 * is meant to be fed straight into a React Query list hook's params + queryKey.
 */
/** Outcome of a bulk apply/delete — surfaced as one aggregated toast. */
export interface BulkOutcome {
  updated: number;
  failed: { id: string; reason: string }[];
}

/** One mass-editable field offered in the bulk action bar. */
export interface BulkFieldAction {
  /** Matches a `FilterConfig.key` when auto-derived from `filters`. */
  key: string;
  label: string;
  options: FilterOption[];
  apply: (value: string, ids: string[]) => Promise<BulkOutcome>;
  /** Confirmation copy for the given value/count. Defaults to a generic "Change {label}?" text. */
  confirm?: (value: string, count: number) => { title: string; description: string };
}

/**
 * Enables row selection + the floating bulk action bar on a `<DataView>`.
 *
 * `fields` lists the mass-editable fields explicitly (use this when a field
 * needs special handling — e.g. status, which routes through a dedicated
 * transition endpoint and excludes certain values). Any field the view
 * doesn't want to special-case can be omitted from `fields` and will be
 * auto-derived from the toolbar's `filters` prop (every `SelectFilterConfig`
 * not already present in `fields`, applied via `applyField`) — so adding a
 * plain filter to a module automatically adds a matching bulk-edit option
 * with no further wiring.
 */
/**
 * A custom bulk action rendered as a button in the action bar. Unlike
 * `BulkFieldAction` (an inline value dropdown), this hands control to the caller —
 * e.g. to open a modal. `onClick` receives the selected ids plus a `done` callback
 * that clears the selection (call it after the action succeeds).
 */
export interface BulkCustomAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (ids: string[], done: () => void) => void;
}

export interface BulkConfig {
  fields?: BulkFieldAction[];
  /**
   * Filter keys that must never be auto-derived into a bulk-edit option.
   * Use for a filter that is readable but not mass-editable — either because the
   * backend rejects it via `applyField`, or because the current user lacks the
   * permission for its dedicated endpoint (e.g. leads `status` without
   * `leads.change_status`). Without this, dropping such a field from `fields`
   * silently resurrects it through the `filters` derivation below.
   */
  excludeFields?: string[];
  /** Caller-driven action buttons (e.g. "Assign" → opens a modal). */
  customActions?: BulkCustomAction[];
  /** Default apply handler for fields auto-derived from `filters`. Required if any filter should be bulk-editable without an explicit entry in `fields`. */
  applyField?: (key: string, value: string, ids: string[]) => Promise<BulkOutcome>;
  /** Present ⇒ the Delete action is shown by default. */
  onDelete?: (ids: string[]) => Promise<BulkOutcome>;
  /** Gates the field editor. Defaults to true. */
  canEdit?: boolean;
  /** Gates delete. Defaults to true (only relevant when `onDelete` is set). */
  canDelete?: boolean;
}

export interface DataViewParams {
  search: string;
  setSearch: (value: string) => void;

  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  /** Set/clear several filters in a single URL write (avoids lost updates). */
  setFilters: (updates: Record<string, string>) => void;
  clearFilters: () => void;
  activeFilterCount: number;

  sortBy: string | null;
  sortOrder: "asc" | "desc";
  setSort: (field: string, order?: "asc" | "desc") => void;

  page: number;
  setPage: (page: number) => void;
  pageSize: number;

  apiParams: Record<string, string | number | undefined>;
  resetAll: () => void;
}

export type { ReactNode };
