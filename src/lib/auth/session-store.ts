"use client";

import { create } from "zustand";

interface SessionState {
  /** True once a token refresh has failed and the session cannot be recovered. */
  isExpired: boolean;
  /** True from the moment a deliberate sign-out starts until the next sign-in. */
  isSigningOut: boolean;
  /** Where to send the user back to after they sign in again. */
  redirectTo: string | null;
  markExpired: (redirectTo: string | null) => void;
  beginSignOut: () => void;
  cancelSignOut: () => void;
  clearExpired: () => void;
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
 *
 * **A deliberate sign-out is not an expired session.** `useLogout` drops the
 * cookies and clears the query cache while the dashboard is still mounted. Any
 * query that refetches in that gap gets a 401, and each 401 would raise the
 * dialog on the login page, telling someone who just clicked "Sign out" that
 * their session ended. Influen hit this as soon as its logout also cleared a
 * saved store, because that re-rendered the shell and refired its queries.
 */
export const useSessionStore = create<SessionState>((set) => ({
  isExpired: false,
  isSigningOut: false,
  redirectTo: null,
  // Ignore repeat notifications: a screen with six queries in flight will report
  // the same dead session six times, and the first one already told the truth.
  markExpired: (redirectTo) =>
    set((s) => (s.isExpired || s.isSigningOut ? s : { isExpired: true, redirectTo })),
  // Raised before the logout request goes out, not after it lands. The 401s it
  // causes arrive a beat later, so a flag set in `onSuccess` is already too late.
  beginSignOut: () => set({ isSigningOut: true }),
  // The logout request failed, so the person is still signed in. A real expiry
  // after this must still be able to raise the dialog.
  cancelSignOut: () => set({ isSigningOut: false }),
  // **Leaves `isSigningOut` alone, and that is the point.** `<LoginForm>` calls
  // this on mount, and the login page can mount before the dashboard's last 401s
  // have landed. Dropping the sign-out flag here would let them raise the dialog
  // on top of the login form.
  clearExpired: () => set({ isExpired: false, redirectTo: null }),
  // Everything, including the sign-out flag. Only a new session may call this:
  // `useLogin`, and the dialog's own "Sign in again".
  reset: () => set({ isExpired: false, isSigningOut: false, redirectTo: null }),
}));
