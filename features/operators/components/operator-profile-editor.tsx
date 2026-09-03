"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { MutationStatus } from "@/components/admin/mutation-status";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, OperatorProfileResponse, StaffCreateResponse } from "@/lib/types";
import { Mail, ExternalLink, ShieldCheck, User, Bike, X } from "lucide-react";

export function OperatorProfileEditor({
  operator,
  branches = [],
  onSuccess,
  onClose,
}: {
  operator: OperatorProfileResponse;
  branches?: BranchAdminResponse[];
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  const isAdmin = isDirector || user?.role === "BRANCH_ADMIN";
  const isRider = operator.role === "RIDER";

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState<string>(operator.email || "");
  const [loadingEmail, setLoadingEmail] = useState(!operator.email);

  useEffect(() => {
    let cancelled = false;
    if (!email && operator.authUserId) {
      void apiRequest<{ email?: string }>({ path: `/admin/profiles/${operator.authUserId}` })
        .then((res) => {
          if (!cancelled && res?.email) {
            setEmail(res.email);
          }
        })
        .catch(() => { })
        .finally(() => {
          if (!cancelled) setLoadingEmail(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [operator.authUserId, email]);

  return (
    <div className="w-full bg-surface">
      {/* Sticky Modal Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border-soft)] bg-surface/95 backdrop-blur-md px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isRider ? <Bike className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Edit {isRider ? "Rider" : "Operator"} Profile
            </h2>
            <p className="text-xs text-text-muted">
              {operator.displayName} · <span className="font-mono text-foreground font-semibold">{operator.role}</span>
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              setMessage(null);
              setError(null);

              try {
                const body: Record<string, unknown> = {
                  fullName: String(formData.get("fullName") ?? "").trim(),
                  phoneNumber: String(formData.get("phoneNumber") ?? "").trim() || null,
                  gender: String(formData.get("gender") ?? "").trim() || null,
                  dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || null,
                  fullAddress: String(formData.get("fullAddress") ?? "").trim() || null,
                  emergencyContactName: String(formData.get("emergencyContactName") ?? "").trim() || null,
                  emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "").trim() || null,
                  governmentIdType: String(formData.get("governmentIdType") ?? "").trim() || null,
                  governmentIdNumber: String(formData.get("governmentIdNumber") ?? "").trim() || null,
                  profilePhotoUrl: String(formData.get("profilePhotoUrl") ?? "").trim() || null,
                  governmentIdProofUrl: String(formData.get("governmentIdProofUrl") ?? "").trim() || null,
                };

                const branchVal = formData.get("branchId");
                if (branchVal && typeof branchVal === "string") {
                  body.branchId = branchVal.trim();
                }

                if (isAdmin) {
                  body.isVerified = formData.get("isVerified") === "on";
                }

                if (isRider) {
                  body.vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;
                  body.vehicleNumber = String(formData.get("vehicleNumber") ?? "").trim() || null;
                  body.drivingLicenseNumber = String(formData.get("drivingLicenseNumber") ?? "").trim() || null;
                  body.drivingLicenseExpiry = String(formData.get("drivingLicenseExpiry") ?? "").trim() || null;
                  body.drivingLicenseUrl = String(formData.get("drivingLicenseUrl") ?? "").trim() || null;
                }

                await apiRequest<StaffCreateResponse>({
                  path: `/admin/operators/${operator.authUserId}`,
                  method: "PATCH",
                  body,
                });

                if (onSuccess) {
                  onSuccess();
                } else {
                  setMessage("Profile updated successfully.");
                }
              } catch (nextError) {
                setError(
                  nextError instanceof Error
                    ? nextError.message
                    : "Could not update profile.",
                );
              }
            });
          }}
        >
          {/* ── Section 1: Account & Contact ── */}
          <div className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-[var(--border-soft)] pb-1.5 flex items-center justify-between">
            <span>Account & Contact Information</span>
            <span className="text-[10px] font-mono text-text-muted">Role: {operator.role}</span>
          </div>

          {/* Full Name */}
          <Field
            label="Full Name"
            name="fullName"
            defaultValue={operator.displayName}
            required
          />

          {/* Email Address (Prominent with badge & icon) */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-text-muted">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={loadingEmail ? "Loading email..." : email || "No email on record"}
                disabled
                readOnly
                className="w-full rounded-xl border border-[var(--border-soft)] bg-surface-muted pl-9 pr-24 py-2 text-xs text-foreground cursor-not-allowed font-mono select-all"
              />
              <span className="absolute right-2.5 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/25">
                Login Email
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">Primary account email used to authenticate into Clean7.</p>
          </div>

          {/* Phone number */}
          <Field
            label="Phone Number"
            name="phoneNumber"
            type="tel"
            defaultValue={operator.phoneNumber ?? ""}
            placeholder="+91..."
          />

          {/* Branch selection */}
          {branches.length > 0 ? (
            <Select
              label="Assigned Branch"
              name="branchId"
              defaultValue={operator.branchId ?? ""}
            >
              <option value="">No branch assigned</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Assigned Branch
              </label>
              <input
                type="text"
                disabled
                readOnly
                value={operator.branch?.name || operator.branchId || "General"}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-surface-muted px-3.5 py-2 text-xs text-text-muted"
              />
            </div>
          )}

          {/* Gender */}
          <Select label="Gender" name="gender" defaultValue={operator.gender ?? ""}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>

          {/* Date of Birth */}
          <Field
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            defaultValue={
              operator.dateOfBirth
                ? new Date(operator.dateOfBirth).toISOString().split("T")[0]
                : ""
            }
          />

          {/* Full Address */}
          <div className="md:col-span-2">
            <Field
              label="Full Address"
              name="fullAddress"
              defaultValue={operator.fullAddress ?? ""}
              placeholder="Flat / Building, Street, Area, City..."
            />
          </div>

          {/* ── Section 2: Verification Status ── */}
          {isAdmin && (
            <div className="md:col-span-2 rounded-xl bg-surface-muted/70 border border-[var(--border-soft)] p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Verification Status</p>
                  <p className="text-[11px] text-text-muted">
                    Mark this {isRider ? "rider" : "operator"} profile and documents as verified by admin.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isVerified"
                  id="isVerified"
                  defaultChecked={operator.isVerified}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          )}

          {/* ── Section 3: Emergency Contact ── */}
          <div className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-[var(--border-soft)] pb-1.5 mt-2">
            Emergency Contact
          </div>
          <Field
            label="Emergency Contact Name"
            name="emergencyContactName"
            defaultValue={operator.emergencyContactName ?? ""}
          />
          <Field
            label="Emergency Contact Phone"
            name="emergencyContactPhone"
            type="tel"
            defaultValue={operator.emergencyContactPhone ?? ""}
          />

          {/* ── Section 4: Identity & Documents ── */}
          <div className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-[var(--border-soft)] pb-1.5 mt-2">
            Identity Documents
          </div>
          <Select
            label="Government ID Type"
            name="governmentIdType"
            defaultValue={operator.governmentIdType ?? ""}
          >
            <option value="">Select ID Type</option>
            <option value="Aadhar">Aadhar</option>
            <option value="PAN">PAN</option>
            <option value="Passport">Passport</option>
            <option value="Driving License">Driving License</option>
            <option value="Voter ID">Voter ID</option>
          </Select>
          <Field
            label="Government ID Number"
            name="governmentIdNumber"
            defaultValue={operator.governmentIdNumber ?? ""}
          />
          <div>
            <Field
              label="Profile Photo URL"
              name="profilePhotoUrl"
              type="url"
              defaultValue={operator.profilePhotoUrl ?? ""}
              placeholder="https://..."
            />
            {operator.profilePhotoUrl && (
              <a
                href={operator.profilePhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1 font-medium"
              >
                <ExternalLink className="h-3 w-3" /> View Photo
              </a>
            )}
          </div>
          <div>
            <Field
              label="Government ID Proof URL"
              name="governmentIdProofUrl"
              type="url"
              defaultValue={operator.governmentIdProofUrl ?? ""}
              placeholder="https://..."
            />
            {operator.governmentIdProofUrl && (
              <a
                href={operator.governmentIdProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1 font-medium"
              >
                <ExternalLink className="h-3 w-3" /> View ID Document
              </a>
            )}
          </div>

          {/* ── Section 5: Rider Details (if Rider) ── */}
          {isRider && (
            <>
              <div className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-[var(--border-soft)] pb-1.5 mt-2">
                Rider & Vehicle Details
              </div>
              <Select
                label="Vehicle Type"
                name="vehicleType"
                defaultValue={operator.vehicleType ?? ""}
              >
                <option value="">Select Vehicle</option>
                <option value="BIKE">Bike</option>
                <option value="SCOOTER">Scooter</option>
                <option value="VAN">Van</option>
                <option value="TRUCK">Truck</option>
              </Select>
              <Field
                label="Vehicle Registration Number"
                name="vehicleNumber"
                defaultValue={operator.vehicleNumber ?? ""}
                placeholder="e.g. DL-01-AB-1234"
              />
              <Field
                label="Driving License Number"
                name="drivingLicenseNumber"
                defaultValue={operator.drivingLicenseNumber ?? ""}
              />
              <Field
                label="Driving License Expiry"
                name="drivingLicenseExpiry"
                type="date"
                defaultValue={
                  operator.drivingLicenseExpiry
                    ? new Date(operator.drivingLicenseExpiry).toISOString().split("T")[0]
                    : ""
                }
              />
              <div className="md:col-span-2">
                <Field
                  label="Driving License Document URL"
                  name="drivingLicenseUrl"
                  type="url"
                  defaultValue={operator.drivingLicenseUrl ?? ""}
                  placeholder="https://..."
                />
                {operator.drivingLicenseUrl && (
                  <a
                    href={operator.drivingLicenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                  >
                    <ExternalLink className="h-3 w-3" /> View Driving License
                  </a>
                )}
              </div>
            </>
          )}

          {/* ── Form Actions ── */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-soft)]">
            <MutationStatus error={error} success={message} />
            <Button type="submit" variant="success" disabled={isPending} className="w-full sm:w-auto shadow-md">
              {isPending ? "Saving changes..." : "Save Profile Details"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
