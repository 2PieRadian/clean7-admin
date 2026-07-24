"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/store/auth-store";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        aria-label="Profile actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-muted hover:text-foreground ${
          compact ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        <MoreHorizontal
          className="shrink-0"
          size={compact ? 20 : 22}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute bottom-10 right-0 min-w-[170px] rounded-2xl border border-[var(--border-soft)] bg-surface p-1.5 shadow-[var(--shadow-card)]">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await logout();
                  router.push("/login");
                } catch (nextError) {
                  setError(
                    nextError instanceof Error
                      ? nextError.message
                      : "Unable to sign out.",
                  );
                } finally {
                  setOpen(false);
                }
              });
            }}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="max-w-[220px] text-right text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
