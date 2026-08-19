"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the effect version
 * renders `false` once and then corrects itself, which flashes the mobile layout
 * on a desktop first paint — and `react-hooks/set-state-in-effect` rejects it.
 * The server snapshot is `false`, so SSR renders the "does not match" branch.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1024px)");
}

/**
 * Whether the viewer has asked their system to reduce motion.
 *
 * Gate anything that moves on its own — a slide-in, a looping pulse, an
 * auto-advancing carousel. For people with vestibular disorders this is not a
 * preference, it is an accessibility requirement.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
