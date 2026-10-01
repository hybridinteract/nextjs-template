"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useSessionStore } from "@/lib/auth";
import { loginFormSchema, type LoginFormValues } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/form-fields";

export function LoginForm() {
  // "Your session has ended" means nothing on the page where you sign in. The
  // login page mounts the dialog too (through AppProviders), and its store
  // outlives the dashboard, so it would otherwise follow you here and sit on
  // top of this form. `clearExpired`, not `reset`: the sign-out flag
  // has to outlive this mount (see session-store.ts).
  useEffect(() => {
    useSessionStore.getState().clearExpired();
  }, []);

  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  return (
    <form onSubmit={handleSubmit((values) => login(values))} className="space-y-4">
      <Field label="Email" required error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email")}
        />
      </Field>

      <Field label="Password" required error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
      </Field>

      {/* The button carries its own pending state, which is why `useLogin` is a
          plain mutation rather than a blocking one. */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
