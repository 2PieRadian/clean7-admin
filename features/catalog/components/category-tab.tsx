"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "../schemas";
import { useCreateCategory } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";

type CategoryFormData = z.infer<typeof categorySchema>;

export function CategoryForm({ onSuccess }: { onSuccess?: () => void }) {
  const createCategory = useCreateCategory();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      sortOrder: 0,
      publishState: "ACTIVE",
      isEnabled: true,
    }
  });

  const onSubmit = async (data: CategoryFormData) => {
    await createCategory.mutateAsync(data);
    reset();
    onSuccess?.();
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Create category</h3>
      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit as any)}>
        <Field label="Code" required {...register("code")} hint={errors.code?.message} />
        <Field label="Slug" required {...register("slug")} hint={errors.slug?.message} />
        <Field label="Name" required {...register("name")} hint={errors.name?.message} />
        <TextArea label="Description" {...register("description")} hint={errors.description?.message} />
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
        
        <Field label="Change summary" required {...register("changeSummary")} hint={errors.changeSummary?.message} />
        
        <Button type="submit" disabled={isSubmitting || createCategory.isPending}>
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
