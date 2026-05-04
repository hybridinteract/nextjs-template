import type { PermissionedNavItem } from "@/types";

// ── Roles ──────────────────────────────────────────────────────────────────────
export const BUILTIN_ROLES = ["super_admin", "admin", "member", "viewer"] as const;
export type BuiltinUserRole = (typeof BUILTIN_ROLES)[number];
export type UserRole = BuiltinUserRole | string;

// ── Permissions ────────────────────────────────────────────────────────────────
// Format: "resource.action" — customize for your project
export const PERMISSIONS = [
  // User management
  "users.view",
  "users.manage",
  "users.delete",
  // Roles & access
  "roles.manage",
  // Settings
  "settings.view",
  "settings.manage",
  // Content (replace with your actual domain permissions)
  "content.view",
  "content.create",
  "content.edit",
  "content.delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number] | string;

// Re-export for use in layout
export type { PermissionedNavItem };
