"use client";

import type { PermissionedNavItem } from "@/types";
import { useRoleStore } from "./store";
import { hasPermission, hasAnyPermission, hasAllPermissions, getNavItemsForPermissions } from "./helpers";

export function usePermission(permission: string): boolean {
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasPermission(isSuperuser, effectivePermissions, permission);
}

export function useAnyPermission(permissions: string[]): boolean {
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasAnyPermission(isSuperuser, effectivePermissions, permissions);
}

export function useAllPermissions(permissions: string[]): boolean {
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return hasAllPermissions(isSuperuser, effectivePermissions, permissions);
}

export function useFilteredNavItems(items: PermissionedNavItem[]): PermissionedNavItem[] {
  const isSuperuser = useRoleStore((s) => s.isSuperuser);
  const effectivePermissions = useRoleStore((s) => s.effectivePermissions);
  return getNavItemsForPermissions(items, isSuperuser, effectivePermissions);
}
