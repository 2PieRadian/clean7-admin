"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/store/auth-store";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { SystemResetButton } from "@/features/system/components/system-reset-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace preferences"
        description="Theme and quick links. There is no backend settings API in the contract—use branch and catalog screens for operational configuration."
      />

      <Card className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Appearance</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Light or dark color scheme is stored in this browser only.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      {isDirector ? (
        <Card className="space-y-3 p-5 md:p-6">
          <h2 className="text-base font-semibold text-foreground">Director tools</h2>
          <p className="text-sm text-text-secondary">
            Advanced user management routes are not in the main sidebar; open them here if
            needed.
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-primary">
            <li>
              <Link href="/auth-users" className="underline-offset-4 hover:underline">
                Managed users
              </Link>
            </li>

            <li>
              <Link href="/profiles" className="underline-offset-4 hover:underline">
                Profile lookup (legacy path)
              </Link>
            </li>
          </ul>
        </Card>
      ) : null}

      {isDirector ? (
        <Card className="space-y-4 p-5 md:p-6 border-danger">
          <div>
            <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Irreversible destructive actions for the Clean7 system.
            </p>
          </div>
          <SystemResetButton />
        </Card>
      ) : null}
    </div>
  );
}
