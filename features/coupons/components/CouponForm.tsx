import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Coupon, useCreateCoupon, useUpdateCoupon } from "../api/coupon-api";
import { toast } from "sonner";
import { CalendarIcon, ClockIcon } from "lucide-react";

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

  const handleDateChange = (field: 'validFrom' | 'validUntil', date: string) => {
    const current = formData[field] || "";
    const time = current.includes("T") ? current.split("T")[1].slice(0, 5) : "00:00";
    if (!date) {
      setFormData((prev) => ({ ...prev, [field]: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: `${date}T${time}` }));
    }
  };

  const handleTimeChange = (field: 'validFrom' | 'validUntil', time: string) => {
    const current = formData[field] || "";
    const date = current.includes("T") ? current.split("T")[0] : new Date().toISOString().split("T")[0];
    if (!time) {
      setFormData((prev) => ({ ...prev, [field]: `${date}T00:00` }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: `${date}T${time}` }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Coupon Code"
          type="text"
          required
          value={formData.code || ""}
          onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
          placeholder="e.g. SUMMER10"
        />
        <div className="flex items-center space-x-2 mt-6">
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
        <Select
          label="Discount Type"
          required
          value={formData.discountType || "FLAT"}
          onChange={(e) => handleChange("discountType", e.target.value)}
        >
          <option value="FLAT">Flat Amount (₹)</option>
          <option value="PERCENTAGE">Percentage (%)</option>
        </Select>

        <Field
          label={formData.discountType === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
          type="number"
          required
          min="0"
          step="0.01"
          value={formData.discountValue || ""}
          onChange={(e) => handleChange("discountValue", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Max Discount Amount (₹)"
          hint="Applicable only for percentage discount"
          type="number"
          min="0"
          step="0.01"
          value={formData.maxDiscountAmount || ""}
          onChange={(e) => handleChange("maxDiscountAmount", e.target.value)}
        />

        <Field
          label="Min Order Value (₹)"
          hint="Minimum cart total to apply"
          type="number"
          min="0"
          step="0.01"
          value={formData.minOrderValue || ""}
          onChange={(e) => handleChange("minOrderValue", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Per User Limit"
          hint="Max times a single user can use this"
          type="number"
          min="1"
          value={formData.perUserLimit || ""}
          onChange={(e) => handleChange("perUserLimit", e.target.value)}
        />

        <Field
          label="Global Limit"
          hint="Max total usage across all users"
          type="number"
          min="1"
          value={formData.globalLimit || ""}
          onChange={(e) => handleChange("globalLimit", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Valid From</span>
          <div className="flex gap-2 relative">
            <div className="relative flex-1 group">
              <input
                type="date"
                className="input-surface w-full pl-9 pr-2.5 py-1.5 text-sm text-foreground outline-none transition cursor-pointer"
                value={(formData.validFrom || "").split("T")[0] || ""}
                onChange={(e) => handleDateChange("validFrom", e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker(); } catch (err) { }
                }}
              />
              <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors" />
            </div>
            <div className="relative w-32 group">
              <input
                type="time"
                className="input-surface w-full pl-9 pr-2.5 py-1.5 text-sm text-foreground outline-none transition cursor-pointer"
                value={(formData.validFrom || "").split("T")[1]?.slice(0, 5) || ""}
                onChange={(e) => handleTimeChange("validFrom", e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker(); } catch (err) { }
                }}
              />
              <ClockIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <span className="text-xs text-text-muted">Optional start date & time</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Valid Until</span>
          <div className="flex gap-2 relative">
            <div className="relative flex-1 group">
              <input
                type="date"
                className="input-surface w-full pl-9 pr-2.5 py-1.5 text-sm text-foreground outline-none transition cursor-pointer"
                value={(formData.validUntil || "").split("T")[0] || ""}
                onChange={(e) => handleDateChange("validUntil", e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker(); } catch (err) { }
                }}
              />
              <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors" />
            </div>
            <div className="relative w-32 group">
              <input
                type="time"
                className="input-surface w-full pl-9 pr-2.5 py-1.5 text-sm text-foreground outline-none transition cursor-pointer"
                value={(formData.validUntil || "").split("T")[1]?.slice(0, 5) || ""}
                onChange={(e) => handleTimeChange("validUntil", e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker(); } catch (err) { }
                }}
              />
              <ClockIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <span className="text-xs text-text-muted">Optional expiry date & time</span>
        </div>
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
