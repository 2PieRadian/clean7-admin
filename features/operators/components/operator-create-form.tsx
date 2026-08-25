"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { MutationStatus } from "@/components/admin/mutation-status";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, StaffCreateResponse } from "@/lib/types";

export function OperatorCreateForm({
  branches,
  onSuccess,
}: {
  branches: BranchAdminResponse[];
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  const singleBranchId = branches.length === 1 ? branches[0]?.id : "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState("OPERATOR");

  return (
    <div className="w-full bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Add staff</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Creates login access and a operator or rider profile in one step.
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
              const branchField = String(formData.get("branchId") ?? "").trim();
              const resolvedBranchId = isDirector
                ? branchField
                : singleBranchId || branches[0]?.id || "";

              if (!resolvedBranchId) {
                setError("No branch available.");
                return;
              }

              if (isDirector && !branchField) {
                setError("Select a branch.");
                return;
              }

              await apiRequest<StaffCreateResponse>({
                path: "/admin/staff",
                method: "POST",
                body: {
                  fullName: String(formData.get("fullName") ?? "").trim(),
                  email: String(formData.get("email") ?? "").trim(),
                  password: String(formData.get("password") ?? ""),
                  phoneNumber:
                    String(formData.get("phoneNumber") ?? "").trim() || undefined,
                  role: String(formData.get("role") ?? "OPERATOR"),
                  branchId: resolvedBranchId,
                  dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || undefined,
                  gender: String(formData.get("gender") ?? "").trim() || undefined,
                  fullAddress: String(formData.get("fullAddress") ?? "").trim() || undefined,
                  emergencyContactName: String(formData.get("emergencyContactName") ?? "").trim() || undefined,
                  emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "").trim() || undefined,
                  governmentIdType: String(formData.get("governmentIdType") ?? "").trim() || undefined,
                  governmentIdNumber: String(formData.get("governmentIdNumber") ?? "").trim() || undefined,
                  profilePhotoUrl: String(formData.get("profilePhotoUrl") ?? "").trim() || undefined,
                  governmentIdProofUrl: String(formData.get("governmentIdProofUrl") ?? "").trim() || undefined,
                  ...(selectedRole === "RIDER" ? {
                    vehicleType: String(formData.get("vehicleType") ?? "").trim() || undefined,
                    vehicleNumber: String(formData.get("vehicleNumber") ?? "").trim() || undefined,
                    drivingLicenseNumber: String(formData.get("drivingLicenseNumber") ?? "").trim() || undefined,
                    drivingLicenseExpiry: String(formData.get("drivingLicenseExpiry") ?? "").trim() || undefined,
                    drivingLicenseUrl: String(formData.get("drivingLicenseUrl") ?? "").trim() || undefined,
                  } : {}),
                },
              });

              form.reset();
              if (onSuccess) {
                onSuccess();
              } else {
                setMessage("Staff member added. They can sign in with this email and password.");
              }
            } catch (nextError) {
              setError(
                nextError instanceof Error
                  ? nextError.message
                  : "Could not add staff.",
              );
            }
          });
        }}
      >
        <div className="md:col-span-2">
          <Field label="Full name" name="fullName" required />
        </div>
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone number" name="phoneNumber" type="tel" />
        <div className="md:col-span-2">
          <Field
            label="Password"
            name="password"
            type="password"
            required
            minLength={8}
            hint="At least 8 characters."
          />
        </div>
        <Select
          label="Role"
          name="role"
          required
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <option value="OPERATOR">Operator (at-home services)</option>
          <option value="RIDER">Rider (pickup & delivery)</option>
        </Select>
        {isDirector ? (
          <Select label="Branch" name="branchId" required defaultValue="">
            <option value="" disabled>
              Select a branch
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        ) : (
          <input type="hidden" name="branchId" value={singleBranchId} />
        )}

        <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
          Personal Information (Optional)
        </div>
        <Select label="Gender" name="gender" defaultValue="">
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </Select>
        <Field label="Date of Birth" name="dateOfBirth" type="date" />
        <div className="md:col-span-2">
          <Field label="Full Address" name="fullAddress" />
        </div>

        <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
          Emergency Contact (Optional)
        </div>
        <Field label="Emergency Contact Name" name="emergencyContactName" />
        <Field label="Emergency Contact Phone" name="emergencyContactPhone" type="tel" />

        <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
          Identity & Documents (Optional)
        </div>
        <Select label="Government ID Type" name="governmentIdType" defaultValue="">
          <option value="">Select ID Type</option>
          <option value="Aadhar">Aadhar</option>
          <option value="PAN">PAN</option>
          <option value="Passport">Passport</option>
          <option value="Driving License">Driving License</option>
          <option value="Voter ID">Voter ID</option>
        </Select>
        <Field label="Government ID Number" name="governmentIdNumber" />
        <Field label="Profile Photo URL" name="profilePhotoUrl" type="url" />
        <Field label="Government ID Proof URL" name="governmentIdProofUrl" type="url" />

        {selectedRole === "RIDER" && (
          <>
            <div className="md:col-span-2 text-sm font-semibold text-text-primary border-b border-[var(--border-soft)] pb-2 mt-4">
              Rider Details (Optional)
            </div>
            <Select label="Vehicle Type" name="vehicleType" defaultValue="">
              <option value="">Select Vehicle</option>
              <option value="BIKE">Bike</option>
              <option value="SCOOTER">Scooter</option>
              <option value="VAN">Van</option>
              <option value="TRUCK">Truck</option>
            </Select>
            <Field label="Vehicle Number" name="vehicleNumber" />
            <Field label="Driving License Number" name="drivingLicenseNumber" />
            <Field label="Driving License Expiry" name="drivingLicenseExpiry" type="date" />
            <div className="md:col-span-2">
              <Field label="Driving License URL" name="drivingLicenseUrl" type="url" />
            </div>
          </>
        )}

        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <MutationStatus error={error} success={message} />
          <Button type="submit" variant="success" disabled={isPending}>
            {isPending ? "Adding..." : "Add staff"}
          </Button>
        </div>
      </form>
    </div>
  );
}
