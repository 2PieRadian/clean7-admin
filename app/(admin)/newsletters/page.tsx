"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ComposeNewsletterModal } from "@/features/newsletters/components/ComposeNewsletterModal";
import { useNewsletterSubscribers, useSentNewsletters, useDeleteSubscriber } from "@/features/newsletters/api/newsletter-api";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { Trash2, Eye } from "lucide-react";

export default function NewslettersPage() {
  const [activeTab, setActiveTab] = useState<"subscribers" | "sent">("subscribers");
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const { data: subscribersResponse, isLoading: loadingSubscribers, refetch: refetchSubscribers } = useNewsletterSubscribers();
  const { data: sentResponse, isLoading: loadingSent } = useSentNewsletters();
  const deleteMutation = useDeleteSubscriber();

  const subscribers = subscribersResponse || [];
  const sentNewsletters = sentResponse || [];

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this subscriber?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Subscriber deleted");
          refetchSubscribers();
        },
        onError: () => {
          toast.error("Failed to delete subscriber");
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Newsletters"
          description="Manage subscribers and sent newsletters."
        />
        <Button onClick={() => setComposeModalOpen(true)}>Compose Newsletter</Button>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("subscribers")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "subscribers"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Subscribers
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "sent"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Sent Newsletters
          </button>
        </nav>
      </div>

      {activeTab === "subscribers" && (
        <DataTable
          loading={loadingSubscribers}
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
              render: (row) => new Date(row.createdAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <button
                  onClick={() => handleDelete(row.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ),
            },
          ]}
        />
      )}

      {activeTab === "sent" && (
        <DataTable
          loading={loadingSent}
          emptyMessage="No sent newsletters found."
          rows={sentNewsletters}
          columns={[
            {
              key: "subject",
              header: "Subject",
              render: (row) => row.subject,
            },
            {
              key: "recipientCount",
              header: "Recipients",
              render: (row) => row.recipientCount,
            },
            {
              key: "sentAt",
              header: "Sent At",
              render: (row) => new Date(row.sentAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <button
                  onClick={() => setPreviewHtml(row.htmlContent)}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Preview HTML"
                >
                  <Eye className="w-4 h-4" />
                </button>
              ),
            },
          ]}
        />
      )}

      <ComposeNewsletterModal open={composeModalOpen} onClose={() => setComposeModalOpen(false)} />

      <Modal open={!!previewHtml} onClose={() => setPreviewHtml(null)} title="Newsletter Preview">
        <div className="mt-4 border rounded-md p-4 bg-white text-black min-h-[300px] max-h-[70vh] overflow-auto">
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full min-h-[400px] border-none"
              title="Newsletter Preview"
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
