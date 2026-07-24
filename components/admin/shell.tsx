"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutPanelLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { DirectorRouteGate } from "@/components/admin/director-route-gate";
import { AdminNav } from "@/components/admin/nav";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { LogoutButton } from "@/components/admin/logout-button";
import { breadcrumbsForPath } from "@/lib/breadcrumbs";
import type { AuthUser } from "@/lib/types";
import pkg from "../../package.json";

function userInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthUser;
}) {
  const pathname = usePathname();
  const breadcrumbItems = useMemo(
    () => breadcrumbsForPath(pathname),
    [pathname],
  );
  const displayName = user.name || user.email;
  const panelLabel =
    user.role === "DIRECTOR" ? "Director's Panel" : "Branch Admin's Panel";
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("admin-sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("admin-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-[100svh] overflow-hidden bg-[var(--app-canvas)]">
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-r border-[var(--border-soft)] bg-surface transition-[width] duration-300 ease-out lg:flex ${collapsed ? "w-[84px]" : "w-[312px]"
          }`}
      >
        <DesktopSidebar
          collapsed={collapsed}
          displayName={displayName}
          userInitials={userInitials(displayName)}
          role={user.role}
          panelLabel={panelLabel}
          version={pkg.version}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-[rgba(15,23,42,0.34)] transition-opacity duration-300 lg:hidden ${mobileOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
          }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(316px,92vw)] flex-col overflow-hidden border-r border-[var(--border-soft)] bg-surface shadow-[18px_0_48px_rgba(15,23,42,0.14)] transition-transform duration-300 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <MobileSidebar
          displayName={displayName}
          userInitials={userInitials(displayName)}
          role={user.role}
          panelLabel={panelLabel}
          version={pkg.version}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--workspace-bg)]">
        <AdminTopBar
          items={breadcrumbItems}
          onOpenNav={() => setMobileOpen(true)}
        />
        <main className="admin-content-scroll flex-1 overflow-y-auto p-3 md:p-4">
          <div className="admin-workspace-type min-h-full rounded-[32px] overflow-hidden border border-[var(--border-soft)] bg-surface px-4 py-4 shadow-[var(--shadow-card)] md:px-5 md:py-5">
            <DirectorRouteGate user={user}>{children}</DirectorRouteGate>
          </div>
        </main>
      </div>
    </div>
  );
}

function DesktopSidebar({
  collapsed,
  displayName,
  userInitials,
  role,
  panelLabel,
  version,
  onToggle,
}: {
  collapsed: boolean;
  displayName: string;
  userInitials: string;
  role: AuthUser["role"];
  panelLabel: string;
  version: string;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-[var(--admin-header-height)] shrink-0 items-center border-b border-[var(--border-soft)] px-3 py-3 md:py-3.5">
          {collapsed ? (
            <div className="flex w-full justify-center">
              <button
                type="button"
                aria-label="Expand sidebar"
                onClick={onToggle}
                className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(39,193,165,0.16)] bg-[rgba(39,193,165,0.08)] text-primary transition hover:border-[rgba(39,193,165,0.35)] hover:bg-[rgba(39,193,165,0.14)]"
              >
                <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-150 group-hover:pointer-events-none group-hover:opacity-0">
                  <LayoutPanelLeft
                    className="h-5 w-5"
                    strokeWidth={2.1}
                    aria-hidden
                  />
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <ChevronRight
                    className="h-5 w-5 text-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(39,193,165,0.16)] bg-[rgba(39,193,165,0.08)] text-primary">
                  <LayoutPanelLeft
                    className="h-5 w-5"
                    strokeWidth={2.1}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-display text-[16px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                    Clean7
                  </p>
                  <p className="truncate text-[12px] leading-tight text-text-muted">
                    {panelLabel} · v{version}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={onToggle}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--sidebar-pane)] text-text-secondary transition hover:bg-surface hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 thin-scrollbar">
          <AdminNav collapsed={collapsed} role={role} />
        </div>
      </div>

      <div
        className={`border-t border-[var(--border-soft)] bg-[var(--sidebar-pane)] p-3 ${collapsed ? "px-2" : ""} relative`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#21252d] text-[13px] font-semibold text-white">
            {userInitials}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-[12px] text-text-muted">
                  {panelLabel}
                </p>
              </div>
              <LogoutButton compact={false} />
            </>
          ) : (
            <div className="absolute bottom-3 right-1">
              <LogoutButton compact />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MobileSidebar({
  displayName,
  userInitials,
  role,
  panelLabel,
  version,
  onClose,
}: {
  displayName: string;
  userInitials: string;
  role: AuthUser["role"];
  panelLabel: string;
  version: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-[var(--admin-header-height)] shrink-0 items-center border-b border-[var(--border-soft)] px-4 py-3 md:py-3.5">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(39,193,165,0.16)] bg-[rgba(39,193,165,0.08)] text-primary">
                <LayoutPanelLeft
                  className="h-5 w-5"
                  strokeWidth={2.1}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate font-display text-[16px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                  Clean7
                </p>
                <p className="truncate text-[12px] leading-tight text-text-muted">
                  {panelLabel} · v{version}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border-soft)] bg-[var(--sidebar-pane)] text-text-secondary transition hover:bg-surface hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 thin-scrollbar">
          <AdminNav onNavigate={onClose} role={role} />
        </div>
      </div>

      <div className="border-t border-[var(--border-soft)] bg-[var(--sidebar-pane)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#21252d] text-[13px] font-semibold text-white">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[12px] text-text-muted">
              {panelLabel}
            </p>
          </div>
          <LogoutButton compact={false} />
        </div>
      </div>
    </>
  );
}
