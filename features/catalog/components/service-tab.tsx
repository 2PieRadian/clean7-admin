"use client";

import { useState, useRef } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema } from "../schemas";
import { useCategories, useCreateService, useUpdateService } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates, serviceModes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { uploadServiceImage } from "@/lib/upload-utils";
import { Upload, X, Smartphone, Globe, Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import type { CatalogServiceSummary } from "@/lib/types";

type ServiceFormData = z.infer<typeof serviceSchema>;

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveCode(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ServiceForm({
  defaultCategoryId,
  initialService,
  onSuccess
}: {
  defaultCategoryId?: string;
  initialService?: CatalogServiceSummary | null;
  onSuccess?: () => void
}) {
  const { data: categories = [] } = useCategories();
  const createService = useCreateService();
  const updateService = useUpdateService();

  const isEditing = Boolean(initialService?.id);

  const [appImageUploading, setAppImageUploading] = useState(false);
  const [appImageProgress, setAppImageProgress] = useState(0);
  const [appImageError, setAppImageError] = useState<string | null>(null);

  const [webImageUploading, setWebImageUploading] = useState(false);
  const [webImageProgress, setWebImageProgress] = useState(0);
  const [webImageError, setWebImageError] = useState<string | null>(null);

  const appFileInputRef = useRef<HTMLInputElement>(null);
  const webFileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      categoryId: initialService?.categoryId || defaultCategoryId || "",
      code: initialService?.code || "",
      slug: initialService?.slug || "",
      name: initialService?.name || "",
      shortDescription: initialService?.shortDescription || "",
      serviceMode: initialService?.serviceMode || "PICKUP_DELIVERY",
      durationEstimateMinutes: initialService?.durationEstimateMinutes ?? undefined,
      appImageUrl: initialService?.appImageUrl || "",
      webImageUrl: initialService?.webImageUrl || "",
      sortOrder: initialService?.sortOrder ?? 0,
      publishState: initialService?.publishState || "ACTIVE",
      changeSummary: isEditing ? `Updated service ${initialService?.name}` : "Initial service creation",
    }
  });

  const appImageUrlValue = watch("appImageUrl") || "";
  const webImageUrlValue = watch("webImageUrl") || "";

  const handleFileUpload = async (
    file: File,
    variant: "app" | "web"
  ) => {
    if (variant === "app") {
      setAppImageUploading(true);
      setAppImageProgress(0);
      setAppImageError(null);
      try {
        const url = await uploadServiceImage(file, "app", (p) => setAppImageProgress(p));
        setValue("appImageUrl", url, { shouldValidate: true, shouldDirty: true });
      } catch (err: any) {
        setAppImageError(err.message || "Failed to upload App Image");
      } finally {
        setAppImageUploading(false);
      }
    } else {
      setWebImageUploading(true);
      setWebImageProgress(0);
      setWebImageError(null);
      try {
        const url = await uploadServiceImage(file, "web", (p) => setWebImageProgress(p));
        setValue("webImageUrl", url, { shouldValidate: true, shouldDirty: true });
      } catch (err: any) {
        setWebImageError(err.message || "Failed to upload Website Image");
      } finally {
        setWebImageUploading(false);
      }
    }
  };

  const onSubmit = async (data: ServiceFormData) => {
    const code = data.code?.trim() || deriveCode(data.name);
    const slug = data.slug?.trim() || deriveSlug(data.name);
    const changeSummary = data.changeSummary?.trim() || (isEditing ? `Updated service ${data.name}` : `Created service ${data.name}`);

    if (isEditing && initialService) {
      await updateService.mutateAsync({ id: initialService.id, ...data, code, slug, changeSummary });
    } else {
      await createService.mutateAsync({ ...data, code, slug, changeSummary });
    }
    reset();
    onSuccess?.();
  };

  const isPending = createService.isPending || updateService.isPending;
  const isError = createService.isError || updateService.isError;
  const isSuccess = createService.isSuccess || updateService.isSuccess;
  const errorMessage = createService.error?.message || updateService.error?.message;

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {isEditing ? "Edit service" : "Create service"}
      </h3>
      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit as any)}>
        {!defaultCategoryId && !isEditing ? (
          <Select label="Category" required {...register("categoryId")} hint={errors.categoryId?.message}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        ) : (
          <input type="hidden" {...register("categoryId")} />
        )}

        <Field label="Name" required {...register("name")} hint={errors.name?.message} />
        <TextArea label="Short description" {...register("shortDescription")} hint={errors.shortDescription?.message} />

        <Select label="Service mode" {...register("serviceMode")} hint={errors.serviceMode?.message}>
          {serviceModes.map((m) => (
            <option key={m} value={m}>{humanizeToken(m)}</option>
          ))}
        </Select>

        {/* Dual Service Images Section */}
        <div className="border border-[var(--border-soft)] rounded-2xl p-4 bg-surface-muted/30 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Service Photos</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. App Photo */}
            <div className="space-y-2 p-3 bg-surface rounded-xl border border-[var(--border-soft)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  <span>App Photo</span>
                </div>
                <p className="text-[11px] text-text-muted mb-2">
                  Used in clean7-app (mobile view).
                </p>

                <Field
                  label=""
                  placeholder="https://... or upload below"
                  {...register("appImageUrl")}
                  hint={errors.appImageUrl?.message || appImageError || undefined}
                />
              </div>

              <div className="mt-2 space-y-2">
                {appImageUrlValue ? (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border border-[var(--border-soft)] bg-surface-muted flex items-center justify-center">
                    <img
                      src={appImageUrlValue}
                      alt="App preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setValue("appImageUrl", "", { shouldDirty: true })}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <input
                  type="file"
                  ref={appFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "app");
                  }}
                />

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  disabled={appImageUploading}
                  onClick={() => appFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {appImageUploading ? `Uploading (${appImageProgress}%)...` : "Upload App Photo"}
                </Button>
              </div>
            </div>

            {/* 2. Website Photo */}
            <div className="space-y-2 p-3 bg-surface rounded-xl border border-[var(--border-soft)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>Website Photo</span>
                </div>
                <p className="text-[11px] text-text-muted mb-2">
                  Used in clean7-website (desktop & web cards).
                </p>

                <Field
                  label=""
                  placeholder="https://... or upload below"
                  {...register("webImageUrl")}
                  hint={errors.webImageUrl?.message || webImageError || undefined}
                />
              </div>

              <div className="mt-2 space-y-2">
                {webImageUrlValue ? (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border border-[var(--border-soft)] bg-surface-muted flex items-center justify-center">
                    <img
                      src={webImageUrlValue}
                      alt="Website preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setValue("webImageUrl", "", { shouldDirty: true })}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <input
                  type="file"
                  ref={webFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "web");
                  }}
                />

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  disabled={webImageUploading}
                  onClick={() => webFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {webImageUploading ? `Uploading (${webImageProgress}%)...` : "Upload Website Photo"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Field label="Duration (minutes)" type="number" {...register("durationEstimateMinutes")} hint={errors.durationEstimateMinutes?.message} />
        <Field label="Sort order" type="number" {...register("sortOrder")} hint={errors.sortOrder?.message} />

        <Select label="Publish state" {...register("publishState")} hint={errors.publishState?.message}>
          {publishStates.map((p) => (
            <option key={p} value={p}>{humanizeToken(p)}</option>
          ))}
        </Select>

        <Button type="submit" disabled={isSubmitting || isPending}>
          {isSubmitting || isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update service" : "Create service")}
        </Button>

        {isError && (
          <p className="text-sm text-red-500">{errorMessage || `Failed to ${isEditing ? "update" : "create"} service`}</p>
        )}
        {isSuccess && (
          <p className="text-sm text-green-500">Service {isEditing ? "updated" : "created"} successfully!</p>
        )}
      </form>
    </Card>
  );
}
