import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  authorName: string;
  imageUrl: string | null;
  category: "CAR_WASH" | "HOUSE_HELP" | "LAUNDRY";
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

// Queries
export function useBlogs(search?: string, category?: string) {
  return useQuery({
    queryKey: ["blogs", search, category],
    queryFn: () => {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (category && category !== "All") query.category = category;
      return apiRequest<Blog[]>({
        path: "/admin/blogs",
        query: Object.keys(query).length > 0 ? query : undefined,
      });
    },
  });
}

export function useBlog(slug: string) {
  return useQuery({
    queryKey: ["blogs", slug],
    queryFn: () => apiRequest<Blog>({ path: `/admin/blogs/${slug}` }),
    enabled: !!slug,
  });
}

// Mutations
export function useCreateBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Blog>) =>
      apiRequest({ path: "/admin/blogs", method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blogs"] }),
  });
}

export function useUpdateBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Blog> & { id: string }) =>
      apiRequest({ path: `/admin/blogs/${id}`, method: "PATCH", body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      if (variables.slug) {
        queryClient.invalidateQueries({ queryKey: ["blogs", variables.slug] });
      }
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({ path: `/admin/blogs/${id}`, method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}
