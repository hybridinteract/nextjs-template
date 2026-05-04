"use client";

import { useEffect } from "react";

interface Tab {
  key: string;
}

interface UseZustandTabSyncOptions {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  paramName?: string;
}

// Syncs a Zustand-stored tab state with URL search params.
// Use when tab state already lives in a Zustand store (e.g., useLeadStore).
export function useZustandTabSync({
  tabs,
  activeTab,
  setActiveTab,
  paramName = "tab",
}: UseZustandTabSyncOptions) {
  // Initialize store from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(paramName);
    if (fromUrl && tabs.some((t) => t.key === fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL when store activeTab changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab, paramName]);
}
