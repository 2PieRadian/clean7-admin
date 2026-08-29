import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Coupon, useCreateCoupon, useUpdateCoupon } from "../api/coupon-api";
import { toast } from "sonner";

interface CouponFormProps {
  initialData?: Coupon;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CouponForm({ initialData, onSuccess, onCancel }: CouponFormProps) {
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();

  const isEditing = !!initialData;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: "",
    discountType: "FLAT",
    discountValue: "",
    maxDiscountAmount: "",
    minOrderValue: "",
    perUserLimit: null,
    globalLimit: null,
    validFrom: "",
    validUntil: "",
    isFirstOrderOnly: false,
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        validFrom: initialData.validFrom ? new Date(initialData.validFrom).toISOString().slice(0, 16) : "",
        validUntil: initialData.validUntil ? new Date(initialData.validUntil).toISOString().slice(0, 16) : "",
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // clean up payload
    const payload = { ...formData };
    if (!payload.maxDiscountAmount) payload.maxDiscountAmount = null;
    if (!payload.minOrderValue) payload.minOrderValue = null;
    if (!payload.perUserLimit) payload.perUserLimit = null;
    if (!payload.globalLimit) payload.globalLimit = null;
    if (!payload.validFrom) payload.validFrom = null;
    if (!payload.validUntil) payload.validUntil = null;

    if (payload.perUserLimit && typeof payload.perUserLimit === 'string') {
      payload.perUserLimit = parseInt(payload.perUserLimit, 10);
    }
    if (payload.globalLimit && typeof payload.globalLimit === 'string') {
      payload.globalLimit = parseInt(payload.globalLimit, 10);
    }

    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Coupon updated successfully");
            onSuccess?.();
          },
          onError: (error) => {
            toast.error(error.message || "Failed to update coupon");
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Coupon created successfully");
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create coupon");
        },
      });
    }
  };

  const handleChange = (field: keyof Coupon, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Coupon Code" required>
          <input
            type="text"
            required
            value={formData.code || ""}
            onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
            placeholder="e.g. SUMMER10"
          />
        </Field>
        <div className="flex items-center space-x-2 mt-8">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Active
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Discount Type" required>
          <select
            value={formData.discountType || "FLAT"}
            onChange={(e) => handleChange("discountType", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="FLAT">Flat Amount (₹)</option>
            <option value="PERCENTAGE">Percentage (%)</option>
          </select>
        </Field>

        <Field label={formData.discountType === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount (₹)"} required>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.discountValue || ""}
            onChange={(e) => handleChange("discountValue", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max Discount Amount (₹)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.maxDiscountAmount || ""}
            onChange={(e) => handleChange("maxDiscountAmount", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>

        <Field label="Min Order Value (₹)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.minOrderValue || ""}
            onChange={(e) => handleChange("minOrderValue", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum cart total to apply</p>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Per User Limit">
          <input
            type="number"
            min="1"
            value={formData.perUserLimit || ""}
            onChange={(e) => handleChange("perUserLimit", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>

        <Field label="Global Limit">
          <input
            type="number"
            min="1"
            value={formData.globalLimit || ""}
            onChange={(e) => handleChange("globalLimit", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valid From">
          <input
            type="datetime-local"
            value={formData.validFrom || ""}
            onChange={(e) => handleChange("validFrom", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>

        <Field label="Valid Until">
          <input
            type="datetime-local"
            value={formData.validUntil || ""}
            onChange={(e) => handleChange("validUntil", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>
      </div>

      <div className="flex items-center space-x-2 pt-2 pb-4">
        <input
          type="checkbox"
          id="isFirstOrderOnly"
          checked={formData.isFirstOrderOnly}
          onChange={(e) => handleChange("isFirstOrderOnly", e.target.checked)}
          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
        />
        <label htmlFor="isFirstOrderOnly" className="text-sm font-medium">
          First Order Only
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Update Coupon" : "Create Coupon"}
        </Button>
      </div>
    </form>
  );
}
