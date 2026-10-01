"use client";

import { Button } from "@/components/ui/button";
import { Pill } from "./filter-parts";
import { ReferencePill } from "./reference-filter";
import { splitMulti, splitRange } from "./types";
import type { FilterConfig, FilterOption } from "./types";

/**
 * "You are filtering on this", under the toolbar, one pill per filter.
 *
 * **The panel is not the only way out of a filter.** Someone narrowing a list
 * often wants to drop one condition and look again. Reopening the panel, finding
 * the control and unticking it is three steps for one intent, so each pill
 * removes its own filter.
 */

/** How many values a pill names before it counts them. */
const PILL_NAMES_UP_TO = 2;

export function FilterPills({
  filters,
  active,
  onRemove,
  onClearAll,
}: {
  filters: FilterConfig[];
  active: Record<string, string>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  const entries = Object.entries(active).filter(([, value]) => value !== "");
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entries.map(([key, value]) => {
        const config = filters.find((f) => f.key === key);
        const remove = () => onRemove(key);
        // Its own component, because it fetches the names of the ids it holds.
        if (config?.type === "reference") return <ReferencePill key={key} config={config} value={value} onRemove={remove} />;
        return <Pill key={key} label={config?.label ?? key} value={describe(config, value)} onRemove={remove} />;
      })}
      <Button variant="ghost" size="xs" onClick={onClearAll} className="text-muted-foreground">
        Clear all
      </Button>
    </div>
  );
}

/** A number range in words. "10+" and "up to 50" read as filters. "10 → …" reads as half done. */
function describeNumberRange(value: string, unit = ""): string {
  const [min, max] = splitRange(value);
  if (min && max) return `${min}${unit} – ${max}${unit}`;
  if (min) return `${min}${unit}+`;
  return `up to ${max}${unit}`;
}

function describeMulti(options: FilterOption[], value: string): string {
  const chosen = splitMulti(value);
  if (chosen.length > PILL_NAMES_UP_TO) return `${chosen.length} selected`;
  return chosen.map((v) => optionLabel(options, v)).join(", ");
}

/** One filter value in words. The raw value for a filter it has no words for. */
function describe(config: FilterConfig | undefined, value: string): string {
  switch (config?.type) {
    case "daterange": {
      const [from, to] = splitRange(value);
      return `${from || "…"} → ${to || "…"}`;
    }
    case "numberrange":
      return describeNumberRange(value, config.unit);
    case "multiselect":
      return describeMulti(config.options, value);
    case "boolean":
      return value === "true" ? (config.trueLabel ?? "Yes") : (config.falseLabel ?? "No");
    case "select":
    case undefined:
      return optionLabel(config?.options, value);
    default:
      return value;
  }
}

/** The label for one value, or the value itself when no option matches. */
function optionLabel(options: FilterOption[] | undefined, value: string): string {
  return options?.find((o) => o.value === value)?.label ?? value;
}
