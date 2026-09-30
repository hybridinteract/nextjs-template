"use client";

import { useState } from "react";
import { IndianRupee, Trash2 } from "lucide-react";
import { formatBusinessDate, formatDateTime } from "@/lib/date-utils";
import { useDisplayTimeZone } from "@/lib/timezone";
import { DataTable, DetailRow, Field, StatsCard, type Column } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Caption, Showcase } from "./showcase";

interface SampleOrder {
  id: string;
  reference: string;
  customer: string;
  dueDate: string;
  paid: boolean;
}

const SAMPLE_ORDERS: SampleOrder[] = [
  { id: "1", reference: "ORD-1042", customer: "Ravi Kumar", dueDate: "2026-09-24", paid: true },
  { id: "2", reference: "ORD-1043", customer: "Anita Joseph", dueDate: "2026-09-28", paid: false },
  { id: "3", reference: "ORD-1044", customer: "Meera Nair", dueDate: "2026-10-02", paid: false },
];

const COLUMNS: Column<SampleOrder>[] = [
  { key: "reference", header: "Reference", mobilePrimary: true },
  { key: "customer", header: "Customer" },
  { key: "dueDate", header: "Due", cell: (row) => formatBusinessDate(row.dueDate) },
  {
    key: "paid",
    header: "Status",
    cell: (row) => <StatusBadge tone={row.paid ? "success" : "warning"} label={row.paid ? "Paid" : "Unpaid"} />,
  },
];

export function DataSection() {
  const timeZone = useDisplayTimeZone();
  return (
    <Showcase
      id="data"
      title="Data"
      note="A list page is always <DataView>, which wraps this table with search, filters, paging and the empty and error states. The table turns into cards on a phone. Read-only values use <DetailRow>."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard title="Orders this month" value="128" description="12 more than August" />
          <StatsCard title="Unpaid" value="₹4.2L" icon={IndianRupee} />
          <StatsCard title="Due this week" value="9" />
        </div>
        <DataTable columns={COLUMNS} data={SAMPLE_ORDERS} keyExtractor={(row) => row.id} />
        <div className="max-w-md rounded-lg border border-border p-4">
          <Caption>DetailRow</Caption>
          <DetailRow label="Customer" value="Ravi Kumar" />
          <DetailRow label="Created" value={formatDateTime("2026-09-24T09:30:00Z", { timeZone })} />
          <DetailRow label="Notes" value={null} />
        </div>
      </div>
    </Showcase>
  );
}

export function DialogsSection() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [centredOpen, setCentredOpen] = useState(false);

  return (
    <Showcase
      id="dialogs"
      title="Dialogs"
      note="Always <Modal>. Opening a record from a list is the side panel. Starting something new is placement=&quot;center&quot;. A phone gets a bottom sheet either way. A destructive action asks first, in an AlertDialog."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setPanelOpen(true)}>Side panel</Button>
        <Button variant="outline" onClick={() => setCentredOpen(true)}>Centred</Button>
        <DeleteConfirm />
      </div>
      <SidePanelSample isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
      <CentredSample isOpen={centredOpen} onClose={() => setCentredOpen(false)} />
    </Showcase>
  );
}

function SidePanelSample({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ORD-1042"
      footer={
        <div className="flex justify-end gap-2 p-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <DetailRow label="Customer" value="Ravi Kumar" />
      <DetailRow label="Due" value={formatBusinessDate("2026-09-24")} />
      <DetailRow label="Status" value={<StatusBadge tone="success" label="Paid" />} />
    </Modal>
  );
}

function CentredSample({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [customer, setCustomer] = useState("");
  // The panel stays mounted while closed, so it clears on the way out. The unsaved-work
  // guard compares against the empty form it opened with.
  const close = () => {
    setCustomer("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="New order"
      placement="center"
      isDirty={customer !== ""}
      footer={
        <div className="flex justify-end gap-2 p-4">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={close}>Create</Button>
        </div>
      }
    >
      <Field label="Customer" required hint="Type something, then press Escape">
        <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
      </Field>
    </Modal>
  );
}

function DeleteConfirm() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive"><Trash2 />Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this order?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
