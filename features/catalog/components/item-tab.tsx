"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema } from "../schemas";
import { useServices, useCreateItem, useUpdateItem } from "../api/catalog-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { publishStates, pricingTypes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import { z } from "zod";

type ItemFormData = z.infer<typeof itemSchema>;

export function ItemForm({
  defaultServiceId,
  initialItem,
  onSuccess,
}: {
  defaultServiceId?: string;
  initialItem?: any;
  onSuccess?: () => void;
}) {
  const { data: services = [] } = useServices();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const isEditing = !!initialItem;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: {
      serviceId: initialItem?.serviceId ?? defaultServiceId ?? "",
      name: initialItem?.name ?? "",
      pricingType: initialItem?.pricingType ?? "PER_ITEM",
      basePrice: initialItem?.basePrice ?? initialItem?.price ?? 0,
      currency: initialItem?.currency ?? "INR",
      unitLabel: initialItem?.unitLabel ?? "",
      minQty: initialItem?.minQty ?? null,
      maxQty: initialItem?.maxQty ?? null,
      sortOrder: initialItem?.sortOrder ?? 0,
      publishState: initialItem?.publishState ?? "ACTIVE",
    },
  });

  const activeMutation = isEditing ? updateItem : createItem;

  const onSubmit = async (data: ItemFormData) => {
    const changeSummary = isEditing
      ? `Updated item ${data.name}`
      : `Created item ${data.name}`;

    if (isEditing && initialItem) {
      await updateItem.mutateAsync({
        id: initialItem.id,
        ...data,
        changeSummary,
      });
    } else {
      await createItem.mutateAsync({
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
        {isEditing ? `Edit item: ${initialItem.name}` : "Create item"}
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
          label="Base price"
          type="number"
          step="0.01"
          required
          {...register("basePrice")}
          hint={errors.basePrice?.message}
        />
        <Field
          label="Currency"
          {...register("currency")}
          hint={errors.currency?.message}
        />
        <Field
          label="Unit label"
          placeholder="item"
          {...register("unitLabel")}
          hint={errors.unitLabel?.message}
        />

        <Field
          label="Min qty"
          type="number"
          {...register("minQty")}
          hint={errors.minQty?.message}
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
              : "Create item"}
        </Button>

        {activeMutation.isError && (
          <p className="text-sm text-red-500">
            {activeMutation.error?.message ||
              `Failed to ${isEditing ? "update" : "create"} item`}
          </p>
        )}
        {activeMutation.isSuccess && (
          <p className="text-sm text-green-500">
            Item {isEditing ? "updated" : "created"} successfully!
          </p>
        )}
      </form>
    </Card>
  );
}
