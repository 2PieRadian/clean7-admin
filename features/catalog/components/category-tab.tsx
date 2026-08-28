"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "../schemas";
import { useCategories, useCreateCategory } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
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

export function CategoryForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();

  const { register, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      sortOrder: 0,
      publishState: "ACTIVE",
      isEnabled: true,
      changeSummary: "Initial category creation",
    }
  });

  const nameValue = watch("name") || "";
  const trimmedName = nameValue.trim();
  const derivedSlug = deriveSlug(trimmedName);
  const derivedCode = deriveCode(trimmedName);

  const duplicateName = Boolean(
    trimmedName &&
    categories.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
  );

  const duplicateSlugOrCode = Boolean(
    trimmedName &&
    categories.some(
      (c) =>
        c.slug.trim().toLowerCase() === derivedSlug.toLowerCase() ||
        c.code.trim().toUpperCase() === derivedCode.toUpperCase()
    )
  );

  const onSubmit = async (data: CategoryFormData) => {
    const code = data.code?.trim() || deriveCode(data.name);
    const slug = data.slug?.trim() || deriveSlug(data.name);
    const changeSummary = data.changeSummary?.trim() || `Created category ${data.name}`;

    const existingMatch = categories.find(
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

    await createCategory.mutateAsync({
      ...data,
      code,
      slug,
      changeSummary,
    });
    reset();
    onSuccess?.();
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Create category</h3>
      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit as any)}>
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

        <TextArea label="Description" {...register("description")} hint={errors.description?.message} placeholder="Optional category description" />
        <Field label="Sort order" type="number" {...register("sortOrder")} hint={errors.sortOrder?.message} />

        <Select label="Publish state" {...register("publishState")} hint={errors.publishState?.message}>
          {publishStates.map((p) => (
            <option key={p} value={p}>{humanizeToken(p)}</option>
          ))}
        </Select>

        <label className="flex items-center text-sm text-text-secondary">
          <input className="mr-2" type="checkbox" {...register("isEnabled")} />
          Enabled
        </label>

        <Button
          type="submit"
          disabled={isSubmitting || createCategory.isPending || duplicateName || duplicateSlugOrCode}
        >
          {isSubmitting || createCategory.isPending ? "Creating..." : "Create category"}
        </Button>

        {createCategory.isError && (
          <p className="text-sm text-red-500">{createCategory.error?.message || "Failed to create category"}</p>
        )}
        {createCategory.isSuccess && (
          <p className="text-sm text-green-500">Category created successfully!</p>
        )}
      </form>
    </Card>
  );
}
