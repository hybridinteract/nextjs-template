"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataView, useDataView, type FilterConfig, type SortOption } from "@/components/data-view";
import type { Column } from "@/components/shared/data-table";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, DetailRow } from "@/components/shared";
import { isFormDirty } from "@/lib/forms";
import { formatMoney, formatQuantity } from "@/lib/numeric";
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
}

const ROWS: Widget[] = Array.from({ length: 47 }, (_, i) => ({
  id: `w${i + 1}`,
  name: `Widget ${String(i + 1).padStart(2, "0")}`,
  status: (["active", "draft", "archived"] as const)[i % 3],
  price: (1234.5 + i * 10).toFixed(2),
  qty: (1990 + i).toFixed(3),
  dueDate: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
  createdAt: "2026-07-14T21:00:00.000Z",
}));

const TONES: Record<Widget["status"], StatusTone> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

const FILTERS: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "draft", label: "Draft" },
      { value: "archived", label: "Archived" },
    ],
  },
];

const SORTS: SortOption[] = [
  { field: "name", label: "Name" },
  { field: "price", label: "Price" },
];

/** Stands in for a list endpoint: filters, sorts and pages exactly like one. */
function useWidgets(params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ["fixture-widgets", params],
    queryFn: async () => {
      // `?mode=` lets a test drive the failure and empty paths without a backend.
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "fail") throw new Error("The widgets service is unavailable.");
      if (mode === "empty") return { items: [] as Widget[], total: 0 };

      const search = String(params.search ?? "").toLowerCase();
      const status = params.status as string | undefined;
      let rows = ROWS.filter(
        (r) =>
          (!search || r.name.toLowerCase().includes(search)) &&
          (!status || r.status === status),
      );
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
  const dv = useDataView({ namespace: "widgets", defaultSort: { field: "name", order: "asc" } });
  const q = useWidgets(dv.apiParams);
  const [detail, setDetail] = useState<Widget | null>(null);
  const [name, setName] = useState("");

  const columns: Column<Widget>[] = [
    { key: "name", header: "Name", sortable: true, mobilePrimary: true },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge label={r.status} tone={TONES[r.status]} />,
    },
    { key: "price", header: "Price", sortable: true, cell: (r) => formatMoney(r.price, "USD") },
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
        }}
        filters={FILTERS}
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
          <Button size="sm">
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
        isDirty={isFormDirty(name, detail?.name)}
        onDiscard={() => setName(detail?.name ?? "")}
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
          <div className="rounded-lg border p-3">
            <DetailRow label="Status" value={detail?.status} />
            <DetailRow label="Price" value={detail && formatMoney(detail.price, "USD")} />
            <DetailRow label="Quantity" value={detail && formatQuantity(detail.qty)} />
            <DetailRow label="Due" value={detail && formatBusinessDate(detail.dueDate)} />
            <DetailRow label="Notes" value={null} />
          </div>
        </div>
      </Modal>
    </>
  );
}
