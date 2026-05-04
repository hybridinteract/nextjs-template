import { LayoutDashboard, Settings, Users, Shield } from "lucide-react";
import type { PermissionedNavItem } from "@/lib/permissions";

// ── Navigation items ────────────────────────────────────────────────────────
// Add permission/permissions to gate visibility by role.
// Leave both undefined to show to all authenticated users.
export const dashboardNavItems: PermissionedNavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: "settings.view",
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
    permissions: ["users.view", "users.manage"],
  },
  {
    name: "Access Control",
    href: "/dashboard/access-control",
    icon: Shield,
    permission: "roles.manage",
  },
];

// ── Route constants ─────────────────────────────────────────────────────────
// Never hardcode URL strings in components. Import from here.
export const ROUTES = {
  home: "/dashboard",
  settings: "/dashboard/settings",
  users: "/dashboard/users",
  userDetail: (id: string) => `/dashboard/users/${id}`,
  accessControl: "/dashboard/access-control",
  login: "/login",
} as const;
