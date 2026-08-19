import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Icon node (e.g. a lucide icon) rendered in a tinted chip. */
  icon?: ReactNode;
  /** Action buttons, rendered on the right. */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
              {icon}
            </div>
          )}
          <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
        </div>
        {/* Hidden on phones: the actions and the table matter more than the
            explanation on a 375px screen. */}
        {description && (
          <p className="hidden max-w-[640px] text-sm leading-relaxed text-muted-foreground sm:block">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2 sm:pt-1">{children}</div>}
    </div>
  );
}
