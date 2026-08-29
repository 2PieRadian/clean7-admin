"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CouponList } from "@/features/coupons/components/CouponList";
import { CouponForm } from "@/features/coupons/components/CouponForm";
import { Modal } from "@/components/ui/modal";
import { useCoupons, Coupon } from "@/features/coupons/api/coupon-api";

export default function CouponsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | undefined>();

  const { data: coupons, isLoading } = useCoupons();

  const handleCreate = () => {
    setEditingCoupon(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Coupons"
          description="Manage promotional coupons and discounts for customers."
        />
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      <CouponList
        coupons={coupons || []}
        isLoading={isLoading}
        onEdit={handleEdit}
      />

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingCoupon ? "Edit Coupon" : "Create Coupon"}
      >
        <CouponForm
          initialData={editingCoupon}
          onSuccess={handleCloseModal}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
