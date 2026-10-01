import type { ReactNode } from "react";
// Type only, so there is no import cycle at runtime. The reference filter keeps
// its type in its own file, so `ncube remove reference` takes it out whole.
import type { ReferenceFilterConfig } from "./reference-filter";

export interface SortState {
  field: string | null;
  order: "asc" | "desc";
}

/** A sortable backend field surfaced in the toolbar's Sort menu. */
export interface SortOption {
  field: string;
  label: string;
  /**
   * Pin the direction instead of toggling it. Omit it and picking the field the
   * list is already sorted by flips the order. Set it when the label already
   * names a direction: "Newest first" cannot be ascending, and a second click
   * that made it oldest-first would leave the label lying. Two options can then
   * sort one field in opposite directions.
   */
  order?: "asc" | "desc";
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfigBase {
  /** Sent to the API verbatim as a query param, and used as the URL filter key. */
  key: string;
  label: string;
  /**
   * Heading this filter sits under in the filter panel. Only for the screen, it
   * never reaches the backend. A panel past about eight filters needs these.
   */
  group?: string;
  /** One muted line under the label, for a difference the label cannot carry. */
  hint?: string;
}

/** A single dropdown filter. */
export interface SelectFilterConfig extends FilterConfigBase {
  type?: "select";
  options: FilterOption[];
  placeholder?: string;
}

/**
 * A dropdown that takes several values at once: "active or draft".
 *
 * The values live in one URL key, comma-joined, and `apiParams` turns them into
 * an array, which `apiClient` sends as a repeated param (`?status=a&status=b`).
 * That is what FastAPI's `list[...]` query fields read. **The backend must accept
 * a list for this key.** Pointed at a single-value filter, FastAPI keeps one of
 * the two values, and the control seems to work while ignoring half of it.
 */
export interface MultiSelectFilterConfig extends FilterConfigBase {
  type: "multiselect";
  options: FilterOption[];
  placeholder?: string;
  /**
   * Force the searchable checkbox list (true) or the row of chips (false). Left
   * unset, up to eight options are chips and more are a searchable list.
   */
  searchable?: boolean;
}

/**
 * A from/to date range, stored in one URL key as `"<from>|<to>"` (either side
 * may be empty) and sent as two backend params. `fromKey` and `toKey` are those
 * params' names. Without them the joined string went to the backend under
 * `key`, which no backend reads, so they are required.
 */
export interface DateRangeFilterConfig extends FilterConfigBase {
  type: "daterange";
  fromKey: string;
  toKey: string;
}

/**
 * A min/max number range, stored like a date range and sent as two backend
 * params. **One control, not two dropdowns**, so a minimum above the maximum is
 * shown as a mistake instead of returning an empty list with no reason given.
 */
export interface NumberRangeFilterConfig extends FilterConfigBase {
  type: "numberrange";
  minKey: string;
  maxKey: string;
  min?: number;
  max?: number;
  step?: number;
  /** Shown after the number: "%", "yrs". Not a currency sign, which goes before it. */
  unit?: string;
  /** One-click bands, for the ranges people actually ask for. */
  presets?: { label: string; min?: number; max?: number }[];
}

/**
 * Yes, no, or not filtered. **Three states, not a checkbox**: a checkbox's "off"
 * has to mean either "no" or "not filtered", and those are different questions.
 * FastAPI reads the "true" or "false" it sends as a bool.
 */
export interface BooleanFilterConfig extends FilterConfigBase {
  type: "boolean";
  trueLabel?: string;
  falseLabel?: string;
}

/** A toolbar filter. */
export type FilterConfig =
  | SelectFilterConfig
  | MultiSelectFilterConfig
  | DateRangeFilterConfig
  | NumberRangeFilterConfig
  | BooleanFilterConfig
  | ReferenceFilterConfig;

/** Separator between the values of a multi-select or reference filter. */
export const MULTI_SEPARATOR = ",";

/** Separator between the two halves of a range filter. */
export const RANGE_SEPARATOR = "|";

/** Split a `"from|to"` filter value into its two halves. */
export function splitRange(value: string | undefined): [string, string] {
  const [from = "", to = ""] = (value ?? "").split(RANGE_SEPARATOR);
  return [from, to];
}

/** Join from/to into `"from|to"`, or `""` when both are empty (clears the filter). */
export function joinRange(from: string, to: string): string {
  return from || to ? `${from}${RANGE_SEPARATOR}${to}` : "";
}

/** The chosen values of a multi-select or reference filter, empties dropped. */
export function splitMulti(value: string | undefined): string[] {
  return (value ?? "").split(MULTI_SEPARATOR).filter(Boolean);
}

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

  /**
   * The backend's query params. A `string[]` is a multi-select, sent as a
   * repeated param. A range is already split into its two backend keys, so
   * nothing downstream sees a `"a|b"` string.
   */
  apiParams: Record<string, string | number | string[] | undefined>;
  resetAll: () => void;
}

export type { ReactNode };
