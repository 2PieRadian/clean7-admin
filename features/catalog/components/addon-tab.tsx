"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addOnSchema } from "../schemas";
import { useServices, useCreateAddOn, useUpdateAddOn } from "../api/catalog-api";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { publishStates, pricingTypes } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";
import type { Resolver } from "react-hook-form";
import type { CatalogAddOnResponse } from "@/lib/types";
import { z } from "zod";

type AddOnFormData = z.infer<typeof addOnSchema>;

export function AddOnForm({
  defaultServiceId,
  initialAddOn,
  onSuccess,
  onCancel,
}: {
  defaultServiceId?: string;
  initialAddOn?: Partial<CatalogAddOnResponse> | null;
  onSuccess?: () => void;
  onCancel?: () => void;
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
    resolver: zodResolver(addOnSchema) as Resolver<AddOnFormData>,
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

    if (isEditing && initialAddOn && initialAddOn.id) {
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

        {/* Row 1: Name & Unit Label */}
        <div className="col-span-12 sm:col-span-8">
          <Field
            label="Name"
            placeholder="e.g. Fabric Conditioner, Stain Removal"
            required
            {...register("name")}
            hint={errors.name?.message}
          />
        </div>

        <div className="col-span-12 sm:col-span-4">
          <Field
            label="Unit label"
            placeholder="e.g. garment, kg"
            {...register("unitLabel")}
            hint={errors.unitLabel?.message}
          />
        </div>

        {/* Row 2: Price, Currency, Pricing Type */}
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
            label="Price (₹)"
            type="number"
            step="0.01"
            required
            {...register("price")}
            hint={errors.price?.message}
          />
        </div>

        <div className="col-span-5 sm:col-span-3">
          <Field
            label="Currency"
            {...register("currency")}
            hint={errors.currency?.message}
          />
        </div>

        {/* Row 3: Description */}
        <div className="col-span-12">
          <TextArea
            label="Description"
            placeholder="Optional description for customers..."
            className="min-h-16"
            {...register("description")}
            hint={errors.description?.message}
          />
        </div>

        {/* Row 4: Max Qty, Sort Order, Publish State */}
        <div className="col-span-12 sm:col-span-4">
          <Field
            label="Max quantity"
            type="number"
            placeholder="No max"
            {...register("maxQty")}
            hint={errors.maxQty?.message}
          />
        </div>

        <div className="col-span-6 sm:col-span-4">
          <Field
            label="Sort order"
            type="number"
            {...register("sortOrder")}
            hint={errors.sortOrder?.message}
          />
        </div>

        <div className="col-span-6 sm:col-span-4">
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
            `Failed to ${isEditing ? "update" : "create"} add-on`}
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
              : "Create add-on"}
        </Button>
      </div>
    </form>
  );
}
