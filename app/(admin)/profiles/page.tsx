"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileSearch } from "@/features/users/components/profile-search";
import { ProfileEditor } from "@/features/users/components/profile-editor";

export default function ProfilesPage() {
  const searchParams = useSearchParams();
  const authUserId = searchParams.get("authUserId");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People details"
        title="Find a customer or staff profile"
        description="Search by email or phone to update contact details and private team notes."
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
