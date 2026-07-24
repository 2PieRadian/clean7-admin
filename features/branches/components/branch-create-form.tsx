"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { useAuth } from "@/features/auth/store/auth-store";
import { useCreateBranch } from "@/features/branches/api/branch-api";
import { useAuthUsers } from "@/features/users/api/user-api";
import { branchCreateSchema } from "@/features/branches/schemas";
import { defaultServiceRadiusKm } from "@/lib/branch-form";
import { indianStates } from "@/lib/constants";
type BranchFormData = z.infer<typeof branchCreateSchema>;

export function BranchCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  
  const { data: branchAdmins = [] } = useAuthUsers({ role: "BRANCH_ADMIN", isActive: true });
  const createBranch = useCreateBranch();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BranchFormData>({
    resolver: zodResolver(branchCreateSchema) as any,
    defaultValues: {
      serviceRadiusKm: defaultServiceRadiusKm,
      isActive: true,
    }
  });

  const onSubmit = async (data: BranchFormData) => {
    await createBranch.mutateAsync(data);
    reset();
    if (onSuccess) onSuccess();
  };

  if (!isDirector) {
    return (
      <Card className="max-w-3xl">
        <p className="text-sm text-text-secondary">
          Only Directors can create branches or assign Branch Admins.
        </p>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Add branch</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Create a place where orders can be picked up or handled.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit as any)}>
        <Field label="Short code" placeholder="DELHI_CENTRAL" required {...register("code")} hint={errors.code?.message} />
        <Field label="Branch name" placeholder="Delhi Central" required {...register("name")} hint={errors.name?.message} />
        <Field label="City" placeholder="Bengaluru" {...register("city")} hint={errors.city?.message} />
        <Select label="State" {...register("state")} hint={errors.state?.message}>
          <option value="">Select a state</option>
          {indianStates.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        
        <Field className="md:col-span-2" label="Address line 1" placeholder="12 Example Road" {...register("addressLine1")} hint={errors.addressLine1?.message} />
        <Field className="md:col-span-2" label="Address line 2" placeholder="Near Metro Station" {...register("addressLine2")} hint={errors.addressLine2?.message} />
        
        <Field label="Branch postal code" placeholder="560038" {...register("postalCode")} hint={errors.postalCode?.message} />
        <Field
          label="Service radius (km)"
          type="number"
          min={0.1}
          step="0.1"
          {...register("serviceRadiusKm")}
          hint={errors.serviceRadiusKm?.message || "Defaults to 8 km."}
        />
        
        <Field
          label="Latitude"
          type="number"
          step="any"
          min={-90}
          max={90}
          placeholder="12.9716"
          {...register("latitude")}
          hint={errors.latitude?.message || "Required when the branch is active."}
        />
        <Field
          label="Longitude"
          type="number"
          step="any"
          min={-180}
          max={180}
          placeholder="77.6412"
          {...register("longitude")}
          hint={errors.longitude?.message || "Required when the branch is active."}
        />
        
        <Select label="Assigned Branch Admin" {...register("assignedBranchAdminAuthUserId")} hint={errors.assignedBranchAdminAuthUserId?.message}>
          <option value="">Unassigned</option>
          {branchAdmins.map((branchAdmin) => (
            <option key={branchAdmin.id} value={branchAdmin.id}>
              {branchAdmin.name || branchAdmin.email}
            </option>
          ))}
        </Select>
        
        <label className="md:col-span-2 text-sm text-text-secondary flex items-center">
          <input className="mr-2" type="checkbox" {...register("isActive")} />
          This branch is active
        </label>
        
        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <div>
            {createBranch.isSuccess && <p className="text-sm text-green-500">Branch added successfully!</p>}
            {createBranch.isError && <p className="text-sm text-red-500">{createBranch.error?.message || "Failed to create branch."}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || createBranch.isPending}>
            {isSubmitting || createBranch.isPending ? "Adding..." : "Add branch"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
