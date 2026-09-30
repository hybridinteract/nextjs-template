import { Toaster } from "@/components/ui/sonner";
import { GlobalLoadingOverlay } from "@/components/loading/global-loading-overlay";
import { SessionExpiredDialog } from "@/components/auth/session-expired-dialog";
import { QueryProvider } from "./query-provider";

/**
 * What the signed-in half of the app needs, and the public site does not.
 * Mounted by the `(auth)` and `(dashboard)` layouts, not the root one.
 *
 * In the root layout, every public page downloaded TanStack Query, sonner, the
 * loading store and a Radix alert dialog, and used none of them. Influen
 * measured 56KB for TanStack alone. A public page that does need one of these
 * (a contact form, say) mounts `<AppProviders>` in its own layout.
 *
 * Moving between `(auth)` and `(dashboard)` unmounts one copy and mounts the
 * other. The query cache survives that, because `QueryProvider` keeps one client
 * per browser tab. The toaster does not: a toast raised just before sign-in or
 * sign-out moves you across goes with the old copy. Say it on the page you land
 * on instead.
 *
 * The Toaster goes FIRST. React runs an earlier sibling's effects before a later
 * one's, and sonner's Toaster only shows toasts raised after its own effect
 * subscribes. Mounted last, it missed every toast a page raised while mounting.
 * Influen found it with a "you're signed out" notice that never appeared. It
 * sets its own z-index, so being first in the DOM does not put it behind.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <Toaster richColors position="top-right" />
      {children}
      <GlobalLoadingOverlay />
      <SessionExpiredDialog />
    </QueryProvider>
  );
}
