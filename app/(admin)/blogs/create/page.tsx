"use client";

import { BlogForm } from "@/features/blogs/components/blog-form";
import { useAuth } from "@/features/auth/store/auth-store";
import { notFound } from "next/navigation";

export default function CreateBlogPage() {
  const { user } = useAuth();
  if (user && user.role !== "DIRECTOR") {
    notFound();
  }

  return <BlogForm />;
}
