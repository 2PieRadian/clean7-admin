"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "admin_required"
      ? "This account cannot open the admin area."
      : null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    router.replace(searchParams.get("next") || "/dashboard");
  }, [router, searchParams, user]);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          setError(null);
          try {
            await login(
              String(formData.get("email") ?? ""),
              String(formData.get("password") ?? ""),
            );
            router.push(searchParams.get("next") || "/dashboard");
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Could not sign in.");
          }
        });
      }}
    >
      <Field
        label="Work email"
        type="email"
        name="email"
        placeholder="ops@clean7.in"
        required
      />
      <Field
        label="Password"
        type="password"
        name="password"
        placeholder="Enter your password"
        required
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
