"use client";

import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MULTI_SEPARATOR } from "./types";
import type { FilterConfig, FilterOption } from "./types";

/**
 * The small pieces every filter control is built from. Shared by
 * `filter-fields.tsx`, `reference-filter.tsx` and `filter-pills.tsx`, and kept
 * apart from them so none of those imports another in a circle.
 */

/** How many chosen values a searchable list names above itself before it counts them. */
const CHIPS_NAMED_UP_TO = 6;

/** Adds or removes one value from a comma-joined multi value. */
export function toggleValue(chosen: string[], value: string): string {
  const next = chosen.includes(value)
    ? chosen.filter((v) => v !== value)
    : [...chosen, value];
  return next.join(MULTI_SEPARATOR);
}

/**
 * One value you can switch on and off. `neutral` is for the choice that means
 * "not filtered", like a yes/no filter's "Any": still shown as picked, but
 * muted, because a lit chip should mean the list is being narrowed.
 */
export function ChipToggle({
  label,
  active,
  onClick,
  neutral,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  neutral?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={active ? (neutral ? "secondary" : "default") : "outline"}
      size="xs"
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** A filter's label, its hint, how many values are chosen, and a Clear link. */
export function FilterFrame({
  config,
  count = 0,
  onClear,
  children,
}: {
  config: FilterConfig;
  count?: number;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          {config.label}
          {/* Only past one. A single choice already shows as a lit chip or a
              filled input. */}
          {count > 1 && <span className="ml-1.5 font-normal text-primary">{count}</span>}
        </span>
        {count > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {config.hint && (
        <p className="text-[11px] leading-snug text-muted-foreground">{config.hint}</p>
      )}
      {children}
    </div>
  );
}

/** The search box above a checkbox list. */
export function FilterSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        className="h-8 pl-8 text-sm"
        aria-label={`Search ${label}`}
      />
    </div>
  );
}

/** The scrolling checkbox list for a long multi-select or a reference filter. */
export function CheckList({
  options,
  chosen,
  onToggle,
  empty,
}: {
  options: FilterOption[];
  chosen: string[];
  onToggle: (option: FilterOption) => void;
  empty: React.ReactNode;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-md border p-1">
        <p className="px-2 py-3 text-xs text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border p-1">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1.5 text-sm hover:bg-muted"
        >
          <Checkbox
            checked={chosen.includes(option.value)}
            onCheckedChange={() => onToggle(option)}
            aria-label={option.label}
          />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * The chosen values above a searchable list, each removable. Without it, a
 * value ticked and then searched out of view is chosen but invisible.
 */
export function ChosenChips({
  chosen,
  labelFor,
  onRemove,
}: {
  chosen: string[];
  labelFor: (value: string) => string;
  onRemove: (value: string) => void;
}) {
  if (chosen.length === 0) return null;
  const named = chosen.slice(0, CHIPS_NAMED_UP_TO);
  const hidden = chosen.length - named.length;
  return (
    <div className="flex flex-wrap gap-1">
      {named.map((value) => (
        <RemovableBadge
          key={value}
          text={labelFor(value)}
          removeLabel={`Remove ${labelFor(value)}`}
          onRemove={() => onRemove(value)}
        />
      ))}
      {hidden > 0 && (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          +{hidden} more
        </Badge>
      )}
    </div>
  );
}

/** One applied filter under the toolbar, removable in one click. */
export function Pill({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <RemovableBadge
      text={value}
      prefix={`${label}:`}
      removeLabel={`Remove ${label} filter`}
      onRemove={onRemove}
    />
  );
}

function RemovableBadge({
  text,
  prefix,
  removeLabel,
  onRemove,
}: {
  text: string;
  prefix?: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <Badge variant="secondary" className="max-w-full gap-1 pr-1 font-normal">
      {prefix && <span className="text-muted-foreground">{prefix}</span>}
      <span className="truncate">{text}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm hover:bg-muted-foreground/20"
        aria-label={removeLabel}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
