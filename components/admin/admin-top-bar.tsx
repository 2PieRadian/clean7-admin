"use client";

import { HelpCircle, Menu } from "lucide-react";
import type { BreadcrumbItem } from "@/lib/breadcrumbs";
import { BreadcrumbBar } from "@/components/ui/breadcrumb-bar";
import { ThemeToggle } from "@/components/admin/theme-toggle";

type AdminTopBarProps = {
  items: BreadcrumbItem[];
  onOpenNav?: () => void;
};

export function AdminTopBar({ items, onOpenNav }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--border-soft)] bg-[var(--topbar-bg)] backdrop-blur-xl">
      <div className="flex min-h-[var(--admin-header-height)] items-center justify-between gap-4 px-4 py-3 md:px-5 md:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {onOpenNav ? (
            <button
              type="button"
              aria-label="Open navigation"
              onClick={onOpenNav}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border-soft)] bg-surface text-text-secondary transition hover:bg-[var(--sidebar-pane)] hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          ) : null}

          <BreadcrumbBar items={items} className="min-w-0" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            aria-label="Help"
            className="inline-flex h-10 w-10 items-center justify-center border border-[var(--border-soft)] bg-surface text-text-secondary transition hover:bg-[var(--sidebar-pane)] hover:text-foreground"
          >
            <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
