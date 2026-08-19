import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The frame every page sits in — a header row and the content below it.
 *
 * A server component. Its whole job is to keep page chrome identical across the
 * app, so `page.tsx` stays declarative (metadata, this, and a client view) and
 * never grows hooks.
 */
export function PageLayout({
  title,
  description,
  icon,
  headerActions,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col p-4 sm:p-6 lg:p-8",
        "animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out",
        className,
      )}
    >
      <PageHeader title={title} description={description} icon={icon}>
        {headerActions}
      </PageHeader>
      <div className="w-full min-w-0 flex-1">{children}</div>
    </div>
  );
}
