"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { apiRequest } from "@/lib/browser-api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MutationStatus } from "@/components/admin/mutation-status";
import type { BranchAdminResponse, OperatorProfileResponse, ProfileResponse } from "@/lib/types";
import { operatorStatuses } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { OperatorCreateForm } from "@/features/operators/components/operator-create-form";
import { OperatorProfileEditor } from "@/features/operators/components/operator-profile-editor";
import {
  Car,
  Calendar,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
} from "lucide-react";

function branchNameMap(branches: BranchAdminResponse[]) {
  return Object.fromEntries(branches.map((b) => [b.id, b.name]));
}

function getInitials(name: string, fallbackRole?: string): string {
  if (!name) return fallbackRole === "RIDER" ? "R1" : "OP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const single = parts[0]!;
    return single.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function formatStaffId(authUserId: string, role?: string): string {
  const prefix = role === "RIDER" ? "RID" : "OPR";
  return `ID: ${prefix}-${authUserId.slice(-4).toUpperCase()}`;
}

export function OperatorManager({
  operators,
  branches,
  onReload,
  role,
}: {
  operators: OperatorProfileResponse[];
  branches: BranchAdminResponse[];
  onReload: () => Promise<void>;
  role?: "OPERATOR" | "RIDER";
}) {
  const namesByBranch = useMemo(() => branchNameMap(branches), [branches]);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "OPERATOR" | "RIDER">("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<OperatorProfileResponse | null>(null);
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorProfileResponse | null>(null);
  const [openMenuAuthId, setOpenMenuAuthId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load emails from profiles lookup
  const [profilesByAuthId, setProfilesByAuthId] = useState<Record<string, { email?: string; fullName?: string | null }>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadProfiles() {
      try {
        const profiles = await apiRequest<ProfileResponse[]>({ path: "/admin/profiles" });
        if (!cancelled) {
          const map: Record<string, { email?: string; fullName?: string | null }> = {};
          for (const p of profiles) {
            map[p.authUserId] = { email: p.email, fullName: p.fullName };
          }
          setProfilesByAuthId(map);
        }
      } catch {
        // Silently continue
      }
    }
    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuAuthId) return;
    function handleDocumentClick() {
      setOpenMenuAuthId(null);
    }
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [openMenuAuthId]);

  const filteredOperators = useMemo(
    () =>
      operators.filter((operator) => {
        const matchesStatus =
          statusFilter === "ALL" ? true : operator.status === statusFilter;
        const matchesBranch =
          branchFilter === "ALL" ? true : operator.branchId === branchFilter;

        const effectiveRole = role || roleFilter;
        const matchesRole =
          effectiveRole === "ALL" ? true : operator.role === effectiveRole;
        return matchesStatus && matchesBranch && matchesRole;
      }),
    [operators, statusFilter, branchFilter, roleFilter, role],
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
      setMessage(`${role === "RIDER" ? "Rider" : "Operator"} deleted.`);
      await onReload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to delete.",
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-soft)] bg-surface p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {role === "RIDER" ? "Delivery Riders" : role === "OPERATOR" ? "Operators" : "Staff Directory"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {role === "RIDER"
              ? "Pickup and delivery fleet visible to your role and branch."
              : role === "OPERATOR"
                ? "At-home service specialists and operators visible to your role and branch."
                : "Operators and riders visible to your role and branch."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="success" onClick={() => setCreateModalOpen(true)}>
            {role === "RIDER" ? "Add Rider" : role === "OPERATOR" ? "Add Operator" : "Add Staff"}
          </Button>
          <select
            className="rounded-xl border border-[var(--border-soft)] bg-surface-muted px-3.5 py-2 text-xs font-medium text-foreground cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
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
          {!role && (
            <select
              className="rounded-xl border border-[var(--border-soft)] bg-surface-muted px-3.5 py-2 text-xs font-medium text-foreground cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "ALL" | "OPERATOR" | "RIDER")}
            >
              <option value="ALL">All roles</option>
              <option value="OPERATOR">Operators</option>
              <option value="RIDER">Riders</option>
            </select>
          )}
          <select
            className="rounded-xl border border-[var(--border-soft)] bg-surface-muted px-3.5 py-2 text-xs font-medium text-foreground cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
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

      <MutationStatus error={error} success={message} />

      {/* Profile Cards Container (No inner scroll container, overflow-visible) */}
      <div className="space-y-3 overflow-visible">
        {/* Table Column Headers on Desktop */}
        <div className="hidden lg:grid grid-cols-[2.2fr_1fr_2fr_1.5fr_1.2fr_50px] items-center gap-4 px-6 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
          <div>{role === "RIDER" ? "Rider" : role === "OPERATOR" ? "Operator" : "Staff"}</div>
          <div className="flex items-center gap-1">
            <span>Branch</span>
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          </div>
          <div className="flex items-center gap-1">
            <span>{role === "RIDER" ? "Vehicle & License" : "Service Categories"}</span>
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          </div>
          <div className="flex items-center gap-1">
            <span>Active Assignments</span>
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          </div>
          <div className="flex items-center gap-1">
            <span>Status</span>
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          </div>
          <div className="text-right">Actions</div>
        </div>

        {/* Profile Card Rows */}
        {filteredOperators.length > 0 ? (
          filteredOperators.map((operator, index) => {
            const email = operator.email || profilesByAuthId[operator.authUserId]?.email;
            const isMenuOpen = openMenuAuthId === operator.authUserId;
            const isNearBottom = index >= filteredOperators.length - 2 && filteredOperators.length > 2;

            return (
              <div
                key={operator.authUserId}
                className={`relative rounded-2xl border border-[var(--border-soft)] bg-surface p-4 sm:px-6 sm:py-4 transition-all duration-150 hover:border-primary/40 hover:shadow-sm ${isMenuOpen ? "z-40 ring-1 ring-primary/30" : "z-10"
                  }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr_2fr_1.5fr_1.2fr_50px] items-center gap-4">
                  {/* Column 1: Rider / Operator Avatar + Name + ID + Email */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-sm font-black shadow-sm tracking-wide">
                      {getInitials(operator.displayName, role)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm leading-tight truncate">
                        {operator.displayName}
                      </p>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">
                        {formatStaffId(operator.authUserId, operator.role)}
                      </p>
                      {email && (
                        <p className="text-[11px] text-text-muted/80 truncate mt-0.5">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Branch */}
                  <div>
                    <span className="font-semibold text-foreground text-xs">
                      {operator.branch?.name ??
                        (operator.branchId ? namesByBranch[operator.branchId] ?? operator.branchId : "—")}
                    </span>
                  </div>

                  {/* Column 3: Vehicle & License (for Rider) or Service Categories (for Operator) */}
                  {role === "RIDER" ? (
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="p-1.5 rounded-lg bg-surface-muted border border-[var(--border-soft)] text-text-muted mt-0.5 flex-shrink-0">
                        <Car className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        {operator.vehicleType || operator.vehicleNumber ? (
                          <>
                            <p className="font-semibold text-foreground text-xs leading-tight truncate">
                              <span className="capitalize">{operator.vehicleType?.toLowerCase() || "Vehicle"}</span>
                              {operator.vehicleNumber ? ` · ${operator.vehicleNumber}` : ""}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5 truncate">
                              {operator.drivingLicenseNumber ? `DL: ${operator.drivingLicenseNumber}` : "No license added"}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-text-secondary text-xs leading-tight">Not added</p>
                            <p className="text-[11px] text-text-muted mt-0.5">Add vehicle & license</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="p-1.5 rounded-lg bg-surface-muted border border-[var(--border-soft)] text-text-muted mt-0.5 flex-shrink-0">
                        <Layers className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        {operator.serviceCategoryCodes?.length ? (
                          <>
                            <p className="font-semibold text-foreground text-xs truncate leading-tight">
                              {operator.serviceCategoryCodes.join(", ")}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {operator.serviceCategoryCodes.length} active categories
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-text-secondary text-xs leading-tight">All categories</p>
                            <p className="text-[11px] text-text-muted mt-0.5">General services</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Column 4: Active Assignments */}
                  <div className="flex items-start gap-2.5">
                    <span className="p-1.5 rounded-lg bg-surface-muted border border-[var(--border-soft)] text-text-muted mt-0.5 flex-shrink-0">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-bold text-foreground text-xs leading-none">0</p>
                      <p className="text-[11px] text-text-muted mt-1 leading-tight">No active assignments</p>
                    </div>
                  </div>

                  {/* Column 5: Status Badge & Dropdown */}
                  <div className="space-y-1.5">
                    <div>
                      {operator.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : operator.status === "SUSPENDED" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/15 text-danger border border-danger/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-muted text-text-muted border border-[var(--border-soft)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <select
                      className="rounded-lg border border-[var(--border-soft)] bg-surface-muted px-2 py-1 text-xs font-medium text-foreground cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary block"
                      value={operator.status}
                      onChange={(event) =>
                        startTransition(() =>
                          updateOperatorStatus(operator.authUserId, event.target.value)
                        )
                      }
                    >
                      {operatorStatuses.map((status) => (
                        <option key={status} value={status}>
                          {humanizeToken(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Column 6: Actions Three-Dots Popover */}
                  <div className="relative flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuAuthId(isMenuOpen ? null : operator.authUserId);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${isMenuOpen
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-[var(--border-soft)] bg-surface hover:bg-surface-muted text-text-muted hover:text-foreground"
                        }`}
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        className={`absolute right-0 ${isNearBottom ? "bottom-full mb-2" : "top-full mt-2"
                          } z-50 w-48 rounded-xl border border-[var(--border-soft)] bg-surface shadow-2xl py-1 text-xs divide-y divide-[var(--border-soft)] animate-in fade-in zoom-in-95 duration-100`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOperator({ ...operator, email });
                              setOpenMenuAuthId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors font-semibold text-left"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Profile
                          </button>
                        </div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOperatorToDelete(operator);
                              setOpenMenuAuthId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-danger hover:bg-danger/10 transition-colors font-semibold text-left"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {role === "RIDER" ? "Delete Rider" : "Delete Operator"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-surface p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-text-muted">
              {role === "RIDER" ? "No riders found." : role === "OPERATOR" ? "No operators found." : "No staff found."}
            </p>
          </div>
        )}
      </div>

      {/* Delete Staff Confirmation Dialog */}
      <AlertDialog
        open={Boolean(operatorToDelete)}
        onOpenChange={(open) => !open && setOperatorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {operatorToDelete?.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently delete their account, authentication credentials, and staff profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOperatorToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger-hover"
              onClick={() => {
                if (operatorToDelete) {
                  startTransition(() => deleteOperator(operatorToDelete.authUserId));
                  setOperatorToDelete(null);
                }
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Staff Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            role="dialog"
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto thin-scrollbar bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <OperatorCreateForm
              branches={branches}
              fixedRole={role}
              onClose={() => setCreateModalOpen(false)}
              onSuccess={() => {
                setCreateModalOpen(false);
                setMessage(`${role === "RIDER" ? "Rider" : role === "OPERATOR" ? "Operator" : "Staff member"} added successfully.`);
                void onReload();
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {selectedOperator && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedOperator(null)}
        >
          <div
            role="dialog"
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto thin-scrollbar bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <OperatorProfileEditor
              operator={{
                ...selectedOperator,
                email: selectedOperator.email || profilesByAuthId[selectedOperator.authUserId]?.email,
              }}
              branches={branches}
              onClose={() => setSelectedOperator(null)}
              onSuccess={() => {
                setSelectedOperator(null);
                setMessage("Profile updated successfully.");
                void onReload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
