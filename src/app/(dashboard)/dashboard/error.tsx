"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/utilities";

/**
 * Catches a crash in one dashboard page **without taking the shell with it**.
 *
 * Because this boundary sits inside `(dashboard)/layout.tsx`, the sidebar and top
 * bar keep rendering and the user can navigate to another page. The root
 * `app/error.tsx` would replace the whole screen instead, stranding them.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Dashboard page error", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-5 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">
          This page could not be shown
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The rest of the app is still working — pick another page from the menu, or
          try this one again.
        </p>
        {error.digest && (
          <p className="pt-1 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        <RotateCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
