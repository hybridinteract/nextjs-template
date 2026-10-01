"use client";

import { Check, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { notify } from "@/lib/toast";
import { Field } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Caption, Showcase } from "./showcase";

export function ButtonsSection() {
  return (
    <Showcase
      id="buttons"
      title="Buttons"
      note="Always <Button variant size>, never a class string or a raw <button>. One default (primary) button per area."
    >
      <div className="space-y-5">
        <div>
          <Caption>Variants</Caption>
          <div className="flex flex-wrap items-center gap-2">
            <Button><Plus />New order</Button>
            <Button variant="secondary">Save draft</Button>
            <Button variant="outline"><Pencil />Edit</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive"><Trash2 />Delete</Button>
            <Button variant="link">View history</Button>
          </div>
        </div>
        <div>
          <Caption>Sizes: xs · sm · default · lg · icon</Caption>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Extra small</Button>
            <Button size="sm"><Check />Approve</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="outline" aria-label="Print"><Printer /></Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </div>
    </Showcase>
  );
}

export function FieldsSection() {
  return (
    <Showcase
      id="fields"
      title="Fields"
      note="Every control sits in <Field>, which ties the label to it. A hint goes under the control. An error replaces the hint, in words."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Customer name" required>
          <Input placeholder="Name or mobile" />
        </Field>
        <Field label="Reference" hint="Printed on the invoice">
          <Input defaultValue="ORD-1042" />
        </Field>
        <Field label="Mobile" required error="Enter a 10-digit mobile number">
          <Input defaultValue="98470 1234" />
        </Field>
        <Field label="Notes">
          <Textarea placeholder="Anything the next person should know" />
        </Field>
        <ChoiceFields />
      </div>
    </Showcase>
  );
}

function ChoiceFields() {
  return (
    <>
      {/* `htmlFor`, because Field cannot reach inside a Select to wire the label. */}
      <Field label="Status" htmlFor="design-status">
        <Select defaultValue="active">
          <SelectTrigger id="design-status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex flex-wrap items-center gap-6">
        <Label><Checkbox defaultChecked />Send a receipt</Label>
        <Label><Switch defaultChecked />Online orders open</Label>
      </div>
      <RadioGroup defaultValue="pickup" className="flex gap-6">
        <Label><RadioGroupItem value="pickup" />Pickup</Label>
        <Label><RadioGroupItem value="delivery" />Delivery</Label>
      </RadioGroup>
    </>
  );
}

const TONES: { tone: StatusTone; label: string }[] = [
  { tone: "neutral", label: "Draft" },
  { tone: "info", label: "Scheduled" },
  { tone: "brand", label: "In progress" },
  { tone: "success", label: "Paid" },
  { tone: "warning", label: "Due soon" },
  { tone: "danger", label: "Overdue" },
];

export function StatusSection() {
  return (
    <Showcase
      id="status"
      title="Status"
      note="Every status maps onto one of six tones, in a small helper per module. The tone says good or bad. The label says what happened."
    >
      <div className="flex flex-wrap gap-2">
        {TONES.map(({ tone, label }) => (
          <StatusBadge key={tone} tone={tone} label={label} />
        ))}
      </div>
    </Showcase>
  );
}

export function FeedbackSection() {
  return (
    <Showcase
      id="feedback"
      title="Feedback"
      note="Toasts go through notify, from the mutation hook, once per action. An error stays twice as long as a success. A loading list shows skeleton rows, not a spinner."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => notify.success("Order created")}>Success</Button>
          <Button size="sm" variant="outline" onClick={() => notify.warning("Updated 12 orders, 1 skipped.")}>Warning</Button>
          <Button size="sm" variant="outline" onClick={() => notify.info("No changes to save")}>Info</Button>
          <Button size="sm" variant="outline" onClick={() => notify.error("Could not save the order")}>Error</Button>
        </div>
        <div className="max-w-md space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </Showcase>
  );
}
