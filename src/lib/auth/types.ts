import { z } from "zod";

// ── Backend shapes (match wire format exactly) ─────────────────────────────────
export interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// ── Frontend shapes ────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperuser: boolean;
  role: string;
  effectivePermissions: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Zod schemas ────────────────────────────────────────────────────────────────
export const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
