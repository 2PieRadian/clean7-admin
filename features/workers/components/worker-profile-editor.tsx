"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { MutationStatus } from "@/components/admin/mutation-status";
import { apiRequest } from "@/lib/browser-api";
import type { WorkerProfileResponse, StaffCreateResponse } from "@/lib/types";

export function WorkerProfileEditor({
  worker,
  onSuccess,
}: {
  worker: WorkerProfileResponse;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "DIRECTOR" || user?.role === "BRANCH_ADMIN";
  const isRider = worker.role === "RIDER";

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="w-full bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Edit Profile</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Update operational and identity information for {worker.displayName}.
        </p>
      </div>

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
              const body: any = {
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

              // Use the new endpoint implemented in worker-service
              await apiRequest<StaffCreateResponse>({
                path: `/admin/workers/${worker.authUserId}`,
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
        <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2">
          Basic Details
        </div>
        <div className="md:col-span-2">
          <Field label="Full name" name="fullName" defaultValue={worker.displayName} required />
        </div>
        <Field label="Phone number" name="phoneNumber" type="tel" defaultValue={worker.phoneNumber ?? ""} />
        <Select label="Gender" name="gender" defaultValue={worker.gender ?? ""}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </Select>
        <Field label="Date of Birth" name="dateOfBirth" type="date" defaultValue={worker.dateOfBirth ? new Date(worker.dateOfBirth).toISOString().split('T')[0] : ""} />
        <div className="md:col-span-2">
          <Field label="Full Address" name="fullAddress" defaultValue={worker.fullAddress ?? ""} />
        </div>

        <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
          Emergency Contact
        </div>
        <Field label="Emergency Contact Name" name="emergencyContactName" defaultValue={worker.emergencyContactName ?? ""} />
        <Field label="Emergency Contact Phone" name="emergencyContactPhone" type="tel" defaultValue={worker.emergencyContactPhone ?? ""} />

        <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
          Identity & Documents (URL Inputs)
        </div>
        <Select label="Government ID Type" name="governmentIdType" defaultValue={worker.governmentIdType ?? ""}>
          <option value="">Select ID Type</option>
          <option value="Aadhar">Aadhar</option>
          <option value="PAN">PAN</option>
          <option value="Passport">Passport</option>
          <option value="Driving License">Driving License</option>
          <option value="Voter ID">Voter ID</option>
        </Select>
        <Field label="Government ID Number" name="governmentIdNumber" defaultValue={worker.governmentIdNumber ?? ""} />
        <Field label="Profile Photo URL" name="profilePhotoUrl" type="url" defaultValue={worker.profilePhotoUrl ?? ""} />
        <Field label="Government ID Proof URL" name="governmentIdProofUrl" type="url" defaultValue={worker.governmentIdProofUrl ?? ""} />

        {isRider && (
          <>
            <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
              Rider Details
            </div>
            <Select label="Vehicle Type" name="vehicleType" defaultValue={worker.vehicleType ?? ""}>
              <option value="">Select Vehicle</option>
              <option value="BIKE">Bike</option>
              <option value="SCOOTER">Scooter</option>
              <option value="VAN">Van</option>
              <option value="TRUCK">Truck</option>
            </Select>
            <Field label="Vehicle Number" name="vehicleNumber" defaultValue={worker.vehicleNumber ?? ""} />
            <Field label="Driving License Number" name="drivingLicenseNumber" defaultValue={worker.drivingLicenseNumber ?? ""} />
            <Field label="Driving License Expiry" name="drivingLicenseExpiry" type="date" defaultValue={worker.drivingLicenseExpiry ? new Date(worker.drivingLicenseExpiry).toISOString().split('T')[0] : ""} />
            <div className="md:col-span-2">
              <Field label="Driving License URL" name="drivingLicenseUrl" type="url" defaultValue={worker.drivingLicenseUrl ?? ""} />
            </div>
          </>
        )}

        {isAdmin && (
          <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
            Verification
          </div>
        )}
        {isAdmin && (
          <div className="md:col-span-2 flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              name="isVerified"
              id="isVerified"
              defaultChecked={worker.isVerified}
              className="w-4 h-4 text-primary bg-surface border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="isVerified" className="text-sm font-medium text-foreground">
              Mark worker profile and documents as verified
            </label>
          </div>
        )}

        <div className="md:col-span-2 flex items-center justify-between gap-3 mt-4">
          <MutationStatus error={error} success={message} />
          <Button type="submit" variant="success" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
