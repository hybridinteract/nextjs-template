import type { BuiltinUserRole } from "./types";

// ── Role display metadata ──────────────────────────────────────────────────────
export const ROLE_LABELS: Record<BuiltinUserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

// Post-login redirect for all roles
export const DEFAULT_DASHBOARD = "/dashboard";
