"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled form field. Use this rather than a bare `<Label>` + input, so every
 * field in the app has the same spacing, the same required marker and the same
 * error position.
 */
export function Field({
  label,
  error,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  /** Appends a marker to the label to signal a mandatory field. */
  required?: boolean;
  /** Helper text under the control, shown only when there is no error. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * One label/value row in a read-only detail view — the `view` half of a Modal
 * that flips between viewing and editing.
 *
 * Renders an em dash for an empty value rather than collapsing the row, so the
 * shape of the record stays readable when half its fields are blank.
 */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value || "—"}</span>
    </div>
  );
}
