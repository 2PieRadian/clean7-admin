"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ComposeNewsletterModal } from "@/features/newsletters/components/ComposeNewsletterModal";
import { useNewsletterSubscribers } from "@/features/newsletters/api/newsletter-api";

export default function NewslettersPage() {
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const { data: response, isLoading } = useNewsletterSubscribers();

  const subscribers = response || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Newsletter Subscribers"
          description="Manage subscribers and send newsletters."
        />
        <Button onClick={() => setComposeModalOpen(true)}>Compose Newsletter</Button>
      </div>

      <DataTable
        loading={isLoading}
        emptyMessage="No subscribers found."
        rows={subscribers}
        columns={[
          {
            key: "email",
            header: "Email",
            render: (row) => row.email,
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
              >
                {row.isActive ? "Active" : "Unsubscribed"}
              </span>
            ),
          },
          {
            key: "subscribedAt",
            header: "Subscribed At",
            render: (row) => new Date(row.createdAt).toLocaleDateString(),
          },
        ]}
      />

      <ComposeNewsletterModal open={composeModalOpen} onClose={() => setComposeModalOpen(false)} />
    </div>
  );
}
