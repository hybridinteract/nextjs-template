"use client";

import { useEffect } from "react";
import { useMe, useAuthStore } from "@/lib/auth";
import { useRoleStore, useFilteredNavItems } from "@/lib/permissions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { dashboardNavItems } from "./config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
