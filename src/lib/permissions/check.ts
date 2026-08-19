import type { PermissionedNavItem } from "@/types";
import type { UserRole, Permission } from "./types";

/**
 * Maps each frontend permission key to the backend permission names
 * that grant it. Expand this mapping as new modules are added.
 */
const PERMISSION_MAPPING: Record<Permission, readonly string[]> = {
  "users.view": ["users:read", "users:read_all"],
  "users.manage": ["users:create", "users:update", "users:manage_roles"],
  "users.delete": ["users:delete"],
  "roles.manage": ["system:permissions_read", "system:permissions_update"],
  "settings.view": ["settings:read"],
  "settings.manage": ["settings:update"],
  "content.view": ["content:read", "content:read_all"],
  "content.create": ["content:create"],
  "content.edit": ["content:update"],
  "content.delete": ["content:delete"],
};

export function hasPermission(
  role: UserRole,
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
  permission: Permission,
): boolean {
  if (role === "super_admin" || isSuperuser) return true;
  
  if (effectivePermissions && effectivePermissions.size > 0) {
    const backendPerms = PERMISSION_MAPPING[permission];
    if (!backendPerms) return false;
    return backendPerms.some((p) => effectivePermissions.has(p));
  }
  
  return false;
}

export function hasAnyPermission(
  role: UserRole,
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, isSuperuser, effectivePermissions, p));
}

export function hasAllPermissions(
  role: UserRole,
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, isSuperuser, effectivePermissions, p));
}

export function getNavItemsForPermissions(
  items: PermissionedNavItem[],
  role: UserRole,
  isSuperuser: boolean,
  effectivePermissions: Set<string>,
): PermissionedNavItem[] {
  return items.filter((item) => {
    if (!item.permission && !item.permissions?.length) return true;

    if (item.permissions?.length) {
      return hasAnyPermission(role, isSuperuser, effectivePermissions, item.permissions as Permission[]);
    }
    if (item.permission) {
      return hasPermission(role, isSuperuser, effectivePermissions, item.permission as Permission);
    }
    return false;
  });
}
