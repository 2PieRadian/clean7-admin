import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse } from "@/lib/types";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: () =>
      apiRequest<BranchAdminResponse[]>({
        path: "/admin/branches",
      }),
  });
}

export function useBranch(branchId: string) {
  return useQuery({
    queryKey: ["branch", branchId],
    queryFn: () =>
      apiRequest<BranchAdminResponse>({
        path: `/admin/branches/${branchId}`,
      }),
    enabled: !!branchId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) =>
      apiRequest({
        path: "/admin/branches",
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, ...body }: any) =>
      apiRequest({
        path: `/admin/branches/${branchId}`,
        method: "PATCH",
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch", variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
