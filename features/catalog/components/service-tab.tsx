"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema } from "../schemas";
import { useCategories, useCreateService, useUpdateService } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates, serviceModes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";
import type { CatalogServiceSummary } from "@/lib/types";

type ServiceFormData = z.infer<typeof serviceSchema>;

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      categoryId: initialService?.categoryId || defaultCategoryId || "",
      name: initialService?.name || "",
      shortDescription: initialService?.shortDescription || "",
      serviceMode: initialService?.serviceMode || "PICKUP_DELIVERY",
      durationEstimateMinutes: initialService?.durationEstimateMinutes ?? undefined,
      sortOrder: initialService?.sortOrder ?? 0,
      publishState: initialService?.publishState || "ACTIVE",
      changeSummary: isEditing ? `Updated service ${initialService?.name}` : "",
    }
  });

  const onSubmit = async (data: ServiceFormData) => {
    if (isEditing && initialService) {
      await updateService.mutateAsync({ id: initialService.id, ...data });
    } else {
      await createService.mutateAsync(data);
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
