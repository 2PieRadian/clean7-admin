"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema } from "../schemas";
import { useServices, useCreateItem, useUpdateItem } from "../api/catalog-api";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { publishStates, pricingTypes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import type { Resolver } from "react-hook-form";
import type { CatalogItemResponse } from "@/lib/types";
import { z } from "zod";

type ItemFormData = z.infer<typeof itemSchema>;

export function ItemForm({
  defaultServiceId,
  initialItem,
  onSuccess,
  onCancel,
}: {
  defaultServiceId?: string;
  initialItem?: (Partial<CatalogItemResponse> & { basePrice?: number }) | null;
  onSuccess?: () => void;
  onCancel?: () => void;
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
    resolver: zodResolver(itemSchema) as Resolver<ItemFormData>,
    defaultValues: {
      serviceId: initialItem?.serviceId ?? defaultServiceId ?? "",
      name: initialItem?.name ?? "",
      pricingType: initialItem?.pricingType ?? "PER_ITEM",
      basePrice: initialItem?.basePrice ?? (initialItem?.price ? Number(initialItem.price) : 0),
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

    if (isEditing && initialItem && initialItem.id) {
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
    <form
      className="space-y-4"
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
    >
      <div className="grid grid-cols-12 gap-3">
        {!defaultServiceId && !isEditing ? (
          <div className="col-span-12">
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
          </div>
        ) : (
          <input type="hidden" {...register("serviceId")} />
        )}

        {/* Row 1: Name and Unit Label */}
        <div className="col-span-12 sm:col-span-8">
          <Field
            label="Name"
            placeholder="e.g. Dry Clean Shirt, Wash & Fold"
            required
            {...register("name")}
            hint={errors.name?.message}
          />
        </div>

        <div className="col-span-12 sm:col-span-4">
          <Field
            label="Unit label"
            placeholder="e.g. item, piece, kg"
            {...register("unitLabel")}
            hint={errors.unitLabel?.message}
          />
        </div>

        {/* Row 2: Pricing Type, Base Price, Currency */}
        <div className="col-span-12 sm:col-span-5">
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
        </div>

        <div className="col-span-7 sm:col-span-4">
          <Field
            label="Base price (₹)"
            type="number"
            step="0.01"
            required
            {...register("basePrice")}
            hint={errors.basePrice?.message}
          />
        </div>

        <div className="col-span-5 sm:col-span-3">
          <Field
            label="Currency"
            {...register("currency")}
            hint={errors.currency?.message}
          />
        </div>

        {/* Row 3: Min Qty, Max Qty, Sort Order, Publish State */}
        <div className="col-span-6 sm:col-span-3">
          <Field
            label="Min qty"
            type="number"
            placeholder="No min"
            {...register("minQty")}
            hint={errors.minQty?.message}
          />
        </div>

        <div className="col-span-6 sm:col-span-3">
          <Field
            label="Max qty"
            type="number"
            placeholder="No max"
            {...register("maxQty")}
            hint={errors.maxQty?.message}
          />
        </div>

        <div className="col-span-6 sm:col-span-3">
          <Field
            label="Sort order"
            type="number"
            {...register("sortOrder")}
            hint={errors.sortOrder?.message}
          />
        </div>

        <div className="col-span-6 sm:col-span-3">
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
      </div>

      {activeMutation.isError && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
          {activeMutation.error?.message ||
            `Failed to ${isEditing ? "update" : "create"} item`}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel ?? onSuccess}
          disabled={isSubmitting || activeMutation.isPending}
        >
          Cancel
        </Button>
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
      </div>
    </form>
  );
}
