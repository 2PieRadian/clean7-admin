import React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Coupon, useDeleteCoupon } from "../api/coupon-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CouponListProps {
  coupons: Coupon[];
  isLoading: boolean;
  onEdit: (coupon: Coupon) => void;
}

export function CouponList({ coupons, isLoading, onEdit }: CouponListProps) {
  const deleteMutation = useDeleteCoupon();

  const handleDelete = (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete coupon ${code}?`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Coupon deleted successfully"),
        onError: (err) => toast.error(err.message || "Failed to delete coupon"),
      });
    }
  };

  const columns = [
    {
      key: "code",
      header: "Code",
      render: (row: Coupon) => <span className="font-mono font-bold">{row.code}</span>,
    },
    {
      key: "discount",
      header: "Discount",
      render: (row: Coupon) => {
        if (row.discountType === "FLAT") {
          return `₹${row.discountValue}`;
        }
        return `${row.discountValue}%${row.maxDiscountAmount ? ` (Up to ₹${row.maxDiscountAmount})` : ""}`;
      },
    },
    {
      key: "usage",
      header: "Usage",
      render: (row: Coupon) => (
        <span>
          {row.globalUsageCount} {row.globalLimit ? `/ ${row.globalLimit}` : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Coupon) => (
        <Badge tone={row.isActive ? "success" : "muted"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      render: (row: Coupon) => {
        if (!row.validFrom && !row.validUntil) return <span className="text-gray-500">Always</span>;

        const from = row.validFrom ? new Date(row.validFrom).toLocaleDateString() : "Anytime";
        const until = row.validUntil ? new Date(row.validUntil).toLocaleDateString() : "Forever";
        return <span className="text-sm">{from} - {until}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Coupon) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(row)}
            className="text-blue-600 hover:text-blue-800 p-1 h-auto"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id, row.code)}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-800 p-1 h-auto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={coupons}
      loading={isLoading}
      emptyMessage="No coupons found. Create one to get started."
    />
  );
}
