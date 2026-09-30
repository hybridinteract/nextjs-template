"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { CommandItem } from "@/components/ui/command";

/**
 * The palette's light/dark switch. The only place in the app a person can
 * change the theme. Its own file so `node ncube.js remove dark-mode` can delete
 * it.
 */
export function ThemeCommand({ run }: { run: (action: () => void) => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <CommandItem
      value="theme dark light mode appearance"
      onSelect={() => run(() => setTheme(isDark ? "light" : "dark"))}
    >
      <Icon className="size-4 text-muted-foreground" />
      Switch to {isDark ? "light" : "dark"} mode
    </CommandItem>
  );
}
