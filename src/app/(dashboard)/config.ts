import { LayoutDashboard } from "lucide-react";
import type { PermissionedNavItem } from "@/lib/permissions";

// ── Navigation items ────────────────────────────────────────────────────────
// Add permission/permissions to gate visibility by role.
// Leave both undefined to show to all authenticated users.
// `node ncube.js startdomain` adds each new module here and to ROUTES.
export const dashboardNavItems: PermissionedNavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

// ── Route constants ─────────────────────────────────────────────────────────
// Never hardcode URL strings in components. Import from here.
export const ROUTES = {
  home: "/dashboard",
  login: "/login",
} as const;
