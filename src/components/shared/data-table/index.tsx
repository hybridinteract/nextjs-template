"use client";

import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** When true, the header becomes a click-to-sort button. */
  sortable?: boolean;
  /** Backend sort field for this column. Defaults to `key` when omitted. */
  sortKey?: string;
  /**
   * On the mobile card layout (below `md`), render this column as the card's
   * title (large, no label) instead of a labelled field. Defaults to the first
   * column when no column opts in.
   */
  mobilePrimary?: boolean;
  /** Omit this column from the mobile card layout (e.g. row-action menus). */
  mobileHidden?: boolean;
  /** Override the field label shown in the mobile card (defaults to `header`). */
  mobileLabel?: string;
}

export interface SortState {
  field: string | null;
  order: "asc" | "desc";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loadingRows?: number;
  className?: string;
  onRowClick?: (row: T) => void;
  /** Current sort state — drives the header indicators. */
  sort?: SortState;
  /** Called with the column's sortKey when a sortable header is clicked. */
  onSortChange?: (field: string) => void;

  // ── row selection (optional — all no-ops when omitted) ──
  /** When true, renders a leading checkbox column for bulk selection. */
  selectable?: boolean;
  /** Ids (from {@link keyExtractor}) currently selected. */
  selectedIds?: Set<string>;
  /** Toggle a single row's selection by its key. */
  onToggleRow?: (id: string) => void;
  /** Toggle all rows on the current page. */
  onToggleAll?: () => void;
  /** All rows on the page are selected. */
  allSelected?: boolean;
  /** Some but not all rows on the page are selected (drives the header's indeterminate state). */
  someSelected?: boolean;
}

/** Render a column's value for a row, honouring a custom `cell` renderer. */
function renderCell<T>(col: Column<T>, row: T): React.ReactNode {
  if (col.cell) return col.cell(row);
  return String((row as Record<string, unknown>)[col.key as string] ?? "—");
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  keyExtractor,
  emptyMessage = "No results found.",
  loadingRows = 5,
  className,
  onRowClick,
  sort,
  onSortChange,
  selectable,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allSelected,
  someSelected,
}: DataTableProps<T>) {
  const totalCols = columns.length + (selectable ? 1 : 0);

  // Mobile card layout: title column, labelled fields, and (separately) any
  // header-less action columns — those are row menus/buttons, kept in a footer
  // so they stay reachable without an empty label above them.
  const primaryCol = columns.find((c) => c.mobilePrimary) ?? columns[0];
  const cardCandidates = columns.filter((c) => c !== primaryCol && !c.mobileHidden);
  const cardActions = cardCandidates.filter((c) => (c.header ?? "").trim() === "");
  const cardFields = cardCandidates.filter((c) => (c.header ?? "").trim() !== "");

  return (
    <>
      {/* ── Mobile: stacked cards (no horizontal scroll) ── */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-3.5">
              <Skeleton className="h-4 w-1/2" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          data.map((row) => {
            const id = keyExtractor(row);
            const isSelected = selectedIds?.has(id) ?? false;
            return (
              <div
                key={id}
                data-state={isSelected ? "selected" : undefined}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "rounded-xl border bg-card p-3.5 shadow-sm transition-colors",
                  onRowClick && "cursor-pointer active:bg-muted/50",
                  isSelected && "border-primary/40 bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {primaryCol ? renderCell(primaryCol, row) : null}
                  </div>
                  {selectable ? (
                    <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleRow?.(id)}
                        aria-label="Select row"
                      />
                    </div>
                  ) : (
                    onRowClick && (
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )
                  )}
                </div>

                {cardFields.length > 0 && (
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
                    {cardFields.map((col) => (
                      <div key={String(col.key)} className="min-w-0">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {col.mobileLabel ?? col.header}
                        </dt>
                        <dd className="mt-0.5 min-w-0 break-words text-[13px] text-foreground">
                          {renderCell(col, row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {cardActions.length > 0 && (
                  <div
                    className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cardActions.map((col) => (
                      <div key={String(col.key)}>{renderCell(col, row)}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop / tablet: full table ── */}
      <div className={cn("hidden rounded-xl border bg-card overflow-hidden md:block", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={() => onToggleAll?.()}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const sortField = col.sortKey ?? String(col.key);
                const canSort = !!col.sortable && !!onSortChange;
                const isActive = sort?.field === sortField;
                return (
                  <TableHead
                    key={String(col.key)}
                    className={cn("text-xs font-medium", col.headerClassName)}
                    aria-sort={
                      isActive
                        ? sort?.order === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(sortField)}
                        className={cn(
                          "-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
                          isActive ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {col.header}
                        {isActive ? (
                          sort?.order === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && (
                    <TableCell>
                      <Skeleton className="size-4" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const id = keyExtractor(row);
                const isSelected = selectedIds?.has(id) ?? false;
                return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleRow?.(id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className={col.className}>
                      {renderCell(col, row)}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
