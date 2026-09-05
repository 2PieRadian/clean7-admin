"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addOnSchema } from "../schemas";
import { useServices, useCreateAddOn, useUpdateAddOn } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates, pricingTypes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";

type AddOnFormData = z.infer<typeof addOnSchema>;

export function AddOnForm({
  defaultServiceId,
  initialAddOn,
  onSuccess,
}: {
  defaultServiceId?: string;
  initialAddOn?: any;
  onSuccess?: () => void;
}) {
  const { data: services = [] } = useServices();
  const createAddOn = useCreateAddOn();
  const updateAddOn = useUpdateAddOn();
  const isEditing = !!initialAddOn;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddOnFormData>({
    resolver: zodResolver(addOnSchema) as any,
    defaultValues: {
      serviceId: initialAddOn?.serviceId ?? defaultServiceId ?? "",
      name: initialAddOn?.name ?? "",
      description: initialAddOn?.description ?? "",
      pricingType: "ADD_ON",
      price: initialAddOn?.price ? Number(initialAddOn.price) : 0,
      currency: initialAddOn?.currency ?? "INR",
      unitLabel: initialAddOn?.unitLabel ?? "",
      maxQty: initialAddOn?.maxQty ?? null,
      sortOrder: initialAddOn?.sortOrder ?? 0,
      publishState: initialAddOn?.publishState ?? "ACTIVE",
    },
  });

  const activeMutation = isEditing ? updateAddOn : createAddOn;

  const onSubmit = async (data: AddOnFormData) => {
    const changeSummary = isEditing
      ? `Updated add-on ${data.name}`
      : `Created add-on ${data.name}`;

    if (isEditing && initialAddOn) {
      await updateAddOn.mutateAsync({
        id: initialAddOn.id,
        ...data,
        changeSummary,
      });
    } else {
      await createAddOn.mutateAsync({
        ...data,
        changeSummary,
      });
      reset();
    }
    onSuccess?.();
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {isEditing ? `Edit add-on: ${initialAddOn.name}` : "Create add-on"}
      </h3>
      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit as any)}>
        {!defaultServiceId && !isEditing ? (
          <Select
            label="Service"
            required
            {...register("serviceId")}
            hint={errors.serviceId?.message}
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : (
          <input type="hidden" {...register("serviceId")} />
        )}

        <Field
          label="Name"
          required
          {...register("name")}
          hint={errors.name?.message}
        />
        <TextArea
          label="Description"
          {...register("description")}
          hint={errors.description?.message}
        />

        <Select
          label="Pricing type"
          {...register("pricingType")}
          hint={errors.pricingType?.message}
        >
          {pricingTypes.map((p) => (
            <option key={p} value={p}>
              {humanizeToken(p)}
            </option>
          ))}
        </Select>

        <Field
          label="Price"
          type="number"
          step="0.01"
          required
          {...register("price")}
          hint={errors.price?.message}
        />
        <Field
          label="Currency"
          {...register("currency")}
          hint={errors.currency?.message}
        />
        <Field
          label="Unit label"
          placeholder="e.g. room"
          {...register("unitLabel")}
          hint={errors.unitLabel?.message}
        />

        <Field
          label="Max qty"
          type="number"
          {...register("maxQty")}
          hint={errors.maxQty?.message}
        />
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

        <Button
          type="submit"
          disabled={isSubmitting || activeMutation.isPending}
        >
          {isSubmitting || activeMutation.isPending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save changes"
              : "Create add-on"}
        </Button>

        {activeMutation.isError && (
          <p className="text-sm text-red-500">
            {activeMutation.error?.message ||
              `Failed to ${isEditing ? "update" : "create"} add-on`}
          </p>
        )}
        {activeMutation.isSuccess && (
          <p className="text-sm text-green-500">
            Add-on {isEditing ? "updated" : "created"} successfully!
          </p>
        )}
      </form>
    </Card>
  );
}
