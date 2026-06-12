"use client";

import type { PermissionedNavItem } from "@/types";
import type { Permission } from "./types";
import { useRoleStore } from "./store";
import { hasPermission, hasAnyPermission, hasAllPermissions, getNavItemsForPermissions } from "./helpers";

export function usePermission(permission: string): boolean {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasPermission(role, isSuperuser, effectivePermissions, permission as Permission);
}

export function useAnyPermission(permissions: string[]): boolean {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasAnyPermission(role, isSuperuser, effectivePermissions, permissions as Permission[]);
}

export function useAllPermissions(permissions: string[]): boolean {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasAllPermissions(role, isSuperuser, effectivePermissions, permissions as Permission[]);
}

export function useFilteredNavItems(items: PermissionedNavItem[]): PermissionedNavItem[] {
  const role = useRoleStore((s) => s.role);
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return getNavItemsForPermissions(items, role, isSuperuser, effectivePermissions);
}
