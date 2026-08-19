import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The six tones every status in the app maps onto.
 *
 * Deliberately six, and deliberately not domain names. A module maps its own
 * statuses onto these in a small helper (`orderStatusTone(status)`) — that way a
 * status pill looks the same everywhere, and adding a seventh tone is a decision
 * someone has to make on purpose rather than by reflex.
 */
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
  brand: "bg-primary/10 text-primary border-primary/25",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

/** Semantic status pill, built on the shadcn `<Badge>` primitive. */
export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </Badge>
  );
}
