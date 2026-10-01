"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useBlockingMutation } from "@/lib/loading";
import { notify } from "@/lib/toast";
import { useSessionStore } from "./session-store";
import * as authApi from "./api";
import type { LoginFormValues } from "./types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.fetchMe,
    staleTime: 5 * 60_000,
    // The one sanctioned retry override. A failing /me means "not signed in",
    // and retrying that just makes the login redirect three times slower.
    retry: false,
  });
}

/**
 * Deliberately a plain `useMutation`, not `useBlockingMutation`: the login button
 * already shows its own pending state, and a full-screen overlay over a two-field
 * form is heavier than the action. No success toast either — the navigation is the
 * acknowledgement, and a toast fired here rides through the transition and lands
 * on the dashboard looking orphaned.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (values: LoginFormValues) => authApi.login(values),
    onSuccess: async () => {
      // A new session exists, so the last one's sign-out flag ends here. Not on
      // the login page mounting, where the old dashboard's 401s can still land.
      useSessionStore.getState().reset();
      // Fetch, not invalidate. Nothing observes /me on the login page, so
      // invalidation marks it stale and fetches nothing — the dashboard layout
      // would then mount with no user, seed an empty role store, and render a
      // sidebar with zero nav items until the round trip landed. Priming the
      // cache here spends the navigation's dead time instead.
      await queryClient.prefetchQuery({
        queryKey: authKeys.me,
        queryFn: authApi.fetchMe,
        staleTime: 5 * 60_000,
      });
      router.push("/dashboard");
    },
    onError: (err) => notify.fromError(err, "Login failed"),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useBlockingMutation(
    {
      mutationFn: authApi.logout,
      // Before the request, not after it. Once the cookies are gone, any query
      // that refetches gets a 401, and without this flag each one raises "your
      // session has ended" at someone who chose to leave. See session-store.ts.
      onMutate: () => useSessionStore.getState().beginSignOut(),
      onSuccess: () => {
        queryClient.clear();
        router.push("/login");
      },
      onError: (err) => {
        // Still signed in, so a real expiry later must still raise the dialog.
        useSessionStore.getState().cancelSignOut();
        notify.fromError(err, "Logout failed");
      },
    },
    { source: "auth", label: "Signing out…" },
  );
}
