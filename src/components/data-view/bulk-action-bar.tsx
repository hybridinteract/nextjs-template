"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SearchableSelect } from "@/components/shared/searchable-select";
import type { BulkConfig, BulkFieldAction, BulkOutcome } from "./types";

/** Same threshold as the toolbar's filters — see `SEARCHABLE_FROM` there. */
const SEARCHABLE_FROM = 10;

/** The bar's own surface, so the searchable trigger matches the plain Selects beside it. */
const TRIGGER_CLASS =
  "h-8 w-40 shrink-0 rounded-xl border-border bg-muted/50 text-sm text-popover-foreground hover:bg-muted hover:text-popover-foreground";

export interface BulkActionBarProps {
  bulk: BulkConfig;
  selectedIds: string[];
  entityName?: string;
  onDone: () => void;
}

function summarize(outcome: BulkOutcome, entityName: string) {
  if (outcome.failed.length === 0) {
    return `Updated ${outcome.updated} ${entityName}.`;
  }
  return `Updated ${outcome.updated} ${entityName}, ${outcome.failed.length} skipped.`;
}

/**
 * Floating bottom-center bar shown while rows are selected on a `<DataView>`.
 * High-contrast floating dock with ambient glow, bold selection badge,
 * and spring entrance animation so users immediately notice it.
 */
export function BulkActionBar({ bulk, selectedIds, entityName = "items", onDone }: BulkActionBarProps) {
  const [fieldKey, setFieldKey] = useState<string | null>(null);
  const [value, setValue] = useState<string | null>(null);
  const [pendingField, setPendingField] = useState<BulkFieldAction | null>(null);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const count = selectedIds.length;
  const canEdit = bulk.canEdit ?? true;
  const canDelete = (bulk.canDelete ?? true) && !!bulk.onDelete;
  const fields = bulk.fields ?? [];
  const activeField = fields.find((f) => f.key === fieldKey) ?? null;

  // Reset field/value once nothing is selected (the bar is hidden). Done during
  // render on the transition to zero, not in an effect — see `use-row-selection`
  // for why this shape is the one React sanctions.
  const [hadSelection, setHadSelection] = useState(count > 0);
  if (hadSelection !== count > 0) {
    setHadSelection(count > 0);
    if (count === 0) {
      setFieldKey(null);
      setValue(null);
    }
  }

  // The bar is portalled into document.body, so it must not render on the server.
  // `useSyncExternalStore` answers "are we on the client?" without a setState in
  // an effect — the subscribe callback never fires, the client snapshot is always
  // true, and the server snapshot is always false.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted || count === 0 || (!canEdit && !canDelete)) return null;

  const askApply = () => {
    if (!activeField || !value) return;
    setPendingField(activeField);
    setPendingValue(value);
  };

  const confirmApply = async () => {
    if (!pendingField || pendingValue === null) return;
    setBusy(true);
    try {
      const outcome = await pendingField.apply(pendingValue, selectedIds);
      toast.success(summarize(outcome, entityName));
      onDone();
      setFieldKey(null);
      setValue(null);
    } catch {
      // Errors already surfaced by the underlying mutation's handleError → toast.error.
    } finally {
      setBusy(false);
      setPendingField(null);
      setPendingValue(null);
    }
  };

  const confirmDelete = async () => {
    if (!bulk.onDelete) return;
    setBusy(true);
    try {
      const outcome = await bulk.onDelete(selectedIds);
      toast.success(
        outcome.failed.length === 0
          ? `Deleted ${outcome.updated} ${entityName}.`
          : `Deleted ${outcome.updated} ${entityName}, ${outcome.failed.length} skipped.`,
      );
      onDone();
    } catch {
      // Errors already surfaced by the underlying mutation's handleError → toast.error.
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  const confirmCopy = pendingField?.confirm?.(pendingValue ?? "", count) ?? {
    title: `Change ${pendingField?.label ?? "field"}?`,
    description: `Change ${pendingField?.label.toLowerCase()} of ${count} ${entityName} to “${
      pendingField?.options.find((o) => o.value === pendingValue)?.label ?? pendingValue
    }”?`,
  };

  return createPortal(
    <>
      <AnimatePresence>
        <motion.div
          key="bulk-action-bar"
          initial={{ opacity: 0, y: 32, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="fixed bottom-6 left-1/2 z-[100] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-nowrap items-center gap-2.5 overflow-x-auto overflow-y-hidden rounded-2xl border border-border bg-popover px-4 py-2.5 text-popover-foreground shadow-2xl"
        >
          {/* Ambient top light beam highlight */}
          <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent pointer-events-none" />

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm">
              <CheckSquare className="size-3.5" />
              <span>{count} selected</span>
            </span>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted/60 hover:bg-muted px-2.5 py-1 text-xs font-medium text-popover-foreground border border-border transition-all active:scale-95 shadow-xs"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="size-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {canEdit && fields.length > 0 && (
            <>
              <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
              <Select
                value={fieldKey ?? undefined}
                onValueChange={(v) => {
                  setFieldKey(v);
                  setValue(null);
                }}
              >
                <SelectTrigger size="sm" className="w-38 shrink-0 bg-muted/50 text-popover-foreground border-border hover:bg-muted hover:border-border focus:ring-ring rounded-xl data-[placeholder]:text-muted-foreground! [&_svg:not([class*='text-'])]:text-muted-foreground!">
                  <SelectValue placeholder="Change field…" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeField &&
                (activeField.options.length >= SEARCHABLE_FROM ? (
                  <SearchableSelect
                    value={value ?? ""}
                    onChange={setValue}
                    options={activeField.options}
                    placeholder={`Select ${activeField.label.toLowerCase()}…`}
                    searchPlaceholder={`Search ${activeField.label.toLowerCase()}…`}
                    emptyText="No matches."
                    className={TRIGGER_CLASS}
                    aria-label={activeField.label}
                  />
                ) : (
                  <Select value={value ?? undefined} onValueChange={setValue}>
                    <SelectTrigger size="sm" className="w-40 shrink-0 bg-muted/50 text-popover-foreground border-border hover:bg-muted hover:border-border focus:ring-ring rounded-xl data-[placeholder]:text-muted-foreground! [&_svg:not([class*='text-'])]:text-muted-foreground!">
                      <SelectValue placeholder={`Select ${activeField.label.toLowerCase()}…`} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeField.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}

              <Button size="sm" className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm" disabled={!activeField || !value || busy} onClick={askApply}>
                Apply
              </Button>
            </>
          )}

          {(bulk.customActions ?? []).map((action) => (
            <span key={action.key} className="flex shrink-0 items-center gap-2">
              <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 whitespace-nowrap rounded-xl bg-muted/60 text-popover-foreground border-border hover:bg-muted hover:text-foreground"
                disabled={busy}
                onClick={() => action.onClick([...selectedIds], onDone)}
              >
                {action.icon}
                {action.label}
              </Button>
            </span>
          ))}

          {canDelete && (
            <>
              <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 whitespace-nowrap rounded-xl text-destructive hover:bg-destructive/15 hover:text-destructive font-medium"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5 mr-1" />
                Delete
              </Button>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <AlertDialog
        open={pendingField !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingField(null);
            setPendingValue(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply} disabled={busy}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} {entityName}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={busy}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body,
  );
}
