import type { PermissionedNavItem } from "@/types";

export function hasPermission(
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
  permission: string,
): boolean {
  if (isSuperuser) return true;
  return effectivePermissions.has(permission);
}

export function hasAnyPermission(
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
  permissions: string[],
): boolean {
  if (isSuperuser) return true;
  return permissions.some((p) => effectivePermissions.has(p));
}

export function hasAllPermissions(
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
  permissions: string[],
): boolean {
  if (isSuperuser) return true;
  return permissions.every((p) => effectivePermissions.has(p));
}

export function getNavItemsForPermissions(
  items: PermissionedNavItem[],
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
): PermissionedNavItem[] {
  return items.filter((item) => {
    if (!item.permission && !item.permissions?.length) return true;
    if (isSuperuser) return true;

    if (item.permissions?.length) {
      return hasAnyPermission(isSuperuser, effectivePermissions, item.permissions);
    }
    if (item.permission) {
      return hasPermission(isSuperuser, effectivePermissions, item.permission);
    }
    return false;
  });
}
