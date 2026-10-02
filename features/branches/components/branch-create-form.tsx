"use client";

import { useState } from "react";
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
import { uploadStoreImage } from "@/lib/upload-utils";
import { Upload } from "lucide-react";

type BranchFormData = z.infer<typeof branchCreateSchema>;

export function BranchCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  const { data: branchAdmins = [] } = useAuthUsers({ role: "BRANCH_ADMIN", isActive: true });
  const createBranch = useCreateBranch();

  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<BranchFormData>({
    resolver: zodResolver(branchCreateSchema) as any,
    defaultValues: {
      serviceRadiusKm: defaultServiceRadiusKm,
      status: "OPEN NOW",
      openHours: "8:00 AM - 8:00 PM",
      pickupTime: "30-45 mins",
      readyWithin: "24 hrs",
      rating: 4.8,
      reviews: 0,
      tags: "Laundry, Car Wash, Home Care",
      features: "Free Pickup, Express Service, Verified Store",
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
        <Field label="Branch name" placeholder="Delhi Central" required {...register("name")} hint={errors.name?.message} />
        <Field label="Phone number (Optional)" placeholder="+91-9876543210" {...register("phoneNumber")} hint={errors.phoneNumber?.message} />
        <Field label="GSTIN (Optional)" placeholder="09AAJCE8249F1ZA" {...register("gstin")} hint={errors.gstin?.message} />
        <Field label="CIN (Optional)" placeholder="U96010UW2026PTC255529" {...register("cin")} hint={errors.cin?.message} />
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
          hint={errors.latitude?.message}
        />
        <Field
          label="Longitude"
          type="number"
          step="any"
          min={-180}
          max={180}
          placeholder="77.6412"
          {...register("longitude")}
          hint={errors.longitude?.message}
        />

        <Select label="Assigned Branch Admin" {...register("assignedBranchAdminAuthUserId")} hint={errors.assignedBranchAdminAuthUserId?.message}>
          <option value="">Unassigned</option>
          {branchAdmins.map((branchAdmin) => (
            <option key={branchAdmin.id} value={branchAdmin.id}>
              {branchAdmin.name || branchAdmin.email}
            </option>
          ))}
        </Select>

        <div className="md:col-span-2 pt-4 border-t border-border space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Website Store Locator & Front Display
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary">
              Configure how this store appears on the public website at clean7.in/stores.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Store front image
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {imageUrl ? (
                <div className="relative w-36 h-24 rounded-lg overflow-hidden border border-border shrink-0 bg-surface">
                  <img
                    src={imageUrl}
                    alt="Store preview"
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
                    id="create-store-image"
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
                        setValue("imageUrl", url);
                      } catch (err: any) {
                        alert(err.message || "Failed to upload image");
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                  <label
                    htmlFor="create-store-image"
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
                      onClick={() => {
                        setImageUrl("");
                        setValue("imageUrl", "");
                      }}
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder="Or enter image URL..."
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setValue("imageUrl", e.target.value);
                  }}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Store Status" {...register("status")}>
              <option value="OPEN NOW">OPEN NOW (Green badge)</option>
              <option value="CLOSED">CLOSED (Red badge)</option>
            </Select>
            <Field label="Open Hours" placeholder="8:00 AM - 8:00 PM" {...register("openHours")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rating (0.0 to 5.0)" type="number" step="0.1" min={0} max={5} {...register("rating")} />
            <Field label="Reviews Count" type="number" min={0} {...register("reviews")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Pickup in" placeholder="30-45 mins" {...register("pickupTime")} />
            <Field label="Ready within" placeholder="24 hrs" {...register("readyWithin")} />
          </div>

          <Field label="Services / Tags (comma separated)" placeholder="Laundry, Car Wash, Home Care" {...register("tags")} />
          <Field label="Store features / Highlights (comma separated)" placeholder="Free Pickup, Express Service, Verified Store" {...register("features")} />
          <Field label="Google Maps directions URL (Optional)" placeholder="https://maps.google.com/?q=..." {...register("directionsUrl")} />
        </div>

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
