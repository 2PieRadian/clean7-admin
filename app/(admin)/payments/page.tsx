"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InlineLoadingCard } from "@/components/ui/loading-state";

/**
 * Contract-safe: uses GET /admin/orders with payment filters only.
 * Redirects to orders with COD pending collection as the default payment lens.
 */
export default function PaymentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders?paymentStatus=COD_PENDING_COLLECTION");
  }, [router]);

  return <InlineLoadingCard lines={4} />;
}
