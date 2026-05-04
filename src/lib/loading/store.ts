"use client";

import { create } from "zustand";
import type { LoadingEntry, BlockingLoadSource } from "./types";

interface BlockingLoadingState {
  entries: LoadingEntry[];
  add: (entry: Omit<LoadingEntry, "startedAt">) => void;
  remove: (id: string) => void;
  isBlocking: () => boolean;
  currentLabel: () => string | undefined;
}

export const useBlockingLoadingStore = create<BlockingLoadingState>((set, get) => ({
  entries: [],

  add: (entry) =>
    set((state) => ({
      entries: [...state.entries, { ...entry, startedAt: Date.now() }],
    })),

  remove: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),

  isBlocking: () => get().entries.length > 0,

  currentLabel: () => get().entries.at(-1)?.label,
}));

// Convenience: start a loading token and return a cleanup function
export function startBlockingLoad(
  id: string,
  source: BlockingLoadSource,
  label?: string,
): () => void {
  useBlockingLoadingStore.getState().add({ id, source, label });
  return () => useBlockingLoadingStore.getState().remove(id);
}
