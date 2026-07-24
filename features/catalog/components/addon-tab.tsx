"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addOnSchema } from "../schemas";
import { useServices, useCreateAddOn } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates, pricingTypes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";

type AddOnFormData = z.infer<typeof addOnSchema>;

export function AddOnForm({ defaultServiceId, onSuccess }: { defaultServiceId?: string; onSuccess?: () => void }) {
  const { data: services = [] } = useServices();
  const createAddOn = useCreateAddOn();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddOnFormData>({
    resolver: zodResolver(addOnSchema) as any,
    defaultValues: {
      serviceId: defaultServiceId ?? "",
      sortOrder: 0,
      publishState: "ACTIVE",
      pricingType: "ADD_ON",
      currency: "INR",
      isEnabled: true,
    }
  });

  const onSubmit = async (data: AddOnFormData) => {
    await createAddOn.mutateAsync(data);
    reset();
    onSuccess?.();
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Create add-on</h3>
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
        
        <Field label="Code" required {...register("code")} hint={errors.code?.message} />
        <Field label="Name" required {...register("name")} hint={errors.name?.message} />
        <TextArea label="Description" {...register("description")} hint={errors.description?.message} />
        
        <Select label="Pricing type" {...register("pricingType")} hint={errors.pricingType?.message}>
          {pricingTypes.map((p) => (
            <option key={p} value={p}>{humanizeToken(p)}</option>
          ))}
        </Select>
        
        <Field label="Price" type="number" required {...register("price")} hint={errors.price?.message} />
        <Field label="Currency" {...register("currency")} hint={errors.currency?.message} />
        <Field label="Unit label" placeholder="e.g. room" {...register("unitLabel")} hint={errors.unitLabel?.message} />
        
        <Field label="Max qty" type="number" {...register("maxQty")} hint={errors.maxQty?.message} />
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
        
        <Button type="submit" disabled={isSubmitting || createAddOn.isPending}>
          {isSubmitting || createAddOn.isPending ? "Creating..." : "Create add-on"}
        </Button>
        
        {createAddOn.isError && (
          <p className="text-sm text-red-500">{createAddOn.error?.message || "Failed to create add-on"}</p>
        )}
        {createAddOn.isSuccess && (
          <p className="text-sm text-green-500">Add-on created successfully!</p>
        )}
      </form>
    </Card>
  );
}
