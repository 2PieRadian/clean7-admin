import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";

export function useSystemReset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest({
        path: "/admin/system/reset-all-data",
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
