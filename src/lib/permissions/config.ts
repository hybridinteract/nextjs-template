import type { BuiltinUserRole, Permission } from "./types";

// ── Role → Permission mapping ──────────────────────────────────────────────────
// super_admin gets [] here because hasPermission() short-circuits for super_admin.
export const ROLE_PERMISSIONS: Record<BuiltinUserRole, Permission[]> = {
  super_admin: [],
  admin: [
    "users.view",
    "users.manage",
    "users.delete",
    "roles.manage",
    "settings.view",
    "settings.manage",
    "content.view",
    "content.create",
    "content.edit",
    "content.delete",
  ],
  member: [
    "content.view",
    "content.create",
    "content.edit",
  ],
  viewer: [
    "content.view",
  ],
};

// ── Role display metadata ──────────────────────────────────────────────────────
export const ROLE_LABELS: Record<BuiltinUserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_COLORS: Record<BuiltinUserRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

// Post-login redirect for all roles
export const DEFAULT_DASHBOARD = "/dashboard";
