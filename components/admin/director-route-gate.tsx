"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import type { AuthUser } from "@/lib/types";

const DIRECTOR_ONLY_PREFIXES = [
  "/branches",
  "/catalogue",
  "/geo-overrides",
  "/payments",
  "/branch-admins",
  "/schedule-overrides",
];

function normalizePath(pathname: string) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isDirectorOnlyAdminPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return DIRECTOR_ONLY_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function DirectorRouteGate({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const blocked =
    user.role !== "DIRECTOR" && isDirectorOnlyAdminPath(pathname);

  if (blocked) {
    notFound();
  }

  return <>{children}</>;
}
