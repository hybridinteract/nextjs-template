"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  /** All available options (pre-filtered server-side if using search callback). */
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** When true, the trigger shows a loading spinner. */
  loading?: boolean;
  /**
   * Server-side search callback. When provided:
   * - The local filtering is bypassed (the server filters).
   * - Calls are debounced at 250ms to avoid flooding the API.
   * - The ``loading`` prop should be wired to the query's ``isFetching`` so the
   *   spinner appears while the server round-trip is in flight.
   */
  onSearch?: (query: string) => void;
  /** Extra classes for the trigger button — for hosts with their own surface (e.g. the bulk bar). */
  className?: string;
  "aria-label"?: string;
}

const DEBOUNCE_MS = 250;

/**
 * Searchable entity select — wraps shadcn's Command/Combobox pattern.
 *
 * Use this instead of a plain ``<Select>`` when the option list can grow beyond
 * ~50 items. Supports both local filtering (small lists) and a server-side search
 * callback (large lists — debounced automatically).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  allowClear = false,
  disabled,
  loading,
  onSearch,
  className,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remember the option the user last picked. Under server-side search the current
  // `options` only holds the latest result page, so once the user types a query
  // that excludes their earlier choice, the trigger would lose its label and
  // silently blank the field. Captured in the select handler (never during
  // render) so it survives search changes. The *initial* value is kept visible by
  // the caller prepending it into `options` (see the entity pickers).
  const [lastPicked, setLastPicked] = React.useState<SearchableSelectOption | null>(
    null,
  );

  const selected =
    options.find((o) => o.value === value) ??
    (lastPicked && lastPicked.value === value ? lastPicked : undefined);

  // Local filter when there's no server-side search callback.
  const filtered = React.useMemo(() => {
    if (onSearch) return options; // server handles filtering
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query, onSearch]);

  const select = (next: string) => {
    const picked = options.find((o) => o.value === next);
    if (picked) setLastPicked(picked);
    onChange(next === value && allowClear ? "" : next);
    setQuery("");
    setOpen(false);
  };

  const handleSearchChange = (q: string) => {
    setQuery(q);
    if (onSearch) {
      // Debounce server-side search to avoid flooding the API
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(q.trim());
      }, DEBOUNCE_MS);
    }
  };

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {loading ? (
              <Loader2 className="size-4 animate-spin opacity-50" />
            ) : null}
            {allowClear && value ? (
              <X
                className="size-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            ) : null}
            <ChevronsUpDown className="size-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading…</CommandEmpty>
            ) : filtered.length === 0 ? (
              <CommandEmpty>
                {query ? emptyText : options.length === 0 ? "No options available." : "Type to search…"}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem key={o.value} value={o.value} onSelect={() => select(o.value)}>
                    <Check
                      className={cn(
                        "size-4",
                        o.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
