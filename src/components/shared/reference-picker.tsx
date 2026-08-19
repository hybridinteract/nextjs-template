"use client";

import { useState } from "react";
import { useReferenceOptions } from "@/lib/reference";
import type {
  ReferenceOption,
  ReferenceOptionsParams,
  ReferenceResource,
} from "@/lib/reference";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/shared/searchable-select";

/**
 * The one picker every reference dropdown is built from.
 *
 * Write thin wrappers over this (`<VendorPicker>` = this with
 * `resource="vendors"`), never a new picker component. Eight near-identical
 * pickers, each fetching its own module's gated list and each carrying the same
 * "keep the current value visible" shim, is what this replaces.
 *
 * Two things it gets right that a hand-rolled one usually does not:
 *
 * - It reads `GET /<resource>/options`, which needs no permission, so anyone who
 *   may use the *form* can always fill in the field.
 * - It pins the current value server-side via `ids`, so the label survives a
 *   search that excludes it, a cap that would have pushed it off the page, and
 *   the row later being archived.
 *
 * `hasMore` is surfaced rather than swallowed: a capped list that looks complete
 * is how someone concludes a vendor is missing and creates a duplicate.
 */
export function ReferencePicker({
  resource,
  value,
  onChange,
  filters,
  enabled = true,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled,
  allowClear,
  className,
  "aria-label": ariaLabel,
}: {
  resource: ReferenceResource;
  value: string;
  onChange: (id: string, option?: ReferenceOption) => void;
  /** Per-resource narrowing (statuses, role, state…). Never widens the response. */
  filters?: Omit<ReferenceOptionsParams, "q" | "ids">;
  /** False parks the query — for a field behind a collapsed section or a tab. */
  enabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [search, setSearch] = useState("");

  const { data, isFetching } = useReferenceOptions(
    resource,
    {
      ...filters,
      ...(search ? { q: search } : {}),
      // The current value rides along so the server returns its label even when
      // the search or the active filter would exclude it.
      ...(value ? { ids: [value] } : {}),
    },
    enabled,
  );

  const items = data?.items ?? [];
  const options: SearchableSelectOption[] = items.map((option) => ({
    value: option.id,
    label: option.sublabel ? `${option.label} · ${option.sublabel}` : option.label,
  }));

  return (
    <SearchableSelect
      value={value}
      onChange={(id) => onChange(id, items.find((option) => option.id === id))}
      options={options}
      onSearch={setSearch}
      loading={isFetching}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={
        data?.hasMore
          ? "Too many matches — keep typing to narrow the list."
          : emptyText
      }
      disabled={disabled}
      allowClear={allowClear}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
