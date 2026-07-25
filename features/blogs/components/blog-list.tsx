"use client";

import { useBlogs, useDeleteBlog } from "../api/blogs-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth/store/auth-store";

export function BlogList() {
  const { data: blogs, isLoading } = useBlogs();
  const deleteBlog = useDeleteBlog();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-surface-muted rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!blogs || blogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted bg-surface rounded-2xl border border-[var(--border-soft)]">
        <p className="mb-4">No blogs found.</p>
        {isDirector && (
          <Link href="/blogs/create">
            <Button>Create your first blog</Button>
          </Link>
        )}
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this blog?")) {
      setDeletingId(id);
      try {
        await deleteBlog.mutateAsync(id);
      } catch (err) {
        console.error("Failed to delete blog", err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {blogs.map((blog) => (
        <Card
          key={blog.id}
          className="flex flex-col overflow-hidden bg-surface group hover:shadow-md transition-all"
        >
          {blog.imageUrl ? (
            <div className="h-40 bg-surface-muted overflow-hidden">
              <img
                src={blog.imageUrl}
                alt={blog.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-40 bg-primary/5 flex items-center justify-center">
              <span className="text-primary/40 font-medium">No Image</span>
            </div>
          )}

          <div className="p-5 flex flex-col flex-grow">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant={blog.status === "ACTIVE" ? "fulfillment" : "status"}
              >
                {blog.status}
              </Badge>
              <Badge variant="status">{blog.category.replace("_", " ")}</Badge>
            </div>

            <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-2">
              {blog.title}
            </h3>
            <p className="text-sm text-text-muted line-clamp-3 mb-4 flex-grow">
              {blog.excerpt || "No excerpt available."}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-soft)] mt-auto">
              <div className="text-xs text-text-muted font-medium">
                {new Date(blog.createdAt).toLocaleDateString()}
              </div>
              {isDirector && (
                <div className="flex items-center gap-2">
                  <Link href={`/blogs/${blog.id}`}>
                    <Button
                      variant="secondary"
                      className="h-8 w-8 p-0 flex items-center justify-center text-primary hover:bg-primary/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    className="h-8 w-8 p-0 flex items-center justify-center text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(blog.id)}
                    disabled={deletingId === blog.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
