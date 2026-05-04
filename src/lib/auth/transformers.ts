import type { BackendUser, AuthUser } from "./types";

export function transformUser(raw: BackendUser): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    isActive: raw.is_active,
    isSuperuser: raw.is_superuser,
    role: raw.role,
    effectivePermissions: raw.permissions ?? [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function toBackendProfile(values: { fullName: string; email: string }): Record<string, unknown> {
  return {
    full_name: values.fullName,
    email: values.email,
  };
}
