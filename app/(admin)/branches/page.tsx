"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/store/auth-store";
import { useBranches, useDeleteBranch } from "@/features/branches/api/branch-api";
import { defaultServiceRadiusKm } from "@/lib/branch-form";
import type { BranchAdminResponse } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { BranchCreateForm } from "@/features/branches/components/branch-create-form";

export default function BranchesPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isDirector = user?.role === "DIRECTOR";

  if (user && !isDirector) {
    notFound();
  }

  const { data: branches = [], isLoading: loading, error: branchError } = useBranches();
  const deleteBranch = useDeleteBranch();
  const error = branchError instanceof Error ? branchError.message : null;

  const handleDelete = async (branchId: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      await deleteBranch.mutateAsync(branchId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="View and manage all branches."
        description="Open any branch to update location, radius, and assigned branch admin. Use schedule overrides for slot closures."
      />

      <div className="flex flex-wrap gap-3">
        {isDirector ? (
          <Button onClick={() => setIsModalOpen(true)}>Add branch</Button>
        ) : null}
        <Link href="/schedule-overrides">
          <Button variant="secondary">Schedule overrides</Button>
        </Link>
      </div>

      {loading ? <InlineLoadingCard lines={8} /> : null}

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {!loading ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Branches</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Open any branch to update the name and covered areas.
              </p>
            </div>
            <Badge tone="service-blue">{branches.length} branches</Badge>
          </div>

          <DataTable
            rows={branches}
            emptyMessage="No branches yet."
            columns={[
              {
                key: "name",
                header: "Branch",
                render: (branch) => (
                  <div>
                    <Link
                      href={`/branches/${branch.id}`}
                      className="font-semibold text-foreground underline decoration-[rgba(39,193,165,0.35)] underline-offset-4"
                    >
                      {branch.name}
                    </Link>
                  </div>
                ),
              },

              {
                key: "coverage",
                header: "Assignment radius",
                render: (branch) =>
                  typeof branch.latitude === "number" &&
                    typeof branch.longitude === "number"
                    ? `${branch.serviceRadiusKm ?? defaultServiceRadiusKm} km`
                    : "No coordinates",
              },
              {
                key: "city",
                header: "City / PIN",
                render: (branch) => [branch.city, branch.postalCode].filter(Boolean).join(" · ") || "—",
              },
              ...(isDirector
                ? [
                  {
                    key: "actions",
                    header: "",
                    render: (branch: any) => (
                      <div className="flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(branch.id)}
                          loading={deleteBranch.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]
                : []),
            ]}
          />
        </Card>
      ) : null}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add branch">
        <BranchCreateForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
