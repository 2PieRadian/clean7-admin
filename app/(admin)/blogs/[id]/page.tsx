"use client";

import { useBlog } from "@/features/blogs/api/blogs-api";
import { BlogForm } from "@/features/blogs/components/blog-form";
import { use } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/store/auth-store";
import { notFound } from "next/navigation";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();

  if (user && user.role !== "DIRECTOR") {
    notFound();
  }

  // Actually, the API `useBlog` expects a slug, but our DB update expects an ID.
  // Wait, in `blogs-api.ts`, useBlog(slug) hits `/admin/blogs/${slug}`.
  // We can just fetch the blog by ID if our API gateway allows it, or change the URL to fetch by ID.
  // In `clean7-admin`, `id` is what we pass in the URL (`/blogs/[id]`).
  // Let's assume the API `/admin/blogs/:id` can resolve either by ID or Slug, or we adjust the hook to fetch by ID.
  const { data: blog, isLoading, error } = useBlog(id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
        Failed to load blog for editing. It may have been deleted or the ID is
        incorrect.
      </div>
    );
  }

  return <BlogForm initialData={blog} />;
}
