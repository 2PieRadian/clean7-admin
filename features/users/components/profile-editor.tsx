"use client";

import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Field, TextArea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useProfile, useUpdateProfile } from "../api/profile-api";

export function ProfileEditor({ authUserId }: { authUserId: string }) {
  const { data: profile, isLoading, isError, error } = useProfile(authUserId);
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    values: {
      fullName: profile?.fullName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      emergencyContactName: profile?.emergencyContactName ?? "",
      emergencyContactPhone: profile?.emergencyContactPhone ?? "",
      internalNotes: profile?.internalNotes ?? "",
    }
  });

  if (isLoading) {
    return <Card className="animate-pulse h-64 bg-surface-muted" />;
  }

  if (isError || !profile) {
    return (
      <Card>
        <p className="text-sm text-danger">{error?.message || "Profile not found."}</p>
      </Card>
    );
  }

  const onSubmit = async (data: any) => {
    await updateProfile.mutateAsync({ authUserId, payload: data });
  };

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-foreground">
          {profile.fullName || "No name saved"}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          {profile.email} - {profile.role}
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Full name" {...register("fullName")} />
        <Field label="Phone number" {...register("phoneNumber")} />
        <Field label="Avatar URL" {...register("avatarUrl")} />
        <Field label="Emergency contact name" {...register("emergencyContactName")} />
        <Field label="Emergency contact phone" {...register("emergencyContactPhone")} />
        <TextArea
          className="md:col-span-2"
          label="Private notes for your team"
          {...register("internalNotes")}
          hint="Only your team can see this."
        />

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={isSubmitting || updateProfile.isPending}>
            {isSubmitting || updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="md:col-span-2">
          {updateProfile.isError && (
            <p className="text-sm text-danger">{updateProfile.error?.message || "Failed to update profile."}</p>
          )}
          {updateProfile.isSuccess && (
            <p className="text-sm text-green-500">Profile updated successfully!</p>
          )}
        </div>
      </form>
    </Card>
  );
}
