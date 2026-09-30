import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/app/(dashboard)/config";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "My App";

/**
 * The public site: pages anyone can read without signing in. The home page,
 * pricing, the legal pages and the like go in this folder.
 *
 * It mounts no providers on purpose. No query client, no toaster, no loading
 * overlay, so a visitor who never signs in downloads none of them. A page here
 * that needs one mounts <AppProviders> in its own layout. See
 * docs/rules/08-components-and-routing.md.
 *
 * No public site? `node ncube.js remove site` deletes this folder and sends "/"
 * to the dashboard again.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-semibold text-foreground">
            {APP_NAME}
          </Link>
          {/* Right for someone already signed in too: the proxy sends them from
              the login page straight to the dashboard. Reading the cookie here
              instead would make every public page render per request. */}
          <Button asChild size="sm">
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          {APP_NAME}
        </div>
      </footer>
    </div>
  );
}
