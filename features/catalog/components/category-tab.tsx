"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "../schemas";
import { useCategories, useCreateCategory, useUpdateCategory } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { uploadCategoryImage } from "@/lib/upload-utils";
import type { CategorySummary } from "@/lib/types";
import { Upload, X, Smartphone, Globe, Image as ImageIcon } from "lucide-react";
import { z } from "zod";

type CategoryFormData = z.infer<typeof categorySchema>;

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

interface CategoryFormProps {
  initialCategory?: CategorySummary | null;
  onSuccess?: () => void;
}

export function CategoryForm({ initialCategory, onSuccess }: CategoryFormProps) {
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = Boolean(initialCategory?.id);

  const [appImageUploading, setAppImageUploading] = useState(false);
  const [appImageProgress, setAppImageProgress] = useState(0);
  const [appImageError, setAppImageError] = useState<string | null>(null);

  const [webImageUploading, setWebImageUploading] = useState(false);
  const [webImageProgress, setWebImageProgress] = useState(0);
  const [webImageError, setWebImageError] = useState<string | null>(null);

  const appFileInputRef = useRef<HTMLInputElement>(null);
  const webFileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: initialCategory?.name || "",
      code: initialCategory?.code || "",
      slug: initialCategory?.slug || "",
      description: initialCategory?.description || "",
      iconUrl: initialCategory?.iconUrl || "",
      appImageUrl: initialCategory?.appImageUrl || "",
      webImageUrl: initialCategory?.webImageUrl || "",
      sortOrder: initialCategory?.sortOrder ?? 0,
      publishState: (initialCategory?.publishState as any) || "ACTIVE",
      isEnabled: initialCategory?.isEnabled ?? true,
      changeSummary: isEditing ? `Updated category ${initialCategory?.name}` : "Initial category creation",
    },
  });

  const nameValue = watch("name") || "";
  const appImageUrlValue = watch("appImageUrl") || "";
  const webImageUrlValue = watch("webImageUrl") || "";
  const trimmedName = nameValue.trim();
  const derivedSlug = deriveSlug(trimmedName);
  const derivedCode = deriveCode(trimmedName);

  const otherCategories = categories.filter((c) => c.id !== initialCategory?.id);

  const duplicateName = Boolean(
    trimmedName &&
    otherCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
  );

  const duplicateSlugOrCode = Boolean(
    trimmedName &&
    otherCategories.some(
      (c) =>
        c.slug.trim().toLowerCase() === derivedSlug.toLowerCase() ||
        c.code.trim().toUpperCase() === derivedCode.toUpperCase()
    )
  );

  const handleFileUpload = async (
    file: File,
    variant: "app" | "web"
  ) => {
    if (variant === "app") {
      setAppImageUploading(true);
      setAppImageProgress(0);
      setAppImageError(null);
      try {
        const url = await uploadCategoryImage(file, "app", (p) => setAppImageProgress(p));
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
        const url = await uploadCategoryImage(file, "web", (p) => setWebImageProgress(p));
        setValue("webImageUrl", url, { shouldValidate: true, shouldDirty: true });
      } catch (err: any) {
        setWebImageError(err.message || "Failed to upload Website Image");
      } finally {
        setWebImageUploading(false);
      }
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    const code = data.code?.trim() || deriveCode(data.name);
    const slug = data.slug?.trim() || deriveSlug(data.name);
    const changeSummary = data.changeSummary?.trim() || (isEditing ? `Updated category ${data.name}` : `Created category ${data.name}`);

    const existingMatch = otherCategories.find(
      (c) =>
        c.name.trim().toLowerCase() === data.name.trim().toLowerCase() ||
        c.slug.trim().toLowerCase() === slug.toLowerCase() ||
        c.code.trim().toUpperCase() === code.toUpperCase()
    );

    if (existingMatch) {
      setError("name", {
        type: "manual",
        message: `Category "${existingMatch.name}" already exists.`,
      });
      return;
    }

    if (isEditing && initialCategory?.id) {
      await updateCategory.mutateAsync({
        id: initialCategory.id,
        ...data,
        code,
        slug,
        changeSummary,
      });
    } else {
      await createCategory.mutateAsync({
        ...data,
        code,
        slug,
        changeSummary,
      });
      reset();
    }

    onSuccess?.();
  };

  const isPending = isSubmitting || createCategory.isPending || updateCategory.isPending;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {isEditing ? `Edit Category: ${initialCategory?.name}` : "Create Category"}
        </h3>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit as any)}>
        <Field
          label="Category Name"
          required
          {...register("name")}
          hint={
            errors.name?.message ||
            (duplicateName
              ? `Category "${trimmedName}" already exists.`
              : duplicateSlugOrCode
                ? "A category with a similar slug or code already exists."
                : undefined)
          }
          placeholder="e.g. Dry Cleaning"
        />

        {trimmedName && (
          <div className="flex flex-wrap gap-4 text-xs text-text-secondary bg-surface-muted/60 p-2.5 rounded-lg border border-[var(--border-soft)]">
            <div>
              <span className="text-text-muted">Slug: </span>
              <span className="font-mono font-medium text-foreground">{derivedSlug || "—"}</span>
            </div>
            <div>
              <span className="text-text-muted">Code: </span>
              <span className="font-mono font-medium text-foreground">{derivedCode || "—"}</span>
            </div>
          </div>
        )}

        <TextArea
          label="Description"
          {...register("description")}
          hint={errors.description?.message}
          placeholder="Category description"
        />

        {/* Dual Category Images Section */}
        <div className="border border-[var(--border-soft)] rounded-2xl p-4 bg-surface-muted/30 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Category Photos</h4>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Sort order"
            type="number"
            {...register("sortOrder")}
            hint={errors.sortOrder?.message}
          />

          <Select
            label="Publish state"
            {...register("publishState")}
            hint={errors.publishState?.message}
          >
            {publishStates.map((p) => (
              <option key={p} value={p}>
                {humanizeToken(p)}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center text-sm text-text-secondary">
          <input className="mr-2" type="checkbox" {...register("isEnabled")} />
          Enabled
        </label>

        <Button
          type="submit"
          disabled={isPending || duplicateName || duplicateSlugOrCode}
        >
          {isPending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Category"}
        </Button>

        {(createCategory.isError || updateCategory.isError) && (
          <p className="text-sm text-red-500">
            {createCategory.error?.message || updateCategory.error?.message || "Operation failed"}
          </p>
        )}
        {(createCategory.isSuccess || updateCategory.isSuccess) && (
          <p className="text-sm text-green-500">
            {isEditing ? "Category updated successfully!" : "Category created successfully!"}
          </p>
        )}
      </form>
    </Card>
  );
}
