"use client";

import { useEffect } from "react";
import { useMe, useAuthStore } from "@/lib/auth";
import { useRoleStore, useFilteredNavItems } from "@/lib/permissions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AppProviders } from "@/components/providers/app-providers";
import { dashboardNavItems } from "./config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <DashboardFrame>{children}</DashboardFrame>
    </AppProviders>
  );
}

// A child of the layout, not the layout itself, because useMe needs the query
// client that AppProviders puts above it.
function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { data: user } = useMe();
  const setUser = useAuthStore((s) => s.setUser);
  const { setRole, setIsSuperuser, setEffectivePermissions } = useRoleStore();
  const navItems = useFilteredNavItems(dashboardNavItems);

  useEffect(() => {
    if (user) {
      setUser(user);
      setRole(user.role);
      setIsSuperuser(user.isSuperuser);
      setEffectivePermissions(user.effectivePermissions);
    }
  }, [user, setUser, setRole, setIsSuperuser, setEffectivePermissions]);

  return <DashboardShell navItems={navItems}>{children}</DashboardShell>;
}
