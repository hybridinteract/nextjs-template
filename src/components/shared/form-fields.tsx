"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled form field.
 *
 * The label is **associated** with the control, not just placed above it. That
 * association is what makes clicking the label focus the input, and what makes a
 * screen reader announce "Email, edit text" instead of "edit text". It is also
 * what `getByLabelText` uses, so an unassociated field is invisible to tests as
 * well as to assistive technology.
 *
 * To do that it clones its single child to add an `id` (unless the child already
 * has one) plus `aria-invalid` and `aria-describedby`. If you need to pass more
 * than one element, give the real control an `id` and pass the same value as
 * `htmlFor` — the clone is skipped and the wiring stays explicit.
 */
export function Field({
  label,
  error,
  required,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  error?: string;
  /** Appends a marker to the label to signal a mandatory field. */
  required?: boolean;
  /** Helper text under the control, shown only when there is no error. */
  hint?: string;
  /** Set this when the field holds more than one element. */
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();

  // Clone only when there is exactly one element to clone and the caller has not
  // taken over the wiring with `htmlFor`.
  const childArray = Children.toArray(children);
  const single = childArray.length === 1 && isValidElement(childArray[0]) ? childArray[0] : null;
  const ownId = single ? (single.props as { id?: string }).id : undefined;

  // Precedence matters: an explicit `htmlFor` wins, then whatever id the control
  // already had, and only then a generated one. Getting this order wrong points
  // the label at an id nothing has — which is the same as having no label.
  const controlId = htmlFor ?? ownId ?? generatedId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control =
    !htmlFor && single
      ? cloneElement(single as React.ReactElement<Record<string, unknown>>, {
          id: controlId,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
        })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={controlId} className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {control}
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
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
