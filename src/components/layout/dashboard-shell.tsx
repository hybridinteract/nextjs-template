"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLogout, useAuthStore } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import type { PermissionedNavItem } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardShellProps {
  navItems: PermissionedNavItem[];
  children: React.ReactNode;
  moduleTitle?: string;
}

export function DashboardShell({
  navItems,
  children,
  moduleTitle = process.env.NEXT_PUBLIC_APP_NAME ?? "My App",
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70",
              collapsed && "justify-center px-2",
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            {!collapsed && <span>{item.name}</span>}
            {!collapsed && item.badge !== undefined && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-[60px]" : "w-[240px]",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {moduleTitle}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>

        <NavLinks />

        {/* User footer */}
        {user && (
          <div className="border-t border-sidebar-border p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                    collapsed && "justify-center",
                  )}
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(user.fullName || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-xs font-medium text-sidebar-foreground truncate">
                        {user.fullName || user.email}
                      </span>
                      <span className="text-[11px] text-sidebar-foreground/50 truncate">
                        {user.email}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex lg:hidden h-14 items-center border-b px-4 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] bg-sidebar p-0">
              <div className="flex h-14 items-center border-b border-sidebar-border px-4">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  {moduleTitle}
                </span>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">{moduleTitle}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
