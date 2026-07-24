import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type { ManagedAuthUser } from "@/lib/types";

export function useAuthUsers(query?: Record<string, any>) {
  return useQuery({
    queryKey: ["auth-users", query],
    queryFn: () =>
      apiRequest<ManagedAuthUser[]>({
        path: "/admin/auth-users",
        query,
      }),
  });
}
