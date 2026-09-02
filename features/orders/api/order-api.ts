import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import { getStoredSession } from "@/lib/browser-session";
import { getGatewayUrl } from "@/lib/env";
import type { OrderResponse } from "@/lib/types";

export function useOrders(query?: Record<string, string>) {
  return useQuery({
    queryKey: ["orders", query],
    queryFn: () =>
      apiRequest<OrderResponse[]>({
        path: "/admin/orders",
        query,
      }),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () =>
      apiRequest<OrderResponse>({
        path: `/admin/orders/${orderId}`,
      }),
    enabled: !!orderId,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status, note }: { orderId: string; status: string; note?: string | null }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/status`,
        method: "PATCH",
        body: { status, note },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, paymentStatus, paymentMethod }: { orderId: string; paymentStatus: string; paymentMethod: string }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/payment`,
        method: "PATCH",
        body: { paymentStatus, paymentMethod },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useOrderPaymentCodCollect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, collectedAmount, note }: { orderId: string; collectedAmount: number; note: string }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/payment/cod-collect`,
        method: "POST",
        body: { collectedAmount, note },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...body }: { orderId: string; assignedOperatorAuthUserId: string; note?: string | null; forceOverride?: boolean; overrideReason?: string | null }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/assignment`,
        method: "PATCH",
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useAssignPickupRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, riderAuthUserId }: { orderId: string; riderAuthUserId: string }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/pickup-rider`,
        method: "POST",
        body: { riderAuthUserId },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRecordLaundryIntake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...body }: { orderId: string; orderCode: string; actualItemCount: number; continueWithMismatch: boolean; note?: string | null }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/laundry-intake`,
        method: "POST",
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRescheduleOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...body }: { orderId: string; scheduledDate: string; scheduledSlotCode: string; forceOverride?: boolean; overrideReason?: string | null }) =>
      apiRequest({
        path: `/admin/orders/${orderId}/schedule`,
        method: "PATCH",
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export async function downloadOrderInvoice(orderId: string, orderNumber: string): Promise<void> {
  const session = getStoredSession();
  const token = session?.token;
  const baseUrl = getGatewayUrl();
  const url = `${baseUrl}/admin/orders/${orderId}/invoice`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to download invoice: ${response.statusText}`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `Invoice-${orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}
