"use client";

import { ArrowUpDown, ListFilter, Search, X } from "lucide-react";
import type { ReactNode } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/shared/searchable-select";
import type { DataViewParams, FilterConfig, SortOption } from "./types";

const ALL = "__all__";

/**
 * Above this many options a filter gets a search box instead of a plain list.
 * Status/type filters are short and read better as a plain list; entity filters
 * (people, employees, approvers) run to hundreds and are unusable without one.
 */
const SEARCHABLE_FROM = 10;

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

/** Split a `"from|to"` filter value into its two halves. */
function splitRange(value: string | undefined): [string, string] {
  const [from = "", to = ""] = (value ?? "").split("|");
  return [from, to];
}

/** Join from/to into `"from|to"`, or `""` when both are empty (clears the filter). */
function joinRange(from: string, to: string): string {
  return from || to ? `${from}|${to}` : "";
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
  const { search, setSearch, filters: active, setFilter, clearFilters, activeFilterCount } = params;
  const hasFilters = !!filters && filters.length > 0;
  const hasSort = !!sortOptions && sortOptions.length > 0;
  const activeSortLabel = sortOptions?.find((o) => o.field === params.sortBy)?.label;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
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
          {/* Filters */}
          {hasFilters && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="size-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 space-y-3">
                {filters!.map((f) => {
                  if (f.type === "daterange") {
                    const [from, to] = splitRange(active[f.key]);
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFilter(f.key, joinRange(e.target.value, to))}
                            className="flex-1"
                            aria-label={`${f.label} from`}
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input
                            type="date"
                            value={to}
                            onChange={(e) => setFilter(f.key, joinRange(from, e.target.value))}
                            className="flex-1"
                            aria-label={`${f.label} to`}
                          />
                        </div>
                      </div>
                    );
                  }
                  const allLabel = f.placeholder ?? `All ${f.label.toLowerCase()}`;
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                      {f.options.length >= SEARCHABLE_FROM ? (
                        <SearchableSelect
                          value={active[f.key] ?? ALL}
                          onChange={(v) => setFilter(f.key, v === ALL ? "" : v)}
                          options={[{ value: ALL, label: allLabel }, ...f.options]}
                          placeholder={allLabel}
                          searchPlaceholder={`Search ${f.label.toLowerCase()}…`}
                          emptyText="No matches."
                          aria-label={f.label}
                        />
                      ) : (
                        <Select
                          value={active[f.key] ?? ALL}
                          onValueChange={(v) => setFilter(f.key, v === ALL ? "" : v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={allLabel} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL}>{allLabel}</SelectItem>
                            {f.options.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Sort */}
          {hasSort && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="size-4" />
                  {activeSortLabel ? (
                    <span>
                      {activeSortLabel}
                      <span className="ml-1 text-muted-foreground">
                        {params.sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    </span>
                  ) : (
                    "Sort"
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions!.map((o) => {
                  const isActive = params.sortBy === o.field;
                  return (
                    <DropdownMenuItem
                      key={o.field}
                      onClick={() => params.setSort(o.field)}
                      className={cn(isActive && "font-medium")}
                    >
                      {o.label}
                      {isActive && (
                        <span className="ml-auto text-muted-foreground">
                          {params.sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {actions}
        </div>
      </div>

      {/* Active filter pills */}
      {hasFilters && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(active).map(([key, value]) => {
            const config = filters!.find((f) => f.key === key);
            let label: string;
            if (config?.type === "daterange") {
              const [from, to] = splitRange(value);
              label = `${from || "…"} → ${to || "…"}`;
            } else {
              label = config?.options.find((o) => o.value === value)?.label ?? value;
            }
            return (
              <Badge key={key} variant="secondary" className="gap-1 pr-1 font-normal">
                <span className="text-muted-foreground">{config?.label ?? key}:</span>
                {label}
                <button
                  type="button"
                  onClick={() => setFilter(key, "")}
                  className="ml-0.5 rounded-sm hover:bg-muted-foreground/20"
                  aria-label={`Remove ${config?.label ?? key} filter`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
          <Button variant="ghost" size="xs" onClick={clearFilters} className="text-muted-foreground">
            Clear all
          </Button>
        </div>
      )}

      {/* Result count */}
      {totalCount !== undefined && entityName && (
        <p className="text-[13px] sm:text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{totalCount}</span> {entityName}
        </p>
      )}
    </div>
  );
}
