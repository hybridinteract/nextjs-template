"use client";

import type { PermissionedNavItem } from "@/types";
import type { Permission } from "./types";
import { useRoleStore } from "./store";
import { hasPermission, hasAnyPermission, hasAllPermissions, getNavItemsForPermissions } from "./check";

// These take `Permission`, not `string`. The `as Permission` casts they used to
// carry defeated the check entirely: an unmapped key like "orders.raed" compiled
// fine and then returned false for every non-superuser, because hasPermission
// returns false when PERMISSION_MAPPING has no entry. The affordance just went
// missing, silently. Keep the parameter typed so a bad key fails the build.
export function usePermission(permission: Permission): boolean {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasPermission(role, isSuperuser, effectivePermissions, permission);
}

export function useAnyPermission(permissions: Permission[]): boolean {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasAnyPermission(role, isSuperuser, effectivePermissions, permissions);
}

export function useAllPermissions(permissions: Permission[]): boolean {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasAllPermissions(role, isSuperuser, effectivePermissions, permissions);
}

export function useFilteredNavItems(items: PermissionedNavItem[]): PermissionedNavItem[] {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return getNavItemsForPermissions(items, role, isSuperuser, effectivePermissions);
}
