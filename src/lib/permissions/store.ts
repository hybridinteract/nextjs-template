"use client";

import { create } from "zustand";
import type { UserRole } from "./types";

interface RoleState {
  role: UserRole;
  isSuperuser: boolean;
  effectivePermissions: Set<string>;
  setRole: (role: UserRole) => void;
  setIsSuperuser: (value: boolean) => void;
  setEffectivePermissions: (permissions: string[]) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  role: "viewer",
  isSuperuser: false,
  effectivePermissions: new Set<string>(),
  setRole: (role) => set({ role }),
  setIsSuperuser: (isSuperuser) => set({ isSuperuser }),
  setEffectivePermissions: (permissions) =>
    set({ effectivePermissions: new Set(permissions) }),
}));
