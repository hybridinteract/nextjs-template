"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useResetOnOpen } from "@/lib/forms";
import { FilterFields, countActive } from "./filter-fields";
import type { DataViewParams, FilterConfig } from "./types";

/**
 * The filter panel, for a list with more filters than the toolbar's dropdown
 * holds well.
 *
 * **It drafts, then applies.** The dropdown writes to the URL on every change,
 * which is right for two filters. For ten it is ten URL writes and ten requests,
 * nine of them answering a question nobody asked, each one redrawing the table
 * behind the panel. Here the changes stay in local state and one `setFilters`
 * writes them together.
 *
 * So it takes `<Modal isDirty>` (rule 09): changes not yet applied are unsaved
 * work, and a stray Escape should not throw away a query someone spent a minute
 * building.
 */
export function FilterPanel({
  isOpen,
  onClose,
  filters,
  params,
  entityName,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterConfig[];
  params: DataViewParams;
  entityName?: string;
}) {
  const applied = params.filters;
  const [draft, setDraft] = useState<Record<string, string>>(applied);

  // The panel stays mounted while closed, so a discarded draft would otherwise
  // still be ticked next time, even after Back changed the URL under it.
  useResetOnOpen(isOpen, () => setDraft(applied));

  const draftCount = countActive(draft);
  const isDirty = useMemo(() => !sameFilters(draft, applied), [draft, applied]);

  const apply = () => {
    if (isDirty) params.setFilters(patchFrom(draft, applied));
    onClose();
  };

  const change = (updates: Record<string, string>) =>
    setDraft((prev) => withoutEmpties({ ...prev, ...updates }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      size={filters.length > 10 ? "large" : "medium"}
      isDirty={isDirty}
      onDiscard={() => setDraft(applied)}
      footer={
        <div className="flex items-center justify-between gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => setDraft({})} disabled={draftCount === 0}>
            Clear all
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={apply}>
              {applyLabel(isDirty, draftCount)}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Each filter narrows the list further. Within one filter, any chosen value
          matches: pick two statuses and you get {entityName ?? "rows"} in either.
        </p>
        <FilterFields filters={filters} values={draft} onChange={change} />
      </div>
    </Modal>
  );
}

function applyLabel(isDirty: boolean, count: number): string {
  if (!isDirty) return "Done";
  if (count === 0) return "Show everything";
  return `Apply ${count} filter${count === 1 ? "" : "s"}`;
}

/**
 * The URL write for the draft. A key that was applied but is gone from the
 * draft is sent as "" to clear it. Leaving it out would keep a filter nobody
 * can see narrowing the list.
 */
function patchFrom(draft: Record<string, string>, applied: Record<string, string>) {
  const patch: Record<string, string> = {};
  for (const key of new Set([...Object.keys(applied), ...Object.keys(draft)])) {
    patch[key] = draft[key] ?? "";
  }
  return patch;
}

/** An empty value is an absent filter, so it is dropped, or the count and the dirty check would see it. */
function withoutEmpties(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""));
}

/** Do two filter sets say the same thing, empties ignored? */
function sameFilters(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  }
  return true;
}
