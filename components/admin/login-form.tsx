"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/features/auth/store/auth-store";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    router.replace(searchParams.get("next") || "/dashboard");
  }, [router, searchParams, user]);

  return (
    <form
      className="space-y-6"
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
            setError(
              nextError instanceof Error
                ? nextError.message
                : "Could not sign in.",
            );
          }
        });
      }}
    >
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-white">
          Email Address
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="Enter your email address"
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#C8A04C]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-white">
          Password
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Enter your password"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 pr-10 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#C8A04C]"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A04C] transition-colors hover:text-[#EED28A]"
            onClick={(e) => {
              e.preventDefault();
              setShowPassword(!showPassword);
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#C8A04C]"
          />
          Remember me
        </label>
        <a
          href="#"
          className="text-sm font-medium text-[#C8A04C] hover:underline"
        >
          Forgot password?
        </a>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C8A04C] px-4 py-3.5 text-base font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Signing in..." : "Login Now"}
        {!isPending && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
