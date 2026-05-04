import { cn } from "@/lib/utils";

interface FullscreenLoaderProps {
  label?: string;
  className?: string;
}

export function FullscreenLoader({ label, className }: FullscreenLoaderProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[200px] w-full items-center justify-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
