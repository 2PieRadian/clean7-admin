import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type {
  CategorySummary,
  CatalogServiceSummary,
  CatalogItemResponse,
  CatalogAddOnResponse,
  BranchCatalogResponse,
  BranchCatalogConfig,
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

// Settings
export function useSetting(key: string) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: () => apiRequest<any>({ path: `/admin/settings/${key}` }),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      apiRequest({ path: `/admin/settings/${key}`, method: "PUT", body: { value } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["settings", variables.key] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useCreateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiRequest({ path: "/admin/addons", method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string;[key: string]: any }) =>
      apiRequest({ path: `/admin/items/${id}`, method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string;[key: string]: any }) =>
      apiRequest({ path: `/admin/addons/${id}`, method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ path: `/admin/addons/${id}`, method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
}

// Branch Catalog Queries & Mutations
export function useBranchCatalog(branchId: string) {
  return useQuery({
    queryKey: ["branch-catalog", branchId],
    queryFn: () =>
      apiRequest<BranchCatalogResponse>({
        path: `/admin/branch-catalog/${branchId}`,
      }),
    enabled: Boolean(branchId),
  });
}

export function useSaveBranchCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      config,
    }: {
      branchId: string;
      config: Partial<BranchCatalogConfig>;
    }) =>
      apiRequest({
        path: `/admin/branch-catalog/${branchId}`,
        method: "PUT",
        body: config,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch-catalog", variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["geo-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function usePickFromBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      selection,
    }: {
      branchId: string;
      selection: {
        categoryIds?: string[];
        serviceIds?: string[];
        itemIds?: string[];
        addOnIds?: string[];
      };
    }) =>
      apiRequest({
        path: `/admin/branch-catalog/${branchId}/pick-from-base`,
        method: "POST",
        body: selection,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch-catalog", variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useImportAllBaseToBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) =>
      apiRequest({
        path: `/admin/branch-catalog/${branchId}/import-all`,
        method: "POST",
      }),
    onSuccess: (_, branchId) => {
      queryClient.invalidateQueries({ queryKey: ["branch-catalog", branchId] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useRemoveBranchEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      targetType,
      targetId,
    }: {
      branchId: string;
      targetType: "CATEGORY" | "SERVICE" | "ITEM" | "ADDON";
      targetId: string;
    }) =>
      apiRequest({
        path: `/admin/branch-catalog/${branchId}/entity/${targetType}/${targetId}`,
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch-catalog", variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

