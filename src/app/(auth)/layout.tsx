import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";

// Search engines should never list a sign-in page, and once anything public
// links here they will find it. Unlike a robots.txt block, noindex keeps the
// address itself out of the results too.
export const metadata: Metadata = { robots: { index: false } };

// Sign-in fires a mutation and raises toasts, so this half needs the query
// client and the toaster. The public site does not. See app-providers.tsx.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        {children}
      </div>
    </AppProviders>
  );
}
