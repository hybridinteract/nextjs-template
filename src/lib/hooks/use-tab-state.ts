"use client";

import { useState, useEffect, useCallback } from "react";

interface Tab {
  key: string;
}

interface UseTabStateOptions {
  tabs: Tab[];
  defaultTab?: string;
  paramName?: string;
}

export function useTabState({ tabs, defaultTab, paramName = "tab" }: UseTabStateOptions) {
  const getInitialTab = () => {
    if (typeof window === "undefined") return defaultTab ?? tabs[0]?.key ?? "";
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(paramName);
    if (fromUrl && tabs.some((t) => t.key === fromUrl)) return fromUrl;
    return defaultTab ?? tabs[0]?.key ?? "";
  };

  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, tab);
        window.history.replaceState({}, "", url.toString());
      }
    },
    [paramName],
  );

  useEffect(() => {
    const initial = getInitialTab();
    setActiveTabState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [activeTab, setActiveTab] as const;
}
