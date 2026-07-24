"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/browser-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { MutationStatus } from "@/components/admin/mutation-status";
import type { BranchAdminResponse, WorkerProfileResponse } from "@/lib/types";
import { workerStatuses } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { WorkerCreateForm } from "@/features/workers/components/worker-create-form";
import { WorkerProfileEditor } from "@/features/workers/components/worker-profile-editor";

function branchNameMap(branches: BranchAdminResponse[]) {
  return Object.fromEntries(branches.map((b) => [b.id, b.name]));
}

export function WorkerManager({
  workers,
  branches,
  onReload,
}: {
  workers: WorkerProfileResponse[];
  branches: BranchAdminResponse[];
  onReload: () => Promise<void>;
}) {
  const namesByBranch = useMemo(() => branchNameMap(branches), [branches]);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "WORKER" | "RIDER">("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfileResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredWorkers = useMemo(
    () =>
      workers.filter((worker) => {
        const matchesStatus =
          statusFilter === "ALL" ? true : worker.status === statusFilter;
        const matchesBranch =
          branchFilter === "ALL" ? true : worker.branchId === branchFilter;

        const matchesRole =
          roleFilter === "ALL" ? true : worker.role === roleFilter;
        return matchesStatus && matchesBranch && matchesRole;
      }),
    [workers, statusFilter, branchFilter, roleFilter],
  );

  async function updateWorkerStatus(authUserId: string, status: string) {
    setMessage(null);
    setError(null);

    try {
      await apiRequest({
        path: `/admin/workers/${authUserId}/status`,
        method: "PATCH",
        body: { status },
      });
      setMessage("Status updated.");
      await onReload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to update status.",
      );
      return;
    }
  }

  async function deactivateWorker(authUserId: string) {
    setMessage(null);
    setError(null);

    try {
      await apiRequest({
        path: `/admin/workers/${authUserId}`,
        method: "DELETE",
      });
      setMessage("Staff deactivated.");
      await onReload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to deactivate.",
      );
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Staff directory</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Workers and riders visible to your role and branch.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="success" onClick={() => setCreateModalOpen(true)}>Add staff</Button>
          <select
            className="rounded-full border border-[var(--border-soft)] bg-surface px-4 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {workerStatuses.map((status) => (
              <option key={status} value={status}>
                {humanizeToken(status)}
              </option>
            ))}
          </select>
          <select
            className="rounded-full border border-[var(--border-soft)] bg-surface px-4 py-2 text-sm"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "ALL" | "WORKER" | "RIDER")}
          >
            <option value="ALL">All roles</option>
            <option value="WORKER">Workers</option>
            <option value="RIDER">Riders</option>
          </select>
          <select
            className="rounded-full border border-[var(--border-soft)] bg-surface px-4 py-2 text-sm"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            <option value="ALL">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        rows={filteredWorkers}
        emptyMessage="No staff found."
        columns={[
          {
            key: "name",
            header: "Name",
            render: (worker) => (
              <p className="font-semibold text-foreground">{worker.displayName}</p>
            ),
          },
          {
            key: "role",
            header: "Role",
            render: (worker) => <Badge value={worker.role} />,
          },
          {
            key: "branch",
            header: "Branch",
            render: (worker) =>
              worker.branch?.name ??
              (worker.branchId ? namesByBranch[worker.branchId] ?? worker.branchId : "—"),
          },
          {
            key: "categories",
            header: "Categories",
            render: (worker) =>
              worker.serviceCategoryCodes?.length
                ? worker.serviceCategoryCodes.join(", ")
                : "—",
          },
          {
            key: "assignments",
            header: "Active assignments",
            render: () => <span className="text-xs text-text-muted">—</span>,
          },
          {
            key: "status",
            header: "Status",
            render: (worker) => (
              <div className="space-y-2">
                <Badge value={worker.status} />
                <div className="flex flex-col gap-2">
                  <select
                    className="rounded-full border border-[var(--border-soft)] bg-surface px-3 py-1 text-xs"
                    defaultValue={worker.status}
                    onChange={(event) =>
                      startTransition(() =>
                        updateWorkerStatus(worker.authUserId, event.target.value),
                      )
                    }
                  >
                    {workerStatuses.map((status) => (
                      <option key={status} value={status}>
                        {humanizeToken(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-wider text-primary hover:underline text-left font-semibold"
                    onClick={() => setSelectedWorker(worker)}
                  >
                    Edit profile
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wider text-danger hover:underline text-left font-semibold"
                      >
                        Deactivate
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate {worker.displayName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          They will no longer receive new assignments. History is kept.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-danger text-white hover:bg-danger-hover"
                          onClick={() => startTransition(() => deactivateWorker(worker.authUserId))}
                        >
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ),
          },
        ]}
      />
      <MutationStatus error={error} success={message} />

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
               <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
                 Close
               </Button>
            </div>
            <WorkerCreateForm 
              branches={branches} 
              onSuccess={() => {
                setCreateModalOpen(false);
                setMessage("Staff member added successfully.");
                void onReload();
              }} 
            />
          </div>
        </div>
      )}

      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface rounded-2xl shadow-2xl">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
               <Button variant="ghost" onClick={() => setSelectedWorker(null)}>
                 Close
               </Button>
            </div>
            <WorkerProfileEditor 
              worker={selectedWorker} 
              onSuccess={() => {
                setSelectedWorker(null);
                setMessage("Profile updated successfully.");
                void onReload();
              }} 
            />
          </div>
        </div>
      )}
    </Card>
  );
}
