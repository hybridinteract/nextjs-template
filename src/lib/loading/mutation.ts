"use client";

import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { useRef } from "react";
import { useBlockingLoadingStore } from "./store";
import type { BlockingLoadSource } from "./types";

interface BlockingOptions {
  source?: BlockingLoadSource;
  label?: string;
}

let tokenCounter = 0;

export function useBlockingMutation<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  blockingOptions: BlockingOptions = {},
): UseMutationResult<TData, TError, TVariables, TContext> {
  const tokenRef = useRef<string | null>(null);
  const { add, remove } = useBlockingLoadingStore();

  return useMutation({
    ...options,

    onMutate: async (variables) => {
      const id = `blocking-${++tokenCounter}`;
      tokenRef.current = id;
      add({
        id,
        source: blockingOptions.source ?? "mutation",
        label: blockingOptions.label,
      });
      return options.onMutate?.(variables);
    },

    onSettled: (...args) => {
      if (tokenRef.current) {
        remove(tokenRef.current);
        tokenRef.current = null;
      }
      return options.onSettled?.(...args);
    },
  });
}
