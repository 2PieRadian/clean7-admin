"use client";

import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
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
import { uploadStoreImage } from "@/lib/upload-utils";
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

  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [todaySlots, setTodaySlots] = useState<{ M: boolean; A: boolean; E: boolean }>({
    M: true,
    A: true,
    E: true,
  });

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
    if (branch) {
      setImageUrl(branch.imageUrl ?? "");
      if (Array.isArray(branch.todaySlots) && branch.todaySlots.length > 0) {
        const m = branch.todaySlots.find((s) => s.label === "M");
        const a = branch.todaySlots.find((s) => s.label === "A");
        const e = branch.todaySlots.find((s) => s.label === "E");
        setTodaySlots({
          M: m ? m.active : true,
          A: a ? a.active : true,
          E: e ? e.active : true,
        });
      }
    }
  }, [branch]);

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
            </div>

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
              label="Branch name"
              name="name"
              defaultValue={branch.name}
              required
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Phone number (Optional)"
                name="phoneNumber"
                defaultValue={branch.phoneNumber ?? branch.phone ?? ""}
                placeholder="+91-9876543210"
              />
              <Field
                label="GSTIN (Optional)"
                name="gstin"
                defaultValue={branch.gstin ?? ""}
                placeholder="09AAJCE8249F1ZA"
              />
              <Field
                label="CIN (Optional)"
                name="cin"
                defaultValue={branch.cin ?? ""}
                placeholder="U96010UW2026PTC255529"
              />
            </div>
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
                hint="Required."
              />
              <Field
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={branch.longitude ?? ""}
                hint="Required."
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

            {/* Website Store Locator & Front Display Fields */}
            <div className="pt-5 mt-2 border-t border-border space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Website Store Locator & Front Display
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  These values are displayed on the public customer-facing website at clean7.in/stores.
                </p>
              </div>

              {/* Store Image Upload & URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Store front image
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {imageUrl ? (
                    <div className="relative w-36 h-24 rounded-lg overflow-hidden border border-border shrink-0 bg-surface">
                      <img
                        src={imageUrl}
                        alt={branch.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-24 rounded-lg border border-dashed border-border shrink-0 flex items-center justify-center text-xs text-text-secondary bg-surface">
                      Default image
                    </div>
                  )}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="store-image-upload"
                        className="hidden"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          setUploadProgress(0);
                          try {
                            const url = await uploadStoreImage(file, (p) => setUploadProgress(p));
                            setImageUrl(url);
                          } catch (err: any) {
                            alert(err.message || "Failed to upload image");
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                      />
                      <label
                        htmlFor="store-image-upload"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-foreground cursor-pointer hover:bg-surface-hover"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? `Uploading ${uploadProgress}%...` : "Upload Store Image"}
                      </label>
                      {imageUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setImageUrl("")}
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      placeholder="Or enter image URL (e.g. /images/franchise/store.png or S3 URL)..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground"
                    />
                    <input type="hidden" name="imageUrl" value={imageUrl} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Store Status"
                  name="status"
                  defaultValue={branch.status ?? "OPEN NOW"}
                >
                  <option value="OPEN NOW">OPEN NOW (Green badge)</option>
                  <option value="CLOSED">CLOSED (Red badge)</option>
                </Select>
                <Field
                  label="Open Hours"
                  name="openHours"
                  defaultValue={branch.openHours ?? "8:00 AM - 8:00 PM"}
                  placeholder="8:00 AM - 8:00 PM"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Rating (0.0 to 5.0, Optional)"
                  name="rating"
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  defaultValue={branch.rating ?? ""}
                  placeholder="Leave empty for new store"
                  hint="Store rating shown to customers"
                />
                <Field
                  label="Reviews Count"
                  name="reviews"
                  type="number"
                  min={0}
                  defaultValue={branch.reviews ?? 0}
                  hint="Number of customer reviews"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Pickup in (Optional)"
                  name="pickupTime"
                  defaultValue={branch.pickupTime ?? ""}
                  placeholder="e.g. 30-45 mins"
                  hint="E.g. 30-45 mins"
                />
                <Field
                  label="Ready within (Optional)"
                  name="readyWithin"
                  defaultValue={branch.readyWithin ?? ""}
                  placeholder="e.g. 24 hrs"
                  hint="E.g. 24 hrs"
                />
              </div>

              <Field
                label="Services / Tags (comma separated, Optional)"
                name="tags"
                defaultValue={Array.isArray(branch.tags) ? branch.tags.join(", ") : ""}
                placeholder="e.g. Laundry, Dry Clean, Steam Press"
                hint="Used for tags and service filter on the website"
              />

              <Field
                label="Store features / Highlights (comma separated, Optional)"
                name="features"
                defaultValue={Array.isArray(branch.features) ? branch.features.join(", ") : ""}
                placeholder="e.g. Free Pickup, Express Service, Verified Store"
                hint="Store highlights listed on the card"
              />

              <Field
                label="Google Maps directions URL (Optional)"
                name="directionsUrl"
                defaultValue={branch.directionsUrl ?? ""}
                placeholder="https://maps.google.com/?q=..."
                hint="Leave empty to auto-generate directions from latitude and longitude"
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Today's Slots Available (M / A / E)
                </label>
                <div className="flex gap-2.5">
                  {[
                    { key: "M" as const, label: "Morning (M)" },
                    { key: "A" as const, label: "Afternoon (A)" },
                    { key: "E" as const, label: "Evening (E)" },
                  ].map((slot) => (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() =>
                        setTodaySlots((prev) => ({
                          ...prev,
                          [slot.key]: !prev[slot.key],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all ${todaySlots[slot.key]
                          ? "bg-[rgba(39,193,165,0.15)] border-[#27c1a5] text-[#27c1a5]"
                          : "bg-surface border-border text-text-secondary line-through opacity-50"
                        }`}
                    >
                      {slot.label}: {todaySlots[slot.key] ? "Open" : "Closed"}
                    </button>
                  ))}
                </div>
                <input
                  type="hidden"
                  name="todaySlots"
                  value={JSON.stringify([
                    { label: "M", active: todaySlots.M },
                    { label: "A", active: todaySlots.A },
                    { label: "E", active: todaySlots.E },
                  ])}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-3">
                <MutationStatus error={error} success={message} />
                {isDirector ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="danger" type="button" disabled={isPending}>
                        Delete branch
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {branch.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the branch and all its operators and assignments.
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
                                setMessage("Branch deleted.");
                                await load();
                              } catch (nextError) {
                                setError(
                                  nextError instanceof Error
                                    ? nextError.message
                                    : "Could not delete branch.",
                                );
                              }
                            });
                          }}
                        >
                          Confirm Deletion
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
