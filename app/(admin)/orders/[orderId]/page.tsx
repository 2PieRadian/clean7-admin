"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { OrderDetailManager } from "@/features/orders/components/order-detail-manager";
import { useOrder } from "@/features/orders/api/order-api";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { WorkerProfileResponse } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params.orderId ?? "");
  const [workers, setWorkers] = useState<WorkerProfileResponse[]>([]);
  
  const { data: order, isLoading: loadingOrder, error: orderError } = useOrder(orderId);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkers() {
      try {
        const nextWorkers = await apiRequest<WorkerProfileResponse[]>({ path: "/admin/workers" });
        if (!cancelled) {
          setWorkers(nextWorkers);
        }
      } catch (e) {
        console.error("Failed to load workers", e);
      }
    }
    
    void loadWorkers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          order
            ? order.orderNumber || order.orderCode || "Order"
            : "Order details"
        }
        description="Update status, payment, assignments, intake, and schedule using admin APIs."
      />

      {loadingOrder ? (
        <InlineLoadingCard lines={8} />
      ) : null}

      {orderError ? (
        <Card>
          <p className="text-sm text-danger">{orderError instanceof Error ? orderError.message : "Unable to load order detail."}</p>
        </Card>
      ) : null}

      {!loadingOrder && order ? (
        <OrderDetailManager order={order} workers={workers} />
      ) : null}
    </div>
  );
}
