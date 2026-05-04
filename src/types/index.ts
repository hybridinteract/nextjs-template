// ── Global error class ─────────────────────────────────────────────────────────
export class AppError extends Error {
  statusCode: number;
  detail: unknown;
  data: unknown;

  constructor(message: string, statusCode: number, detail?: unknown, data?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.detail = detail;
    this.data = data;
  }
}

// ── Shared pagination types ────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// ── Common list result ─────────────────────────────────────────────────────────
export interface ListResult<T> {
  items: T[];
  total: number;
}

// ── Nav item types ─────────────────────────────────────────────────────────────
export interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface PermissionedNavItem extends NavItem {
  permission?: string;
  permissions?: string[];
}

// ── Utility types ──────────────────────────────────────────────────────────────
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
