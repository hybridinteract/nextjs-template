"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpDown, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterFields } from "./filter-fields";
import { FilterPanel } from "./filter-panel";
import { FilterPills } from "./filter-pills";
import type { DataViewParams, FilterConfig, SortOption } from "./types";

/**
 * Past this many filters, the Filters button opens the panel instead of a
 * dropdown. A dropdown applies each change at once, which is right for a status
 * and a date. Ten filters do not fit one, and building a query through it costs
 * a request per change. Both render the same `<FilterFields>`.
 */
const PANEL_FROM = 4;

/**
 * A sort option's identity. Not just its field: "Newest first" and "Oldest
 * first" can both sort `created_at`, and keying on the field gives React two
 * children with one key.
 */
function sortKeyOf(option: SortOption): string {
  return option.order ? `${option.field}:${option.order}` : option.field;
}

/** The option the list is sorted by now, matched on direction as well as field. */
function activeSortOption(
  options: SortOption[] | undefined,
  field: string | null,
  order: "asc" | "desc",
): SortOption | undefined {
  return options?.find(
    (option) => option.field === field && (option.order === undefined || option.order === order),
  );
}

export interface DataToolbarProps {
  params: DataViewParams;
  filters?: FilterConfig[];
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
  /** Controls rendered inline right after the search box (e.g. an always-visible period selector). */
  leading?: ReactNode;
  /** Right-aligned actions (e.g. an "Add" button). */
  actions?: ReactNode;
  totalCount?: number;
  entityName?: string;
  className?: string;
}

export function DataToolbar({
  params,
  filters,
  sortOptions,
  searchPlaceholder = "Search…",
  leading,
  actions,
  totalCount,
  entityName,
  className,
}: DataToolbarProps) {
  const { search, setSearch, filters: active, setFilter, clearFilters } = params;
  const hasFilters = !!filters && filters.length > 0;
  const hasSort = !!sortOptions && sortOptions.length > 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>

        {leading}

        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && <FilterControl filters={filters} params={params} entityName={entityName} />}
          {hasSort && <SortMenu options={sortOptions} params={params} />}
          {actions}
        </div>
      </div>

      {hasFilters && (
        <FilterPills
          filters={filters}
          active={active}
          onRemove={(key) => setFilter(key, "")}
          onClearAll={clearFilters}
        />
      )}

      {totalCount !== undefined && entityName && (
        <p className="text-[13px] sm:text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{totalCount}</span> {entityName}
        </p>
      )}
    </div>
  );
}

/** The Filters button, and the dropdown or panel it opens. */
function FilterControl({
  filters,
  params,
  entityName,
}: {
  filters: FilterConfig[];
  params: DataViewParams;
  entityName?: string;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const count = params.activeFilterCount;

  const trigger = (onClick?: () => void) => (
    <Button variant="outline" size="sm" onClick={onClick}>
      <ListFilter className="size-4" />
      Filters
      {count > 0 && (
        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
          {count}
        </Badge>
      )}
    </Button>
  );

  if (filters.length > PANEL_FROM) {
    return (
      <>
        {trigger(() => setPanelOpen(true))}
        <FilterPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          filters={filters}
          params={params}
          entityName={entityName}
        />
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger()}</PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-80 overflow-y-auto">
        <FilterFields filters={filters} values={params.filters} onChange={params.setFilters} columns={1} />
        {count > 0 && (
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={params.clearFilters}>
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SortMenu({ options, params }: { options: SortOption[]; params: DataViewParams }) {
  const current = activeSortOption(options, params.sortBy, params.sortOrder);
  const arrow = params.sortOrder === "asc" ? "↑" : "↓";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="size-4" />
          {current ? (
            <span>
              {current.label}
              {/* A pinned option names its direction already. */}
              {!current.order && <span className="ml-1 text-muted-foreground">{arrow}</span>}
            </span>
          ) : (
            "Sort"
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const isActive = current !== undefined && sortKeyOf(current) === sortKeyOf(option);
          return (
            <DropdownMenuItem
              key={sortKeyOf(option)}
              onClick={() => params.setSort(option.field, option.order)}
              className={cn(isActive && "font-medium")}
            >
              {option.label}
              {isActive && !option.order && (
                <span className="ml-auto text-muted-foreground">{arrow}</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
