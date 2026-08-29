"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema } from "../schemas";
import { useServices, useCreateItem } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { publishStates, pricingTypes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";

type ItemFormData = z.infer<typeof itemSchema>;

export function ItemForm({ defaultServiceId, onSuccess }: { defaultServiceId?: string; onSuccess?: () => void }) {
  const { data: services = [] } = useServices();
  const createItem = useCreateItem();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: {
      serviceId: defaultServiceId ?? "",
      sortOrder: 0,
      publishState: "ACTIVE",
      pricingType: "PER_ITEM",
      currency: "INR",
    }
  });

  const onSubmit = async (data: ItemFormData) => {
    await createItem.mutateAsync(data);
    reset();
    onSuccess?.();
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Create item</h3>
      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit as any)}>
        {!defaultServiceId ? (
          <Select label="Service" required {...register("serviceId")} hint={errors.serviceId?.message}>
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        ) : (
          <input type="hidden" {...register("serviceId")} />
        )}

        <Field label="Name" required {...register("name")} hint={errors.name?.message} />

        <Select label="Pricing type" {...register("pricingType")} hint={errors.pricingType?.message}>
          {pricingTypes.map((p) => (
            <option key={p} value={p}>{humanizeToken(p)}</option>
          ))}
        </Select>

        <Field label="Base price" type="number" required {...register("basePrice")} hint={errors.basePrice?.message} />
        <Field label="Currency" {...register("currency")} hint={errors.currency?.message} />
        <Field label="Unit label" placeholder="item" {...register("unitLabel")} hint={errors.unitLabel?.message} />

        <Field label="Min qty" type="number" {...register("minQty")} hint={errors.minQty?.message} />
        <Field label="Max qty" type="number" {...register("maxQty")} hint={errors.maxQty?.message} />
        <Field label="Sort order" type="number" {...register("sortOrder")} hint={errors.sortOrder?.message} />

        <Select label="Publish state" {...register("publishState")} hint={errors.publishState?.message}>
          {publishStates.map((p) => (
            <option key={p} value={p}>{humanizeToken(p)}</option>
          ))}
        </Select>

        <Field label="Change summary" required {...register("changeSummary")} hint={errors.changeSummary?.message} />

        <Button type="submit" disabled={isSubmitting || createItem.isPending}>
          {isSubmitting || createItem.isPending ? "Creating..." : "Create item"}
        </Button>

        {createItem.isError && (
          <p className="text-sm text-red-500">{createItem.error?.message || "Failed to create item"}</p>
        )}
        {createItem.isSuccess && (
          <p className="text-sm text-green-500">Item created successfully!</p>
        )}
      </form>
    </Card>
  );
}
