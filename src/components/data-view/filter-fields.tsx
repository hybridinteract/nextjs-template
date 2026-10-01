"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import {
  ChipToggle,
  CheckList,
  ChosenChips,
  FilterFrame,
  FilterSearch,
  toggleValue,
} from "./filter-parts";
import { ReferenceField } from "./reference-filter";
import { joinRange, splitMulti, splitRange } from "./types";
import type {
  BooleanFilterConfig,
  DateRangeFilterConfig,
  FilterConfig,
  MultiSelectFilterConfig,
  NumberRangeFilterConfig,
  SelectFilterConfig,
} from "./types";

/**
 * Every filter control, the body of both the toolbar's dropdown and the filter
 * panel. **One renderer, two containers**, so the two can never drift into
 * supporting different filter types. The container decides when to write. This
 * file decides how a filter looks and behaves.
 *
 * Nothing here writes to the URL. `onChange` gets a `{ key: value }` patch, and
 * an empty value means "not filtered".
 */

/** Above this many options a single select gets a search box. */
const SEARCHABLE_SELECT_FROM = 10;

/**
 * Up to this many options a multi-select is a row of chips. Six statuses as
 * chips are one glance. Sixty as chips are a wall, so past this it is a
 * searchable list.
 */
const CHIPS_UP_TO = 8;

const ALL = "__all__";

type SetValue = (next: string) => void;

function SelectField({ config, value, set }: { config: SelectFilterConfig; value: string; set: SetValue }) {
  const allLabel = config.placeholder ?? `All ${config.label.toLowerCase()}`;
  const onPick = (v: string) => set(v === ALL ? "" : v);

  if (config.options.length >= SEARCHABLE_SELECT_FROM) {
    return (
      <SearchableSelect
        value={value || ALL}
        onChange={onPick}
        options={[{ value: ALL, label: allLabel }, ...config.options]}
        placeholder={allLabel}
        searchPlaceholder={`Search ${config.label.toLowerCase()}…`}
        emptyText="No matches."
        aria-label={config.label}
      />
    );
  }
  return (
    <Select value={value || ALL} onValueChange={onPick}>
      <SelectTrigger className="w-full" aria-label={config.label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {config.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiChips({ config, value, set }: { config: MultiSelectFilterConfig; value: string; set: SetValue }) {
  const chosen = splitMulti(value);
  if (config.options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {config.placeholder ?? "Nothing to choose from yet."}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={config.label}>
      {config.options.map((option) => (
        <ChipToggle
          key={option.value}
          label={option.label}
          active={chosen.includes(option.value)}
          onClick={() => set(toggleValue(chosen, option.value))}
        />
      ))}
    </div>
  );
}

function MultiList({ config, value, set }: { config: MultiSelectFilterConfig; value: string; set: SetValue }) {
  const chosen = splitMulti(value);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return config.options;
    return config.options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, config.options]);

  const labelFor = (v: string) => config.options.find((o) => o.value === v)?.label ?? v;
  const empty = query
    ? `Nothing matches “${query}”.`
    : (config.placeholder ?? "Nothing to choose from yet.");

  return (
    <>
      <ChosenChips chosen={chosen} labelFor={labelFor} onRemove={(v) => set(toggleValue(chosen, v))} />
      <FilterSearch label={config.label} value={query} onChange={setQuery} />
      <CheckList
        options={visible}
        chosen={chosen}
        onToggle={(option) => set(toggleValue(chosen, option.value))}
        empty={empty}
      />
    </>
  );
}

function DateRangeField({ config, value, set }: { config: DateRangeFilterConfig; value: string; set: SetValue }) {
  const [from, to] = splitRange(value);
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        value={from}
        onChange={(e) => set(joinRange(e.target.value, to))}
        className="h-8 flex-1 text-sm"
        aria-label={`${config.label} from`}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        type="date"
        value={to}
        onChange={(e) => set(joinRange(from, e.target.value))}
        className="h-8 flex-1 text-sm"
        aria-label={`${config.label} to`}
      />
    </div>
  );
}

function NumberInput({
  config,
  value,
  onChange,
  side,
}: {
  config: NumberRangeFilterConfig;
  value: string;
  onChange: (next: string) => void;
  side: "Min" | "Max";
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      min={config.min}
      max={config.max}
      step={config.step}
      placeholder={config.unit ? `${side} ${config.unit}` : side}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 flex-1 text-sm"
      aria-label={`${config.label} ${side === "Min" ? "minimum" : "maximum"}`}
    />
  );
}

function NumberRangeField({ config, value, set }: { config: NumberRangeFilterConfig; value: string; set: SetValue }) {
  const [min, max] = splitRange(value);
  // Shown, not corrected. Quietly swapping the two hides a typo, and an empty
  // table explains nothing.
  const crossed = min !== "" && max !== "" && Number(min) > Number(max);
  return (
    <>
      <div className="flex items-center gap-1.5">
        <NumberInput config={config} side="Min" value={min} onChange={(v) => set(joinRange(v, max))} />
        <span className="text-xs text-muted-foreground">to</span>
        <NumberInput config={config} side="Max" value={max} onChange={(v) => set(joinRange(min, v))} />
      </div>
      {crossed && (
        <p className="text-[11px] text-destructive">
          The minimum is above the maximum, so nothing can match.
        </p>
      )}
      <RangePresets config={config} value={value} set={set} />
    </>
  );
}

function RangePresets({ config, value, set }: { config: NumberRangeFilterConfig; value: string; set: SetValue }) {
  if (!config.presets?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {config.presets.map((preset) => {
        const asValue = joinRange(
          preset.min === undefined ? "" : String(preset.min),
          preset.max === undefined ? "" : String(preset.max),
        );
        return (
          <ChipToggle
            key={preset.label}
            label={preset.label}
            active={value === asValue}
            // A second click clears it, so a preset is never a one-way door.
            onClick={() => set(value === asValue ? "" : asValue)}
          />
        );
      })}
    </div>
  );
}

function BooleanField({ config, value, set }: { config: BooleanFilterConfig; value: string; set: SetValue }) {
  const choices = [
    { value: "", label: "Any" },
    { value: "true", label: config.trueLabel ?? "Yes" },
    { value: "false", label: config.falseLabel ?? "No" },
  ];
  return (
    <div className="flex gap-1.5" role="group" aria-label={config.label}>
      {choices.map((choice) => (
        <ChipToggle
          key={choice.value || "any"}
          label={choice.label}
          active={value === choice.value}
          neutral={choice.value === ""}
          onClick={() => set(choice.value)}
        />
      ))}
    </div>
  );
}

/** One filter's control, under its label. */
export function FilterField({
  config,
  values,
  onChange,
}: {
  config: FilterConfig;
  values: Record<string, string>;
  onChange: (updates: Record<string, string>) => void;
}) {
  const value = values[config.key] ?? "";
  const set: SetValue = (next) => onChange({ [config.key]: next });
  const clear = () => set("");

  switch (config.type) {
    case "multiselect": {
      const asList = config.searchable ?? config.options.length > CHIPS_UP_TO;
      const Control = asList ? MultiList : MultiChips;
      return (
        <FilterFrame config={config} count={splitMulti(value).length} onClear={clear}>
          <Control config={config} value={value} set={set} />
        </FilterFrame>
      );
    }
    case "reference":
      return <ReferenceField config={config} value={value} values={values} set={set} />;
    case "daterange":
      return (
        <FilterFrame config={config} count={value ? 1 : 0} onClear={clear}>
          <DateRangeField config={config} value={value} set={set} />
        </FilterFrame>
      );
    case "numberrange":
      return (
        <FilterFrame config={config} count={value ? 1 : 0} onClear={clear}>
          <NumberRangeField config={config} value={value} set={set} />
        </FilterFrame>
      );
    case "boolean":
      return (
        <FilterFrame config={config} count={value ? 1 : 0}>
          <BooleanField config={config} value={value} set={set} />
        </FilterFrame>
      );
    default:
      return (
        <FilterFrame config={config} count={value ? 1 : 0} onClear={clear}>
          <SelectField config={config} value={value} set={set} />
        </FilterFrame>
      );
  }
}

/** Filters grouped by `group`, in the order each group first appears. */
function sectionsOf(filters: FilterConfig[]) {
  const sections: { name: string | null; items: FilterConfig[] }[] = [];
  for (const filter of filters) {
    const name = filter.group ?? null;
    const section = sections.find((s) => s.name === name);
    if (section) section.items.push(filter);
    else sections.push({ name, items: [filter] });
  }
  return sections;
}

export interface FilterFieldsProps {
  filters: FilterConfig[];
  /** Current value per filter key: the panel's draft, or the live URL state. */
  values: Record<string, string>;
  onChange: (updates: Record<string, string>) => void;
  /**
   * Columns on a wide screen. One in the toolbar's dropdown, which is narrow on
   * every screen. `sm:` is a screen width, not the dropdown's.
   */
  columns?: 1 | 2;
  className?: string;
}

export function FilterFields({ filters, values, onChange, columns = 2, className }: FilterFieldsProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {sectionsOf(filters).map((section) => (
        <section key={section.name ?? "__ungrouped__"} className="space-y-3">
          {section.name && (
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.name}
              </h3>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          {/* CSS columns, not a grid. Controls differ a lot in height (a long
              checkbox list against a row of chips), and a grid leaves a hole
              beside the short one. The DOM order, which the keyboard and a
              screen reader follow, stays the declared one. */}
          <div className={cn(columns === 2 && "sm:columns-2 sm:gap-x-5")}>
            {section.items.map((filter) => (
              <div key={filter.key} className="mb-4 break-inside-avoid last:mb-0">
                <FilterField config={filter} values={values} onChange={onChange} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** How many filters a set of values holds. For the panel's Apply button. */
export function countActive(values: Record<string, string>): number {
  return Object.values(values).filter(Boolean).length;
}
