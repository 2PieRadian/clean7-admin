"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronDown,
  ContactRound,
  Globe2,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  Settings,
  Shirt,
  SlidersHorizontal,
  SquarePlus,
  Truck,
  UserCog,
  Users,
  Wallet,
  BookOpen,
  Briefcase,
  Mail,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  directorOnly?: boolean;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/orders", label: "Orders", icon: Receipt },
      { href: "/delivery-trips", label: "Delivery trips", icon: Truck },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        href: "/branches",
        label: "Branches",
        icon: Building2,
        directorOnly: true,
      },
      {
        href: "/catalogue",
        label: "Services & Pricing",
        icon: LayoutGrid,
        directorOnly: true,
      },
      {
        href: "/geo-overrides",
        label: "Area Pricing",
        icon: Globe2,
        directorOnly: true,
      },
      {
        href: "/schedule-overrides",
        label: "Schedule overrides",
        icon: SlidersHorizontal,
        directorOnly: true,
      },
      { href: "/blogs", label: "Blogs", icon: BookOpen, directorOnly: true },
    ],
  },
  {
    title: "People & customers",
    items: [
      { href: "/operators", label: "Operators", icon: Users },
      { href: "/careers", label: "Careers", icon: Briefcase, directorOnly: true },
      {
        href: "/branch-admins",
        label: "Branch Admins",
        icon: UserCog,
        directorOnly: true,
      },
      { href: "/customers", label: "Customers", icon: ContactRound },
      { href: "/newsletters", label: "Newsletters", icon: Mail, directorOnly: true },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/payments",
        label: "Payments",
        icon: Wallet,
        directorOnly: true,
      },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminNav({
  collapsed = false,
  onNavigate,
  role,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.title, true])),
  );

  return (
    <nav className="space-y-4">
      {navGroups.map((group) => {
        const sectionOpen = collapsed ? true : openGroups[group.title];
        const visibleItems = group.items.filter(
          (item) => !item.directorOnly || role === "DIRECTOR",
        );

        if (visibleItems.length === 0) {
          return null;
        }

        const itemLinks = visibleItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={`${group.title}-${item.label}`}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={`group flex items-center rounded-2xl text-[14px] font-medium leading-snug transition ${collapsed
                ? "justify-center w-11 h-11 mx-auto"
                : "gap-2.5 px-3 py-2.5 mx-2"
                } ${active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-text-secondary hover:bg-surface-muted hover:text-foreground"
                }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${active
                  ? "bg-surface text-primary shadow-sm"
                  : "bg-transparent text-text-muted group-hover:bg-surface group-hover:text-foreground"
                  }`}
              >
                <Icon
                  className="h-[19px] w-[19px] shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
              {!collapsed ? (
                <span className="truncate">{item.label}</span>
              ) : null}
            </Link>
          );
        });

        return (
          <div key={group.title} className="space-y-1">
            {!collapsed ? (
              <button
                type="button"
                aria-expanded={sectionOpen}
                onClick={() =>
                  setOpenGroups((prev) => ({
                    ...prev,
                    [group.title]: !prev[group.title],
                  }))
                }
                className="flex w-full items-center justify-between px-2 py-1.5 text-left transition hover:bg-surface-muted"
              >
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {group.title}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-300 ease-out motion-reduce:transition-none ${sectionOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            ) : null}

            {!collapsed ? (
              <div
                className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none motion-reduce:duration-0 ${sectionOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                inert={sectionOpen ? undefined : true}
              >
                <div className="min-h-0">
                  <div className="space-y-0.5">{itemLinks}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">{itemLinks}</div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;

  if (href === "/branches") {
    return (
      pathname.startsWith("/branches/") &&
      !pathname.startsWith("/branches/create")
    );
  }

  if (href === "/branch-admins") {
    return (
      pathname === "/branch-admins" || pathname.startsWith("/branch-admins/")
    );
  }

  if (href === "/catalogue") {
    return pathname === "/catalogue" || pathname.startsWith("/catalogue/");
  }

  if (href === "/blogs") {
    return pathname === "/blogs" || pathname.startsWith("/blogs/");
  }

  if (href === "/customers") {
    return pathname === "/customers" || pathname.startsWith("/customers/");
  }

  if (href === "/payments") {
    return pathname === "/payments" || pathname.startsWith("/payments/");
  }

  if (href === "/settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }

  if (href === "/careers") {
    return pathname === "/careers" || pathname.startsWith("/careers/");
  }

  if (href === "/newsletters") {
    return pathname === "/newsletters" || pathname.startsWith("/newsletters/");
  }

  return pathname.startsWith(`${href}/`);
}
