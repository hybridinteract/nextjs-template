"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { startBlockingLoad } from "./store";

// Wraps Next.js router with automatic route-loading token management.
// Use instead of useRouter() for consistent loading overlay during navigation.
export function useTrackedRouter() {
  const router = useRouter();

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) => {
      const stop = startBlockingLoad(`route-${href}`, "route", "Loading…");
      router.push(href, options);
      // The RouteLoadingObserver in the layout will clean this up on navigation end
      // Fallback cleanup in case navigation is instant
      setTimeout(stop, 5000);
    },
    [router],
  );

  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) => {
      const stop = startBlockingLoad(`route-replace-${href}`, "route", "Loading…");
      router.replace(href, options);
      setTimeout(stop, 5000);
    },
    [router],
  );

  return { ...router, push, replace };
}
