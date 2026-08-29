import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";

export type DiscountType = "FLAT" | "PERCENTAGE";

export type Coupon = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountAmount: string | null;
  minOrderValue: string | null;
  perUserLimit: number | null;
  globalLimit: number | null;
  globalUsageCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isFirstOrderOnly: boolean;
  isActive: boolean;
  createdAt: string;
};

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: () =>
      apiRequest<Coupon[]>({
        path: "/admin/orders/coupons",
      }),
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Coupon>) =>
      apiRequest({
        path: "/admin/orders/coupons",
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Coupon> & { id: string }) =>
      apiRequest({
        path: `/admin/orders/coupons/${id}`,
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        path: `/admin/orders/coupons/${id}`,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
  });
}
