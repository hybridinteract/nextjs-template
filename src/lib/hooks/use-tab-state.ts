"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface Tab {
  key: string;
}

interface UseTabStateOptions {
  tabs: Tab[];
  defaultTab?: string;
  paramName?: string;
}

/**
 * Tab selection, held in the URL rather than in component state.
 *
 * There is deliberately **no local state here**. The query string is the only
 * source of truth, so back/forward work, a tab is shareable by link, and there is
 * no second copy to fall out of step with the URL. Reading `useSearchParams`
 * makes it reactive, so an external URL change (a browser Back, a link from a
 * notification) just re-renders with the new tab.
 *
 * Needs dynamic rendering — `app/(dashboard)/dashboard/layout.tsx` already exports
 * `dynamic = "force-dynamic"` for exactly this.
 */
export function useTabState({ tabs, defaultTab, paramName = "tab" }: UseTabStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fromUrl = searchParams?.get(paramName);
  const activeTab =
    fromUrl && tabs.some((t) => t.key === fromUrl)
      ? fromUrl
      : defaultTab ?? tabs[0]?.key ?? "";

  const setActiveTab = useCallback(
    (tab: string) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.set(paramName, tab);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [paramName, searchParams, pathname, router],
  );

  return [activeTab, setActiveTab] as const;
}
