"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { notFound, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { MutationStatus } from "@/components/admin/mutation-status";
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
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import { buildBranchPayload, defaultServiceRadiusKm } from "@/lib/branch-form";
import type { BranchAdminResponse, ManagedAuthUser } from "@/lib/types";

export default function BranchDetailPage() {
  const params = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  if (user && !isDirector) {
    notFound();
  }

  const branchId = String(params.branchId ?? "");
  const [branch, setBranch] = useState<BranchAdminResponse | null>(null);
  const [branchAdmins, setBranchAdmins] = useState<ManagedAuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    if (!branchId) return;

    setLoading(true);
    setError(null);

    try {
      const branches = await apiRequest<BranchAdminResponse[]>({
        path: "/admin/branches",
      });
      const matchedBranch =
        branches.find((item) => item.id === branchId) ?? null;

      setBranch(matchedBranch);
      if (!matchedBranch) {
        setError("Branch not found.");
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load branch.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    if (!branchId) {
      return;
    }

    void (async () => {
      try {
        const branches = await apiRequest<BranchAdminResponse[]>({
          path: "/admin/branches",
        });
        const matchedBranch =
          branches.find((item) => item.id === branchId) ?? null;

        if (!cancelled) {
          setBranch(matchedBranch);
          if (!matchedBranch) {
            setError("Branch not found.");
          }
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load branch.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!isDirector) return;

    let cancelled = false;

    void (async () => {
      try {
        const nextBranchAdmins = await apiRequest<ManagedAuthUser[]>({
          path: "/admin/auth-users",
          query: { role: "BRANCH_ADMIN", isActive: true },
        });

        if (!cancelled) {
          setBranchAdmins(nextBranchAdmins);
        }
      } catch {
        if (!cancelled) {
          setBranchAdmins([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDirector]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={branch ? branch.name : "Branch details"}
        description="Update branch location metadata and service radius. Schedule closures from Schedule overrides."
      />

      <div className="flex flex-wrap gap-3">
        <Link href="/branches">
          <Button variant="primary" className="gap-1.5">
            <ArrowLeft
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            Back to branches
          </Button>
        </Link>
        <Link href="/schedule-overrides">
          <Button variant="secondary">Schedule overrides</Button>
        </Link>
      </div>

      {loading ? <InlineLoadingCard lines={7} /> : null}

      {error && !branch ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {!loading && branch ? (
        <Card className="max-w-3xl space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {branch.name}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{branch.code}</p>
            </div>
            <Badge value={branch.isActive ? "ACTIVE" : "INACTIVE"} />
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                setMessage(null);
                setError(null);

                try {
                  await apiRequest({
                    path: `/admin/branches/${branch.id}`,
                    method: "PATCH",
                    body: buildBranchPayload(formData, {
                      includeAssignedBranchAdmin: isDirector,
                      isActiveFallback: branch.isActive,
                    }),
                  });
                  setMessage("Branch updated.");
                  await load();
                } catch (nextError) {
                  setError(
                    nextError instanceof Error
                      ? nextError.message
                      : "Could not update the branch.",
                  );
                }
              });
            }}
          >
            <Field
              label="Short code"
              name="code"
              defaultValue={branch.code}
              required
            />
            <Field
              label="Branch name"
              name="name"
              defaultValue={branch.name}
              required
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="City"
                name="city"
                defaultValue={branch.city ?? ""}
                placeholder="Bengaluru"
              />
              <Field
                label="State"
                name="state"
                defaultValue={branch.state ?? ""}
                placeholder="Karnataka"
              />
            </div>
            <Field
              label="Address line 1"
              name="addressLine1"
              defaultValue={branch.addressLine1 ?? ""}
              placeholder="12 Example Road"
            />
            <Field
              label="Address line 2"
              name="addressLine2"
              defaultValue={branch.addressLine2 ?? ""}
              placeholder="Near Metro Station"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Branch postal code"
                name="postalCode"
                defaultValue={branch.postalCode ?? ""}
                placeholder="560038"
              />
              <Field
                label="Service radius (km)"
                name="serviceRadiusKm"
                type="number"
                min={0.1}
                step="0.1"
                defaultValue={branch.serviceRadiusKm ?? defaultServiceRadiusKm}
                hint="Defaults to 8 km."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Latitude"
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                defaultValue={branch.latitude ?? ""}
                hint="Required when the branch is active."
              />
              <Field
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={branch.longitude ?? ""}
                hint="Required when the branch is active."
              />
            </div>
            {isDirector ? (
              <Select
                label="Assigned Branch Admin"
                name="assignedBranchAdminAuthUserId"
                defaultValue={branch.assignedBranchAdminAuthUserId ?? ""}
              >
                <option value="">Unassigned</option>
                {branch.assignedBranchAdminAuthUserId &&
                !branchAdmins.some(
                  (branchAdmin) =>
                    branchAdmin.id === branch.assignedBranchAdminAuthUserId,
                ) ? (
                  <option value={branch.assignedBranchAdminAuthUserId}>
                    Current: {branch.assignedBranchAdminAuthUserId}
                  </option>
                ) : null}
                {branchAdmins.map((branchAdmin) => (
                  <option key={branchAdmin.id} value={branchAdmin.id}>
                    {branchAdmin.name || branchAdmin.email}
                  </option>
                ))}
              </Select>
            ) : null}
            {isDirector ? (
              <label className="text-sm text-text-secondary">
                <input
                  className="mr-2"
                  type="checkbox"
                  name="isActive"
                  defaultChecked={branch.isActive}
                />
                This branch is active
              </label>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MutationStatus error={error} success={message} />
                {isDirector ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="danger" type="button" disabled={isPending}>
                        Deactivate branch
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate {branch.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will set the branch to inactive. It will no longer accept
                          new orders, but existing history and assignments will be
                          preserved.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-danger text-white hover:bg-danger-hover"
                          onClick={() => {
                            startTransition(async () => {
                              setMessage(null);
                              setError(null);
                              try {
                                await apiRequest({
                                  path: `/admin/branches/${branch.id}`,
                                  method: "DELETE",
                                });
                                setMessage("Branch deactivated.");
                                await load();
                              } catch (nextError) {
                                setError(
                                  nextError instanceof Error
                                    ? nextError.message
                                    : "Could not deactivate branch.",
                                );
                              }
                            });
                          }}
                        >
                          Confirm Deactivation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
