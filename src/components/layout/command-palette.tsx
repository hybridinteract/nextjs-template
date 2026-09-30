"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { PermissionedNavItem } from "@/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ThemeCommand } from "./theme-command";

/**
 * ⌘K on a Mac, Ctrl K everywhere else. The server renders the Mac form, and the
 * browser corrects it on the first paint.
 */
export function useShortcutLabel(): string {
  return useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );
}

/**
 * Opens and closes the palette on ⌘K or Ctrl+K, from anywhere in the app.
 *
 * In the capture phase, so it fires even when a text field stops the key.
 * ⌘K from inside a search box is exactly when someone reaches for it. Chrome's
 * own ⌘K focuses the address bar, and inside the app ours wins.
 */
export function usePaletteShortcut(toggle: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [toggle]);
}

/** Nav items by their sidebar group, in the order each group first appears. */
function byGroup(items: PermissionedNavItem[]) {
  const groups = new Map<string, PermissionedNavItem[]>();
  for (const item of items) {
    const name = item.group ?? "Go to";
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups];
}

/**
 * Jump to any page the sidebar has, and run a few app-wide actions.
 *
 * It lists the sidebar's own items, already filtered by permission, so a page
 * someone cannot open never shows up here either. A search over records (a
 * customer by name, an order by number) belongs here too once a project has
 * one: add a group that reads a reference feed, never a module's list hook.
 */
export function CommandPalette({
  open,
  onOpenChange,
  navItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: PermissionedNavItem[];
}) {
  const router = useRouter();

  // Close first, then act. Navigating while the dialog is still mounted races
  // Radix's own unmount, and can leave its overlay on the new page.
  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Jump to a page or run an action"
    >
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>
        {byGroup(navItems).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              // cmdk matches on `value`, not on what is drawn. The group is in
              // it, so "settings" finds every page under Settings.
              <CommandItem
                key={item.href}
                value={`${item.name} ${item.group ?? ""}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                {item.icon && <item.icon className="size-4 text-muted-foreground" />}
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Actions">
          <ThemeCommand run={run} />
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
