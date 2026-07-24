"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema } from "../schemas";
import { useCategories, useCreateService } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates, serviceModes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";

type ServiceFormData = z.infer<typeof serviceSchema>;

export function ServiceForm({ defaultCategoryId, onSuccess }: { defaultCategoryId?: string; onSuccess?: () => void }) {
  const { data: categories = [] } = useCategories();
  const createService = useCreateService();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      categoryId: defaultCategoryId ?? "",
      sortOrder: 0,
      publishState: "ACTIVE",
      serviceMode: "PICKUP_DELIVERY",
      isEnabled: true,
    }
  });

  const onSubmit = async (data: ServiceFormData) => {
    await createService.mutateAsync(data);
    reset();
    onSuccess?.();
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Create service</h3>
      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit as any)}>
        {!defaultCategoryId ? (
          <Select label="Category" required {...register("categoryId")} hint={errors.categoryId?.message}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        ) : (
          <input type="hidden" {...register("categoryId")} />
        )}
        
        <Field label="Code" required {...register("code")} hint={errors.code?.message} />
        <Field label="Slug" required {...register("slug")} hint={errors.slug?.message} />
        <Field label="Name" required {...register("name")} hint={errors.name?.message} />
        <TextArea label="Short description" {...register("shortDescription")} hint={errors.shortDescription?.message} />
        
        <Select label="Service mode" {...register("serviceMode")} hint={errors.serviceMode?.message}>
          {serviceModes.map((m) => (
            <option key={m} value={m}>{humanizeToken(m)}</option>
          ))}
        </Select>
        
        <Field label="Duration (minutes)" type="number" {...register("durationEstimateMinutes")} hint={errors.durationEstimateMinutes?.message} />
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
        
        <Button type="submit" disabled={isSubmitting || createService.isPending}>
          {isSubmitting || createService.isPending ? "Creating..." : "Create service"}
        </Button>
        
        {createService.isError && (
          <p className="text-sm text-red-500">{createService.error?.message || "Failed to create service"}</p>
        )}
        {createService.isSuccess && (
          <p className="text-sm text-green-500">Service created successfully!</p>
        )}
      </form>
    </Card>
  );
}
