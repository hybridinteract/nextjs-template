"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/utilities";

/**
 * Catches render errors anywhere in the app that a nearer boundary did not.
 *
 * Without this file one thrown error in one component white-screens the whole
 * app — the user sees nothing, not even a way to retry.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled render error", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This page hit an error it could not recover from. Trying again often works.
        </p>
        {/* The digest is the only handle on a production stack trace, which is
            stripped from the client. Without it a support report is unmatchable. */}
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
