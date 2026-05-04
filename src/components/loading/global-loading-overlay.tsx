"use client";

import { useBlockingLoadingStore } from "@/lib/loading";
import { cn } from "@/lib/utils";

export function GlobalLoadingOverlay() {
  const entries = useBlockingLoadingStore((s) => s.entries);
  const isBlocking = entries.length > 0;
  const label = entries.at(-1)?.label;

  if (!isBlocking) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-background/60 backdrop-blur-sm",
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        {label && (
          <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
        )}
      </div>
    </div>
  );
}
