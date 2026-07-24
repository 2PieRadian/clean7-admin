import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type { ProfileResponse } from "@/lib/types";

export function useProfileSearch(query: { email?: string; phoneNumber?: string }) {
  return useQuery({
    queryKey: ["profiles", query],
    queryFn: () =>
      apiRequest<ProfileResponse[]>({
        path: "/admin/profiles",
        query,
      }),
    enabled: !!query.email || !!query.phoneNumber,
  });
}

export function useProfile(authUserId?: string) {
  return useQuery({
    queryKey: ["profiles", authUserId],
    queryFn: () =>
      apiRequest<ProfileResponse>({
        path: `/admin/profiles/${authUserId}`,
      }),
    enabled: !!authUserId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ authUserId, payload }: { authUserId: string; payload: any }) =>
      apiRequest({
        path: `/admin/profiles/${authUserId}`,
        method: "PATCH",
        body: payload,
      }),
    onSuccess: (_, { authUserId }) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", authUserId] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] }); // invalidate search results
    },
  });
}
