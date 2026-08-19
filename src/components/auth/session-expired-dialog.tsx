"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSessionStore } from "@/lib/auth/session-store";

/**
 * Shown when a token refresh has failed and the session cannot be recovered.
 *
 * Deliberately has **no cancel button and no dismiss**: nothing on the page will
 * load any more, so offering to stay would only look like the app still works.
 * What it does buy the user is a beat to copy anything they had typed before the
 * navigation takes it — which the old hard redirect never gave them.
 *
 * Mounted once, in the root layout, beside the other global surfaces.
 */
export function SessionExpiredDialog() {
  const isExpired = useSessionStore((s) => s.isExpired);
  const redirectTo = useSessionStore((s) => s.redirectTo);
  const reset = useSessionStore((s) => s.reset);
  const queryClient = useQueryClient();
  const router = useRouter();

  const signInAgain = () => {
    reset();
    queryClient.clear();
    const target = redirectTo
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : "/login";
    router.push(target);
  };

  return (
    <AlertDialog open={isExpired}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your session has ended</AlertDialogTitle>
          <AlertDialogDescription>
            You have been signed out, so nothing on this page will save. Copy anything
            you still need, then sign in again — we will bring you back to this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={signInAgain}>Sign in again</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
