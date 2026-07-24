"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileSearch } from "@/features/users/components/profile-search";
import { ProfileEditor } from "@/features/users/components/profile-editor";

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const authUserId = searchParams.get("authUserId");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Look up a customer profile"
        description="Search by email or phone to view or edit contact details."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr] items-start">
        <ProfileSearch />

        {authUserId ? (
          <ProfileEditor authUserId={authUserId} />
        ) : (
          <div className="rounded-[24px] bg-surface-muted p-6 text-sm text-text-secondary">
            Select a profile from the search results to see and edit the details.
          </div>
        )}
      </div>
    </div>
  );
}
