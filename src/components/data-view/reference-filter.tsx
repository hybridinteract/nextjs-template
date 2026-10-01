"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks";
import { useReferenceOptions } from "@/lib/reference";
import type { ReferenceOptionsParams, ReferenceResource } from "@/lib/reference";
import { CheckList, ChosenChips, FilterFrame, FilterSearch, Pill, toggleValue } from "./filter-parts";
import { splitMulti } from "./types";
import type { FilterConfigBase, FilterOption } from "./types";

/**
 * The reference filter: its control in the panel and its pill under the toolbar.
 * Both ask the options feed, because the URL holds ids and only the feed knows
 * their names. `node ncube.js remove reference` deletes this file.
 */

/**
 * Several values from an options feed, searched **on the server**. For a filter
 * by a related record (a customer, an assignee, a city) whose list is too long
 * to hold in the page. It reads the same feed as `<ReferencePicker>`, so it needs
 * no permission (rule 13), and the chosen ids are pinned into the answer, so
 * their labels never go blank. Sent like a multi-select, so **the backend filter
 * must accept a list.** Drawn by this file.
 */
export interface ReferenceFilterConfig extends FilterConfigBase {
  type: "reference";
  resource: ReferenceResource;
  /**
   * Narrowing sent to the feed. A function receives the other filters' current
   * values, so districts narrow to the state just ticked in the open panel.
   */
  narrow?: ReferenceNarrowing | ((values: Record<string, string>) => ReferenceNarrowing);
  /**
   * Hold the request until the search box has this many characters, for a feed
   * that refuses an unnarrowed request rather than capping it. A narrowing or an
   * id already chosen lifts the hold.
   */
  minChars?: number;
  /** Options per request. Defaults to 100. */
  limit?: number;
  /** Shown while the request is held for want of a search. */
  idleHint?: string;
  placeholder?: string;
}

/** Per-resource narrowing for a reference filter's feed. */
export type ReferenceNarrowing = Omit<ReferenceOptionsParams, "q" | "ids">;

/** How many chosen values a pill names before it counts them. */
const PILL_NAMES_UP_TO = 2;

const DEFAULT_LIMIT = 100;

function resolveNarrowing(
  config: ReferenceFilterConfig,
  values: Record<string, string>,
): ReferenceNarrowing {
  const narrow = typeof config.narrow === "function" ? config.narrow(values) : config.narrow;
  if (!narrow) return {};
  // An empty narrowing value is "not narrowed", never "narrowed to nothing",
  // which is the rule the backend's list filters follow too.
  return Object.fromEntries(
    Object.entries(narrow).filter(([, v]) => v !== undefined && v !== "" && v !== null),
  );
}

function emptyText(
  config: ReferenceFilterConfig,
  state: { enabled: boolean; isFetching: boolean; hasMore: boolean; search: string },
): string {
  if (!state.enabled) {
    return config.idleHint ?? `Type ${config.minChars} letters to search ${config.label.toLowerCase()}.`;
  }
  if (state.isFetching) return "Loading…";
  if (state.hasMore) return "Too many matches. Keep typing to narrow the list.";
  if (state.search) return `Nothing matches “${state.search}”.`;
  return config.placeholder ?? "Nothing to choose from yet.";
}

/**
 * The feed's options for the field. A feed with a floor refuses rather than
 * truncating, so the request waits until a narrowing, a chosen id or enough
 * letters satisfy it.
 */
function useFeedOptions(
  config: ReferenceFilterConfig,
  values: Record<string, string>,
  pinned: string[],
  search: string,
) {
  const narrow = resolveNarrowing(config, values);
  const minChars = config.minChars ?? 0;
  const enabled =
    minChars === 0 || Object.keys(narrow).length > 0 || pinned.length > 0 || search.length >= minChars;

  const { data, isFetching } = useReferenceOptions(
    config.resource,
    {
      ...narrow,
      limit: config.limit ?? DEFAULT_LIMIT,
      ...(search ? { q: search } : {}),
      ...(pinned.length > 0 ? { ids: pinned } : {}),
    },
    enabled,
  );

  const options: FilterOption[] = useMemo(
    () =>
      (data?.items ?? []).map((o) => ({
        value: o.id,
        label: o.sublabel ? `${o.label} · ${o.sublabel}` : o.label,
      })),
    [data],
  );
  return { options, enabled, isFetching, hasMore: Boolean(data?.hasMore) };
}

export function ReferenceField({
  config,
  value,
  values,
  set,
}: {
  config: ReferenceFilterConfig;
  value: string;
  values: Record<string, string>;
  set: (next: string) => void;
}) {
  const chosen = splitMulti(value);
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 250).trim();

  // The ids this field OPENED with are pinned into the feed, never the live
  // ticks. `ids` is part of the query key, so pinning live ticks would refetch
  // the whole list on every click. The panel unmounts its body when it closes,
  // so this seeds again on each open, which is when the applied set changes.
  const [pinned] = useState(() => splitMulti(value));
  // Labels of values ticked this session that a later search scrolled away.
  const [seen, setSeen] = useState<Record<string, string>>({});

  const { options, enabled, isFetching, hasMore } = useFeedOptions(config, values, pinned, search);

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? seen[v] ?? "…";
  const toggle = (option: FilterOption) => {
    setSeen((prev) => ({ ...prev, [option.value]: option.label }));
    set(toggleValue(chosen, option.value));
  };

  return (
    <FilterFrame config={config} count={chosen.length} onClear={() => set("")}>
      <ChosenChips chosen={chosen} labelFor={labelFor} onRemove={(v) => set(toggleValue(chosen, v))} />
      <FilterSearch label={config.label} value={query} onChange={setQuery} />
      <CheckList
        options={options}
        chosen={chosen}
        onToggle={toggle}
        empty={emptyText(config, { enabled, isFetching, hasMore, search })}
      />
      {/* Honest, rather than a list that looks complete. It is why the feed
          returns has_more at all. */}
      {enabled && hasMore && options.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          More match than fit here. Keep typing to narrow it down.
        </p>
      )}
    </FilterFrame>
  );
}

/**
 * The pill for a reference filter. It asks the feed for the chosen ids, with no
 * search. For a filter with no narrowing, that is the request the panel's field
 * opens with, so the two share one cached answer.
 */
export function ReferencePill({
  config,
  value,
  onRemove,
}: {
  config: ReferenceFilterConfig;
  value: string;
  onRemove: () => void;
}) {
  const chosen = splitMulti(value);
  const { data } = useReferenceOptions(
    config.resource,
    { limit: config.limit ?? DEFAULT_LIMIT, ids: chosen },
    chosen.length > 0,
  );

  const labels = new Map((data?.items ?? []).map((o) => [o.id, o.label]));
  const named =
    chosen.length <= PILL_NAMES_UP_TO
      ? chosen.map((id) => labels.get(id) ?? "…").join(", ")
      : `${chosen.length} selected`;

  return <Pill label={config.label} value={named} onRemove={onRemove} />;
}
