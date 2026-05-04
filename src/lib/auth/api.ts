import { apiClient } from "@/lib/api-client";
import { transformUser, toBackendProfile } from "./transformers";
import type { BackendUser, AuthUser, LoginFormValues, UpdateProfileValues } from "./types";

export async function login(values: LoginFormValues): Promise<void> {
  await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(values),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? "Login failed");
    }
  });
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await fetch("/api/auth/me", { credentials: "include" }).then(
    async (res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      return res.json() as Promise<BackendUser>;
    },
  );
  return transformUser(data);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function updateProfile(values: UpdateProfileValues): Promise<AuthUser> {
  const payload = toBackendProfile(values);
  const data = await apiClient.put<BackendUser>("/api/v1/auth/me", payload);
  return transformUser(data);
}
