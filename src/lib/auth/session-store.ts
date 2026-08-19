"use client";

import { create } from "zustand";

interface SessionState {
  /** True once a token refresh has failed and the session cannot be recovered. */
  isExpired: boolean;
  /** Where to send the user back to after they sign in again. */
  redirectTo: string | null;
  markExpired: (redirectTo: string | null) => void;
  reset: () => void;
}

/**
 * "The session is gone" — held in a store rather than acted on directly.
 *
 * The api-client used to answer a failed refresh with
 * `window.location.href = "/login"`. That is a navigation, so anything the user
 * had typed and not saved went with it — on a long form that is minutes of work
 * and no way back. Nothing warned them, and nothing could: the decision was made
 * three layers below the form.
 *
 * Setting a flag instead lets `<SessionExpiredDialog>` explain what happened and
 * let the user decide when to leave the page.
 */
export const useSessionStore = create<SessionState>((set) => ({
  isExpired: false,
  redirectTo: null,
  // Ignore repeat notifications: a screen with six queries in flight will report
  // the same dead session six times, and the first one already told the truth.
  markExpired: (redirectTo) =>
    set((s) => (s.isExpired ? s : { isExpired: true, redirectTo })),
  reset: () => set({ isExpired: false, redirectTo: null }),
}));
