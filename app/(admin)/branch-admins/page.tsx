"use client";

import { AuthUserManager } from "@/features/users/components/auth-user-manager";
import { notFound } from "next/navigation";
import { useAuth } from "@/features/auth/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";

export default function BranchAdminsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  if (user && !isDirector) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create and manage branch admins."
        description={
          isDirector
            ? "Use this screen to manage branch admin login accounts separately from operator and rider auth users."
            : "Only Directors can manage branch admin accounts."
        }
      />
      <AuthUserManager mode="branch-admins" />
    </div>
  );
}
