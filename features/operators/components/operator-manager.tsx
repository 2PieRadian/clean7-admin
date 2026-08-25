"use client";

import { useMemo, useState, useTransition } from "react";
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
import type { BranchAdminResponse, OperatorProfileResponse } from "@/lib/types";
import { operatorStatuses } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { OperatorCreateForm } from "@/features/operators/components/operator-create-form";
import { OperatorProfileEditor } from "@/features/operators/components/operator-profile-editor";

function branchNameMap(branches: BranchAdminResponse[]) {
  return Object.fromEntries(branches.map((b) => [b.id, b.name]));
}

export function OperatorManager({
  operators,
  branches,
  onReload,
}: {
  operators: OperatorProfileResponse[];
  branches: BranchAdminResponse[];
  onReload: () => Promise<void>;
}) {
  const namesByBranch = useMemo(() => branchNameMap(branches), [branches]);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "OPERATOR" | "RIDER">("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<OperatorProfileResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredOperators = useMemo(
    () =>
      operators.filter((operator) => {
        const matchesStatus =
          statusFilter === "ALL" ? true : operator.status === statusFilter;
        const matchesBranch =
          branchFilter === "ALL" ? true : operator.branchId === branchFilter;

        const matchesRole =
          roleFilter === "ALL" ? true : operator.role === roleFilter;
        return matchesStatus && matchesBranch && matchesRole;
      }),
    [operators, statusFilter, branchFilter, roleFilter],
  );

  async function updateOperatorStatus(authUserId: string, status: string) {
    setMessage(null);
    setError(null);

    try {
      await apiRequest({
        path: `/admin/operators/${authUserId}/status`,
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

  async function deleteOperator(authUserId: string) {
    setMessage(null);
    setError(null);

    try {
      await apiRequest({
        path: `/admin/auth-users/${authUserId}`,
        method: "DELETE",
      });
      setMessage("Staff deleted.");
      await onReload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to delete.",
      );
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Staff directory</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Operators and riders visible to your role and branch.
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
            {operatorStatuses.map((status) => (
              <option key={status} value={status}>
                {humanizeToken(status)}
              </option>
            ))}
          </select>
          <select
            className="rounded-full border border-[var(--border-soft)] bg-surface px-4 py-2 text-sm"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "ALL" | "OPERATOR" | "RIDER")}
          >
            <option value="ALL">All roles</option>
            <option value="OPERATOR">Operators</option>
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
        rows={filteredOperators}
        emptyMessage="No staff found."
        columns={[
          {
            key: "name",
            header: "Name",
            render: (operator) => (
              <p className="font-semibold text-foreground">{operator.displayName}</p>
            ),
          },
          {
            key: "role",
            header: "Role",
            render: (operator) => <Badge value={operator.role} />,
          },
          {
            key: "branch",
            header: "Branch",
            render: (operator) =>
              operator.branch?.name ??
              (operator.branchId ? namesByBranch[operator.branchId] ?? operator.branchId : "—"),
          },
          {
            key: "categories",
            header: "Categories",
            render: (operator) =>
              operator.serviceCategoryCodes?.length
                ? operator.serviceCategoryCodes.join(", ")
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
            render: (operator) => (
              <div className="space-y-2">
                <Badge value={operator.status} />
                <div className="flex flex-col gap-2">
                  <select
                    className="rounded-full border border-[var(--border-soft)] bg-surface px-3 py-1 text-xs"
                    defaultValue={operator.status}
                    onChange={(event) =>
                      startTransition(() =>
                        updateOperatorStatus(operator.authUserId, event.target.value),
                      )
                    }
                  >
                    {operatorStatuses.map((status) => (
                      <option key={status} value={status}>
                        {humanizeToken(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-wider text-primary hover:underline text-left font-semibold"
                    onClick={() => setSelectedOperator(operator)}
                  >
                    Edit profile
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wider text-danger hover:underline text-left font-semibold"
                      >
                        Delete Operator
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {operator.displayName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. It will permanently delete their account and staff profile.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-danger text-white hover:bg-danger-hover"
                          onClick={() => startTransition(() => deleteOperator(operator.authUserId))}
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
            <OperatorCreateForm
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

      {selectedOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface rounded-2xl shadow-2xl">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedOperator(null)}>
                Close
              </Button>
            </div>
            <OperatorProfileEditor
              operator={selectedOperator}
              onSuccess={() => {
                setSelectedOperator(null);
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
