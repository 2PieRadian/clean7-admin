import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type { ProfileResponse } from "@/lib/types";

export interface ProfileQueryParams {
  search?: string;
  role?: string;
  email?: string;
  phoneNumber?: string;
}

export function useProfiles(query?: ProfileQueryParams) {
  return useQuery({
    queryKey: ["profiles", query],
    queryFn: () =>
      apiRequest<ProfileResponse[]>({
        path: "/admin/profiles",
        query: {
          search: query?.search || undefined,
          role: query?.role && query.role !== "ALL" ? query.role : undefined,
          email: query?.email || undefined,
          phoneNumber: query?.phoneNumber || undefined,
        },
      }),
  });
}

export function useProfileSearch(query: { email?: string; phoneNumber?: string }) {
  return useQuery({
    queryKey: ["profiles", "search", query],
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

export interface UpdateProfilePayload {
  fullName?: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  internalNotes?: string | null;
  role?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      authUserId,
      payload,
    }: {
      authUserId: string;
      payload: UpdateProfilePayload;
    }) => {
      // 1. If role or name changed, also update auth-service to keep in sync
      if (payload.fullName !== undefined || payload.role !== undefined) {
        try {
          await apiRequest({
            path: `/admin/auth-users/${authUserId}`,
            method: "PATCH",
            body: {
              ...(payload.fullName !== undefined ? { name: payload.fullName } : {}),
              ...(payload.role !== undefined ? { role: payload.role } : {}),
            },
          });
        } catch {
          // If auth user update fails (e.g. not a managed auth user or permissions), proceed to profile update
        }
      }

      // 2. Update profile in user-service (which handles phoneNumber, emergency contacts, notes, etc.)
      return apiRequest<ProfileResponse>({
        path: `/admin/profiles/${authUserId}`,
        method: "PATCH",
        body: payload,
      });
    },
    onSuccess: (_, { authUserId }) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", authUserId] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (authUserId: string) => {
      try {
        // First try primary auth-service delete endpoint (cascades to profile, operator, and auth credentials)
        await apiRequest({
          path: `/admin/auth-users/${authUserId}`,
          method: "DELETE",
        });
      } catch (error) {
        // Fallback: delete profile in user-service directly if auth-user was missing or already removed
        try {
          await apiRequest({
            path: `/admin/profiles/${authUserId}`,
            method: "DELETE",
          });
        } catch {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    },
  });
}
