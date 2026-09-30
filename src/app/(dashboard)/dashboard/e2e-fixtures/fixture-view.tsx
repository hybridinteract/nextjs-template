"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataView, useDataView, type FilterConfig, type SortOption } from "@/components/data-view";
import type { Column } from "@/components/shared/data-table";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, DetailRow } from "@/components/shared";
import { isFormDirty } from "@/lib/forms";
import { DEFAULT_CURRENCY, formatMoney, formatQuantity } from "@/lib/numeric";
import { formatBusinessDate, formatDateTime } from "@/lib/date-utils";
import { useDisplayTimeZone } from "@/lib/timezone";

interface Widget {
  id: string;
  name: string;
  status: "active" | "draft" | "archived";
  price: string;
  qty: string;
  dueDate: string;
  createdAt: string;
  inStock: boolean;
  colour: string;
}

const COLOURS = [
  "Amber", "Black", "Blue", "Bronze", "Green", "Grey",
  "Indigo", "Orange", "Pink", "Red", "Silver", "White",
];

const ROWS: Widget[] = Array.from({ length: 47 }, (_, i) => ({
  id: `w${i + 1}`,
  name: `Widget ${String(i + 1).padStart(2, "0")}`,
  status: (["active", "draft", "archived"] as const)[i % 3],
  price: (1234.5 + i * 10).toFixed(2),
  qty: (1990 + i).toFixed(3),
  dueDate: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
  createdAt: "2026-07-14T21:00:00.000Z",
  inStock: i % 4 !== 0,
  colour: COLOURS[i % COLOURS.length],
}));

const TONES: Record<Widget["status"], StatusTone> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

const STATUS_FILTER: FilterConfig = {
  key: "status",
  label: "Status",
  type: "multiselect",
  options: [
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" },
  ],
};

const IN_STOCK_FILTER: FilterConfig = {
  key: "in_stock",
  label: "In stock",
  type: "boolean",
};

// Five filters, so the Filters button opens the panel. `?mode=few` keeps two,
// so the suite can drive the dropdown too.
const FILTERS: FilterConfig[] = [
  STATUS_FILTER,
  IN_STOCK_FILTER,
  {
    key: "colour",
    label: "Colour",
    type: "multiselect",
    group: "Look",
    options: COLOURS.map((c) => ({ value: c.toLowerCase(), label: c })),
  },
  {
    key: "price",
    label: "Price",
    type: "numberrange",
    group: "Numbers",
    minKey: "price_min",
    maxKey: "price_max",
    presets: [{ label: "Under ₹1,500", max: 1500 }],
  },
  {
    key: "due",
    label: "Due",
    type: "daterange",
    group: "Numbers",
    fromKey: "due_from",
    toKey: "due_to",
  },
];

const FEW_FILTERS: FilterConfig[] = [STATUS_FILTER, IN_STOCK_FILTER];

type WidgetParams = Record<string, string | number | string[] | undefined>;

/** A list param the way the backend would read it: one value or a repeated one. */
function asList(value: WidgetParams[string]): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [String(value)];
}

/** Whether a row passes every filter, the way the backend would decide it. */
function matches(row: Widget, params: WidgetParams): boolean {
  const search = String(params.search ?? "").toLowerCase();
  const statuses = asList(params.status);
  const colours = asList(params.colour);
  const price = Number(row.price);
  if (search && !row.name.toLowerCase().includes(search)) return false;
  if (statuses.length && !statuses.includes(row.status)) return false;
  if (colours.length && !colours.includes(row.colour.toLowerCase())) return false;
  if (params.in_stock !== undefined && String(row.inStock) !== params.in_stock) return false;
  if (params.price_min !== undefined && price < Number(params.price_min)) return false;
  if (params.price_max !== undefined && price > Number(params.price_max)) return false;
  if (params.due_from !== undefined && row.dueDate < String(params.due_from)) return false;
  if (params.due_to !== undefined && row.dueDate > String(params.due_to)) return false;
  return true;
}

const SORTS: SortOption[] = [
  { field: "name", label: "Name" },
  { field: "price", label: "Price" },
];

/** Stands in for a list endpoint: filters, sorts and pages exactly like one. */
function useWidgets(params: WidgetParams) {
  return useQuery({
    queryKey: ["fixture-widgets", params],
    queryFn: async () => {
      // `?mode=` lets a test drive the failure and empty paths without a backend.
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "fail") throw new Error("The widgets service is unavailable.");
      if (mode === "empty") return { items: [] as Widget[], total: 0 };

      let rows = ROWS.filter((r) => matches(r, params));
      const sortBy = params.sort_by as keyof Widget | undefined;
      if (sortBy) {
        const dir = params.sort_order === "asc" ? 1 : -1;
        rows = [...rows].sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])) * dir);
      }
      const skip = Number(params.skip ?? 0);
      const limit = Number(params.limit ?? 20);
      return { items: rows.slice(skip, skip + limit), total: rows.length };
    },
    placeholderData: (prev) => prev,
    retry: false,
  });
}

export function FixtureView() {
  const tz = useDisplayTimeZone();
  const filters = useSearchParams().get("mode") === "few" ? FEW_FILTERS : FILTERS;
  const dv = useDataView({ namespace: "widgets", defaultSort: { field: "name", order: "asc" }, filters });
  const q = useWidgets(dv.apiParams);
  const [detail, setDetail] = useState<Widget | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Widget["status"]>("active");
  const [creating, setCreating] = useState(false);

  const columns: Column<Widget>[] = [
    { key: "name", header: "Name", sortable: true, mobilePrimary: true },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge label={r.status} tone={TONES[r.status]} />,
    },
    { key: "price", header: "Price", sortable: true, cell: (r) => formatMoney(r.price, DEFAULT_CURRENCY) },
    { key: "qty", header: "Qty", cell: (r) => formatQuantity(r.qty) },
    { key: "dueDate", header: "Due", cell: (r) => formatBusinessDate(r.dueDate) },
    {
      key: "createdAt",
      header: "Created",
      cell: (r) => formatDateTime(r.createdAt, { timeZone: tz }),
    },
  ];

  return (
    <>
      <DataView
        params={dv}
        columns={columns}
        data={q.data?.items ?? []}
        total={q.data?.total ?? 0}
        isLoading={q.isLoading}
        isPending={q.isPending}
        error={q.error}
        onRetry={q.refetch}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => {
          setDetail(r);
          setName(r.name);
          setStatus(r.status);
        }}
        filters={filters}
        sortOptions={SORTS}
        searchPlaceholder="Search widgets…"
        entityName="widgets"
        emptyState={
          <div className="space-y-3">
            <p className="text-sm font-medium">No widgets yet</p>
            <p className="text-sm text-muted-foreground">
              Widgets you add will show up here.
            </p>
            <Button size="sm">
              <Plus className="size-4" />
              Add your first widget
            </Button>
          </div>
        }
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Add widget
          </Button>
        }
        bulk={{ onDelete: async (ids) => ({ updated: ids.length, failed: [] }) }}
      />

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        size="medium"
        isDirty={isFormDirty({ name, status }, detail && { name: detail.name, status: detail.status })}
        onDiscard={() => {
          setName(detail?.name ?? "");
          setStatus(detail?.status ?? "active");
        }}
        footer={
          <div className="flex justify-end gap-2 p-4">
            <Button size="sm">Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {/* A select inside the modal, so the suite has one to drive. Both
              portal to document.body, and a select that paints behind the
              panel looks like a dead control. See the z-index layers in
              globals.css. */}
          <Field label="Status">
            <Select value={status} onValueChange={(v) => setStatus(v as Widget["status"])}>
              <SelectTrigger className="w-full" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="rounded-lg border p-3">
            <DetailRow label="Status" value={detail?.status} />
            <DetailRow label="Price" value={detail && formatMoney(detail.price, DEFAULT_CURRENCY)} />
            <DetailRow label="Quantity" value={detail && formatQuantity(detail.qty)} />
            <DetailRow label="Due" value={detail && formatBusinessDate(detail.dueDate)} />
            <DetailRow label="Notes" value={null} />
          </div>
        </div>
      </Modal>

      {/* Starting something new opens centred on a laptop. It saves nothing: it is
          here so the suite can check where a centred modal lands. */}
      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New widget" placement="center">
        <p className="text-sm text-muted-foreground">The fixture saves nothing.</p>
      </Modal>
    </>
  );
}
