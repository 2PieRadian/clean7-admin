"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "admin-color-scheme";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" ? true : stored === "light" ? false : prefersDark;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return (
    <div
      className="inline-flex border border-[var(--border-soft)] bg-surface-muted p-0.5"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        aria-pressed={!dark}
        aria-label="Light theme"
        onClick={() => setDark(false)}
        className={`inline-flex h-8 w-8 items-center justify-center transition ${
          !dark
            ? "bg-surface text-foreground"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <Sun className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={dark}
        aria-label="Dark theme"
        onClick={() => setDark(true)}
        className={`inline-flex h-8 w-8 items-center justify-center transition ${
          dark
            ? "bg-surface text-foreground"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <Moon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
