import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type {
  CategorySummary,
  CatalogServiceSummary,
  CatalogItemResponse,
  CatalogAddOnResponse,
} from "@/lib/types";

// Queries
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiRequest<CategorySummary[]>({ path: "/admin/categories" }),
  });
}

export function useServices(categorySlug?: string, branchId?: string) {
  return useQuery({
    queryKey: ["services", categorySlug, branchId],
    queryFn: () => {
      const query: Record<string, string> = {};
      if (categorySlug) query.category = categorySlug;
      if (branchId) query.branchId = branchId;
      return apiRequest<CatalogServiceSummary[]>({
        path: "/admin/services",
        query: Object.keys(query).length > 0 ? query : undefined,
      });
    },
  });
}

export function useItems(serviceId?: string, branchId?: string) {
  return useQuery({
    queryKey: ["items", serviceId, branchId],
    queryFn: () =>
      apiRequest<CatalogItemResponse[]>({
        path: "/admin/items",
        query: {
          ...(serviceId ? { serviceId } : {}),
          ...(branchId ? { branchId } : {}),
        },
      }),
  });
}

export function useAddOns(serviceId?: string, branchId?: string) {
  return useQuery({
    queryKey: ["addons", serviceId, branchId],
    queryFn: () =>
      apiRequest<CatalogAddOnResponse[]>({
        path: "/admin/addons",
        query: {
          ...(serviceId ? { serviceId } : {}),
          ...(branchId ? { branchId } : {}),
        },
      }),
  });
}

// Mutations
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiRequest({ path: "/admin/categories", method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string;[key: string]: any }) =>
      apiRequest({ path: `/admin/categories/${id}`, method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiRequest({ path: "/admin/services", method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string;[key: string]: any }) =>
      apiRequest({ path: `/admin/services/${id}`, method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ path: `/admin/services/${id}`, method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiRequest({ path: "/admin/items", method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useCreateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiRequest({ path: "/admin/addons", method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; basePrice: number; changeSummary: string }) =>
      apiRequest({ path: `/admin/items/${id}`, method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; price: number; changeSummary: string }) =>
      apiRequest({ path: `/admin/addons/${id}`, method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ path: `/admin/categories/${id}`, method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ path: `/admin/items/${id}`, method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useDeleteAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ path: `/admin/addons/${id}`, method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });
}
