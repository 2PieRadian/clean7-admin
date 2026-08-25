"use client";

import { AuthUserManager } from "@/features/users/components/auth-user-manager";
import { useAuth } from "@/features/auth/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";

export default function ManagedAuthUsersPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDirector ? "Manage staff auth users." : "Create staff logins."}
        description={
          isDirector
            ? "Create and manage operator, rider, and director auth accounts. Branch Admin accounts now live in their own screen."
            : "Create operator and rider auth users here before attaching them to your branch staff roster."
        }
      />
      <AuthUserManager />
    </div>
  );
}
